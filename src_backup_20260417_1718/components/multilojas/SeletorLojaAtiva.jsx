import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SeletorLojaAtiva({ onLojaChange }) {
  const navigate = useNavigate();
  const [lojaAtiva, setLojaAtiva] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas'],
    queryFn: () => base44.entities.Loja.list(),
  });

  useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        setConfiguracoes(JSON.parse(configSalva));
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  }, []);

  useEffect(() => {
    const lojaId = localStorage.getItem('loja_ativa_id');
    if (lojaId === "matriz") {
      setLojaAtiva({ id: "matriz", nome: configuracoes?.empresa?.nome || "Matriz" });
      onLojaChange?.({ id: "matriz", nome: configuracoes?.empresa?.nome || "Matriz" });
    } else if (lojaId && lojas.length > 0) {
      const loja = lojas.find(l => l.id === lojaId);
      if (loja) {
        setLojaAtiva(loja);
        onLojaChange?.(loja);
      }
    }
  }, [lojas, configuracoes]);

  const handleChange = (lojaId) => {
    if (lojaId === "configurar") {
      navigate(createPageUrl("MultiLojas"));
      return;
    }
    
    if (lojaId === "todas") {
      setLojaAtiva(null);
      localStorage.removeItem('loja_ativa_id');
      onLojaChange?.(null);
      toast.success("Visualizando todas as lojas");
      return;
    }
    
    if (lojaId === "matriz") {
      const lojaMatriz = { id: "matriz", nome: configuracoes?.empresa?.nome || "Matriz" };
      setLojaAtiva(lojaMatriz);
      localStorage.setItem('loja_ativa_id', 'matriz');
      onLojaChange?.(lojaMatriz);
      toast.success(`Loja alterada: ${lojaMatriz.nome}`);
      return;
    }
    
    const loja = lojas.find(l => l.id === lojaId);
    if (loja) {
      setLojaAtiva(loja);
      localStorage.setItem('loja_ativa_id', lojaId);
      onLojaChange?.(loja);
      toast.success(`Loja alterada: ${loja.nome}`);
    }
  };

  const lojasAtivas = lojas.filter(l => l.ativo);
  const nomeMatriz = configuracoes?.empresa?.nome || "Matriz";

  return (
    <Select value={lojaAtiva?.id || "todas"} onValueChange={handleChange}>
      <SelectTrigger className="w-[150px] sm:w-[180px] h-9 text-blue-800 font-semibold bg-blue-50 border border-blue-200 hover:border-blue-300 transition-colors rounded-lg shadow-sm">
        <Store className="w-4 h-4 mr-2 text-blue-600" />
        <SelectValue placeholder={nomeMatriz} />
      </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">🏢 Todas as Lojas</SelectItem>
          <SelectItem value="matriz">📍 {nomeMatriz}</SelectItem>
          {lojasAtivas.map(loja => (
            <SelectItem key={loja.id} value={loja.id}>
              📍 {loja.nome}
            </SelectItem>
          ))}
          <SelectItem value="configurar" className="text-blue-600 font-semibold border-t mt-2 pt-2">
            <Plus className="w-4 h-4 inline mr-2" />
            Gerenciar Lojas
          </SelectItem>
        </SelectContent>
    </Select>
  );
}