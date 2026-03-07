import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  Users,
  Wrench,
  ShoppingCart,
  FileText,
  Smartphone,
  TrendingUp,
  Loader2
} from "lucide-react";

const ICONES_TIPO = {
  produto: Package,
  cliente: Users,
  os: Wrench,
  venda: ShoppingCart,
  fornecedor: FileText,
  seminovo: Smartphone,
  comissao: TrendingUp
};

const CORES_TIPO = {
  produto: "bg-blue-100 text-blue-700",
  cliente: "bg-green-100 text-green-700",
  os: "bg-orange-100 text-orange-700",
  venda: "bg-purple-100 text-purple-700",
  fornecedor: "bg-slate-100 text-slate-700",
  seminovo: "bg-indigo-100 text-indigo-700",
  comissao: "bg-emerald-100 text-emerald-700"
};

export default function BuscaGlobal({ open, onClose }) {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-busca'],
    queryFn: () => base44.entities.Produto.list(),
    enabled: open
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-busca'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: open
  });

  const { data: ordensServico = [] } = useQuery({
    queryKey: ['os-busca'],
    queryFn: () => base44.entities.OrdemServico.list(),
    enabled: open
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas-busca'],
    queryFn: () => base44.entities.Venda.list('-created_date', 50),
    enabled: open
  });

  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    const timer = setTimeout(() => {
      const termo = busca.toLowerCase();
      const res = [];

      // Buscar produtos
      produtos.forEach(p => {
        if (
          p.nome?.toLowerCase().includes(termo) ||
          p.sku?.toLowerCase().includes(termo) ||
          p.codigo_barras?.toLowerCase().includes(termo)
        ) {
          res.push({
            tipo: 'produto',
            id: p.id,
            titulo: p.nome,
            subtitulo: `SKU: ${p.sku || 'N/A'} • R$ ${p.preco_venda?.toFixed(2) || '0.00'}`,
            url: createPageUrl('Produtos')
          });
        }
      });

      // Buscar clientes
      clientes.forEach(c => {
        if (
          c.nome_completo?.toLowerCase().includes(termo) ||
          c.cpf_cnpj?.toLowerCase().includes(termo) ||
          c.telefone1?.includes(termo)
        ) {
          res.push({
            tipo: 'cliente',
            id: c.id,
            titulo: c.nome_completo,
            subtitulo: `${c.telefone1 || ''} • ${c.email || ''}`,
            url: createPageUrl('Clientes')
          });
        }
      });

      // Buscar OS
      ordensServico.forEach(os => {
        if (
          os.codigo_os?.toLowerCase().includes(termo) ||
          os.cliente_nome?.toLowerCase().includes(termo) ||
          os.aparelho?.modelo?.toLowerCase().includes(termo)
        ) {
          res.push({
            tipo: 'os',
            id: os.id,
            titulo: os.codigo_os,
            subtitulo: `${os.cliente_nome} • ${os.aparelho?.marca} ${os.aparelho?.modelo}`,
            url: createPageUrl('OrdensServico')
          });
        }
      });

      // Buscar vendas
      vendas.forEach(v => {
        if (
          v.codigo_venda?.toLowerCase().includes(termo) ||
          v.cliente_nome?.toLowerCase().includes(termo)
        ) {
          res.push({
            tipo: 'venda',
            id: v.id,
            titulo: v.codigo_venda,
            subtitulo: `${v.cliente_nome || 'Sem nome'} • R$ ${v.valor_total?.toFixed(2)}`,
            url: createPageUrl('Relatorios')
          });
        }
      });

      setResultados(res.slice(0, 20));
      setBuscando(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca, produtos, clientes, ordensServico, vendas]);

  const handleSelecionar = (resultado) => {
    navigate(resultado.url);
    onClose();
    setBusca("");
  };

  useEffect(() => {
    if (open) {
      setBusca("");
      setResultados([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Busca Global
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produtos, clientes, OS, vendas..."
              className="pl-10 h-12 text-lg"
              autoFocus
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-3 w-5 h-5 text-blue-600 animate-spin" />
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {resultados.length === 0 && busca && !buscando && (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold">Nenhum resultado encontrado</p>
                <p className="text-sm">Tente buscar por outro termo</p>
              </div>
            )}

            {resultados.length === 0 && !busca && (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold">Digite para buscar</p>
                <p className="text-sm">Produtos, clientes, OS, vendas e mais</p>
              </div>
            )}

            <div className="space-y-2">
              {resultados.map((resultado, index) => {
                const Icon = ICONES_TIPO[resultado.tipo];
                return (
                  <div
                    key={index}
                    onClick={() => handleSelecionar(resultado)}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border transition-all hover:border-blue-300"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CORES_TIPO[resultado.tipo]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{resultado.titulo}</p>
                      <p className="text-sm text-slate-500 truncate">{resultado.subtitulo}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {resultado.tipo}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t pt-3 text-xs text-slate-500 text-center">
            💡 Use <kbd className="px-2 py-1 bg-slate-100 rounded border">Ctrl + K</kbd> para abrir a busca rápida
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}