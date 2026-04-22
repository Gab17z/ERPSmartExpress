import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLoja } from "@/contexts/LojaContext";

/**
 * SeletorLojaAtiva — conectado ao LojaContext global.
 * Visível apenas para admins. Usuários comuns já estão fixados na sua loja.
 */
export default function SeletorLojaAtiva() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lojaAtiva, setLojaAtiva, lojas, isAdmin } = useLoja();

  // Usuário comum não vê o seletor
  if (!isAdmin) return null;

  const handleChange = (value) => {
    if (value === "configurar") {
      navigate(createPageUrl("MultiLojas"));
      return;
    }

    if (value === "todas") {
      setLojaAtiva(null);
      // Invalida todas as queries para recarregar sem filtro
      queryClient.invalidateQueries();
      toast.success("Visualizando todas as lojas");
      return;
    }

    const loja = lojas.find((l) => l.id === value);
    if (loja) {
      setLojaAtiva(loja);
      // Invalida todas as queries para recarregar com filtro da nova loja
      queryClient.invalidateQueries();
      toast.success(`Loja: ${loja.nome}`);
    }
  };

  const valorAtual = lojaAtiva?.id || "todas";

  return (
    <Select value={valorAtual} onValueChange={handleChange}>
      <SelectTrigger className="w-[150px] sm:w-[180px] h-9 text-blue-800 font-semibold bg-blue-50 border border-blue-200 hover:border-blue-300 transition-colors rounded-lg shadow-sm">
        <Store className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
        <SelectValue placeholder="Todas as Lojas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">🏢 Todas as Lojas</SelectItem>
        {lojas.map((loja) => (
          <SelectItem key={loja.id} value={loja.id}>
            📍 {loja.nome}
          </SelectItem>
        ))}
        <SelectItem value="configurar" className="text-blue-600 font-semibold border-t mt-2 pt-2">
          <Plus className="w-4 h-4 inline mr-1" />
          Gerenciar Lojas
        </SelectItem>
      </SelectContent>
    </Select>
  );
}