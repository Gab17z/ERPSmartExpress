import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function ContasRecorrentes() {
  const { lojaFiltroId } = useLoja();
  const confirm = useConfirm();
  const [dialogConta, setDialogConta] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "outros",
    fornecedor_id: "",
    fornecedor_nome: "",
    valor_fixo: "",
    valor_estimado: "",
    tipo_valor: "fixo",
    dia_vencimento: "",
    gerar_automaticamente: true,
    ativo: true,
    observacoes: ""
  });

  const queryClient = useQueryClient();

  const { data: contasRecorrentes = [] } = useQuery({
    queryKey: ['contas-recorrentes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaRecorrente.filter({ loja_id: lojaFiltroId }, { order: 'descricao' })
          : lojaFiltroId ? await base44.entities.ContaRecorrente.filter({ loja_id: lojaFiltroId }, { order: 'descricao' }) : await base44.entities.ContaRecorrente.list('descricao');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Fornecedor.filter({ loja_id: lojaFiltroId }, { order: 'nome_fantasia' })
      : lojaFiltroId ? base44.entities.Fornecedor.filter({ loja_id: lojaFiltroId }, { order: 'nome_fantasia' }) : base44.entities.Fornecedor.list('nome_fantasia'),
  });

  // CORREÇÃO: Buscar categorias dinâmicas do banco
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-despesa'],
    queryFn: async () => {
      try {
        return lojaFiltroId ? await base44.entities.CategoriaDespesa.filter({ loja_id: lojaFiltroId }, { order: 'nome' }) : await base44.entities.CategoriaDespesa.list('nome');
      } catch {
        return [
          { id: '1', nome: 'Aluguel', tipo: 'pagar' },
          { id: '2', nome: 'Energia', tipo: 'pagar' },
          { id: '3', nome: 'Água', tipo: 'pagar' },
          { id: '4', nome: 'Internet', tipo: 'pagar' },
          { id: '5', nome: 'Telefone', tipo: 'pagar' },
          { id: '6', nome: 'Pró-labore', tipo: 'pagar' },
          { id: '7', nome: 'Impostos', tipo: 'pagar' },
          { id: '8', nome: 'Seguros', tipo: 'pagar' },
          { id: '9', nome: 'Manutenção', tipo: 'pagar' },
          { id: '10', nome: 'Outros', tipo: 'pagar' }
        ];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaRecorrente.create({ ...data, loja_id: lojaFiltroId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-recorrentes'] });
      toast.success("Conta recorrente criada!");
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContaRecorrente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-recorrentes'] });
      toast.success("Conta atualizada!");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContaRecorrente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-recorrentes'] });
      toast.success("Conta excluída!");
    },
  });

  const gerarContasMesMutation = useMutation({
    mutationFn: async () => {
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      const contasAtivas = contasRecorrentes.filter(c => c.ativo && c.gerar_automaticamente);

      for (const conta of contasAtivas) {
        const diaVencimento = parseInt(conta.dia_vencimento);
        const dataVencimento = new Date(anoAtual, mesAtual, diaVencimento);

        await base44.entities.ContaPagar.create({
          fornecedor_id: conta.fornecedor_id,
          fornecedor_nome: conta.descricao,
          descricao: `${conta.descricao} - ${mesAtual + 1}/${anoAtual}`,
          valor: parseFloat(conta.valor) || 0,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          categoria: conta.categoria,
          status: "pendente",
          loja_id: lojaFiltroId || null
        });
      }

      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      return contasAtivas.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} contas geradas para este mês!`);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      categoria: "outros",
      fornecedor_id: "",
      fornecedor_nome: "",
      valor_fixo: "",
      valor_estimado: "",
      tipo_valor: "fixo",
      dia_vencimento: "",
      gerar_automaticamente: true,
      ativo: true,
      observacoes: ""
    });
    setEditingConta(null);
    setDialogConta(false);
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações
    if (!formData.nome || !formData.dia_vencimento) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    const diaVenc = parseInt(formData.dia_vencimento);
    if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
      toast.error("Dia de vencimento deve ser entre 1 e 31!");
      return;
    }

    const valorFixo = parseValorBRL(formData.valor_fixo) || 0;
    const valorEstimado = parseValorBRL(formData.valor_estimado) || 0;

    if (formData.tipo_valor === "fixo" && valorFixo <= 0) {
      toast.error("Valor fixo deve ser maior que zero!");
      return;
    }

    if (formData.tipo_valor === "variavel" && valorEstimado <= 0) {
      toast.error("Valor estimado deve ser maior que zero!");
      return;
    }

    const data = {
      descricao: formData.nome,
      tipo: "pagar",
      valor: formData.tipo_valor === "fixo" ? valorFixo : valorEstimado,
      dia_vencimento: diaVenc,
      frequencia: "mensal",
      categoria: formData.categoria,
      fornecedor_id: formData.fornecedor_id || null,
      ativo: formData.ativo
    };

    if (editingConta) {
      updateMutation.mutate({ id: editingConta.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (conta) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.descricao || "",
      categoria: conta.categoria || "outros",
      fornecedor_id: conta.fornecedor_id || "",
      fornecedor_nome: "",
      valor_fixo: conta.valor?.toString() || "",
      valor_estimado: "",
      tipo_valor: "fixo",
      dia_vencimento: conta.dia_vencimento?.toString() || "",
      gerar_automaticamente: true,
      ativo: conta.ativo !== false,
      observacoes: ""
    });
    setDialogConta(true);
  };

  const handleDelete = async (id) => {
    const resposta = await confirm({
      title: "Excluir Conta Recorrente",
      description: "Tem certeza que deseja excluir esta conta recorrente?",
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      deleteMutation.mutate(id);
    }
  };

  // CRÍTICO: Cálculo seguro de total mensal
  const totalMensal = contasRecorrentes
    .filter(c => c.ativo)
    .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-purple-600" />
            Contas Recorrentes
          </h1>
          <p className="text-slate-500">Gerencie despesas fixas mensais</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => gerarContasMesMutation.mutate()} variant="outline" className="bg-green-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Gerar Contas do Mês
          </Button>
          <Button onClick={() => setDialogConta(true)} className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta Recorrente
          </Button>
        </div>
      </div>

      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div>
            <p className="text-sm text-slate-500">Total Mensal Estimado</p>
            <p className="text-3xl font-bold text-purple-600">R$ {totalMensal.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{contasRecorrentes.filter(c => c.ativo).length} contas ativas</p>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Buscar conta..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="flex-1 min-w-[250px]"
            />
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Categorias</SelectItem>
                {categorias.filter(c => c.ativo !== false && c.tipo === 'pagar').map(cat => (
                  <SelectItem key={cat.id} value={cat.nome.toLowerCase()}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="ativo">Ativas</SelectItem>
                <SelectItem value="inativo">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vence Dia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasRecorrentes.filter(c => {
                const matchBusca = !buscaTexto || c.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
                const matchCategoria = filtroCategoria === "todos" || c.categoria === filtroCategoria;
                const matchAtivo = filtroAtivo === "todos" || (filtroAtivo === "ativo" ? c.ativo : !c.ativo);
                return matchBusca && matchCategoria && matchAtivo;
              }).map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-semibold">{conta.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{conta.categoria}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {conta.frequencia || "mensal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-purple-600">
                    R$ {(parseFloat(conta.valor) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>Todo dia {conta.dia_vencimento}</TableCell>
                  <TableCell>
                    <Badge variant={conta.ativo ? "default" : "secondary"}>
                      {conta.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(conta)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(conta.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogConta} onOpenChange={() => resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingConta ? "Editar" : "Nova"} Conta Recorrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Conta *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Aluguel do Imóvel"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.ativo !== false && c.tipo === 'pagar').map(cat => (
                      <SelectItem key={cat.id} value={cat.nome.toLowerCase()}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Valor</Label>
                <Select value={formData.tipo_valor} onValueChange={(v) => setFormData({ ...formData, tipo_valor: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor Fixo</SelectItem>
                    <SelectItem value="variavel">Valor Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_valor === "fixo" ? (
                <div>
                  <Label>Valor Fixo *</Label>
                  <InputMoeda
                    value={formData.valor_fixo}
                    onChange={(valor) => setFormData({ ...formData, valor_fixo: valor })}
                  />
                </div>
              ) : (
                <div>
                  <Label>Valor Estimado *</Label>
                  <InputMoeda
                    value={formData.valor_estimado}
                    onChange={(valor) => setFormData({ ...formData, valor_estimado: valor })}
                  />
                </div>
              )}

              <div>
                <Label>Dia do Vencimento *</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dia_vencimento}
                  onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                  placeholder="1 a 31"
                />
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.gerar_automaticamente}
                  onCheckedChange={(c) => setFormData({ ...formData, gerar_automaticamente: c })}
                />
                <Label>Gerar Automaticamente</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(c) => setFormData({ ...formData, ativo: c })}
                />
                <Label>Conta Ativa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-purple-600">
              {editingConta ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}