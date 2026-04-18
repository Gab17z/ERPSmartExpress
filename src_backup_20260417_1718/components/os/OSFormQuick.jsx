import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, User, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function OSFormQuick({ onSuccess }) {
  const queryClient = useQueryClient();
  const [dialogCliente, setDialogCliente] = useState(false);
  const [searchCliente, setSearchCliente] = useState("");
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    aparelho: {
      marca: "",
      modelo: "",
      imei: "",
      senha: ""
    },
    defeito_reclamado: "",
    prioridade: "normal"
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const codigo = `OS-${Date.now()}`;
      return await base44.entities.OrdemServico.create({
        ...data,
        codigo_os: codigo,
        status: "recebido",
        data_entrada: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os'] });
      toast.success("OS criada com sucesso!");
      if (onSuccess) onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.aparelho.marca || !formData.aparelho.modelo || !formData.defeito_reclamado) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    createMutation.mutate(formData);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome_completo?.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.telefone1?.includes(searchCliente)
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Cliente *</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setDialogCliente(true)}
          >
            <User className="w-4 h-4 mr-2" />
            {formData.cliente_nome || "Selecionar Cliente"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Marca *</Label>
            <Input
              value={formData.aparelho.marca}
              onChange={(e) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, marca: e.target.value }
              })}
              placeholder="Ex: Apple"
            />
          </div>
          <div>
            <Label>Modelo *</Label>
            <Input
              value={formData.aparelho.modelo}
              onChange={(e) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, modelo: e.target.value }
              })}
              placeholder="Ex: iPhone 13"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>IMEI</Label>
            <Input
              value={formData.aparelho.imei}
              onChange={(e) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, imei: e.target.value }
              })}
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              value={formData.aparelho.senha}
              onChange={(e) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, senha: e.target.value }
              })}
            />
          </div>
        </div>

        <div>
          <Label>Defeito Reclamado *</Label>
          <Textarea
            value={formData.defeito_reclamado}
            onChange={(e) => setFormData({ ...formData, defeito_reclamado: e.target.value })}
            rows={3}
            placeholder="Descreva o problema..."
          />
        </div>

        <div>
          <Label>Prioridade</Label>
          <Select
            value={formData.prioridade}
            onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
          <Wrench className="w-4 h-4 mr-2" />
          {createMutation.isPending ? "Criando..." : "Criar Ordem de Serviço"}
        </Button>
      </form>

      <Dialog open={dialogCliente} onOpenChange={setDialogCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {clientesFiltrados.map((cliente) => (
                <Button
                  key={cliente.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      cliente_id: cliente.id,
                      cliente_nome: cliente.nome_completo
                    });
                    setDialogCliente(false);
                  }}
                >
                  <div className="text-left">
                    <div className="font-semibold">{cliente.nome_completo}</div>
                    <div className="text-sm text-slate-500">{cliente.telefone1}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}