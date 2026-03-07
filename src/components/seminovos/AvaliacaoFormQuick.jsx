import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Smartphone, User, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AvaliacaoFormQuick({ onSuccess }) {
  const queryClient = useQueryClient();
  const [dialogCliente, setDialogCliente] = useState(false);
  const [searchCliente, setSearchCliente] = useState("");
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    aparelho: {
      marca: "",
      modelo: "",
      capacidade_gb: 0,
      cor: ""
    },
    condicao_tela: "perfeita",
    condicao_bateria: { estado: "excelente" },
    condicao_carcaca: "perfeita"
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const codigo = `AVL-${Date.now()}`;
      const score = calcularScore(data);
      const valorMercado = 1000;
      const valorOfertar = valorMercado * 0.7;
      
      return await base44.entities.AvaliacaoSeminovo.create({
        ...data,
        codigo_avaliacao: codigo,
        score_final: score,
        valor_mercado: valorMercado,
        valor_oferecido: valorOfertar,
        status: "concluida",
        data_avaliacao: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      toast.success("Avaliação registrada!");
      if (onSuccess) onSuccess();
    }
  });

  const calcularScore = (data) => {
    let score = 100;
    const condicoesScore = {
      tela: { perfeita: 0, arranhoes_leves: -5, arranhoes_visiveis: -15, trinca_pequena: -25, trinca_grande: -40, quebrada: -60 },
      carcaca: { perfeita: 0, pequenos_riscos: -5, riscos_visiveis: -10, amassados: -20, muito_danificada: -40 },
      bateria: { excelente: 0, boa: -5, regular: -15, ruim: -30 }
    };
    
    score += condicoesScore.tela[data.condicao_tela] || 0;
    score += condicoesScore.carcaca[data.condicao_carcaca] || 0;
    score += condicoesScore.bateria[data.condicao_bateria?.estado] || 0;
    
    return Math.max(0, Math.min(100, score));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.aparelho.marca || !formData.aparelho.modelo) {
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
            <Label>Capacidade (GB)</Label>
            <Select
              value={formData.aparelho.capacidade_gb?.toString()}
              onValueChange={(value) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, capacidade_gb: parseInt(value) }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="64">64 GB</SelectItem>
                <SelectItem value="128">128 GB</SelectItem>
                <SelectItem value="256">256 GB</SelectItem>
                <SelectItem value="512">512 GB</SelectItem>
                <SelectItem value="1024">1 TB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cor</Label>
            <Input
              value={formData.aparelho.cor}
              onChange={(e) => setFormData({
                ...formData,
                aparelho: { ...formData.aparelho, cor: e.target.value }
              })}
            />
          </div>
        </div>

        <div>
          <Label>Condição da Tela</Label>
          <Select
            value={formData.condicao_tela}
            onValueChange={(value) => setFormData({ ...formData, condicao_tela: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perfeita">Perfeita</SelectItem>
              <SelectItem value="arranhoes_leves">Arranhões Leves</SelectItem>
              <SelectItem value="arranhoes_visiveis">Arranhões Visíveis</SelectItem>
              <SelectItem value="trinca_pequena">Trinca Pequena</SelectItem>
              <SelectItem value="trinca_grande">Trinca Grande</SelectItem>
              <SelectItem value="quebrada">Quebrada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Condição da Carcaça</Label>
          <Select
            value={formData.condicao_carcaca}
            onValueChange={(value) => setFormData({ ...formData, condicao_carcaca: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perfeita">Perfeita</SelectItem>
              <SelectItem value="pequenos_riscos">Pequenos Riscos</SelectItem>
              <SelectItem value="riscos_visiveis">Riscos Visíveis</SelectItem>
              <SelectItem value="amassados">Amassados</SelectItem>
              <SelectItem value="muito_danificada">Muito Danificada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estado da Bateria</Label>
          <Select
            value={formData.condicao_bateria.estado}
            onValueChange={(value) => setFormData({
              ...formData,
              condicao_bateria: { estado: value }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excelente">Excelente</SelectItem>
              <SelectItem value="boa">Boa</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="ruim">Ruim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={createMutation.isPending}>
          <Smartphone className="w-4 h-4 mr-2" />
          {createMutation.isPending ? "Salvando..." : "Registrar Avaliação"}
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