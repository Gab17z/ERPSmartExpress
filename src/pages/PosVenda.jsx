import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertTriangle, Phone, MessageSquare, Mail, TrendingDown, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
import ClienteHistorico from "@/components/marketing/ClienteHistorico";
import { useLoja } from "@/contexts/LojaContext";

export default function PosVenda() {
  const { lojaFiltroId } = useLoja();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroInatividade, setFiltroInatividade] = useState("todos");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dialogHistorico, setDialogHistorico] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }, { order: 'nome_completo' })
      : base44.entities.Cliente.list('nome_completo'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-data_venda' })
      : base44.entities.Venda.list('-data_venda'),
  });

  const clientesComUltimaCompra = useMemo(() => {
    return clientes.map(cliente => {
      const comprasCliente = vendas
        .filter(v => v.cliente_id === cliente.id && v.status === 'finalizada')
        .sort((a, b) => {
          const dataA = a.data_venda ? new Date(a.data_venda) : new Date(0);
          const dataB = b.data_venda ? new Date(b.data_venda) : new Date(0);
          return dataB - dataA;
        });

      const ultimaCompra = comprasCliente[0];
      const totalCompras = comprasCliente.length;
      const valorTotal = comprasCliente.reduce((sum, v) => sum + (v.valor_total || 0), 0);

      let diasSemComprar = null;
      let statusInatividade = "ativo";
      let corStatus = "green";

      if (ultimaCompra && ultimaCompra.data_venda) {
        try {
          const dataVenda = parseISO(ultimaCompra.data_venda);
          if (isValid(dataVenda)) {
            diasSemComprar = differenceInDays(new Date(), dataVenda);
            
            if (diasSemComprar > 90) {
              statusInatividade = "critico";
              corStatus = "red";
            } else if (diasSemComprar > 60) {
              statusInatividade = "alerta";
              corStatus = "orange";
            } else if (diasSemComprar > 30) {
              statusInatividade = "atencao";
              corStatus = "yellow";
            }
          }
        } catch (error) {
          console.error(`Erro ao processar data de venda para ${cliente.nome_completo}:`, error);
        }
      } else {
        statusInatividade = "sem_compra";
        corStatus = "slate";
      }

      return {
        ...cliente,
        ultimaCompra,
        diasSemComprar,
        totalCompras,
        valorTotal,
        statusInatividade,
        corStatus
      };
    }).sort((a, b) => (b.diasSemComprar || 0) - (a.diasSemComprar || 0));
  }, [clientes, vendas]);

  const clientesFiltrados = useMemo(() => {
    let filtrados = clientesComUltimaCompra;

    if (filtroInatividade !== "todos") {
      filtrados = filtrados.filter(c => c.statusInatividade === filtroInatividade);
    }

    if (searchTerm) {
      filtrados = filtrados.filter(c =>
        c.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtrados;
  }, [clientesComUltimaCompra, filtroInatividade, searchTerm]);

  const clientesCriticos = clientesComUltimaCompra.filter(c => c.statusInatividade === "critico");
  const clientesAlerta = clientesComUltimaCompra.filter(c => c.statusInatividade === "alerta");
  const clientesAtencao = clientesComUltimaCompra.filter(c => c.statusInatividade === "atencao");
  const clientesSemCompra = clientesComUltimaCompra.filter(c => c.statusInatividade === "sem_compra");

  const enviarMensagemRetencao = (cliente) => {
    const mensagem = `Olá ${cliente.nome_completo}! 😊\n\nNotamos que faz algum tempo que você não nos visita.\n\nTemos novidades e promoções especiais esperando por você!\n\nVenha nos fazer uma visita! 📱\n\nEquipe Smart Express`;
    
    const telefone = cliente.telefone1?.replace(/\D/g, '') || '';
    if (telefone) {
      const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, '_blank');
    } else {
      toast.error("Cliente sem telefone cadastrado");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pós-Venda e Retenção</h1>
        <p className="text-slate-500">Monitore clientes inativos e faça ações de retenção</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Críticos (+90 dias)</p>
                <p className="text-2xl font-bold text-red-600">{clientesCriticos.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Alerta (60-90 dias)</p>
                <p className="text-2xl font-bold text-orange-600">{clientesAlerta.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Atenção (30-60 dias)</p>
                <p className="text-2xl font-bold text-yellow-600">{clientesAtencao.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Sem Compras</p>
                <p className="text-2xl font-bold text-slate-600">{clientesSemCompra.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-64"
            />
            <select
              value={filtroInatividade}
              onChange={(e) => setFiltroInatividade(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="todos">Todos os Status</option>
              <option value="critico">Críticos (+90 dias)</option>
              <option value="alerta">Alerta (60-90 dias)</option>
              <option value="atencao">Atenção (30-60 dias)</option>
              <option value="sem_compra">Nunca Compraram</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <div className="space-y-3">
        {clientesFiltrados.map(cliente => {
          const cores = {
            critico: { bg: "bg-red-50", border: "border-red-500", text: "text-red-700", badge: "bg-red-100" },
            alerta: { bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-700", badge: "bg-orange-100" },
            atencao: { bg: "bg-yellow-50", border: "border-yellow-500", text: "text-yellow-700", badge: "bg-yellow-100" },
            ativo: { bg: "bg-green-50", border: "border-green-500", text: "text-green-700", badge: "bg-green-100" },
            sem_compra: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", badge: "bg-slate-100" }
          };

          const cor = cores[cliente.statusInatividade] || cores.ativo;

          return (
            <Card key={cliente.id} className={`border-l-4 ${cor.border} ${cor.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{cliente.nome_completo}</h3>
                      <Badge className={cor.badge}>
                        {cliente.statusInatividade === "critico" && "⚠️ Crítico"}
                        {cliente.statusInatividade === "alerta" && "⏰ Alerta"}
                        {cliente.statusInatividade === "atencao" && "👀 Atenção"}
                        {cliente.statusInatividade === "ativo" && "✅ Ativo"}
                        {cliente.statusInatividade === "sem_compra" && "🆕 Sem Compras"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Última Compra:</p>
                        <p className="font-semibold">
                          {cliente.totalCompras > 0 && cliente.ultimaCompra?.data_venda
                            ? format(parseISO(cliente.ultimaCompra.data_venda), 'dd/MM/yyyy')
                            : "Nunca comprou"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Dias sem Comprar:</p>
                        <p className={`font-semibold ${cor.text}`}>
                          {cliente.diasSemComprar !== null ? `${cliente.diasSemComprar} dias` : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total de Compras:</p>
                        <p className="font-semibold">{cliente.totalCompras}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Valor Total Gasto:</p>
                        <p className="font-semibold text-green-600">
                          R$ {cliente.valorTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{cliente.telefone1}</span>
                      {cliente.email && (
                        <>
                          <Mail className="w-4 h-4 ml-3" />
                          <span>{cliente.email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => enviarMensagemRetencao(cliente)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contatar
                    </Button>
                    <Button 
                      onClick={() => { setClienteSelecionado(cliente); setDialogHistorico(true); }}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Histórico
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {clientesFiltrados.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <TrendingDown className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p>Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      <ClienteHistorico
        cliente={clienteSelecionado}
        vendas={vendas}
        open={dialogHistorico}
        onClose={() => setDialogHistorico(false)}
      />
    </div>
  );
}