import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Wrench, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardLoja({ loja, vendas, os, produtos }) {
  const vendasLoja = vendas.filter(v => v.loja_id === loja.id && v.status === 'finalizada');
  const osLoja = os.filter(o => o.loja_id === loja.id);

  const faturamento = vendasLoja.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
  const ticketMedio = vendasLoja.length > 0 ? faturamento / vendasLoja.length : 0;

  const osPendentes = osLoja.filter(o => ['recebido', 'em_diagnostico', 'aguardando_aprovacao', 'em_conserto'].includes(o.status));
  const osProntas = osLoja.filter(o => o.status === 'pronto');

  const produtosLoja = produtos.map(p => {
    const estoqueLoja = p.estoque_por_loja?.find(e => e.loja_id === loja.id);
    return {
      ...p,
      estoque_loja: estoqueLoja?.quantidade || 0
    };
  });

  const produtosBaixos = produtosLoja.filter(p => p.estoque_loja <= p.estoque_minimo && p.ativo);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Faturamento</p>
              <p className="text-xl font-bold">R$ {faturamento.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{vendasLoja.length} vendas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ticket Médio</p>
              <p className="text-xl font-bold">R$ {ticketMedio.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ordens de Serviço</p>
              <p className="text-xl font-bold">{osLoja.length}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">{osPendentes.length} abertas</Badge>
                <Badge className="text-xs bg-green-600">{osProntas.length} prontas</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Estoque Baixo</p>
              <p className="text-xl font-bold">{produtosBaixos.length}</p>
              <p className="text-xs text-slate-500">produtos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}