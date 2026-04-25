import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Ticket, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function CuponsDesconto() {
  const { lojaFiltroId } = useLoja();
  const confirm = useConfirm();
  const [dialogCupom, setDialogCupom] = useState(false);
  const [editingCupom, setEditingCupom] = useState(null);
  const [formData, setFormData] = useState({
    codigo: "",
    tipo: "percentual",
    valor: 0,
    valor_minimo: 0,
    uso_maximo: 0,
    data_fim: "",
    ativo: true
  });

  const queryClient = useQueryClient();

  const { data: cupons = [] } = useQuery({
    queryKey: ['cupons', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.CupomDesconto.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : await base44.entities.CupomDesconto.list('-created_date');
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // CRÍTICO: Verificar código duplicado dentro da mesma loja
      const cuponsExistentes = lojaFiltroId 
        ? await base44.entities.CupomDesconto.filter({ loja_id: lojaFiltroId })
        : await base44.entities.CupomDesconto.list();
        
      const codigoDuplicado = cuponsExistentes.find(
        c => c.codigo?.toUpperCase() === data.codigo?.toUpperCase()
      );
      if (codigoDuplicado) {
        throw new Error("Já existe um cupom com este código!");
      }
      return base44.entities.CupomDesconto.create({ ...data, loja_id: lojaFiltroId || user?.loja_id || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupons', lojaFiltroId] });
      toast.success("Cupom criado!");
      setDialogCupom(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar cupom");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CupomDesconto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupons', lojaFiltroId] });
      toast.success("Cupom atualizado!");
      setDialogCupom(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CupomDesconto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupons', lojaFiltroId] });
      toast.success("Cupom excluído!");
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: "",
      tipo: "percentual",
      valor: 0,
      valor_minimo: 0,
      uso_maximo: 0,
      data_fim: "",
      ativo: true
    });
    setEditingCupom(null);
  };

  const handleOpenDialog = (cupom = null) => {
    if (cupom) {
      setEditingCupom(cupom);
      setFormData({
        codigo: cupom.codigo,
        tipo: cupom.tipo,
        valor: cupom.valor,
        valor_minimo: cupom.valor_minimo || 0,
        uso_maximo: cupom.uso_maximo || 0,
        data_fim: cupom.data_fim || "",
        ativo: cupom.ativo !== false
      });
    } else {
      resetForm();
    }
    setDialogCupom(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // CRÍTICO: Validações de cupom
    if (!formData.codigo || formData.codigo.trim() === "") {
      toast.error("Digite o código do cupom!");
      return;
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor do desconto deve ser maior que zero!");
      return;
    }

    if (formData.tipo === "percentual" && valor > 100) {
      toast.error("Percentual não pode ser maior que 100%!");
      return;
    }

    const dados = {
      codigo: formData.codigo,
      tipo: formData.tipo,
      valor: valor,
      valor_minimo: parseFloat(formData.valor_minimo) || 0,
      uso_maximo: parseInt(formData.uso_maximo) || null,
      // Não zerar uso_atual ao editar — preservar contador de usos
      ...(editingCupom ? {} : { uso_atual: 0 }),
      data_fim: formData.data_fim || null,
      ativo: formData.ativo
    };

    if (editingCupom) {
      updateMutation.mutate({ id: editingCupom.id, data: dados });
    } else {
      createMutation.mutate(dados);
    }
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-slate-500">Gerencie campanhas de cupons</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cupons Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cupons.map((cupom) => (
                <TableRow key={cupom.id}>
                  <TableCell className="font-mono font-bold">{cupom.codigo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {cupom.tipo === "percentual" ? "%" : "R$"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cupom.tipo === "percentual" ? `${cupom.valor}%` : `R$ ${(parseFloat(cupom.valor) || 0).toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {cupom.uso_atual || 0}/{cupom.uso_maximo || "∞"}
                  </TableCell>
                  <TableCell>
                    {cupom.data_fim ? format(new Date(cupom.data_fim), 'dd/MM/yyyy') : "Sem limite"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Verificar se cupom expirou
                      const expirado = cupom.data_fim && (new Date(cupom.data_fim + 'T23:59:59') < new Date());
                      const semUsos = cupom.uso_maximo > 0 && (cupom.uso_atual || 0) >= cupom.uso_maximo;

                      if (expirado) {
                        return <Badge variant="destructive">Expirado</Badge>;
                      }
                      if (semUsos) {
                        return <Badge variant="secondary">Esgotado</Badge>;
                      }
                      return (
                        <Badge variant={cupom.ativo ? "default" : "secondary"}>
                          {cupom.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => copiarCodigo(cupom.codigo)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cupom)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const resposta = await confirm({
                        title: "Excluir Cupom",
                        description: `Tem certeza que deseja excluir o cupom "${cupom.codigo}"?\n\nEsta ação não pode ser desfeita!`,
                        confirmText: "Sim, Excluir",
                        cancelText: "Cancelar",
                        type: "confirm"
                      });
                      if (resposta) {
                        deleteMutation.mutate(cupom.id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogCupom} onOpenChange={setDialogCupom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCupom ? "Editar" : "Novo"} Cupom</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Código do Cupom</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="DESCONTO10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mínimo da Compra</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label>Limite de Uso (0 = ilimitado)</Label>
                <Input
                  type="number"
                  value={formData.uso_maximo}
                  onChange={(e) => setFormData({ ...formData, uso_maximo: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Data de Validade</Label>
              <Input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogCupom(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}