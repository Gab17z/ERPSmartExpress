import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot, MessageSquare, Clock, ListOrdered, Zap, Settings, Save, Plus, Trash2, Edit,
  Play, Pause, Send, Eye, RefreshCw, Brain, Sparkles, Target, TrendingUp, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca", label: "Terça-feira" },
  { key: "quarta", label: "Quarta-feira" },
  { key: "quinta", label: "Quinta-feira" },
  { key: "sexta", label: "Sexta-feira" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" }
];

const ACOES_MENU = [
  { value: "responder", label: "Responder mensagem", icon: MessageSquare, desc: "Envia uma resposta automática" },
  { value: "transferir", label: "Transferir para atendente", icon: Send, desc: "Encaminha para um humano" },
  { value: "consultar_produto", label: "Consultar produto", icon: Target, desc: "Busca produtos no catálogo" },
  { value: "consultar_os", label: "Consultar OS", icon: Settings, desc: "Verifica status de OS" },
  { value: "agendar", label: "Agendar horário", icon: Clock, desc: "Agenda serviço" },
  { value: "orcamento", label: "Solicitar orçamento", icon: TrendingUp, desc: "Cria orçamento" }
];

const CONFIG_PADRAO = {
  ativo: false,
  nome_bot: "Assistente Smart Express",
  personalidade: "profissional_amigavel",
  mensagem_boas_vindas: "👋 Olá! Seja bem-vindo(a) à *Smart Express*!\n\nSou seu assistente virtual e estou aqui para ajudar.\n\n📱 Escolha uma opção digitando o número:",
  mensagem_fora_horario: "🕐 No momento estamos *fora do horário* de atendimento.\n\n⏰ *Horário de funcionamento:*\nSegunda a Sexta: 09h às 18h\nSábado: 09h às 13h\n\nDeixe sua mensagem que retornaremos assim que possível!",
  horario_atendimento: {
    segunda: { ativo: true, inicio: "09:00", fim: "18:00" },
    terca: { ativo: true, inicio: "09:00", fim: "18:00" },
    quarta: { ativo: true, inicio: "09:00", fim: "18:00" },
    quinta: { ativo: true, inicio: "09:00", fim: "18:00" },
    sexta: { ativo: true, inicio: "09:00", fim: "18:00" },
    sabado: { ativo: true, inicio: "09:00", fim: "13:00" },
    domingo: { ativo: false, inicio: "09:00", fim: "13:00" }
  },
  menu_opcoes: [
    { numero: "1", titulo: "📱 Produtos e Serviços", resposta: "Confira o que oferecemos:\n\n📱 *Celulares novos e seminovos*\n🔧 *Assistência técnica especializada*\n📦 *Acessórios originais*\n💰 *Avaliação de aparelhos*\n\nO que você procura?", acao: "consultar_produto" },
    { numero: "2", titulo: "🔧 Assistência Técnica", resposta: "Para assistência técnica, me informe:\n\n1️⃣ *Modelo do aparelho*\n2️⃣ *Problema apresentado*\n3️⃣ *Seu nome completo*\n\nNosso técnico irá avaliar e enviar o orçamento!", acao: "orcamento" },
    { numero: "3", titulo: "📦 Status da minha OS", resposta: "Para consultar sua ordem de serviço, informe o *código da OS* (ex: OS-001234) ou seu *CPF/telefone*.", acao: "consultar_os" },
    { numero: "4", titulo: "📍 Localização e Horário", resposta: "📍 *Endereço:*\n[Configure em Configurações > Empresa]\n\n⏰ *Horário de funcionamento:*\nSegunda a Sexta: 09h às 18h\nSábado: 09h às 13h\nDomingo: Fechado", acao: "responder" },
    { numero: "5", titulo: "💬 Falar com Atendente", resposta: "✅ Certo! Vou transferir você para um de nossos atendentes.\n\n⏳ Aguarde um momento...", acao: "transferir" }
  ],
  palavras_chave: [
    { palavras: ["preço", "valor", "quanto custa", "orçamento", "quanto é"], resposta: "Para informar o valor exato, preciso saber qual produto ou serviço você procura. Pode me dar mais detalhes? 😊", prioridade: 1 },
    { palavras: ["conserto", "reparo", "quebrou", "não liga", "tela", "defeito"], resposta: "Para orçamento de *reparo*, informe:\n\n📱 Modelo do aparelho\n🔧 Problema apresentado\n👤 Seu nome\n\nNosso técnico irá avaliar!", prioridade: 1 },
    { palavras: ["obrigado", "obrigada", "valeu", "agradeço", "thanks"], resposta: "Por nada! 😊 Estamos sempre à disposição!", prioridade: 2 },
    { palavras: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "opa"], resposta: null, prioridade: 3 }
  ],
  respostas_rapidas: [
    { atalho: "/preco", titulo: "Consulta de preço", mensagem: "💰 Para consultar o preço, por favor informe o *modelo exato* do produto que você procura." },
    { atalho: "/horario", titulo: "Horário de funcionamento", mensagem: "⏰ *Horário de funcionamento:*\n\n📅 Segunda a Sexta: 09h às 18h\n📅 Sábado: 09h às 13h\n📅 Domingo: Fechado" },
    { atalho: "/aguarde", titulo: "Aguarde atendimento", mensagem: "⏳ Obrigado pelo contato! Um atendente irá responder em breve." },
    { atalho: "/endereco", titulo: "Endereço da loja", mensagem: "📍 *Nosso endereço:*\n[Configure em Configurações > Empresa]" }
  ],
  tempo_espera_transferencia: 60,
  mensagem_transferencia: "🙋 Um de nossos colaboradores irá atendê-lo em instantes. Obrigado pela paciência! 🙏",
  coletar_dados_cliente: true,
  dados_a_coletar: ["nome", "telefone", "email"],
  usar_ia_avancada: false,
  contexto_ia: "Você é um assistente de uma loja de celulares. Seja prestativo e objetivo.",
  temperatura_ia: 0.7,
  max_tokens_resposta: 150,
  detectar_intencao: true,
  aprendizado_continuo: false
};

