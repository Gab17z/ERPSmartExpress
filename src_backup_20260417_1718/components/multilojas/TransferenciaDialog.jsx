import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TransferenciaDialog({ open, onClose, produto, lojaOrigem }) {
  const [quantidade, setQuantidade] = useState(1);
  const [lojaDestinoId, setLojaDestinoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  const queryClient = useQueryClient();

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas'],
    queryFn: () => base44.entities.Loja.list(),
  });

  const criarTransferenciaMutation = useMutation({
    mutationFn: async (data) => {
      const codigo = `TRF-${Date.now()}`;
      return base44.entities.TransferenciaEstoque.create({
        ...data,
        codigo_transferencia: codigo,
        status: "pendente",
        data_transferencia: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success("Transferência registrada!");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const lojaDestino = lojas.find(l => l.id === lojaDestinoId);
    
    criarTransferenciaMutation.mutate({
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade: parseInt(quantidade),
      loja_origem_id: lojaOrigem.id,
      loja_origem_nome: lojaOrigem.nome,
      loja_destino_id: lojaDestinoId,
      loja_destino_nome: lojaDestino.nome,
      observacoes
    });
  };

  const lojasDisponiveis = lojas.filter(l => l.id !== lojaOrigem?.id && l.ativo);
  const estoqueDisponivel = produto?.estoque_por_loja?.find(e => e.loja_id === lojaOrigem?.id)?.quantidade || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Produto</Label>
            <Input value={produto?.nome || ""} disabled />
          </div>

          <div>
            <Label>Origem</Label>
            <Input value={lojaOrigem?.nome || ""} disabled />
            <p className="text-xs text-slate-500 mt-1">
              Disponível: {estoqueDisponivel} unidades
            </p>
          </div>

          <div>
            <Label>Destino *</Label>
            <Select value={lojaDestinoId} onValueChange={setLojaDestinoId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar loja" />
              </SelectTrigger>
              <SelectContent>
                {lojasDisponiveis.map(loja => (
                  <SelectItem key={loja.id} value={loja.id}>
                    {loja.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              max={estoqueDisponivel}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}