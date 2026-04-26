import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, ArrowLeftRight, Landmark } from "lucide-react";
import { toast } from "sonner";

export default function ContasBancarias() {
  const { lojaFiltroId } = useLoja();
  const { user } = useAuth();
  const [dialogConta, setDialogConta] = useState(false);
  const [dialogTransferencia, setDialogTransferencia] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    banco: "",
    agencia: "",
    numero_conta: "",
    tipo: "corrente",
    saldo_inicial: "",
    saldo_atual: "",
    ativo: true
  });

  const [formTransferencia, setFormTransferencia] = useState({
    conta_origem_id: "",
    conta_destino_id: "",
    valor: "",
    descricao: ""
  });

  const queryClient = useQueryClient();

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-bancarias', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaBancaria.filter({ loja_id: lojaFiltroId }, { order: 'nome' })
          : await base44.entities.ContaBancaria.list('nome');
      } catch {
        return [];
      }
    },
    refetchInterval: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaBancaria.create({
      ...data,
      saldo_inicial: parseValorBRL(data.saldo_inicial) || 0,
      saldo_atual: parseValorBRL(data.saldo_inicial) || 0,
      loja_id: lojaFiltroId || null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success("Conta criada!");
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContaBancaria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success("Conta atualizada!");
      resetForm();
    },
  });

  const transferenciaMutation = useMutation({
    mutationFn: async (data) => {
      const valor = parseFloat(data.valor);

      if (!data.conta_origem_id || !data.conta_destino_id) {
        throw new Error("Selecione as contas de origem e destino!");
      }

      if (data.conta_origem_id === data.conta_destino_id) {
        throw new Error("Conta de origem e destino devem ser diferentes!");
      }

      if (isNaN(valor) || valor <= 0) {
        throw new Error("Valor deve ser maior que zero!");
      }

      // CORREÇÃO: Buscar dados FRESCOS do banco para evitar race condition
      const [contaOrigem, contaDestino] = await Promise.all([
        base44.entities.ContaBancaria.get(data.conta_origem_id),
        base44.entities.ContaBancaria.get(data.conta_destino_id)
      ]);

      if (!contaOrigem || !contaDestino) {
        throw new Error("Contas inválidas!");
      }

      // CORREÇÃO: Usar saldos frescos do banco
      const saldoOrigemAtual = parseFloat(contaOrigem.saldo_atual) || 0;
      const saldoDestinoAtual = parseFloat(contaDestino.saldo_atual) || 0;

      if (saldoOrigemAtual < valor) {
        throw new Error(`Saldo insuficiente! Disponível: R$ ${saldoOrigemAtual.toFixed(2)}`);
      }

      // CORREÇÃO: Arredondar para evitar erro de centavos
      const novoSaldoOrigem = Math.round((saldoOrigemAtual - valor) * 100) / 100;
      const novoSaldoDestino = Math.round((saldoDestinoAtual + valor) * 100) / 100;

      await base44.entities.ContaBancaria.update(contaOrigem.id, {
        saldo_atual: novoSaldoOrigem
      });

      await base44.entities.ContaBancaria.update(contaDestino.id, {
        saldo_atual: novoSaldoDestino
      });

      return base44.entities.Transferencia.create({
        ...data,
        conta_origem_nome: contaOrigem.nome,
        conta_destino_nome: contaDestino.nome,
        valor: valor,
        data_transferencia: new Date().toISOString(),
        responsavel: user?.nome,
        loja_id: lojaFiltroId || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success("Transferência realizada!");
      setDialogTransferencia(false);
      setFormTransferencia({ conta_origem_id: "", conta_destino_id: "", valor: "", descricao: "" });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      banco: "",
      agencia: "",
      numero_conta: "",
      tipo: "corrente",
      saldo_inicial: "",
      saldo_atual: "",
      ativo: true
    });
    setEditingConta(null);
    setDialogConta(false);
  };

  const handleEdit = (conta) => {
    setEditingConta(conta);
    setFormData(conta);
    setDialogConta(true);
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações financeiras
    if (!formData.nome || !formData.banco) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }

    const saldoInicial = parseValorBRL(formData.saldo_inicial);
    if (isNaN(saldoInicial)) {
      toast.error("Saldo inicial inválido!");
      return;
    }

    if (editingConta) {
      updateMutation.mutate({ id: editingConta.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // CRÍTICO: Cálculo seguro de saldo total
  const saldoTotal = contas.filter(c => c.ativo).reduce((sum, c) => sum + (parseFloat(c.saldo_atual) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-7 h-7 text-blue-600" />
            Contas Bancárias
          </h1>
          <p className="text-slate-500">Gerencie suas contas e transferências</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setDialogTransferencia(true)} variant="outline" className="bg-purple-50">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transferência
          </Button>
          <Button onClick={() => setDialogConta(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div>
            <p className="text-sm text-slate-500">Saldo Total (Todas as Contas)</p>
            <p className="text-3xl font-bold text-blue-600">R$ {saldoTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{contas.filter(c => c.ativo).length} contas ativas</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contas.map((conta) => (
          <Card key={conta.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{conta.nome}</h3>
                  <p className="text-sm text-slate-500">{conta.banco}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(conta)}>
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Ag: {conta.agencia}</span>
                  <span className="text-slate-600">CC: {conta.numero_conta}</span>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-slate-500">Saldo Atual</p>
                  <p className="text-2xl font-bold text-green-600">R$ {(parseFloat(conta.saldo_atual) || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogConta} onOpenChange={() => resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConta ? "Editar" : "Nova"} Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Conta *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Bradesco Conta Corrente"
                />
              </div>
              <div>
                <Label>Banco *</Label>
                <Input
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Ex: Bradesco"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Conta Poupança</SelectItem>
                    <SelectItem value="digital">Conta Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  value={formData.numero_conta}
                  onChange={(e) => setFormData({ ...formData, numero_conta: e.target.value })}
                />
              </div>
              <div>
                <Label>Saldo Inicial</Label>
                <InputMoeda
                  value={formData.saldo_inicial}
                  onChange={(valor) => setFormData({ ...formData, saldo_inicial: valor })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600">
              {editingConta ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTransferencia} onOpenChange={setDialogTransferencia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Conta Origem</Label>
              <Select value={formTransferencia.conta_origem_id} onValueChange={(v) => setFormTransferencia({ ...formTransferencia, conta_origem_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contas.filter(c => c.ativo).map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Destino</Label>
              <Select value={formTransferencia.conta_destino_id} onValueChange={(v) => setFormTransferencia({ ...formTransferencia, conta_destino_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contas.filter(c => c.ativo).map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={formTransferencia.valor}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, valor: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formTransferencia.descricao}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, descricao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferencia(false)}>Cancelar</Button>
            <Button onClick={() => transferenciaMutation.mutate(formTransferencia)} className="bg-purple-600">
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}