export default function ChatbotConfig() {
  const { lojaFiltroId } = useLoja();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [dialogMenu, setDialogMenu] = useState(false);
  const [dialogPalavra, setDialogPalavra] = useState(false);
  const [dialogResposta, setDialogResposta] = useState(false);
  const [dialogPreview, setDialogPreview] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [novoItem, setNovoItem] = useState({});
  const [mensagemTeste, setMensagemTeste] = useState("");
  const [conversaTeste, setConversaTeste] = useState([]);
  // CORREÇÃO: Estado para prevenir saves simultâneos (race condition)
  const [isSaving, setIsSaving] = useState(false);

  const { data: configSalva, isLoading } = useQuery({
    queryKey: ['chatbot-config', lojaFiltroId],
    queryFn: async () => {
      const configs = lojaFiltroId
        ? await base44.entities.ChatbotConfig.filter({ loja_id: lojaFiltroId })
        : await base44.entities.ChatbotConfig.list();
      return configs[0] || null;
    }
  });

  useEffect(() => {
    if (configSalva) {
      // CORREÇÃO: Migração robusta de config garantindo arrays válidos
      const configMigrada = {
        ...CONFIG_PADRAO,
        ...configSalva,
        // Garantir que arrays são arrays válidos, não null/undefined
        menu_opcoes: Array.isArray(configSalva.menu_opcoes) && configSalva.menu_opcoes.length > 0
          ? configSalva.menu_opcoes
          : CONFIG_PADRAO.menu_opcoes,
        palavras_chave: Array.isArray(configSalva.palavras_chave) && configSalva.palavras_chave.length > 0
          ? configSalva.palavras_chave
          : CONFIG_PADRAO.palavras_chave,
        respostas_rapidas: Array.isArray(configSalva.respostas_rapidas) && configSalva.respostas_rapidas.length > 0
          ? configSalva.respostas_rapidas
          : CONFIG_PADRAO.respostas_rapidas,
        // Garantir que horario_atendimento tem todos os dias
        horario_atendimento: {
          ...CONFIG_PADRAO.horario_atendimento,
          ...(configSalva.horario_atendimento || {})
        }
      };
      setConfig(configMigrada);
    }
  }, [configSalva]);

  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const dadosComLoja = { ...dados, loja_id: lojaFiltroId || null };
      if (configSalva?.id) {
        return base44.entities.ChatbotConfig.update(configSalva.id, dadosComLoja);
      } else {
        return base44.entities.ChatbotConfig.create(dadosComLoja);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-config'] });
      toast.success("✅ Configurações salvas!");
      // CORREÇÃO: Liberar lock após sucesso
      setIsSaving(false);
    },
    onError: () => {
      toast.error("❌ Erro ao salvar configurações");
      // CORREÇÃO: Liberar lock após erro também
      setIsSaving(false);
    }
  });

  const handleSalvar = () => {
    // CORREÇÃO: Prevenir saves simultâneos (race condition)
    if (isSaving || salvarMutation.isPending) {
      toast.warning("⏳ Salvando... aguarde.");
      return;
    }
    setIsSaving(true);
    salvarMutation.mutate(config);
  };

  const handleHorarioChange = (dia, campo, valor) => {
    setConfig(prev => ({
      ...prev,
      horario_atendimento: {
        ...prev.horario_atendimento,
        [dia]: {
          ...prev.horario_atendimento[dia],
          [campo]: valor
        }
      }
    }));
  };

  const adicionarItemMenu = () => {
    const novoNumero = String(config.menu_opcoes.length + 1);
    setNovoItem({ numero: novoNumero, titulo: "", resposta: "", acao: "responder" });
    setItemEditando(null);
    setDialogMenu(true);
  };

  const editarItemMenu = (item, index) => {
    setNovoItem({ ...item });
    setItemEditando(index);
    setDialogMenu(true);
  };

  const salvarItemMenu = () => {
    if (!novoItem.titulo || !novoItem.resposta) {
      toast.error("Preencha todos os campos!");
      return;
    }
    
    let novaLista;
    if (itemEditando !== null) {
      novaLista = [...config.menu_opcoes];
      novaLista[itemEditando] = novoItem;
    } else {
      novaLista = [...config.menu_opcoes, novoItem];
    }
    
    setConfig(prev => ({ ...prev, menu_opcoes: novaLista }));
    setDialogMenu(false);
    setNovoItem({});
    toast.success("✅ Item salvo!");
  };

  const removerItemMenu = (index) => {
    const novaLista = config.menu_opcoes.filter((_, i) => i !== index);
    novaLista.forEach((item, i) => item.numero = String(i + 1));
    setConfig(prev => ({ ...prev, menu_opcoes: novaLista }));
    toast.success("Item removido!");
  };

  const adicionarPalavraChave = () => {
    setNovoItem({ palavras: [], resposta: "", prioridade: 1 });
    setItemEditando(null);
    setDialogPalavra(true);
  };

  const salvarPalavraChave = () => {
    if (!novoItem.palavras?.length) {
      toast.error("Adicione pelo menos uma palavra-chave!");
      return;
    }
    
    let novaLista;
    if (itemEditando !== null) {
      novaLista = [...config.palavras_chave];
      novaLista[itemEditando] = novoItem;
    } else {
      novaLista = [...config.palavras_chave, novoItem];
    }
    
    setConfig(prev => ({ ...prev, palavras_chave: novaLista }));
    setDialogPalavra(false);
    setNovoItem({});
    toast.success("✅ Palavra-chave salva!");
  };

  const adicionarRespostaRapida = () => {
    setNovoItem({ atalho: "/", titulo: "", mensagem: "" });
    setItemEditando(null);
    setDialogResposta(true);
  };

  const salvarRespostaRapida = () => {
    if (!novoItem.atalho || !novoItem.mensagem) {
      toast.error("Preencha todos os campos!");
      return;
    }
    
    let novaLista;
    if (itemEditando !== null) {
      novaLista = [...config.respostas_rapidas];
      novaLista[itemEditando] = novoItem;
    } else {
      novaLista = [...config.respostas_rapidas, novoItem];
    }
    
    setConfig(prev => ({ ...prev, respostas_rapidas: novaLista }));
    setDialogResposta(false);
    setNovoItem({});
    toast.success("✅ Resposta rápida salva!");
  };

  // CORREÇÃO: Verificar se está dentro do horário de atendimento
  const verificarDentroHorario = () => {
    const agora = new Date();
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaAtual = diasSemana[agora.getDay()];
    const horarioDia = config.horario_atendimento?.[diaAtual];

    if (!horarioDia?.ativo) {
      return false;
    }

    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const [horaInicio, minInicio] = (horarioDia.inicio || "09:00").split(':').map(Number);
    const [horaFim, minFim] = (horarioDia.fim || "18:00").split(':').map(Number);

    const inicioMinutos = horaInicio * 60 + minInicio;
    const fimMinutos = horaFim * 60 + minFim;

    return horaAtual >= inicioMinutos && horaAtual <= fimMinutos;
  };

  const simularConversa = () => {
    if (!mensagemTeste.trim()) return;

    const msgCliente = { tipo: "cliente", texto: mensagemTeste };
    let respostaBot = null;

    // CORREÇÃO: Verificar horário de atendimento primeiro (comportamento real)
    const dentroHorario = verificarDentroHorario();

    if (!dentroHorario) {
      // Fora do horário - enviar mensagem de fora do horário
      respostaBot = { tipo: "bot", texto: config.mensagem_fora_horario };
      setConversaTeste(prev => [...prev, msgCliente, respostaBot]);
      setMensagemTeste("");
      return;
    }

    const msgLower = mensagemTeste.toLowerCase();
    // CORREÇÃO: Garantir que palavras_chave é um array
    const palavrasChave = Array.isArray(config.palavras_chave) ? config.palavras_chave : [];

    for (const pc of palavrasChave.sort((a, b) => (a.prioridade || 1) - (b.prioridade || 1))) {
      const palavras = Array.isArray(pc.palavras) ? pc.palavras : [];
      if (palavras.some(p => msgLower.includes(p.toLowerCase()))) {
        if (pc.resposta) {
          respostaBot = { tipo: "bot", texto: pc.resposta };
        } else {
          const menuOpcoes = Array.isArray(config.menu_opcoes) ? config.menu_opcoes : [];
          respostaBot = { tipo: "bot", texto: config.mensagem_boas_vindas + "\n\n" + menuOpcoes.map(m => `${m.numero}. ${m.titulo}`).join("\n") };
        }
        break;
      }
    }

    if (!respostaBot) {
      const menuOpcoes = Array.isArray(config.menu_opcoes) ? config.menu_opcoes : [];
      const opcao = menuOpcoes.find(m => m.numero === mensagemTeste.trim());
      if (opcao) {
        respostaBot = { tipo: "bot", texto: opcao.resposta };
      }
    }

    if (!respostaBot) {
      respostaBot = { tipo: "bot", texto: "🤔 Desculpe, não entendi. Por favor, escolha uma das opções do menu ou digite sua dúvida de forma mais específica." };
    }

    setConversaTeste(prev => [...prev, msgCliente, respostaBot]);
    setMensagemTeste("");
  };

  const gerarMenuTexto = () => {
    // CORREÇÃO: Garantir que menu_opcoes é um array
    const menuOpcoes = Array.isArray(config.menu_opcoes) ? config.menu_opcoes : [];
    return menuOpcoes.map(m => `${m.numero}. ${m.titulo}`).join("\n");
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            Chatbot WhatsApp
          </h1>
          <p className="text-slate-500 mt-1">Configure seu assistente virtual inteligente 24/7</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            setConversaTeste([]);
            setDialogPreview(true);
          }}>
            <Eye className="w-4 h-4 mr-2" />
            Testar Bot
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={isSaving || salvarMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {(isSaving || salvarMutation.isPending) ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className={`border-2 transition-all ${config.ativo ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-green-200 shadow-lg' : 'border-slate-300 bg-slate-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.ativo ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}>
                {config.ativo ? <Play className="w-7 h-7 text-white" /> : <Pause className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {config.ativo ? "✅ Chatbot Ativo" : "⏸️ Chatbot Desativado"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {config.ativo 
                    ? "Respondendo automaticamente seus clientes 24/7" 
                    : "Ative para começar a responder automaticamente"}
                </p>
              </div>
            </div>
            <Switch
              checked={config.ativo}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, ativo: v }))}
              className="data-[state=checked]:bg-green-600 scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Quick */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <ListOrdered className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{config.menu_opcoes?.length || 0}</p>
            <p className="text-xs text-slate-600">Opções de Menu</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{config.palavras_chave?.length || 0}</p>
            <p className="text-xs text-slate-600">Palavras-chave</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{config.respostas_rapidas?.length || 0}</p>
            <p className="text-xs text-slate-600">Respostas Rápidas</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{Object.values(config.horario_atendimento || {}).filter(h => h.ativo).length}</p>
            <p className="text-xs text-slate-600">Dias Ativos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mensagens" className="space-y-4">
        <TabsList className="grid grid-cols-6 gap-2 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="mensagens" className="data-[state=active]:bg-white">
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-white">
            <ListOrdered className="w-4 h-4 mr-2" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="horario" className="data-[state=active]:bg-white">
            <Clock className="w-4 h-4 mr-2" />
            Horário
          </TabsTrigger>
          <TabsTrigger value="palavras" className="data-[state=active]:bg-white">
            <Zap className="w-4 h-4 mr-2" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="ia" className="data-[state=active]:bg-white">
            <Brain className="w-4 h-4 mr-2" />
            IA Avançada
          </TabsTrigger>
          <TabsTrigger value="integracao" className="data-[state=active]:bg-white">
            <Settings className="w-4 h-4 mr-2" />
            Integração
          </TabsTrigger>
        </TabsList>

        {/* Tab Mensagens */}
        <TabsContent value="mensagens">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Configurações Básicas</CardTitle>
                <CardDescription>Personalize a identidade do bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Bot</Label>
                  <Input
                    value={config.nome_bot}
                    onChange={(e) => setConfig(prev => ({ ...prev, nome_bot: e.target.value }))}
                    placeholder="Assistente Virtual"
                  />
                </div>

                <div>
                  <Label>Personalidade</Label>
                  <Select value={config.personalidade || "profissional_amigavel"} onValueChange={(v) => setConfig(prev => ({ ...prev, personalidade: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profissional_amigavel">Profissional e Amigável</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="descontraido">Descontraído</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tempo para Transferir (seg)</Label>
                    <Input
                      type="number"
                      value={config.tempo_espera_transferencia}
                      onChange={(e) => setConfig(prev => ({ ...prev, tempo_espera_transferencia: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={config.coletar_dados_cliente}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, coletar_dados_cliente: v }))}
                    />
                    <Label className="text-sm">Coletar Dados</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Mensagens Automáticas</CardTitle>
                <CardDescription>Configure as respostas padrão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mensagem de Boas-vindas</Label>
                  <Textarea
                    value={config.mensagem_boas_vindas}
                    onChange={(e) => setConfig(prev => ({ ...prev, mensagem_boas_vindas: e.target.value }))}
                    rows={6}
                    placeholder="Olá! Bem-vindo..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Use *texto* para negrito no WhatsApp
                  </p>
                </div>

                <div>
                  <Label>Mensagem Fora do Horário</Label>
                  <Textarea
                    value={config.mensagem_fora_horario}
                    onChange={(e) => setConfig(prev => ({ ...prev, mensagem_fora_horario: e.target.value }))}
                    rows={5}
                    placeholder="No momento estamos fora do horário..."
                  />
                </div>

                <div>
                  <Label>Mensagem de Transferência</Label>
                  <Textarea
                    value={config.mensagem_transferencia}
                    onChange={(e) => setConfig(prev => ({ ...prev, mensagem_transferencia: e.target.value }))}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Respostas Rápidas</CardTitle>
                <CardDescription>Atalhos para mensagens frequentes (use com /)</CardDescription>
              </div>
              <Button onClick={adicionarRespostaRapida} size="sm" className="bg-blue-600">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.respostas_rapidas.map((resp, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border hover:shadow-md transition-shadow">
                    <Badge variant="secondary" className="font-mono text-xs mt-1">{resp.atalho}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{resp.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{resp.mensagem}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setNovoItem(resp);
                        setItemEditando(index);
                        setDialogResposta(true);
                      }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          respostas_rapidas: prev.respostas_rapidas.filter((_, i) => i !== index)
                        }));
                        toast.success("Removido!");
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Menu */}
        <TabsContent value="menu">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Menu Interativo</CardTitle>
                <CardDescription>Configure as opções numéricas do menu principal</CardDescription>
              </div>
              <Button onClick={adicionarItemMenu} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Opção
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.menu_opcoes.map((item, index) => {
                  const acao = ACOES_MENU.find(a => a.value === item.acao);
                  const AcaoIcon = acao?.icon || MessageSquare;
                  
                  return (
                    <div key={index} className="flex items-start gap-4 p-5 border-2 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-xl shadow-lg">
                        {item.numero}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{item.titulo}</h4>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.resposta}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <AcaoIcon className="w-4 h-4 text-slate-500" />
                          <Badge variant="outline" className="text-xs">
                            {acao?.label || item.acao}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => editarItemMenu(item, index)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removerItemMenu(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview do Menu
                </h4>
                <pre className="text-sm text-green-800 whitespace-pre-wrap font-sans bg-white p-4 rounded-lg border border-green-200">
                  {gerarMenuTexto()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Horário */}
        <TabsContent value="horario">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Horário de Atendimento</CardTitle>
              <CardDescription>Defina quando o bot deve responder normalmente ou enviar mensagem de fora do horário</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DIAS_SEMANA.map(dia => (
                  <div key={dia.key} className="flex items-center gap-4 p-4 border-2 rounded-lg hover:bg-slate-50">
                    <Switch
                      checked={config.horario_atendimento[dia.key]?.ativo}
                      onCheckedChange={(v) => handleHorarioChange(dia.key, 'ativo', v)}
                    />
                    <span className="w-36 font-semibold">{dia.label}</span>
                    {config.horario_atendimento[dia.key]?.ativo ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={config.horario_atendimento[dia.key]?.inicio || "09:00"}
                          onChange={(e) => handleHorarioChange(dia.key, 'inicio', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-slate-500">às</span>
                        <Input
                          type="time"
                          value={config.horario_atendimento[dia.key]?.fim || "18:00"}
                          onChange={(e) => handleHorarioChange(dia.key, 'fim', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <Badge variant="secondary">Fechado</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Palavras-chave */}
        <TabsContent value="palavras">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Palavras-chave e Gatilhos</CardTitle>
                <CardDescription>Respostas automáticas baseadas em palavras detectadas</CardDescription>
              </div>
              <Button onClick={adicionarPalavraChave} className="bg-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palavras Gatilho</TableHead>
                    <TableHead>Resposta Automática</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.palavras_chave.map((pc, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pc.palavras.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">
                          {pc.resposta || <span className="text-slate-400 italic">Enviar boas-vindas</span>}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={pc.prioridade === 1 ? 'border-red-500 text-red-700' : pc.prioridade === 2 ? 'border-orange-500 text-orange-700' : 'border-blue-500 text-blue-700'}>
                          P{pc.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setNovoItem(pc);
                            setItemEditando(index);
                            setDialogPalavra(true);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              palavras_chave: prev.palavras_chave.filter((_, i) => i !== index)
                            }));
                            toast.success("Removido!");
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab IA Avançada */}
        <TabsContent value="ia">
          <Card className="shadow-lg border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Inteligência Artificial Avançada
              </CardTitle>
              <CardDescription>Configure respostas inteligentes com IA (Em Desenvolvimento)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-12 h-12 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-lg text-purple-900 mb-2">🚀 Recursos em Desenvolvimento</h3>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Compreensão contextual avançada</li>
                      <li>• Aprendizado contínuo com conversas</li>
                      <li>• Respostas personalizadas por cliente</li>
                      <li>• Análise de sentimento</li>
                      <li>• Sugestões inteligentes de produtos</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg opacity-50">
                <div>
                  <Label className="text-slate-600">Usar IA Avançada</Label>
                  <p className="text-sm text-slate-500">Ainda não disponível</p>
                </div>
                <Switch disabled checked={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Integração */}
        <TabsContent value="integracao">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Integração WhatsApp API</CardTitle>
              <CardDescription>Configure a conexão com seu WhatsApp Business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6">
                <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  ⚠️ Integração Externa Necessária
                </h4>
                <p className="text-sm text-amber-800 mb-3">
                  Para usar o chatbot com seu próprio número de WhatsApp, você precisa contratar um serviço de API WhatsApp:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <p className="font-semibold text-sm">Z-API</p>
                    <a href="https://zapi.com.br" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      zapi.com.br →
                    </a>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <p className="font-semibold text-sm">Evolution API</p>
                    <a href="https://evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      evolution-api.com →
                    </a>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <p className="font-semibold text-sm">WhatsApp Oficial</p>
                    <a href="https://business.whatsapp.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      Meta Business →
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  💡 <strong>Como funciona:</strong> Configure as credenciais da API WhatsApp que você contratou. 
                  O chatbot usará essas credenciais para enviar e receber mensagens automaticamente.
                </p>
              </div>

              <div className="space-y-4 opacity-60 pointer-events-none">
                <div>
                  <Label>URL da API</Label>
                  <Input placeholder="https://api.z-api.io/instances/..." disabled />
                </div>
                <div>
                  <Label>Token da API</Label>
                  <Input type="password" placeholder="Seu token de acesso" disabled />
                </div>
                <div>
                  <Label>ID da Instância</Label>
                  <Input placeholder="ID da sua instância" disabled />
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Testar Conexão
                </Button>
              </div>

              <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-700">
                  🔒 Configuração de API em desenvolvimento. Use o painel ADM WhatsApp para gerenciar conversas existentes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={dialogMenu} onOpenChange={setDialogMenu}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{itemEditando !== null ? "Editar" : "Nova"} Opção do Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label>Número</Label>
                <Input
                  value={novoItem.numero || ""}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, numero: e.target.value }))}
                  maxLength={2}
                />
              </div>
              <div className="col-span-4">
                <Label>Título (com emoji)</Label>
                <Input
                  value={novoItem.titulo || ""}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="📱 Ver produtos e serviços"
                />
              </div>
            </div>
            <div>
              <Label>Resposta Automática</Label>
              <Textarea
                value={novoItem.resposta || ""}
                onChange={(e) => setNovoItem(prev => ({ ...prev, resposta: e.target.value }))}
                rows={5}
                placeholder="Mensagem que será enviada quando o cliente escolher esta opção..."
              />
              <p className="text-xs text-slate-500 mt-1">💡 Use *texto* para negrito, _texto_ para itálico</p>
            </div>
            <div>
              <Label>Ação do Sistema</Label>
              <Select
                value={novoItem.acao || "responder"}
                onValueChange={(v) => setNovoItem(prev => ({ ...prev, acao: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACOES_MENU.map(acao => {
                    const Icon = acao.icon;
                    return (
                      <SelectItem key={acao.value} value={acao.value}>
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <div>
                            <p className="font-semibold">{acao.label}</p>
                            <p className="text-xs text-slate-500">{acao.desc}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMenu(false)}>Cancelar</Button>
            <Button onClick={salvarItemMenu} className="bg-blue-600">Salvar Opção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPalavra} onOpenChange={setDialogPalavra}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemEditando !== null ? "Editar" : "Nova"} Palavra-chave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Palavras Gatilho (separadas por vírgula)</Label>
              <Input
                value={novoItem.palavras?.join(", ") || ""}
                onChange={(e) => setNovoItem(prev => ({
                  ...prev,
                  palavras: e.target.value.split(",").map(p => p.trim()).filter(p => p)
                }))}
                placeholder="preço, valor, quanto custa"
              />
              <p className="text-xs text-slate-500 mt-1">Ex: preço, valor, custo</p>
            </div>
            <div>
              <Label>Resposta Automática</Label>
              <Textarea
                value={novoItem.resposta || ""}
                onChange={(e) => setNovoItem(prev => ({ ...prev, resposta: e.target.value }))}
                rows={4}
                placeholder="Deixe vazio para enviar menu de boas-vindas"
              />
            </div>
            <div>
              <Label>Prioridade (1 = maior, 10 = menor)</Label>
              <Input
                type="number"
                value={novoItem.prioridade || 1}
                onChange={(e) => setNovoItem(prev => ({ ...prev, prioridade: parseInt(e.target.value) || 1 }))}
                min={1}
                max={10}
              />
              <p className="text-xs text-slate-500 mt-1">Palavras com prioridade menor são checadas primeiro</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPalavra(false)}>Cancelar</Button>
            <Button onClick={salvarPalavraChave} className="bg-purple-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogResposta} onOpenChange={setDialogResposta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemEditando !== null ? "Editar" : "Nova"} Resposta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Atalho</Label>
                <Input
                  value={novoItem.atalho || "/"}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, atalho: e.target.value }))}
                  placeholder="/preco"
                  className="font-mono"
                />
              </div>
              <div className="col-span-2">
                <Label>Título Descritivo</Label>
                <Input
                  value={novoItem.titulo || ""}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Consulta de preço"
                />
              </div>
            </div>
            <div>
              <Label>Mensagem Completa</Label>
              <Textarea
                value={novoItem.mensagem || ""}
                onChange={(e) => setNovoItem(prev => ({ ...prev, mensagem: e.target.value }))}
                rows={5}
                placeholder="A mensagem que será enviada..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogResposta(false)}>Cancelar</Button>
            <Button onClick={salvarRespostaRapida} className="bg-green-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPreview} onOpenChange={setDialogPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Testar Chatbot
            </DialogTitle>
          </DialogHeader>
          <div className="h-[500px] flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-4 overflow-y-auto space-y-3">
              {conversaTeste.length === 0 && (
                <div className="text-center text-slate-500 py-12">
                  <Bot className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold">Simulador de Conversa</p>
                  <p className="text-sm mt-1">Envie uma mensagem para testar as respostas</p>
                </div>
              )}
              {conversaTeste.map((msg, index) => (
                <div key={index} className={`flex ${msg.tipo === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap shadow-md ${
                    msg.tipo === 'cliente' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-none' 
                      : 'bg-white border-2 border-slate-200 rounded-bl-none'
                  }`}>
                    {msg.texto}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Input
                value={mensagemTeste}
                onChange={(e) => setMensagemTeste(e.target.value)}
                placeholder="Digite uma mensagem de teste..."
                onKeyPress={(e) => e.key === 'Enter' && simularConversa()}
                className="flex-1"
              />
              <Button onClick={simularConversa} className="bg-green-600">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConversaTeste([])}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar Chat
            </Button>
            <Button onClick={() => setDialogPreview(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}