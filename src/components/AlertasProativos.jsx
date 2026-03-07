import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Clock, Users, Wrench } from "lucide-react";
import { createPageUrl } from "@/utils";
import { differenceInDays, parseISO, isBefore, startOfDay } from "date-fns";

export default function AlertasProativos() {
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    refetchInterval: 60000
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: async () => {
      try {
        return await base44.entities.ContaPagar.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 60000
  });

  const { data: os = [] } = useQuery({
    queryKey: ['os'],
    queryFn: () => base44.entities.OrdemServico.list(),
    refetchInterval: 60000
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list(),
    refetchInterval: 60000
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    refetchInterval: 60000
  });

  const hoje = startOfDay(new Date());

  // Estoque Crítico
  const produtosCriticos = produtos.filter(p => 
    p.ativo !== false && p.estoque_atual <= p.estoque_minimo
  );

  // Contas vencendo em 3 dias
  const contasVencendo = contasPagar.filter(c => {
    if (c.situacao === "pago") return false;
    try {
      const vencimento = startOfDay(parseISO(c.data_vencimento));
      const diasRestantes = differenceInDays(vencimento, hoje);
      return diasRestantes >= 0 && diasRestantes <= 3;
    } catch {
      return false;
    }
  });

  // OS Atrasadas
  const osAtrasadas = os.filter(o => {
    if (!['em_conserto', 'aguardando_pecas', 'em_diagnostico'].includes(o.status)) return false;
    if (!o.data_prevista) return false;
    try {
      const prevista = startOfDay(parseISO(o.data_prevista));
      return isBefore(prevista, hoje);
    } catch {
      return false;
    }
  });

  // Clientes Inativos (90+ dias sem comprar)
  const clientesInativos = clientes.filter(cliente => {
    const vendasCliente = vendas.filter(v => v.cliente_id === cliente.id && v.status === 'finalizada');
    if (vendasCliente.length === 0) return false;

    const ultimaVenda = vendasCliente.sort((a, b) => 
      new Date(b.data_venda) - new Date(a.data_venda)
    )[0];

    try {
      const diasSemComprar = differenceInDays(hoje, parseISO(ultimaVenda.data_venda));
      return diasSemComprar >= 90;
    } catch {
      return false;
    }
  });

  const alertas = [
    {
      tipo: "estoque",
      titulo: "Produtos com Estoque Crítico",
      quantidade: produtosCriticos.length,
      cor: "red",
      icon: Package,
      link: createPageUrl("Produtos"),
      itens: produtosCriticos.slice(0, 5).map(p => `${p.nome} (${p.estoque_atual} un)`)
    },
    {
      tipo: "contas",
      titulo: "Contas Vencendo em 3 Dias",
      quantidade: contasVencendo.length,
      cor: "orange",
      icon: Clock,
      link: createPageUrl("ContasPagar"),
      itens: contasVencendo.slice(0, 5).map(c => `${c.fornecedor_nome} - R$ ${c.valor_total.toFixed(2)}`)
    },
    {
      tipo: "os",
      titulo: "Ordens de Serviço Atrasadas",
      quantidade: osAtrasadas.length,
      cor: "purple",
      icon: Wrench,
      link: createPageUrl("OrdensServico"),
      itens: osAtrasadas.slice(0, 5).map(o => `${o.codigo_os} - ${o.cliente_nome}`)
    },
    {
      tipo: "clientes",
      titulo: "Clientes Inativos (90+ dias)",
      quantidade: clientesInativos.length,
      cor: "blue",
      icon: Users,
      link: createPageUrl("Clientes"),
      itens: clientesInativos.slice(0, 5).map(c => c.nome_completo)
    }
  ];

  const totalAlertas = alertas.reduce((sum, a) => sum + a.quantidade, 0);

  if (totalAlertas === 0) return null;

  return (
    <Card className="border-l-4 border-l-red-500 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="font-bold text-lg">⚠️ Alertas Proativos ({totalAlertas})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {alertas.filter(a => a.quantidade > 0).map((alerta) => {
            const Icon = alerta.icon;
            const cores = {
              red: "border-red-500 bg-red-50",
              orange: "border-orange-500 bg-orange-50",
              purple: "border-purple-500 bg-purple-50",
              blue: "border-blue-500 bg-blue-50"
            };

            return (
              <a
                key={alerta.tipo}
                href={alerta.link}
                className={`border-l-4 ${cores[alerta.cor]} p-4 rounded-lg hover:shadow-lg transition-shadow cursor-pointer`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 text-${alerta.cor}-600`} />
                  <div>
                    <p className="font-semibold text-sm">{alerta.titulo}</p>
                    <Badge className={`bg-${alerta.cor}-600 mt-1`}>{alerta.quantidade}</Badge>
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  {alerta.itens.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                  {alerta.quantidade > 5 && (
                    <li className="font-semibold">... e mais {alerta.quantidade - 5}</li>
                  )}
                </ul>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}