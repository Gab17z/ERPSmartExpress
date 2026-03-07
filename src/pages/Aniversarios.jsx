import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Cake, Phone, Mail, MessageSquare, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, isValid, startOfDay } from "date-fns";
import ClienteHistorico from "@/components/marketing/ClienteHistorico";

export default function Aniversarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dialogHistorico, setDialogHistorico] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const clientesComAniversario = useMemo(() => {
    return clientes
      .filter(c => c.data_nascimento && c.data_nascimento.trim() !== "")
      .map(cliente => {
        try {
          const hoje = new Date();
          const anoAtual = hoje.getFullYear();
          
          // Tentar fazer parse da data
          let dataNascimento;
          if (typeof cliente.data_nascimento === 'string' && cliente.data_nascimento.includes('-')) {
            const [ano, mes, dia] = cliente.data_nascimento.split('-').map(n => parseInt(n));
            dataNascimento = new Date(ano, mes - 1, dia);
          } else {
            dataNascimento = parseISO(cliente.data_nascimento);
          }

          // Validar se a data é válida
          if (!isValid(dataNascimento)) {
            console.warn(`Data inválida para cliente ${cliente.nome_completo}:`, cliente.data_nascimento);
            return null;
          }

          const mesNascimento = dataNascimento.getMonth();
          const diaNascimento = dataNascimento.getDate();
          
          const proximoAniversario = new Date(anoAtual, mesNascimento, diaNascimento);

          // CORREÇÃO: Normalizar datas para comparação (ignorar horas)
          const hojeNormalizado = startOfDay(hoje);
          const proximoAniversarioNormalizado = startOfDay(proximoAniversario);

          // Se já passou, considerar próximo ano
          if (proximoAniversarioNormalizado < hojeNormalizado) {
            proximoAniversario.setFullYear(anoAtual + 1);
          }

          const diasAte = differenceInDays(startOfDay(proximoAniversario), hojeNormalizado);
          // CORREÇÃO: Calcular idade corretamente considerando se já fez aniversário no ano
          let idade = anoAtual - dataNascimento.getFullYear();
          if (diasAte > 0) {
            // Se ainda não fez aniversário no ano atual, subtrai 1
            idade = idade - 1;
          }
          const mesAniversario = mesNascimento + 1; // 1-12

          return {
            ...cliente,
            proximoAniversario,
            diasAte,
            idade,
            mesAniversario,
            diaAniversario: diaNascimento
          };
        } catch (error) {
          console.error(`Erro ao processar data de ${cliente.nome_completo}:`, error);
          return null;
        }
      })
      .filter(c => c !== null)
      .sort((a, b) => a.diasAte - b.diasAte);
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    let filtrados = clientesComAniversario;

    if (filtroMes !== "todos") {
      filtrados = filtrados.filter(c => c.mesAniversario === parseInt(filtroMes));
    }

    if (searchTerm) {
      filtrados = filtrados.filter(c => 
        c.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtrados;
  }, [clientesComAniversario, filtroMes, searchTerm]);

  const aniversariantesHoje = clientesComAniversario.filter(c => c.diasAte === 0);
  const aniversariantesProximos7Dias = clientesComAniversario.filter(c => c.diasAte > 0 && c.diasAte <= 7);
  const aniversariantesProximos30Dias = clientesComAniversario.filter(c => c.diasAte > 7 && c.diasAte <= 30);

  const enviarMensagem = async (cliente, tipo) => {
    const mensagem = tipo === 'whatsapp' 
      ? `Olá ${cliente.nome_completo}! 🎉\n\nParabéns pelo seu aniversário! 🎂\n\nQue este novo ano de vida seja repleto de alegrias e conquistas!\n\nEquipe Smart Express`
      : `Parabéns, ${cliente.nome_completo}! Desejamos um feliz aniversário!`;

    if (tipo === 'whatsapp') {
      const telefone = cliente.telefone1?.replace(/\D/g, '') || '';
      if (telefone) {
        const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
      } else {
        toast.error("Cliente sem telefone cadastrado");
      }
    } else if (tipo === 'email' && cliente.email) {
      toast.success(`Email de aniversário enviado para ${cliente.nome_completo}!`);
    }
  };

  const meses = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Aniversários de Clientes</h1>
        <p className="text-slate-500">Gerencie e parabenize seus clientes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Aniversariantes Hoje</p>
                <p className="text-3xl font-bold text-green-600">{aniversariantesHoje.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Cake className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Próximos 7 Dias</p>
                <p className="text-3xl font-bold text-blue-600">{aniversariantesProximos7Dias.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Próximos 30 Dias</p>
                <p className="text-3xl font-bold text-purple-600">{aniversariantesProximos30Dias.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
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
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="todos">Todos os Meses</option>
              {meses.map(mes => (
                <option key={mes.value} value={mes.value}>{mes.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por Período */}
      <Tabs defaultValue="proximos">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="hoje">Hoje ({aniversariantesHoje.length})</TabsTrigger>
          <TabsTrigger value="proximos">Próximos ({aniversariantesProximos7Dias.length})</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-3 mt-4">
          {aniversariantesHoje.map(cliente => (
            <Card key={cliente.id} className="border-2 border-green-500 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Cake className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{cliente.nome_completo}</h3>
                      <p className="text-sm text-slate-600">
                        {cliente.idade} anos • {cliente.telefone1}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => enviarMensagem(cliente, 'whatsapp')} className="bg-green-600">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button onClick={() => { setClienteSelecionado(cliente); setDialogHistorico(true); }} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Histórico
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {aniversariantesHoje.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Cake className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhum aniversariante hoje</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximos" className="space-y-3 mt-4">
          {aniversariantesProximos7Dias.map(cliente => (
            <Card key={cliente.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                        <span className="text-xl font-bold text-blue-600">{cliente.diaAniversario}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {cliente.diasAte} dia{cliente.diasAte !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{cliente.nome_completo}</h3>
                      <p className="text-sm text-slate-600">
                        Fará {cliente.idade} anos • {cliente.telefone1}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => enviarMensagem(cliente, 'whatsapp')} size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button onClick={() => { setClienteSelecionado(cliente); setDialogHistorico(true); }} size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {aniversariantesProximos7Dias.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhum aniversário nos próximos 7 dias</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <div className="space-y-3">
            {clientesFiltrados.map(cliente => (
              <Card key={cliente.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-1">
                          <span className="text-sm font-bold text-slate-700">{cliente.diaAniversario}/{cliente.mesAniversario}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {cliente.diasAte} dias
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold">{cliente.nome_completo}</h3>
                        <p className="text-sm text-slate-600">
                          {cliente.idade} anos • {cliente.telefone1}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={() => enviarMensagem(cliente, 'whatsapp')} size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => { setClienteSelecionado(cliente); setDialogHistorico(true); }} size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {clientesFiltrados.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Nenhum aniversário encontrado</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ClienteHistorico
        cliente={clienteSelecionado}
        vendas={vendas}
        open={dialogHistorico}
        onClose={() => setDialogHistorico(false)}
      />
    </div>
  );
}