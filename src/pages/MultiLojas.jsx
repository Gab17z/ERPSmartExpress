import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Plus, Edit, Trash2, MapPin, BarChart3, Package as PackageIcon, TrendingUp } from "lucide-react";
import SeletorLojaAtiva from "@/components/multilojas/SeletorLojaAtiva";
import DashboardLoja from "@/components/multilojas/DashboardLoja";
import EstoquePorLoja from "@/components/multilojas/EstoquePorLoja";
import TransferenciaDialog from "@/components/multilojas/TransferenciaDialog";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function MultiLojas() {
  const confirm = useConfirm();
  const [dialogLoja, setDialogLoja] = useState(false);
  const [editingLoja, setEditingLoja] = useState(null);
  const [lojaAtiva, setLojaAtiva] = useState(null);
  const [dialogTransferencia, setDialogTransferencia] = useState(false);
  const [produtoTransferencia, setProdutoTransferencia] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    responsavel: "",
    endereco: {
      cep: "",
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: ""
    },
    ativo: true
  });

  const queryClient = useQueryClient();

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas'],
    queryFn: () => base44.entities.Loja.list(),
  });

  // CORREÇÃO: Remover limite hardcoded - carregar todas para cálculos corretos
  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const { data: os = [] } = useQuery({
    queryKey: ['os'],
    queryFn: () => base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
  });

  const { data: transferencias = [] } = useQuery({
    queryKey: ['transferencias'],
    queryFn: () => base44.entities.TransferenciaEstoque.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Loja.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success("Loja cadastrada!");
      setDialogLoja(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Loja.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success("Loja atualizada!");
      setDialogLoja(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // CORREÇÃO: Verificar se loja tem vendas ou OS antes de deletar
      const vendasLoja = vendas.filter(v => v.loja_id === id);
      const osLoja = os.filter(o => o.loja_id === id);

      if (vendasLoja.length > 0) {
        throw new Error(`Loja possui ${vendasLoja.length} venda(s). Não é possível remover.`);
      }
      if (osLoja.length > 0) {
        throw new Error(`Loja possui ${osLoja.length} ordem(s) de serviço. Não é possível remover.`);
      }

      return base44.entities.Loja.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success("Loja removida!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover loja");
    }
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      telefone: "",
      email: "",
      responsavel: "",
      endereco: { cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "" },
      ativo: true
    });
    setEditingLoja(null);
  };

  // CORREÇÃO: Validação básica de CNPJ
  const validarCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    // Verificação básica - todos dígitos iguais são inválidos
    if (/^(\d)\1+$/.test(cnpj)) return false;
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // CORREÇÃO: Validar CNPJ antes de salvar
    if (formData.cnpj && !validarCNPJ(formData.cnpj)) {
      toast.error("CNPJ inválido! Digite um CNPJ válido com 14 dígitos.");
      return;
    }

    if (editingLoja) {
      updateMutation.mutate({ id: editingLoja.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (loja) => {
    setEditingLoja(loja);
    setFormData(loja);
    setDialogLoja(true);
  };

  const handleTransferir = (produto) => {
    setProdutoTransferencia(produto);
    setDialogTransferencia(true);
  };

  const lojasAtivas = lojas.filter(l => l.ativo).length;

  // CRÍTICO: Comparativo com validação
  const calcularComparativo = () => {
    return lojas.map(loja => {
      const vendasLoja = vendas.filter(v => v.loja_id === loja.id && v.status === 'finalizada');
      const faturamento = vendasLoja.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);

      return {
        loja: loja.nome,
        faturamento,
        vendas: vendasLoja.length
      };
    }).sort((a, b) => b.faturamento - a.faturamento);
  };

  const comparativo = calcularComparativo();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            Multi-Lojas - Sistema Profissional
          </h1>
          <p className="text-slate-500">Dashboards, estoque e relatórios por filial</p>
        </div>
        <div className="flex gap-2">
          <SeletorLojaAtiva onLojaChange={setLojaAtiva} />
          <Button onClick={() => setDialogLoja(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Loja
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Lojas</p>
                <p className="text-2xl font-bold">{lojas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Lojas Ativas</p>
                <p className="text-2xl font-bold">{lojasAtivas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Transferências</p>
                <p className="text-2xl font-bold">{transferencias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="estoque">
            <PackageIcon className="w-4 h-4 mr-2" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="comparativo">
            <TrendingUp className="w-4 h-4 mr-2" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="gerenciar">
            <Store className="w-4 h-4 mr-2" />
            Gerenciar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {lojaAtiva ? (
            <DashboardLoja
              loja={lojaAtiva}
              vendas={vendas}
              os={os}
              produtos={produtos}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                Selecione uma loja para ver o dashboard
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="estoque">
          {lojaAtiva ? (
            <EstoquePorLoja
              loja={lojaAtiva}
              produtos={produtos}
              onTransferir={handleTransferir}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                Selecione uma loja para ver o estoque
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparativo">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativo.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant={idx === 0 ? "default" : "secondary"}>
                          {idx + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{item.loja}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        R$ {item.faturamento.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{item.vendas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gerenciar">
          <Card>
            <CardHeader>
              <CardTitle>Lojas Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lojas.map((loja) => (
                    <TableRow key={loja.id}>
                      <TableCell className="font-medium">{loja.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{loja.cnpj}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {loja.endereco?.cidade || '-'} / {loja.endereco?.estado || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{loja.responsavel || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={loja.ativo ? "default" : "secondary"}>
                          {loja.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(loja)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const resposta = await confirm({
                                title: "Remover Loja",
                                description: "Deseja realmente remover esta loja do sistema?",
                                confirmText: "Sim, Remover",
                                cancelText: "Cancelar",
                                type: "confirm"
                              });
                              if (resposta) {
                                deleteMutation.mutate(loja.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogLoja} onOpenChange={setDialogLoja}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoja ? "Editar" : "Nova"} Loja</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Loja *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Responsável</Label>
                <Input
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">Endereço</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={formData.endereco.cep}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cep: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Rua</Label>
                  <Input
                    value={formData.endereco.rua}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, rua: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={formData.endereco.numero}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, numero: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={formData.endereco.bairro}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, bairro: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.endereco.cidade}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cidade: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={formData.endereco.estado}
                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, estado: e.target.value } })}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogLoja(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TransferenciaDialog
        open={dialogTransferencia}
        onClose={() => setDialogTransferencia(false)}
        produto={produtoTransferencia}
        lojaOrigem={lojaAtiva}
      />
    </div>
  );
}