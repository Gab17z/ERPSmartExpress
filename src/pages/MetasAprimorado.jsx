import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy, TrendingUp, Zap, Settings, Award, Star, Crown, Medal } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function MetasAprimorado() {
  const [dialogMetas, setDialogMetas] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [metasConfig, setMetasConfig] = useState({
    vendas_loja: 50000,
    os_loja: 100,
    ticket_medio: 500,
    novos_clientes: 20
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data_venda'),
  });

  const { data: os = [] } = useQuery({
    queryKey: ['os'],
    queryFn: () => base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
  });

  React.useEffect(() => {
    // CRÍTICO: Try/catch para localStorage parse
    try {
      const metasSalvas = localStorage.getItem('metas_sistema');
      if (metasSalvas) {
        const parsed = JSON.parse(metasSalvas);
        // Validar que os valores são números positivos
        setMetasConfig({
          vendas_loja: Math.max(1, parsed.vendas_loja || 50000),
          os_loja: Math.max(1, parsed.os_loja || 100),
          ticket_medio: Math.max(1, parsed.ticket_medio || 500),
          novos_clientes: Math.max(1, parsed.novos_clientes || 20)
        });
      }
    } catch (error) {
      console.error("Erro ao carregar metas do localStorage:", error);
    }

    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser?.role === 'admin');
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const salvarMetas = () => {
    localStorage.setItem('metas_sistema', JSON.stringify(metasConfig));
    toast.success("Metas atualizadas!");
    setDialogMetas(false);
  };

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const vendasMes = vendas.filter(v => {
    const dataVenda = new Date(v.data_venda || v.created_date);
    return v.status === 'finalizada' && 
           dataVenda.getMonth() === mesAtual && 
           dataVenda.getFullYear() === anoAtual;
  });

  const osMes = os.filter(o => {
    const dataOS = new Date(o.data_entrada);
    return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
  });

  const clientesMes = clientes.filter(c => {
    const dataCadastro = new Date(c.created_date);
    return dataCadastro.getMonth() === mesAtual && dataCadastro.getFullYear() === anoAtual;
  });

  const totalVendasMes = vendasMes.reduce((sum, v) => sum + v.valor_total, 0);
  const ticketMedio = vendasMes.length > 0 ? totalVendasMes / vendasMes.length : 0;

  // CRÍTICO: Guard para divisão por zero em todas as metas
  const percentualVendas = metasConfig.vendas_loja > 0 ? (totalVendasMes / metasConfig.vendas_loja) * 100 : 0;
  const percentualOS = metasConfig.os_loja > 0 ? (osMes.length / metasConfig.os_loja) * 100 : 0;
  const percentualTicket = metasConfig.ticket_medio > 0 ? (ticketMedio / metasConfig.ticket_medio) * 100 : 0;
  const percentualClientes = metasConfig.novos_clientes > 0 ? (clientesMes.length / metasConfig.novos_clientes) * 100 : 0;

  // Ranking de vendedores
  const vendedoresRanking = {};
  vendasMes.forEach(venda => {
    const vendedor = venda.vendedor_nome || 'Sem vendedor';
    if (!vendedoresRanking[vendedor]) {
      vendedoresRanking[vendedor] = { nome: vendedor, vendas: 0, valor: 0 };
    }
    vendedoresRanking[vendedor].vendas += 1;
    vendedoresRanking[vendedor].valor += venda.valor_total;
  });

  const rankingArray = Object.values(vendedoresRanking)
    .sort((a, b) => b.valor - a.valor);

  // Ranking de técnicos
  const tecnicosRanking = {};
  osMes.forEach(ordem => {
    const tecnico = ordem.tecnico_responsavel || 'Sem técnico';
    if (!tecnicosRanking[tecnico]) {
      tecnicosRanking[tecnico] = { nome: tecnico, os: 0, concluidas: 0 };
    }
    tecnicosRanking[tecnico].os += 1;
    if (ordem.status === 'entregue') {
      tecnicosRanking[tecnico].concluidas += 1;
    }
  });

  const rankingTecnicos = Object.values(tecnicosRanking)
    .sort((a, b) => b.concluidas - a.concluidas);

  // Gamificação - Conquistas
  const conquistas = [
    { id: 1, nome: "Meta Vendas Batida", icone: Trophy, alcancado: percentualVendas >= 100, cor: "text-yellow-500" },
    { id: 2, nome: "Meta OS Batida", icone: Zap, alcancado: percentualOS >= 100, cor: "text-purple-500" },
    { id: 3, nome: "Ticket Médio Alto", icone: Award, alcancado: percentualTicket >= 100, cor: "text-blue-500" },
    { id: 4, nome: "Novos Clientes", icone: Star, alcancado: percentualClientes >= 100, cor: "text-green-500" },
  ];

  const conquistasAlcancadas = conquistas.filter(c => c.alcancado).length;

  const dadosGrafico = rankingArray.slice(0, 5).map(v => ({
    nome: v.nome.split(' ')[0],
    vendas: v.vendas,
    valor: v.valor
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Metas e Performance</h1>
          <p className="text-slate-500">Acompanhe metas e conquistas da equipe</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogMetas(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Metas
          </Button>
        </div>
      )}

      {/* Conquistas Gamificadas */}
      <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-600" />
            Conquistas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conquistas.map((conquista) => {
              const Icone = conquista.icone;
              return (
                <div
                  key={conquista.id}
                  className={`p-4 rounded-lg text-center transition-all ${
                    conquista.alcancado
                      ? 'bg-white border-2 border-green-400 shadow-lg scale-105'
                      : 'bg-slate-100 border-2 border-slate-200 opacity-50'
                  }`}
                >
                  <Icone className={`w-12 h-12 mx-auto mb-2 ${conquista.alcancado ? conquista.cor : 'text-slate-400'}`} />
                  <p className={`text-sm font-semibold ${conquista.alcancado ? 'text-slate-900' : 'text-slate-500'}`}>
                    {conquista.nome}
                  </p>
                  {conquista.alcancado && (
                    <Badge className="mt-2 bg-green-600">Desbloqueado!</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <p className="text-lg font-bold">
              {conquistasAlcancadas} de {conquistas.length} conquistas desbloqueadas
            </p>
            <Progress value={(conquistasAlcancadas / conquistas.length) * 100} className="h-3 mt-2" />
          </div>
        </CardContent>
      </Card>

      {/* Metas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Meta de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Realizado: R$ {totalVendasMes.toFixed(2)}</span>
              <span>Meta: R$ {metasConfig.vendas_loja.toFixed(2)}</span>
            </div>
            <Progress value={Math.min(percentualVendas, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-blue-600">{percentualVendas.toFixed(1)}%</span>
              {percentualVendas >= 100 && (
                <Badge className="bg-green-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Atingida!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Meta de OS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Realizado: {osMes.length} OS</span>
              <span>Meta: {metasConfig.os_loja} OS</span>
            </div>
            <Progress value={Math.min(percentualOS, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-purple-600">{percentualOS.toFixed(1)}%</span>
              {percentualOS >= 100 && (
                <Badge className="bg-green-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Atingida!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Realizado: R$ {ticketMedio.toFixed(2)}</span>
              <span>Meta: R$ {metasConfig.ticket_medio.toFixed(2)}</span>
            </div>
            <Progress value={Math.min(percentualTicket, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-green-600">{percentualTicket.toFixed(1)}%</span>
              {percentualTicket >= 100 && (
                <Badge className="bg-green-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Atingida!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500" />
              Novos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Realizado: {clientesMes.length}</span>
              <span>Meta: {metasConfig.novos_clientes}</span>
            </div>
            <Progress value={Math.min(percentualClientes, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-orange-600">{percentualClientes.toFixed(1)}%</span>
              {percentualClientes >= 100 && (
                <Badge className="bg-green-600">
                  <Trophy className="w-3 h-3 mr-1" />
                  Atingida!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance de Vendedores (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valor" fill="#3b82f6" name="Valor Total (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankingArray.slice(0, 10).map((vendedor, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${
                  idx === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400' :
                  idx === 1 ? 'bg-gradient-to-r from-slate-100 to-slate-50 border-2 border-slate-400' :
                  idx === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-400' :
                  'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                    idx === 1 ? 'bg-slate-300 text-slate-700' :
                    idx === 2 ? 'bg-orange-300 text-orange-900' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{vendedor.nome}</p>
                    <p className="text-sm text-slate-500">{vendedor.vendas} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R$ {vendedor.valor.toFixed(2)}</p>
                    {idx === 0 && <Medal className="w-5 h-5 text-yellow-600 ml-auto" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Ranking de Técnicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankingTecnicos.slice(0, 10).map((tecnico, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${
                  idx === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400' :
                  idx === 1 ? 'bg-gradient-to-r from-slate-100 to-slate-50 border-2 border-slate-400' :
                  idx === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-400' :
                  'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                    idx === 1 ? 'bg-slate-300 text-slate-700' :
                    idx === 2 ? 'bg-orange-300 text-orange-900' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{tecnico.nome}</p>
                    <p className="text-sm text-slate-500">{tecnico.concluidas}/{tecnico.os} concluídas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{tecnico.concluidas} OS</p>
                    {tecnico.os > 0 && (
                      <p className="text-xs text-slate-500">{((tecnico.concluidas/tecnico.os)*100).toFixed(0)}% taxa</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={dialogMetas} onOpenChange={setDialogMetas}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Metas Mensais</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meta de Vendas (R$)</Label>
              <Input
                type="number"
                value={metasConfig.vendas_loja}
                onChange={(e) => setMetasConfig({...metasConfig, vendas_loja: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Meta de OS (Quantidade)</Label>
              <Input
                type="number"
                value={metasConfig.os_loja}
                onChange={(e) => setMetasConfig({...metasConfig, os_loja: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Ticket Médio Desejado (R$)</Label>
              <Input
                type="number"
                value={metasConfig.ticket_medio}
                onChange={(e) => setMetasConfig({...metasConfig, ticket_medio: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Novos Clientes no Mês</Label>
              <Input
                type="number"
                value={metasConfig.novos_clientes}
                onChange={(e) => setMetasConfig({...metasConfig, novos_clientes: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMetas(false)}>Cancelar</Button>
            <Button onClick={salvarMetas} className="bg-blue-600">Salvar Metas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes de Performance do Mês</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="vendas">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="os">Ordens</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
            </TabsList>
            <TabsContent value="vendas" className="space-y-3">
              <p><strong>Total de Vendas:</strong> {vendasMes.length}</p>
              <p><strong>Valor Total:</strong> R$ {totalVendasMes.toFixed(2)}</p>
              <p><strong>Ticket Médio:</strong> R$ {ticketMedio.toFixed(2)}</p>
              <p><strong>Maior Venda:</strong> R$ {Math.max(...vendasMes.map(v => v.valor_total), 0).toFixed(2)}</p>
            </TabsContent>
            <TabsContent value="os" className="space-y-3">
              <p><strong>Total de OS:</strong> {osMes.length}</p>
              <p><strong>OS Concluídas:</strong> {osMes.filter(o => o.status === 'entregue').length}</p>
              <p><strong>Taxa de Conclusão:</strong> {osMes.length > 0 ? ((osMes.filter(o => o.status === 'entregue').length / osMes.length) * 100).toFixed(1) : 0}%</p>
              <p><strong>Em Andamento:</strong> {osMes.filter(o => !['entregue', 'cancelado'].includes(o.status)).length}</p>
            </TabsContent>
            <TabsContent value="clientes" className="space-y-3">
              <p><strong>Novos Clientes:</strong> {clientesMes.length}</p>
              <p><strong>Total de Clientes:</strong> {clientes.length}</p>
              <p><strong>Crescimento:</strong> {clientes.length > 0 ? ((clientesMes.length / clientes.length) * 100).toFixed(1) : 0}%</p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}