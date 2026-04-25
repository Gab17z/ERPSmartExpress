import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLoja } from "@/contexts/LojaContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Previsoes() {
  const { lojaFiltroId } = useLoja();
  const [previsoes, setPrevisoes] = useState([]);

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas-previsao', lojaFiltroId],
    queryFn: () => lojaFiltroId 
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date', limit: 365 })
      : base44.entities.Venda.list('-created_date', 365),
  });

  useEffect(() => {
    if (vendas.length > 0) {
      calcularPrevisoes();
    }
  }, [vendas]);

  const calcularPrevisoes = () => {
    const vendasPorMes = {};

    // CRÍTICO: Previsões com validação
    vendas.forEach(venda => {
      if (venda.status !== 'finalizada') return;
      const mes = new Date(venda.created_date).toISOString().slice(0, 7);
      vendasPorMes[mes] = (vendasPorMes[mes] || 0) + (parseFloat(venda.valor_total) || 0);
    });

    const meses = Object.keys(vendasPorMes).sort();
    const valores = meses.map(m => vendasPorMes[m]);

    // CRÍTICO: Guard para divisão por zero
    if (valores.length === 0) {
      setPrevisoes({});
      return;
    }

    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const tendencia = valores.length > 1
      ? (valores[valores.length - 1] - valores[0]) / valores.length
      : 0;

    const proximosMeses = [];
    const hoje = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = data.toISOString().slice(0, 7);
      const previsao = media + (tendencia * (valores.length + i));
      
      proximosMeses.push({
        mes,
        valor_previsto: Math.max(0, previsao),
        confianca: Math.max(60, 100 - (i * 10))
      });
    }

    const dadosGrafico = [
      ...meses.slice(-6).map(mes => ({
        mes: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        real: vendasPorMes[mes],
        tipo: 'real'
      })),
      ...proximosMeses.map(p => ({
        mes: new Date(p.mes + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        previsto: p.valor_previsto,
        tipo: 'previsao'
      }))
    ];

    setPrevisoes({ proximosMeses, dadosGrafico, tendencia });
  };

  if (!previsoes.proximosMeses) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dados Insuficientes</h3>
            <p className="text-slate-500">
              É necessário ter histórico de vendas para gerar previsões
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Previsões de Vendas
        </h1>
        <p className="text-slate-500">Análise preditiva baseada em histórico</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {previsoes.proximosMeses.map((prev, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                {new Date(prev.mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {prev.valor_previsto.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">Previsão de Vendas</p>
                </div>
                <Badge variant={prev.confianca > 80 ? "default" : "secondary"}>
                  {prev.confianca}% de confiança
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico vs Previsão</CardTitle>
            <Badge variant={previsoes.tendencia > 0 ? "default" : "destructive"}>
              {previsoes.tendencia > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {previsoes.tendencia > 0 ? 'Crescimento' : 'Queda'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={previsoes.dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value?.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} name="Real" />
              <Line type="monotone" dataKey="previsto" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Previsto" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}