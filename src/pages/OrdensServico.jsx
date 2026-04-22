import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PatternLock from "@/components/PatternLock";
import ClienteFormDialog from "@/components/clientes/ClienteFormDialog";
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  UserPlus,
  Camera,
  Video,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  X,
  Package,
  Smartphone,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from '@/contexts/ConfirmContext';
import { format } from "date-fns";

const STATUS_CONFIG = {
  recebido: { label: "Recebido", color: "bg-blue-500", icon: Clock },
  em_diagnostico: { label: "Em Diagnóstico", color: "bg-yellow-500", icon: Search },
  aguardando_aprovacao: { label: "Aguardando Aprovação", color: "bg-orange-500", icon: Clock },
  aprovado: { label: "Aprovado", color: "bg-green-500", icon: CheckCircle },
  orcamento_reprovado: { label: "Orçamento Reprovado", color: "bg-red-500", icon: AlertCircle },
  aguardando_pecas: { label: "Aguardando Peças", color: "bg-purple-500", icon: Package },
  em_conserto: { label: "Em Conserto", color: "bg-indigo-500", icon: Wrench },
  pronto: { label: "Pronto", color: "bg-green-600", icon: CheckCircle },
  entregue: { label: "Entregue", color: "bg-slate-500", icon: CheckCircle },
  faturada: { label: "Faturada", color: "bg-emerald-600", icon: DollarSign },
  cancelado: { label: "Cancelado", color: "bg-red-600", icon: AlertCircle }
};

const MARCAS_DISPONIVEIS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei",
  "Asus", "Realme", "OnePlus", "Nokia", "Sony", "Oppo", "Vivo"
];

const CAPACIDADES_DISPONIVEIS = [
  "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"
];

const OPERADORAS = ["Claro", "Vivo", "Tim", "Oi", "Nextel", "Outra", "Nenhuma"];

export default function OrdensServico() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOS, setDialogOS] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogOrcamento, setDialogOrcamento] = useState(false);
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [dialogChecklistFinal, setDialogChecklistFinal] = useState(false);
  const [dialogImpressao, setDialogImpressao] = useState(false);
  const [dialogAlterarStatus, setDialogAlterarStatus] = useState(false);
  const [novoStatusSelecionado, setNovoStatusSelecionado] = useState("");
  const [osParaImprimir, setOsParaImprimir] = useState(null);
  const [selectedOS, setSelectedOS] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const { user, hasPermission } = useAuth();
  const podeCriarOS      = hasPermission('gerenciar_os') || hasPermission('criar_os');
  const podeEditarOS     = hasPermission('gerenciar_os') || hasPermission('editar_os');
  const podeFinalizarOS  = hasPermission('gerenciar_os') || hasPermission('finalizar_os');
  const podeCancelarOS   = hasPermission('gerenciar_os') || hasPermission('cancelar_os');
  const podeAprovarOrc   = hasPermission('gerenciar_os') || hasPermission('aprovar_orcamento_os');
  const [uploading, setUploading] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [streamAtivo, setStreamAtivo] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [visualizacao, setVisualizacao] = useState('cards');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    cliente_id: "",
    aparelho: {
      marca: "",
      modelo: "",
      capacidade: "",
      imei: "",
      serial: "",
      cor: "",
      senha: "",
      tipo_senha: "texto",
      acessorios_entregues: "",
      operadora: ""
    },
    defeito_reclamado: "",
    observacoes_cliente: "",
    prioridade: "normal",
    fotos: [],
  });

  const [checklistEntrada, setChecklistEntrada] = useState({});
  const [checklistFinal, setChecklistFinal] = useState({});
  const [valorPreAprovado, setValorPreAprovado] = useState(0);
  const [tipoOrcamento, setTipoOrcamento] = useState('nenhum');

  const [orcamentoData, setOrcamentoData] = useState({
    diagnostico: "",
    laudo_tecnico: "",
    servicos: [{ descricao: "", valor: 0 }],
    pecas: [],
    valor_total: 0,
    prazo_dias: 0
  });

  const confirm = useConfirm();
  const [dialogNovoClienteCompleto, setDialogNovoClienteCompleto] = useState(false);

  const [configChecklist, setConfigChecklist] = useState({
    entrada: [
      { id: "contato_liquido", label: "O CLIENTE INFORMOU QUE O APARELHO TEVE CONTATO COM LÍQUIDO?", ativo: true },
      { id: "aparelho_acende", label: "O APARELHO ESTÁ ACENDENDO A TELA?", ativo: true },
      { id: "tela_danificada", label: "TELA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "aparelho_ligando", label: "O APARELHO ESTÁ LIGANDO OU SINAL DE FUNCIONAMENTO?", ativo: true },
      { id: "estrutura_comprometida", label: "ESTRUTURA ESTÁ VISIVELMENTE TORTA OU DANIFICADA?", ativo: true },
      { id: "riscos_visiveis", label: "HÁ RISCOS APARENTES NO APARELHO?", ativo: true },
      { id: "possui_chip", label: "O APARELHO ESTÁ COM CHIP OU CARTÃO SD?", ativo: true },
      { id: "gaveta_chip_danificada", label: "GAVETA DO CHIP ESTÁ AUSENTE OU DANIFICADA?", ativo: true },
      { id: "botoes_danificados", label: "HÁ ALGUM BOTÃO VISIVELMENTE DANIFICADO?", ativo: true },
      { id: "conector_danificado", label: "CONECTOR DE CARGA OU FONE ESTÁ VISIVELMENTE DANIFICADO?", ativo: true },
      { id: "lente_camera_danificada", label: "LENTE DA CAMERA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "camera_danificada", label: "ALGUMA CAMERA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "tampa_traseira_danificada", label: "TAMPA TRASEIRA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "possui_senha", label: "POSSUI SENHA?", ativo: true }
    ],
    finalizacao: [
      { id: "impossivel_testar", label: "IMPOSSÍVEL TESTAR", ativo: true },
      { id: "aparelho_nao_liga", label: "APARELHO NÃO LIGA", ativo: true },
      { id: "teste_touch", label: "TESTE DE TOUCH", ativo: true },
      { id: "teste_tela", label: "TESTE DE TELA", ativo: true },
      { id: "teste_conector_carga", label: "TESTE CONECTOR DE CARGA", ativo: true },
      { id: "teste_botoes", label: "TESTE DE BOTÕES", ativo: true },
      { id: "teste_alto_falante_primario", label: "TESTE ALTO-FALANTE PRIMÁRIO", ativo: true },
      { id: "teste_alto_falante_secundario", label: "TESTE ALTO-FALANTE SECUNDÁRIO", ativo: true },
      { id: "teste_wifi_bluetooth", label: "TESTE WIFI/BLUETOOTH", ativo: true },
      { id: "teste_rede_gsm", label: "TESTE REDE GSM", ativo: true }
    ]
  });

  React.useEffect(() => {
    if (configuracoes) {
      try {
        const entradaItems = configuracoes.os?.checklist_entrada?.filter(item => item.ativo) || configChecklist.entrada;
        const finalizacaoItems = configuracoes.os?.checklist_finalizacao?.filter(item => item.ativo) || configChecklist.finalizacao;

        setConfigChecklist({
          entrada: entradaItems,
          finalizacao: finalizacaoItems
        });

        const initialEntrada = {};
        entradaItems.forEach(item => {
          initialEntrada[item.id] = false;
        });
        setChecklistEntrada(initialEntrada);

      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  }, [configuracoes]);

  React.useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        setConfiguracoes(JSON.parse(configSalva));
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  }, []);

  const { data: ordensServico = [] } = useQuery({
    queryKey: ['ordens-servico'],
    queryFn: () => base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });



  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);

      let proximoNumero = 1;
      try {
        // OTIMIZAÇÃO: Buscar apenas a última OS criada para descobrir o próximo número
        // Isso evita carregar milhares de registros na memória
        const ultimasOS = await base44.entities.OrdemServico.list('-codigo_os', 1);
        
        if (ultimasOS && ultimasOS.length > 0) {
          const ultimoCodigo = ultimasOS[0].codigo_os || "";
          const ultimoNumero = parseInt(ultimoCodigo.replace('OS-', '') || '0');
          if (!isNaN(ultimoNumero)) {
            proximoNumero = ultimoNumero + 1;
          }
        }

        // Atualizar ou criar configuração para manter sincronizado (opcional, mas bom manter)
        try {
          const configs = await base44.entities.Configuracao.list();
          const configOS = configs.find(c => c.chave === 'ultimo_numero_os');

          if (configOS) {
            await base44.entities.Configuracao.update(configOS.id, { valor: proximoNumero.toString() });
          } else {
            await base44.entities.Configuracao.create({
              chave: 'ultimo_numero_os',
              valor: proximoNumero.toString(),
              tipo: 'numero',
              descricao: 'Último número de OS gerado'
            });
          }
        } catch (confErr) {
          console.warn("Erro ao atualizar config de número OS, mas procedendo com o número calculado.");
        }
      } catch (error) {
        console.error("Erro ao gerar número OS:", error);
        // Fallback: usar total de OS carregadas em memória + 1 (seguro e sem código gigante)
        const osEmMemoria = queryClient.getQueryData(['ordens-servico']) || [];
        proximoNumero = (Array.isArray(osEmMemoria) ? osEmMemoria.length : 0) + 1;
      }

      const codigo = `OS-${proximoNumero.toString().padStart(5, '0')}`;

      const fullChecklistEntrada = { ...checklistEntrada };
      if (tipoOrcamento === 'pre_aprovado') {
        fullChecklistEntrada.pre_aprovado = true;
        fullChecklistEntrada.orcamento = false;
        fullChecklistEntrada.valor_pre_aprovado = valorPreAprovado;
      } else if (tipoOrcamento === 'orcamento') {
        fullChecklistEntrada.pre_aprovado = false;
        fullChecklistEntrada.orcamento = true;
        fullChecklistEntrada.valor_pre_aprovado = 0;
      } else {
        fullChecklistEntrada.pre_aprovado = false;
        fullChecklistEntrada.orcamento = false;
        fullChecklistEntrada.valor_pre_aprovado = 0;
      }

      return base44.entities.OrdemServico.create({
        ...data,
        codigo_os: codigo,
        cliente_nome: cliente?.nome_completo,
        cliente_telefone: cliente?.telefone1,
        cliente_cpf: cliente?.cpf_cnpj,
        cliente_endereco: cliente?.endereco,
        status: "recebido",
        data_entrada: new Date().toISOString(),
        atendente_abertura: user?.nome,
        atendente_abertura_id: user?.id,
        vendedor_id: user?.id,
        checklist_entrada: fullChecklistEntrada,
        historico: [{
          data: new Date().toISOString(),
          usuario: user?.nome,
          status_anterior: null,
          status_novo: "recebido",
          observacao: "OS criada - Aparelho recebido"
        }]
      });
    },
    onSuccess: (osNova) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success("Ordem de serviço criada!");
      setDialogOS(false);
      setOsParaImprimir(osNova);
      setDialogImpressao(true);
      resetForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, novoStatus, observacao, dadosAdicionais = {} }) => {
      const os = ordensServico.find(o => o.id === id);

      // PROTEÇÃO CRÍTICA: Se o histórico legado estiver quebrado (array de caracteres "[\" \"{\"..."), ignora as partes corrompidas
      let historicoAtual = Array.isArray(os.historico) ? os.historico : [];
      historicoAtual = historicoAtual.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));

      const novoHistorico = [
        ...historicoAtual,
        {
          data: new Date().toISOString(),
          usuario: user?.nome,
          status_anterior: os.status,
          status_novo: novoStatus,
          observacao: observacao
        }
      ];

      const updateData = {
        status: novoStatus,
        historico: novoHistorico,
        ...dadosAdicionais
      };

      if (novoStatus === "entregue") {
        updateData.data_entrega = new Date().toISOString();
        updateData.atendente_finalizacao = user?.nome;
      } else if (novoStatus === "pronto") {
        updateData.data_conclusao = new Date().toISOString();
      } else if (novoStatus === "em_diagnostico" && !os.tecnico_responsavel) {
        updateData.tecnico_responsavel = user?.nome;
        updateData.tecnico_id = user?.id;
      }

      return base44.entities.OrdemServico.update(id, updateData);
    },
    onSuccess: async (updatedOS) => {
      await queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success("Status atualizado!");
      // CRÍTICO: Atualizar selectedOS com dados frescos do banco
      // para evitar que PDV e impressão recebam dados desatualizados
      if (updatedOS && updatedOS.id) {
        setSelectedOS(updatedOS);
      }
      setDialogChecklistFinal(false);
      // NÃO fechar o dialog - deixar o técnico ver os botões de próxima ação
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error(`Erro ao atualizar: ${error.message || "Verifique o console para mais detalhes"}`);
    }
  });

  const deleteOSMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.OrdemServico.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success("Ordem de Serviço excluída com sucesso");
      setDialogDetalhes(false);
      setSelectedOS(null);
    },
    onError: (error) => {
      console.error("Erro ao excluir OS:", error);
      toast.error("Erro ao excluir a Ordem de Serviço.");
    }
  });

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      aparelho: {
        marca: "",
        modelo: "",
        capacidade: "",
        imei: "",
        serial: "",
        cor: "",
        senha: "",
        tipo_senha: "texto",
        acessorios_entregues: "",
        operadora: ""
      },
      defeito_reclamado: "",
      observacoes_cliente: "",
      prioridade: "normal",
      fotos: [],
    });

    const initialEntrada = {};
    configChecklist.entrada.forEach(item => {
      initialEntrada[item.id] = false;
    });
    setChecklistEntrada(initialEntrada);
    setValorPreAprovado(0);
    setTipoOrcamento('nenhum');
    setUploadFalhou(false); // CORREÇÃO: Resetar estado de upload

    pararCamera();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // CORREÇÃO: Bloquear submit se upload falhou
    if (uploadFalhou) {
      toast.error("Há um erro de upload pendente. Remova a foto com erro ou tente novamente.");
      return;
    }

    // CORREÇÃO: Bloquear se ainda está fazendo upload
    if (uploading) {
      toast.error("Aguarde o upload da foto terminar.");
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAparelhoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      aparelho: { ...prev.aparelho, [field]: value }
    }));
  };

  // CORREÇÃO: Estado para rastrear se upload falhou
  const [uploadFalhou, setUploadFalhou] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadFalhou(false);

    let sucessos = 0;
    let falhas = 0;
    let erroMsg = '';

    for (const file of files) {
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const url = uploadResult.url || uploadResult.file_url;

        if (url) {
          setFormData(prev => ({
            ...prev,
            fotos: [...(prev.fotos || []), url]
          }));
          sucessos++;
        } else {
          falhas++;
        }
      } catch (error) {
        console.error("Erro no upload:", error);
        erroMsg = error.message || 'Erro desconhecido';
        falhas++;
      }
    }

    if (falhas > 0) {
      setUploadFalhou(true);
      toast.error(`${falhas} foto(s) falharam no envio. ${erroMsg || ''}`);
    }

    if (sucessos > 0) {
      toast.success(`${sucessos} foto(s) adicionada(s)!`);
    }

    setUploading(false);
  };

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamAtivo(stream);
        setCapturandoFoto(true);

        await videoRef.current.play();
        toast.success("Câmera ativada!");
      }
    } catch (error) {
      console.error("Erro câmera:", error);
      toast.error("Erro ao acessar câmera");
    }
  };

  const capturarFoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      setUploading(true);
      try {
        const file = new File([blob], `os-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { url } = await base44.integrations.Core.UploadFile({ file });

        setFormData(prev => ({
          ...prev,
          fotos: [...(prev.fotos || []), url]
        }));

        toast.success("Foto capturada!");
        pararCamera();
      } catch (error) {
        toast.error("Erro ao salvar foto");
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.92);
  };

  const pararCamera = () => {
    if (streamAtivo) {
      streamAtivo.getTracks().forEach(track => track.stop());
      setStreamAtivo(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCapturandoFoto(false);
  };

  React.useEffect(() => {
    return () => {
      pararCamera();
    };
  }, []);


  const handleSubmitOrcamento = () => {
    if (!selectedOS) return;

    // CRÍTICO: Validar serviços e peças
    const servicosValidos = orcamentoData.servicos.filter(s => s.descricao && s.descricao.trim() !== "" && parseFloat(s.valor) > 0);
    const pecasValidas = orcamentoData.pecas.filter(p => p.produto_id && parseInt(p.quantidade) > 0 && parseFloat(p.valor_unitario) > 0);

    const valorTotalCalculado = servicosValidos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0) +
      pecasValidas.reduce((sum, p) => sum + ((parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 0)), 0);

    if (valorTotalCalculado <= 0) {
      toast.error("Orçamento deve ter valor maior que zero! Adicione serviços ou peças.");
      return;
    }

    // Se técnico preencheu orçamento, remove pré-aprovado
    const checklistAtualizado = { ...selectedOS.checklist_entrada };
    if (checklistAtualizado.pre_aprovado && valorTotalCalculado > 0) {
      checklistAtualizado.pre_aprovado = false;
      checklistAtualizado.orcamento = true;
      checklistAtualizado.valor_pre_aprovado = 0;
    }

    updateStatusMutation.mutate({
      id: selectedOS.id,
      novoStatus: "aguardando_aprovacao",
      observacao: `Orçamento enviado - R$ ${valorTotalCalculado.toFixed(2)} - Prazo: ${orcamentoData.prazo_dias} dias`,
      dadosAdicionais: {
        diagnostico: orcamentoData.diagnostico,
        laudo_tecnico: orcamentoData.laudo_tecnico,
        orcamento: {
          servicos: servicosValidos,
          pecas: pecasValidas,
          valor_total: valorTotalCalculado,
          prazo_dias: orcamentoData.prazo_dias,
          faturado: false,
          data_orcamento: new Date().toISOString()
        },
        pecas: pecasValidas.map(p => ({
          ...p,
          produto_nome: produtos.find(prod => prod.id === p.produto_id)?.nome
        })),
        servicos: servicosValidos,
        valor_pecas: pecasValidas.reduce((sum, p) => sum + ((parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 0)), 0),
        valor_servicos: servicosValidos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0),
        valor_total: valorTotalCalculado,
        checklist_entrada: checklistAtualizado
      }
    });

    setDialogOrcamento(false);
  };

  // CRÍTICO: Cálculo com validação
  const calcularValorTotalOrcamento = (currentOrcamentoData) => {
    const servicosTotal = currentOrcamentoData.servicos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    const pecasTotal = currentOrcamentoData.pecas.reduce((sum, p) => sum + ((parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 0)), 0);
    return Math.round((servicosTotal + pecasTotal) * 100) / 100;
  };

  const handleServicoChange = (index, field, value) => {
    const newServicos = [...orcamentoData.servicos];
    newServicos[index][field] = field === 'valor' ? parseFloat(value) || 0 : value;
    setOrcamentoData(prev => ({
      ...prev,
      servicos: newServicos,
      valor_total: calcularValorTotalOrcamento({ ...prev, servicos: newServicos })
    }));
  };

  const addServico = () => {
    setOrcamentoData(prev => ({
      ...prev,
      servicos: [...prev.servicos, { descricao: "", valor: 0 }]
    }));
  };

  const removeServico = (index) => {
    const newServicos = orcamentoData.servicos.filter((_, i) => i !== index);
    setOrcamentoData(prev => ({
      ...prev,
      servicos: newServicos,
      valor_total: calcularValorTotalOrcamento({ ...prev, servicos: newServicos })
    }));
  };

  const handlePecaChange = (index, field, value) => {
    const newPecas = [...orcamentoData.pecas];
    if (field === 'produto_id') {
      const produtoSelecionado = produtos.find(p => p.id === value);
      newPecas[index] = {
        ...newPecas[index],
        produto_id: value,
        produto_nome: produtoSelecionado?.nome || '',
        valor_unitario: produtoSelecionado?.preco_venda || 0
      };
    } else {
      newPecas[index][field] = field === 'quantidade' || field === 'valor_unitario' ? parseFloat(value) || 0 : value;
    }
    setOrcamentoData(prev => ({
      ...prev,
      pecas: newPecas,
      valor_total: calcularValorTotalOrcamento({ ...prev, pecas: newPecas })
    }));
  };

  const addPeca = () => {
    setOrcamentoData(prev => ({
      ...prev,
      pecas: [...prev.pecas, { produto_id: "", produto_nome: "", quantidade: 1, valor_unitario: 0 }]
    }));
  };

  const removePeca = (index) => {
    const newPecas = orcamentoData.pecas.filter((_, i) => i !== index);
    setOrcamentoData(prev => ({
      ...prev,
      pecas: newPecas,
      valor_total: calcularValorTotalOrcamento({ ...prev, pecas: newPecas })
    }));
  };

  const abrirChecklistFinal = () => {
    const initialChecklist = {};
    configChecklist.finalizacao.forEach(item => {
      initialChecklist[item.id] = false;
    });
    setChecklistFinal(initialChecklist);
    setDialogChecklistFinal(true);
  };

  const finalizarComChecklist = () => {
    // CORREÇÃO: Validar se pelo menos 1 item do checklist foi marcado
    const itensPreenchidos = Object.entries(checklistFinal)
      .filter(([key, value]) => key !== 'observacoes_finalizacao' && value === true)
      .length;

    if (itensPreenchidos === 0) {
      toast.error("Preencha pelo menos um item do checklist de finalização.");
      return;
    }

    updateStatusMutation.mutate({
      id: selectedOS.id,
      novoStatus: "pronto",
      observacao: "Serviço finalizado - Checklist de saída preenchido",
      dadosAdicionais: {
        checklist_finalizacao: checklistFinal,
        data_conclusao: new Date().toISOString()
      }
    });
  };

  const imprimirOS = (osImpressao, numVias) => {
    if (!osImpressao) return;

    const configLocal = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const config = Object.keys(configLocal).length > 0 ? configLocal : (configuracoes || {});
    const empresa = config.empresa || {};
    const cliente = clientes.find(c => c.id === osImpressao.cliente_id) || {};

    const formatarDataHoraImpressao = (dataStr) => {
      if (!dataStr) return 'N/A';
      const d = new Date(dataStr);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const seg = String(d.getSeconds()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
    };

    // Gerar padrão de senha visual (grid 3x3) ligado pelas posições
    const gerarPadraoSenha = (senha) => {
      if (!senha) return '';
      const pontos = [
        { x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 },
        { x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 },
        { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 }
      ];

      // Extrair números da senha para desenhar o traçado (ex: "1-4-7-8-9" => [1,4,7,8,9])
      const numeros = senha.match(/\d/g);

      let svg = pontos.map((p, i) =>
        `<circle cx="${p.x}" cy="${p.y}" r="8" fill="none" stroke="#ddd" stroke-width="1.5"/>`
      ).join('');

      if (numeros && numeros.length > 1) {
        let pathD = "";
        numeros.forEach((num, index) => {
          let i = parseInt(num) - 1;
          if (i >= 0 && i < 9) {
            let p = pontos[i];
            if (index === 0) {
              pathD += `M ${p.x} ${p.y} `;
            } else {
              pathD += `L ${p.x} ${p.y} `;
            }
            // Pinta a bolinha ativada
            svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#333"/>`;
          }
        });

        if (pathD) {
          svg += `<path d="${pathD}" fill="none" stroke="#333" stroke-width="2.5" />`;
        }
      }

      return `
        <svg width="100" height="100" viewBox="0 0 100 100" style="border: 1px solid #ccc; background: #fff;">
          ${svg}
        </svg>
      `;
    };

    const getTituloOrcamento = () => {
      if (osImpressao.status === 'faturada') return 'SERVIÇO FATURADO';
      if (osImpressao.status === 'entregue') return 'SERVIÇO FINALIZADO E ENTREGUE';
      if (osImpressao.status === 'pronto') return 'SERVIÇO PRONTO PARA RETIRADA';
      if (osImpressao.status === 'em_conserto') return 'APARELHO EM CONSERTO (BANCADA)';
      if (osImpressao.status === 'aguardando_pecas') return 'AGUARDANDO PEÇAS';
      if (osImpressao.status === 'aprovado' || osImpressao.orcamento?.orcamento_aprovado) return 'ORÇAMENTO APROVADO';
      return 'ORÇAMENTO (AGUARDANDO APROVAÇÃO)';
    };

    const renderChecklistFinalizacao = () => {
      if (!((['pronto', 'entregue', 'faturada'].includes(osImpressao.status)) && osImpressao.checklist_finalizacao)) return '';

      const itensHtml = (configChecklist.finalizacao || [])
        .filter(item => item.id !== 'observacoes_finalizacao')
        .map(item => {
          const isChecked = !!osImpressao.checklist_finalizacao?.[item.id];
          const displayText = item.label ? item.label.toUpperCase() : item.id.toUpperCase();
          const checkClass = isChecked ? 'checked' : '';
          const simBox = isChecked ? 'X' : '&nbsp;';
          const naoBox = !isChecked ? 'X' : '&nbsp;';
          return '<div class="checklist-item ' + checkClass + '">' +
            '<span style="display:inline-block; width: 90px; font-family: monospace; color: #004085;">' +
            '[' + simBox + '] SIM / [' + naoBox + '] NÃO' +
            '</span>' +
            '<span style="color: #004085;">' + displayText + '</span>' +
            '</div>';
        }).join('');

      return `
        <!-- Checklist Finalização -->
        <div class="secao checklist-secao" style="margin-top: 5px; border-color: #0056b3;">
          <div class="secao-titulo" style="background: #e6f2ff; border-bottom-color: #0056b3; color: #004085;">Checklist de Finalização (Testes de Qualidade e Saída):</div>
          <div class="checklist-container">
            <div class="checklist-itens">
              ${itensHtml}
            </div>
            <div class="checklist-lateral">
              <div class="observacao-box" style="border-color: #0056b3; min-height: 50px;">
                <strong style="color: #004085;">OBSERVAÇÕES DA FINALIZAÇÃO:</strong>
                <p style="color: #004085;">${osImpressao.checklist_finalizacao?.observacoes_finalizacao || 'Sem observações.'}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const gerarConteudoVia = (numeroVia) => `
      <div class="pagina">
        <!-- Header com logo, dados empresa e OS -->
        <div class="header">
          <div class="header-logo">
            ${empresa.logo_url ? `<img src="${empresa.logo_url}" alt="Logo" style="object-fit: contain; width: 100%; height: 100%; max-width: 65px; max-height: 50px;" />` : '<div class="logo-placeholder">LOGO</div>'}
          </div>
          <div class="header-empresa">
            <h1>${empresa.nome || 'Smart Express Comercio e Assistencia de Eletronicos'}</h1>
            <p>${empresa.endereco || 'Rua Treze de Maio, N° 612, Centro, S. J. do Rio Pardo'}</p>
            <p>CNPJ: ${empresa.cnpj || '30.850.775/0001-17'}</p>
            <p>Telefone: ${empresa.telefone || '19 99424-0249'}</p>
          </div>
          <div class="header-info">
            <p class="data-hora">${formatarDataHoraImpressao(osImpressao.data_entrada)}</p>
            <div class="os-numero">O.S ${osImpressao.codigo_os.replace('OS-', '')}</div>
          </div>
        </div>

        <!-- Título -->
        <h2 class="titulo-os">Ordem de Serviço</h2>

        <!-- Dados do Cliente -->
        <div class="secao">
          <div class="secao-titulo">Dados do Cliente:</div>
          <div class="secao-conteudo">
            <table class="dados-cliente">
              <tr>
                <td><strong>NOME:</strong> ${(osImpressao.cliente_nome || '').toUpperCase()}</td>
                <td><strong>CONTATO:</strong> ${osImpressao.cliente_telefone || cliente.telefone1 || ''}</td>
                <td><strong>CPF:</strong> ${osImpressao.cliente_cpf || cliente.cpf_cnpj || ''}</td>
              </tr>
              <tr>
                <td><strong>ENDEREÇO:</strong> ${(cliente.endereco?.logradouro || '').toUpperCase()}</td>
                <td><strong>NÚMERO:</strong> ${cliente.endereco?.numero || ''}</td>
                <td><strong>BAIRRO:</strong> ${(cliente.endereco?.bairro || '').toUpperCase()}</td>
              </tr>
              <tr>
                <td><strong>COMPLEMENTO:</strong> ${(cliente.endereco?.complemento || '').toUpperCase()}</td>
                <td colspan="2"><strong>CIDADE:</strong> ${(cliente.endereco?.cidade || '').toUpperCase()}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Dados do Aparelho -->
        <div class="secao">
          <div class="secao-titulo">Dados do Aparelho:</div>
          <div class="secao-conteudo">
            <table class="dados-aparelho">
              <tr>
                <td><strong>MARCA:</strong> ${(osImpressao.aparelho?.marca || '').toUpperCase()}</td>
                <td><strong>MODELO:</strong> ${(osImpressao.aparelho?.modelo || '').toUpperCase()}</td>
                <td><strong>COR:</strong> ${(osImpressao.aparelho?.cor || '').toUpperCase()}</td>
                <td><strong>NÚMERO DE IMEI:</strong> ${osImpressao.aparelho?.imei || ''}</td>
              </tr>
            </table>
            <div class="problema-relatado">
              <strong>PROBLEMA RELATADO PELO CLIENTE:</strong> ${(osImpressao.defeito_reclamado || '').toUpperCase()}
            </div>
          </div>
        </div>

        <!-- Checklist -->
        <div class="secao checklist-secao">
          <div class="secao-titulo">Checklist:</div>
          <div class="checklist-container">
            <div class="checklist-itens">
              ${configChecklist.entrada
        .filter(item => !['pre_aprovado', 'valor_pre_aprovado', 'orcamento'].includes(item.id))
        .map(item => {
          const isChecked = !!osImpressao.checklist_entrada?.[item.id];
          let displayText = item.label.toUpperCase();

          if (displayText.includes('GAVETADO')) {
            displayText = displayText.replace('GAVETADO', 'GAVETA');
          }

          // Adicionar informações extras para itens específicos
          if (item.id === 'possui_senha' && osImpressao.aparelho?.senha) {
            displayText += `: ${osImpressao.aparelho.senha}`;
          } else if (item.id === 'possui_chip' && osImpressao.aparelho?.operadora) {
            displayText += `: ${osImpressao.aparelho.operadora}`;
          }

          return '<div class="checklist-item ' + (isChecked ? 'checked' : '') + '">' +
            '<span style="display:inline-block; width: 90px; font-family: monospace;">' +
            '[' + (isChecked ? 'X' : '&nbsp;') + '] SIM / [' + (!isChecked ? 'X' : '&nbsp;') + '] NÃO' +
            '</span>' +
            '<span>' + displayText + '</span>' +
            '</div>';
        }).join('')}
            </div>
            <div class="checklist-lateral">
              <!-- Padrão de senha -->
              ${osImpressao.aparelho?.senha ? `
                <div class="padrao-senha">
                  ${gerarPadraoSenha(osImpressao.aparelho.senha)}
                </div>
              ` : ''}
              <!-- Observação -->
              <div class="observacao-box">
                <strong>OBSERVAÇÃO:</strong>
                <p>${osImpressao.observacoes_cliente || ''}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pré-aprovado -->
        <div class="pre-aprovado">
          <strong>Pré-aprovado: R$ ${(parseFloat(osImpressao.checklist_entrada?.valor_pre_aprovado) || 0).toFixed(2)}</strong>
        </div>

        ${renderChecklistFinalizacao()}

        ${(osImpressao.orcamento || osImpressao.servicos?.length > 0 || osImpressao.pecas?.length > 0) ? `
        <!-- Orçamento / Valores -->
        <div class="orcamento-box">
          <strong>${getTituloOrcamento()}</strong>
          ${osImpressao.dadosAdicionais?.diagnostico || osImpressao.diagnostico || osImpressao.orcamento?.diagnostico ? `<p><strong>Diagnóstico:</strong> ${osImpressao.dadosAdicionais?.diagnostico || osImpressao.diagnostico || osImpressao.orcamento?.diagnostico}</p>` : ''}
          
          ${(osImpressao.servicos?.length > 0 || osImpressao.orcamento?.servicos?.length > 0) ? `
            <p><strong>Serviços:</strong></p>
            ${(osImpressao.orcamento?.servicos || osImpressao.servicos).map(s => `<p>• ${s.descricao} - R$ ${parseFloat(s.valor || 0).toFixed(2)}</p>`).join('')}
          ` : ''}
          
          ${(osImpressao.pecas?.length > 0 || osImpressao.orcamento?.pecas?.length > 0) ? `
            <p><strong>Peças:</strong></p>
            ${(osImpressao.orcamento?.pecas || osImpressao.pecas).map(p => `<p>• ${p.produto_nome || 'Produto'} (${p.quantidade}x) - R$ ${(parseFloat(p.valor_unitario || 0) * parseInt(p.quantidade || 1)).toFixed(2)}</p>`).join('')}
          ` : ''}
          
          <p class="valor-total"><strong>VALOR TOTAL: R$ ${parseFloat(osImpressao.valor_total || osImpressao.orcamento?.valor_total || 0).toFixed(2)}</strong> | Prazo: ${osImpressao.orcamento?.prazo_dias || 0} dias úteis</p>
        </div>
        ` : ''}

        <!-- Termos e Condições -->
        <div class="termos">
          <strong>TERMOS E CONDIÇÕES DE GARANTIA E SERVIÇO</strong>
          <p><strong>1. Retirada de Acessórios:</strong><br/>
          Antes de entregar o aparelho para conserto, retire o chip, cartão de memória e capa. A ${empresa.nome || 'Smart Express'} não se responsabiliza por nenhum acessório deixado no dispositivo. Apenas o aparelho</p>

          <p><strong>2. Garantia de 90 dias</strong><br/>
          A garantia cobre somente o serviço executado e as peças substituídas durante o reparo. A garantia de 90 dias não se aplica a danos causados por uso indevido, queda, contato com líquidos ou modificações não autorizadas no aparelho. A garantia poderá ser extinta caso o aparelho apresente sinais de abertura não autorizada ou se os selos de reparo estiverem violados.</p>

          <p><strong>3. Perda de Dados</strong><br/>
          A ${empresa.nome || 'Smart Express'} não se responsabiliza pela perda de dados armazenados no aparelho durante o reparo. Recomendamos que o cliente faça backup de todos os dados antes de entregar o dispositivo para o conserto.</p>

          <p><strong>4. Privacidade e Confidencialidade</strong><br/>
          A ${empresa.nome || 'Smart Express'} mantém sigilo e confidencialidade sobre todas as informações armazenadas no aparelho. A senha do dispositivo será solicitada somente se necessário para a execução do serviço e será tratada com total privacidade. Nenhuma informação pessoal será acessada ou divulgada sem a autorização prévia do cliente.</p>

          <p><strong>5. Prazo para Retirada do Aparelho</strong><br/>
          O aparelho deve ser retirado em até 90 dias após o reparo. Caso o cliente não retire o aparelho dentro deste prazo, o dispositivo será desmontado e/ou descartado para cobrir os custos com peças e mão de obra. A ${empresa.nome || 'Smart Express'} não se responsabiliza por aparelhos não retirados após o prazo.</p>

          <p><strong>6. Exclusões da Garantia</strong><br/>
          A garantia não cobre os seguintes casos:<br/>
          Danos causados por líquidos, queda, mau uso ou acidentes;<br/>
          Solda de botões e conectores de carga em caso de mau uso ou danos físicos causados pelo cliente;<br/>
          Aparelhos à prova d'água, que perdem a vedação original após a abertura do dispositivo;<br/>
          Danos causados por modificações de software (como root, aplicativos com vírus ou arquivos corrompidos);<br/>
          Processos de desoxidação ou reparos relacionados a aparelhos molhados (recuperação de placas);</p>

          <p><strong>7. Garantia de Fábrica</strong><br/>
          A abertura do aparelho pode resultar na perda da garantia de fábrica, caso o dispositivo ainda esteja dentro desse período de cobertura. A ${empresa.nome || 'Smart Express'} não se responsabiliza por perdas de garantia de fábrica após o reparo ou abertura do aparelho.</p>

          <p><strong>8. Validação da Garantia</strong><br/>
          A garantia será válida apenas com a apresentação da Ordem de Serviço (OS) correspondente ao reparo realizado. Em caso de perda da OS, será necessário fornecer dados de identificação do serviço realizado.</p>

          <p><strong>9. Responsabilidade Limitada</strong><br/>
          A ${empresa.nome || 'Smart Express'} não se responsabiliza por danos indiretos, lucros cessantes ou qualquer outro tipo de perda não relacionada diretamente ao serviço executado ou peças substituídas. A responsabilidade da empresa está limitada ao reparo realizado.</p>

          <p><strong>10. Alterações nos Termos</strong><br/>
          A ${empresa.nome || 'Smart Express'} se reserva o direito de alterar os termos e condições descritos neste documento a qualquer momento, sendo as alterações válidas a partir da data de publicação de novos termos.</p>

          <p class="declaracao">Declaro estar ciente e de acordo com todos os termos e condições acima descritos.</p>
        </div>

        <!-- Assinatura -->
        <div class="assinatura">
          <div class="linha-assinatura"></div>
          <p>${(osImpressao.cliente_nome || 'CLIENTE').toUpperCase()}</p>
        </div>
      </div>
    `;

    const conteudoImpressao = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS - ${osImpressao.codigo_os}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              margin: 13mm 3mm 3mm 3mm;
              size: A4;
            }
            body { margin: 0; padding: 0; }
            .pagina { page-break-after: always; }
            .pagina:last-child { page-break-after: auto; }
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            font-size: 7.5px;
            color: #000;
            line-height: 1.2;
            margin: 0;
            padding: 2px;
          }
          .pagina {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
          }

          /* Header */
          .header {
            display: flex;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 3px;
          }

          .header-logo {
            width: 70px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .header-logo img {
            max-width: 65px;
            max-height: 50px;
            object-fit: contain;
          }

          .logo-placeholder {
            width: 65px;
            height: 50px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #999;
          }

          .header-empresa {
            flex: 1;
            text-align: center;
            padding: 0 8px;
          }

          .header-empresa h1 {
            margin: 0;
            font-size: 11px;
            font-weight: bold;
          }

          .header-empresa p {
            margin: 1px 0;
            font-size: 7px;
          }

          .header-info {
            width: 90px;
            text-align: right;
            flex-shrink: 0;
          }

          .header-info .data-hora {
            font-size: 7px;
            margin: 0;
          }

          .os-numero {
            border: 2px solid #000;
            padding: 3px 8px;
            margin-top: 3px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
          }

          /* Título */
          .titulo-os {
            text-align: center;
            font-size: 18px;
            font-weight: normal;
            margin: 5px 0;
            color: #666;
            border-bottom: 2px solid #f0c040;
            padding-bottom: 3px;
          }

          /* Seções */
          .secao {
            border: 1px solid #000;
            margin-bottom: 2px;
          }

          .secao-titulo {
            background: #f5f5f5;
            padding: 1.5px 4px;
            font-weight: bold;
            font-size: 8px;
            border-bottom: 1px solid #000;
          }

          .secao-conteudo {
            padding: 2px 4px;
          }

          /* Tabela de dados */
          table {
            width: 100%;
            border-collapse: collapse;
          }

          .dados-cliente td,
          .dados-aparelho td {
            padding: 1px 4px;
            font-size: 8px;
            vertical-align: top;
          }

          .problema-relatado {
            margin-top: 3px;
            font-size: 8px;
          }

          /* Checklist */
          .checklist-container {
            display: flex;
            gap: 10px;
          }

          .checklist-itens {
            flex: 1;
          }

          .checklist-item {
            font-size: 7px;
            padding: 1px 0;
            color: #333;
          }

          .checklist-item.checked {
            font-weight: bold;
          }

          .checklist-lateral {
            width: 120px;
            flex-shrink: 0;
          }

          .padrao-senha {
            margin-bottom: 5px;
          }

          .observacao-box {
            border: 1px solid #000;
            padding: 4px;
            min-height: 40px;
            background: #fff;
          }

          .observacao-box strong {
            font-size: 7px;
          }

          .observacao-box p {
            margin: 3px 0 0 0;
            font-size: 7px;
          }

          /* Pré-aprovado */
          .pre-aprovado {
            border: 2px solid #000;
            padding: 5px 10px;
            margin-bottom: 4px;
            background: #f9f9f9;
            font-size: 10px;
          }

          /* Orçamento */
          .orcamento-box {
            border: 2px solid #28a745;
            padding: 4px;
            margin-bottom: 3px;
            background: #d4edda;
            font-size: 8.5px;
          }

          .orcamento-box p {
            margin: 2px 0;
          }

          .valor-total {
            margin-top: 4px !important;
            padding-top: 3px;
            border-top: 1px solid #28a745;
            font-size: 10px !important;
          }

          /* Termos */
          .termos {
            font-size: 6.5px;
            line-height: 1.2;
            margin-bottom: 2px;
          }

          .termos strong:first-child {
            display: block;
            font-size: 7px;
            margin-bottom: 2px;
          }

          .termos p {
            margin: 1.5px 0;
            text-align: justify;
          }

          .termos .declaracao {
            font-style: italic;
            margin-top: 3px;
          }

          /* Assinatura */
          .assinatura {
            text-align: center;
            margin-top: 5px;
          }

          .linha-assinatura {
            width: 250px;
            border-top: 1px solid #000;
            margin: 0 auto 3px auto;
          }

          .assinatura p {
            margin: 0;
            font-size: 9px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${Array(numVias).fill(0).map((_, index) => gerarConteudoVia(index + 1)).join('')}
      </body>
      </html>
    `;

    const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
    if (janelaImpressao) {
      janelaImpressao.document.write(conteudoImpressao);
      janelaImpressao.document.close();

      setTimeout(() => {
        janelaImpressao.focus();
        janelaImpressao.print();
      }, 500);
    }

    setDialogImpressao(false);
  };

  const handleAlterarStatus = async () => {
    if (!novoStatusSelecionado) {
      toast.error("Selecione um status");
      return;
    }

    const observacao = await confirm({
      title: "Observação de Mudança",
      description: "Digite uma observação para a alteração:",
      confirmText: "Salvar",
      cancelText: "Cancelar",
      type: "prompt",
      inputOptions: {
        placeholder: "Digite aqui a observação..."
      }
    });

    if (!observacao) return;

    updateStatusMutation.mutate({
      id: selectedOS.id,
      novoStatus: novoStatusSelecionado,
      observacao: `Status alterado manualmente - ${observacao}`
    });

    setDialogAlterarStatus(false);
  };

  const formatarDataHora = (dataStr) => {
    if (!dataStr) return 'N/A';
    const d = new Date(dataStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  const osFiltradas = ordensServico.filter(os => {
    const matchStatus = filtroStatus === "todas" || os.status === filtroStatus;
    const matchSearch = !searchTerm ||
      os.codigo_os?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.aparelho?.modelo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordens de Serviço</h1>
          <p className="text-slate-500">Gerencie o fluxo de assistência técnica</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-200 rounded-lg p-1">
            <Button
              variant={visualizacao === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVisualizacao('cards')}
              className="px-3"
            >
              Quadros
            </Button>
            <Button
              variant={visualizacao === 'lista' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVisualizacao('lista')}
              className="px-3"
            >
              Lista
            </Button>
          </div>
          <Button onClick={() => { resetForm(); setDialogOS(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova OS
          </Button>
        </div>
      </div>

      {/* Atalhos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-white"
          onClick={() => setFiltroStatus('recebido')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">OS Abertas</p>
                <p className="text-3xl font-bold text-blue-600">
                  {ordensServico.filter(os => !['entregue', 'faturada', 'cancelado'].includes(os.status)).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-orange-50 to-white"
          onClick={() => setFiltroStatus('aguardando_aprovacao')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Aguardando Aprovação</p>
                <p className="text-3xl font-bold text-orange-600">
                  {ordensServico.filter(os => os.status === 'aguardando_aprovacao').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-indigo-50 to-white"
          onClick={() => setFiltroStatus('em_conserto')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Em Conserto</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {ordensServico.filter(os => os.status === 'em_conserto').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-green-50 to-white"
          onClick={() => setFiltroStatus('pronto')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Prontas</p>
                <p className="text-3xl font-bold text-green-600">
                  {ordensServico.filter(os => os.status === 'pronto').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por código, cliente ou aparelho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="em_conserto">Em Conserto</SelectItem>
                <SelectItem value="pronto">Pronto</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="faturada">Faturada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visualização Cards */}
      {visualizacao === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {osFiltradas.map((os) => {
            const statusConfig = STATUS_CONFIG[os.status] || STATUS_CONFIG.recebido;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={os.id} className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setSelectedOS(os); setDialogDetalhes(true); }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold font-mono text-lg">{os.codigo_os}</p>
                      <p className="text-sm text-slate-600">{os.cliente_nome}</p>
                    </div>
                    <StatusIcon className="w-6 h-6 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                      <span>{os.aparelho?.marca} {os.aparelho?.modelo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{formatarDataHora(os.data_entrada)}</span>
                    </div>
                    <Badge className={`${statusConfig.color} text-white`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {osFiltradas.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma OS encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* Visualização Lista */}
      {visualizacao === 'lista' && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Código</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Cliente</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Aparelho</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Entrada</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Técnico</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="p-4 text-right text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {osFiltradas.map((os) => {
                    const statusConfig = STATUS_CONFIG[os.status] || STATUS_CONFIG.recebido;

                    return (
                      <tr key={os.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-bold text-sm">{os.codigo_os}</span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-sm">{os.cliente_nome}</p>
                            <p className="text-xs text-slate-500">{os.cliente_telefone}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium">{os.aparelho?.marca} {os.aparelho?.modelo}</p>
                          <p className="text-xs text-slate-500">IMEI: {os.aparelho?.imei || 'N/A'}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {formatarDataHora(os.data_entrada)}
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{os.tecnico_responsavel || 'Não atribuído'}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={`${statusConfig.color} text-white whitespace-nowrap`}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedOS(os); setDialogDetalhes(true); }}
                          >
                            Ver Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {osFiltradas.length === 0 && (
              <div className="text-center py-16">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma OS encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Ordem de Serviço - {selectedOS?.codigo_os}</DialogTitle>
          </DialogHeader>

          {selectedOS && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Cliente</p>
                  <p className="font-semibold text-lg">{selectedOS.cliente_nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Status</p>
                  <Badge className={`${STATUS_CONFIG[selectedOS.status]?.color} text-white mt-1`}>
                    {STATUS_CONFIG[selectedOS.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Atendente</p>
                  <p className="font-medium">{selectedOS.atendente_abertura || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Técnico</p>
                  <p className="font-medium">{selectedOS.tecnico_responsavel || 'Gabriel'}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-3">Aparelho</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-600">Marca/Modelo:</span> <span className="font-medium">{selectedOS.aparelho?.marca} {selectedOS.aparelho?.modelo}</span></div>
                  <div><span className="text-slate-600">IMEI:</span> <span className="font-mono">{selectedOS.aparelho?.imei || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Capacidade:</span> <span className="font-medium">{selectedOS.aparelho?.capacidade || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Cor:</span> <span className="font-medium">{selectedOS.aparelho?.cor || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Operadora:</span> <span className="font-medium">{selectedOS.aparelho?.operadora || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Senha:</span> <span className="font-medium">{selectedOS.aparelho?.senha || 'N/A'}</span></div>
                  {selectedOS.aparelho?.serial && <div><span className="text-slate-600">Serial:</span> <span className="font-mono">{selectedOS.aparelho?.serial || 'N/A'}</span></div>}
                  {selectedOS.aparelho?.acessorios_entregues && (
                    <div className="col-span-2"><span className="text-slate-600">Acessórios:</span> <span className="font-medium">{selectedOS.aparelho.acessorios_entregues}</span></div>
                  )}
                </div>
              </div>

              {selectedOS.fotos && selectedOS.fotos.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-600" />
                    Fotos do Aparelho ({selectedOS.fotos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {selectedOS.fotos.map((foto, index) => (
                      <a
                        key={index}
                        href={foto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-all"
                      >
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                            Clique para ampliar
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedOS.checklist_entrada && Object.keys(selectedOS.checklist_entrada).length > 0 && (
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      Checklist de Entrada
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {configChecklist.entrada.map((item) => {
                        if (item.id === 'valor_pre_aprovado' || item.id === 'pre_aprovado' || item.id === 'orcamento') return null;
                        const value = selectedOS.checklist_entrada[item.id];
                        let displayLabel = item.label;
                        if (item.id === 'possui_senha' && selectedOS.aparelho?.senha) {
                          displayLabel += ` → ${selectedOS.aparelho.senha}`;
                        } else if (item.id === 'possui_chip' && selectedOS.aparelho?.operadora) {
                          displayLabel += ` → ${selectedOS.aparelho.operadora}`;
                        }

                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-all ${value
                              ? 'bg-green-50 border-2 border-green-200'
                              : 'bg-slate-50 border-2 border-slate-200'
                              }`}
                          >
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${value ? 'bg-green-500' : 'bg-slate-300'
                              }`}>
                              {value ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : (
                                <X className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-relaxed ${value ? 'text-green-900 font-medium' : 'text-slate-600'}`}>
                                {displayLabel}
                              </p>
                            </div>
                            <Badge variant={value ? "default" : "secondary"} className={`flex-shrink-0 ${value ? 'bg-green-600' : 'bg-slate-400'}`}>
                              {value ? 'Sim' : 'Não'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>

                    {(selectedOS.checklist_entrada.pre_aprovado || selectedOS.checklist_entrada.orcamento) && (
                      <div className="mt-4 pt-4 border-t-2 border-dashed">
                        {selectedOS.checklist_entrada.pre_aprovado && (
                          <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="font-bold text-green-900">Pré-aprovado pelo Cliente</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                  R$ {(parseFloat(selectedOS.checklist_entrada.valor_pre_aprovado) || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedOS.checklist_entrada.orcamento && (
                          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="font-bold text-blue-900">Aguardando Orçamento</p>
                                <p className="text-sm text-blue-700">Cliente solicitou avaliação antes de aprovar</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">Defeito Reclamado</h3>
                <p className="text-slate-700">{selectedOS.defeito_reclamado}</p>
              </div>

              {selectedOS.observacoes_cliente && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2">Observações</h3>
                  <p className="text-slate-700">{selectedOS.observacoes_cliente}</p>
                </div>
              )}

              {(selectedOS.orcamento || selectedOS.servicos?.length > 0 || selectedOS.pecas?.length > 0) && (() => {
                const orcServicos = selectedOS.orcamento?.servicos || selectedOS.servicos || [];
                const orcPecas = selectedOS.orcamento?.pecas || selectedOS.pecas || [];
                const orcDiagnostico = selectedOS.orcamento?.diagnostico || selectedOS.diagnostico;
                const orcPrazo = selectedOS.orcamento?.prazo_dias || configuracoes?.os?.prazo_padrao_dias || 7;

                // Recalcular sempre a partir dos itens
                const totalServicos = orcServicos.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
                const totalPecas = orcPecas.reduce((sum, p) => sum + ((parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 1)), 0);
                const totalFinal = totalServicos + totalPecas || parseFloat(selectedOS.orcamento?.valor_total || selectedOS.valor_total || 0);

                return (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Orçamento
                    </h3>
                    {orcDiagnostico && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-1">Diagnóstico:</p>
                        <p className="text-slate-700">{orcDiagnostico}</p>
                      </div>
                    )}
                    {orcServicos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-1">Serviços:</p>
                        <ul className="text-sm space-y-1">
                          {orcServicos.map((s, i) => (
                            <li key={i}>• {s.descricao} - R$ {parseFloat(s.valor || 0).toFixed(2)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {orcPecas.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-1">Peças:</p>
                        <ul className="text-sm space-y-1">
                          {orcPecas.map((p, i) => (
                            <li key={i}>• {p.produto_nome || 'Produto'} (x{p.quantidade || 1}) - R$ {((parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 1)).toFixed(2)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                      <span>Valor Total:</span>
                      <span className="2xl font-bold text-green-600">
                        R$ {totalFinal.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">Prazo: {orcPrazo} dias úteis</p>
                  </div>
                );
              })()}

              {selectedOS.checklist_finalizacao && Object.keys(selectedOS.checklist_finalizacao).length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-bold mb-3">Checklist de Finalização</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {configChecklist.finalizacao.map((item) => {
                      if (item.id === 'observacoes_finalizacao') return null;
                      const value = selectedOS.checklist_finalizacao[item.id];
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                          <span className="text-slate-700">{item.label}</span>
                          <span className="font-bold">{value ? 'Sim' : 'Não'}</span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedOS.checklist_finalizacao?.observacoes_finalizacao && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold mb-1">Observações da Finalização:</p>
                      <p className="text-slate-700">{selectedOS.checklist_finalizacao.observacoes_finalizacao}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-3">Histórico</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Array.isArray(selectedOS.historico) ? selectedOS.historico.map((hist, idx) => (
                    <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                      <p className="font-mono text-xs text-slate-500">{formatarDataHora(hist.data)}</p>
                      <p className="font-semibold">{hist.usuario} - {hist.observacao}</p>
                    </div>
                  )) : (typeof selectedOS.historico === 'string' ? (() => {
                    try {
                      const parsed = JSON.parse(selectedOS.historico);
                      return Array.isArray(parsed) ? parsed.map((hist, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                          <p className="font-mono text-xs text-slate-500">{formatarDataHora(hist.data)}</p>
                          <p className="font-semibold">{hist.usuario} - {hist.observacao}</p>
                        </div>
                      )) : null;
                    } catch (e) { return null; }
                  })() : null)}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-bold mb-3">Ações Disponíveis</h3>

                {selectedOS.status === 'recebido' && (
                  <Button
                    onClick={() => {
                      const hasOrcamento = !!selectedOS.orcamento;
                      const hasItems = (selectedOS.servicos?.length > 0 || selectedOS.pecas?.length > 0);

                      // Normalizar os serviços e peças para garantir que valores sejam números
                      const normalizeServicos = (list) => (list || []).map(s => ({
                        ...s,
                        valor: parseFloat(s.valor) || 0
                      }));
                      const normalizePecas = (list) => (list || []).map(p => ({
                        ...p,
                        quantidade: parseInt(p.quantidade) || 1,
                        valor_unitario: parseFloat(p.valor_unitario) || 0
                      }));

                      const servicosCarregados = selectedOS.orcamento?.servicos?.length
                        ? normalizeServicos(selectedOS.orcamento.servicos)
                        : (selectedOS.servicos?.length ? normalizeServicos(selectedOS.servicos) : [{ descricao: "", valor: 0 }]);

                      const pecasCarregadas = selectedOS.orcamento?.pecas?.length
                        ? normalizePecas(selectedOS.orcamento.pecas)
                        : (selectedOS.pecas?.length ? normalizePecas(selectedOS.pecas) : []);

                      setOrcamentoData(hasOrcamento || hasItems ? {
                        diagnostico: selectedOS.orcamento?.diagnostico || selectedOS.diagnostico || "",
                        laudo_tecnico: selectedOS.orcamento?.laudo_tecnico || selectedOS.laudo_tecnico || "",
                        servicos: servicosCarregados,
                        pecas: pecasCarregadas,
                        valor_total: 0, // será calculado em tempo real na tela
                        prazo_dias: selectedOS.orcamento?.prazo_dias || configuracoes?.os?.prazo_padrao_dias || 7
                      } : {
                        diagnostico: selectedOS.diagnostico || "",
                        laudo_tecnico: selectedOS.laudo_tecnico || "",
                        servicos: [{ descricao: "", valor: 0 }],
                        pecas: [],
                        valor_total: 0,
                        prazo_dias: configuracoes?.os?.prazo_padrao_dias || 7
                      });
                      setDialogOrcamento(true);
                    }}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Abrir Orçamento
                  </Button>
                )}

                {selectedOS.status === 'aguardando_aprovacao' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedOS.id,
                        novoStatus: "aprovado",
                        observacao: "Orçamento aprovado pelo cliente",
                        dadosAdicionais: {
                          orcamento: {
                            ...(selectedOS.orcamento || {}),
                            orcamento_aprovado: true,
                            data_aprovacao_orcamento: new Date().toISOString()
                          }
                        }
                      })}
                      className="h-12 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Aprovar Orçamento
                    </Button>
                    <Button
                      onClick={async () => {
                        const motivo = await confirm({
                          title: "Reprovar Orçamento",
                          description: "Motivo da reprovação:",
                          confirmText: "Reprovar",
                          cancelText: "Cancelar",
                          type: "prompt",
                          inputOptions: {
                            placeholder: "Descreva o motivo..."
                          }
                        });

                        if (motivo) {
                          updateStatusMutation.mutate({
                            id: selectedOS.id,
                            novoStatus: "orcamento_reprovado",
                            observacao: `Reprovado - ${motivo}`,
                            dadosAdicionais: {
                              orcamento: {
                                ...(selectedOS.orcamento || {}),
                                orcamento_aprovado: false,
                                motivo_reprovacao: motivo
                              }
                            }
                          });
                        }
                      }}
                      className="h-12 bg-red-600 hover:bg-red-700"
                    >
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Reprovar Orçamento
                    </Button>
                  </div>
                )}

                {selectedOS.status === 'aprovado' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({
                      id: selectedOS.id,
                      novoStatus: "em_conserto",
                      observacao: "Serviço iniciado"
                    })}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Wrench className="w-5 h-5 mr-2" />
                    Iniciar Serviço
                  </Button>
                )}

                {selectedOS.status === 'em_conserto' && (
                  <Button
                    onClick={() => {
                      abrirChecklistFinal();
                    }}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalizar Serviço
                  </Button>
                )}

                {selectedOS.status === 'pronto' && !selectedOS.venda_id && selectedOS.status !== 'faturada' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedOS.id,
                        novoStatus: "entregue",
                        observacao: "Aparelho entregue ao cliente"
                      })}
                      className="h-12 bg-slate-800 hover:bg-slate-900"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar Entregue
                    </Button>
                    <Button
                      onClick={() => {
                        if (!selectedOS.orcamento) {
                          toast.error("Esta OS não possui orçamento.");
                          return;
                        }
                        navigate('/pdv', { state: { osToBill: selectedOS } });
                      }}
                      className="h-12 bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Faturar no PDV
                    </Button>
                  </div>
                )}
                {selectedOS.status === 'entregue' && selectedOS.orcamento && !selectedOS.venda_id && selectedOS.status !== 'faturada' && (
                  <Button
                    onClick={() => navigate('/pdv', { state: { osToBill: selectedOS } })}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 mt-2 mb-3"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Faturar Orçamento no PDV
                  </Button>
                )}
                {(selectedOS.status === 'faturada' || selectedOS.venda_id) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-2 mb-3">
                    <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      OS Faturada no PDV
                    </p>
                    {selectedOS.data_faturamento && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Faturada em: {format(new Date(selectedOS.data_faturamento), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => imprimirOS(selectedOS, configuracoes?.impressao?.vias_os || 2)} variant="outline" className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={() => {
                      setNovoStatusSelecionado(selectedOS.status);
                      setDialogAlterarStatus(true);
                    }}
                    variant="outline"
                    className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Alterar Status
                  </Button>
                  <Button onClick={() => setDialogDetalhes(false)} variant="outline" className="flex-1">
                    Fechar
                  </Button>
                  {selectedOS.status !== 'entregue' && selectedOS.status !== 'faturada' && selectedOS.status !== 'cancelado' && (
                    <Button
                      onClick={async () => {
                        const motivo = await confirm({
                          title: "Cancelar Ordem de Serviço",
                          description: "A O.S cancelada não poderá ser reaberta posteriormente.",
                          type: "prompt",
                          inputOptions: {
                            label: "Motivo do cancelamento *",
                            placeholder: "Digite o motivo do cancelamento",
                            type: "text"
                          },
                          confirmText: "Sim, Cancelar O.S",
                          cancelText: "Desistir"
                        });

                        if (motivo) {
                          updateStatusMutation.mutate({
                            id: selectedOS.id,
                            novoStatus: "cancelado",
                            observacao: `Cancelada - ${motivo}`,
                            dadosAdicionais: {
                              itens_adicionais: {
                                ...(selectedOS.itens_adicionais || {}),
                                motivo_cancelamento: motivo,
                                data_cancelamento: new Date().toISOString()
                              }
                            }
                          });
                        }
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar OS
                    </Button>
                  )}
                  {configuracoes?.sistema?.permitir_exclusao_os === true && (
                    <Button
                      onClick={async () => {
                        const confirmado = await confirm({
                          title: "Excluir Ordem de Serviço",
                          description: "ATENÇÃO: Esta ação é irreversível e excluirá permanentemente a Ordem de Serviço do banco de dados.",
                          type: "prompt",
                          inputOptions: {
                            label: "Digite EXCLUIR para confirmar",
                            placeholder: "EXCLUIR",
                            type: "text"
                          },
                          confirmText: "Excluir Permanentemente",
                          cancelText: "Desistir"
                        });

                        if (confirmado === "EXCLUIR") {
                          deleteOSMutation.mutate(selectedOS.id);
                        } else if (confirmado) {
                          toast.error("Palavra de segurança incorreta. A exclusão foi cancelada.");
                        }
                      }}
                      variant="ghost"
                      className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 font-bold"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOS} onOpenChange={(open) => { setDialogOS(open); if (!open) pararCamera(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientePopoverOpen}
                      className="flex-1 justify-between font-normal"
                    >
                      {formData.cliente_id
                        ? (() => {
                          const cliente = clientes.find(c => c.id === formData.cliente_id);
                          return cliente ? `${cliente.nome_completo} - ${cliente.telefone1}` : "Selecione o cliente";
                        })()
                        : "Selecione o cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar cliente por nome ou telefone..."
                        value={clienteSearchTerm}
                        onValueChange={setClienteSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientes
                            .filter(cliente => {
                              const searchLower = clienteSearchTerm.toLowerCase();
                              return (
                                cliente.nome_completo?.toLowerCase().includes(searchLower) ||
                                cliente.telefone1?.includes(clienteSearchTerm) ||
                                cliente.telefone2?.includes(clienteSearchTerm) ||
                                cliente.cpf_cnpj?.includes(clienteSearchTerm)
                              );
                            })
                            .map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={`${cliente.nome_completo} ${cliente.telefone1}`}
                                onSelect={() => {
                                  handleChange('cliente_id', cliente.id);
                                  setClientePopoverOpen(false);
                                  setClienteSearchTerm("");
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${formData.cliente_id === cliente.id ? "opacity-100" : "opacity-0"
                                    }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{cliente.nome_completo}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {cliente.telefone1} {cliente.cpf_cnpj ? `• ${cliente.cpf_cnpj}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  onClick={() => setDialogNovoClienteCompleto(true)}
                  variant="outline"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Dados do Aparelho</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Marca *</Label>
                  <Select
                    value={formData.aparelho.marca}
                    onValueChange={(value) => handleAparelhoChange('marca', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARCAS_DISPONIVEIS.map((marca) => (
                        <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Modelo *</Label>
                  <Input
                    value={formData.aparelho.modelo}
                    onChange={(e) => handleAparelhoChange('modelo', e.target.value)}
                    required
                    placeholder="Ex: iPhone 13"
                  />
                </div>

                <div>
                  <Label>Cor</Label>
                  <Input
                    value={formData.aparelho.cor}
                    onChange={(e) => handleAparelhoChange('cor', e.target.value)}
                    placeholder="Ex: Preto"
                  />
                </div>

                <div>
                  <Label>Capacidade</Label>
                  <Select
                    value={formData.aparelho.capacidade}
                    onValueChange={(value) => handleAparelhoChange('capacidade', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES_DISPONIVEIS.map((cap) => (
                        <SelectItem key={cap} value={cap}>{cap}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>IMEI</Label>
                  <Input
                    value={formData.aparelho.imei}
                    onChange={(e) => handleAparelhoChange('imei', e.target.value)}
                    placeholder="000000000000000"
                  />
                </div>

                <div>
                  <Label>Serial</Label>
                  <Input
                    value={formData.aparelho.serial}
                    onChange={(e) => handleAparelhoChange('serial', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Operadora</Label>
                  <Select
                    value={formData.aparelho.operadora}
                    onValueChange={(value) => handleAparelhoChange('operadora', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERADORAS.map((op) => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Senha do Aparelho</Label>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.aparelho.tipo_senha === 'texto'}
                        onChange={() => handleAparelhoChange('tipo_senha', 'texto')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Digitável (PIN/Número/Letra)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.aparelho.tipo_senha === 'padrao'}
                        onChange={() => handleAparelhoChange('tipo_senha', 'padrao')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Padrão</span>
                    </label>
                  </div>

                  {formData.aparelho.tipo_senha === 'texto' ? (
                    <Input
                      value={formData.aparelho.senha}
                      onChange={(e) => handleAparelhoChange('senha', e.target.value)}
                      placeholder="Digite a senha (PIN, número ou letra)"
                    />
                  ) : (
                    <PatternLock
                      value={formData.aparelho.senha}
                      onChange={(pattern) => handleAparelhoChange('senha', pattern)}
                    />
                  )}
                </div>

                <div className="col-span-2">
                  <Label>Acessórios Entregues</Label>
                  <Textarea
                    value={formData.aparelho.acessorios_entregues}
                    onChange={(e) => handleAparelhoChange('acessorios_entregues', e.target.value)}
                    placeholder="Ex: Carregador, capa, fone..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4 text-lg">Checklist de Entrada</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {configChecklist.entrada.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id={`entrada-${item.id}`}
                      checked={checklistEntrada[item.id] || false}
                      onChange={(e) => setChecklistEntrada(prev => ({
                        ...prev,
                        [item.id]: e.target.checked
                      }))}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    id="pre_aprovado"
                    name="tipo_orcamento_radio"
                    checked={tipoOrcamento === 'pre_aprovado'}
                    onChange={() => setTipoOrcamento('pre_aprovado')}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Pré-aprovado
                  </span>
                </label>

                {tipoOrcamento === 'pre_aprovado' && (
                  <div className="ml-7">
                    <Label className="text-sm">Valor Pré-aprovado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorPreAprovado}
                      onChange={(e) => setValorPreAprovado(parseFloat(e.target.value) || 0)}
                      placeholder="R$ 0,00"
                      onFocus={(e) => e.target.select()}
                      className="mt-1"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    id="orcamento_radio"
                    name="tipo_orcamento_radio"
                    checked={tipoOrcamento === 'orcamento'}
                    onChange={() => setTipoOrcamento('orcamento')}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Orçamento
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    id="nenhum_orcamento_radio"
                    name="tipo_orcamento_radio"
                    checked={tipoOrcamento === 'nenhum'}
                    onChange={() => setTipoOrcamento('nenhum')}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Nenhum
                  </span>
                </label>
              </div>
            </div>

            <div>
              <Label>Defeito Reclamado *</Label>
              <Textarea
                value={formData.defeito_reclamado}
                onChange={(e) => handleChange('defeito_reclamado', e.target.value)}
                required
                placeholder="Descreva o defeito... Ex: O cliente disse que caiu no celular com o celular no bolso e parou de ligar no mesmo momento!"
                rows={3}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes_cliente}
                onChange={(e) => handleChange('observacoes_cliente', e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>

            <div>
              <Label>Fotos do Aparelho</Label>

              {!capturandoFoto ? (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">{uploading ? "Enviando..." : "Escolher arquivo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                        multiple
                      />
                    </label>

                    <Button
                      type="button"
                      onClick={iniciarCamera}
                      variant="outline"
                      disabled={uploading}
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Câmera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-80 object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={capturarFoto}
                      className="flex-1 bg-blue-600"
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? "Salvando..." : "Capturar"}
                    </Button>
                    <Button
                      type="button"
                      onClick={pararCamera}
                      variant="outline"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              )}

              {formData.fotos && formData.fotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {formData.fotos.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            fotos: prev.fotos.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOS(false); pararCamera(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600">
                Criar OS
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ClienteFormDialog
        open={dialogNovoClienteCompleto}
        onOpenChange={(open) => {
          setDialogNovoClienteCompleto(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
          }
        }}
      />

      <Dialog open={dialogOrcamento} onOpenChange={setDialogOrcamento}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orçamento para OS {selectedOS?.codigo_os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Diagnóstico</Label>
              <Textarea
                value={orcamentoData.diagnostico}
                onChange={(e) => setOrcamentoData(prev => ({ ...prev, diagnostico: e.target.value }))}
                rows={3}
                placeholder="Diagnóstico do aparelho"
              />
            </div>

            <div>
              <Label>Laudo Técnico</Label>
              <Textarea
                value={orcamentoData.laudo_tecnico}
                onChange={(e) => setOrcamentoData(prev => ({ ...prev, laudo_tecnico: e.target.value }))}
                rows={4}
                placeholder="Detalhes do laudo técnico"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold">Serviços</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-slate-600">
                  <div className="col-span-8">Descrição do Serviço</div>
                  <div className="col-span-3">Valor</div>
                  <div className="col-span-1"></div>
                </div>
                {orcamentoData.servicos.map((servico, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-8"
                      value={servico.descricao}
                      onChange={(e) => handleServicoChange(index, 'descricao', e.target.value)}
                      placeholder="Ex: Troca de tela"
                    />
                    <Input
                      className="col-span-3"
                      type="number"
                      step="0.01"
                      value={servico.valor}
                      onChange={(e) => handleServicoChange(index, 'valor', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeServico(index)}
                      disabled={orcamentoData.servicos.length === 1}
                      className="col-span-1 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addServico} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Serviço
              </Button>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold">Peças</h4>
              {(() => {
                const pecasDisponiveis = produtos.filter(p => p.categoria === 'peças_de_reposição');
                return (
                  <>
                    {pecasDisponiveis.length === 0 && (
                      <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                        Nenhuma peça cadastrada. Cadastre produtos com categoria "Peças de Reposição" na página de Produtos.
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-slate-600">
                        <div className="col-span-6">Peça</div>
                        <div className="col-span-2">Qtd</div>
                        <div className="col-span-3">Valor Unit.</div>
                        <div className="col-span-1"></div>
                      </div>
                      {orcamentoData.pecas.map((peca, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="col-span-6 justify-between font-normal"
                              >
                                {peca.produto_id
                                  ? pecasDisponiveis.find(p => p.id === peca.produto_id)?.nome || "Selecione..."
                                  : "Buscar peça..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar peça..." />
                                <CommandList>
                                  <CommandEmpty>Nenhuma peça encontrada.</CommandEmpty>
                                  <CommandGroup>
                                    {pecasDisponiveis.map((produto) => (
                                      <CommandItem
                                        key={produto.id}
                                        value={produto.nome}
                                        onSelect={() => handlePecaChange(index, 'produto_id', produto.id)}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${peca.produto_id === produto.id ? "opacity-100" : "opacity-0"}`}
                                        />
                                        <div className="flex flex-col">
                                          <span>{produto.nome}</span>
                                          <span className="text-xs text-slate-500">R$ {parseFloat(produto.preco_venda || 0).toFixed(2)}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Input
                            className="col-span-2"
                            type="number"
                            value={peca.quantidade}
                            onChange={(e) => handlePecaChange(index, 'quantidade', e.target.value)}
                            onFocus={(e) => e.target.select()}
                          />
                          <Input
                            className="col-span-3"
                            type="number"
                            step="0.01"
                            value={peca.valor_unitario}
                            onChange={(e) => handlePecaChange(index, 'valor_unitario', e.target.value)}
                            onFocus={(e) => e.target.select()}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePeca(index)}
                            className="col-span-1 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={addPeca} size="sm" disabled={pecasDisponiveis.length === 0}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Peça
                    </Button>
                  </>
                );
              })()}
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-lg font-bold">Valor Total:</span>
              <span className="2xl font-bold text-green-600">
                R$ {calcularValorTotalOrcamento(orcamentoData).toFixed(2)}
              </span>
            </div>

            <div>
              <Label>Prazo de Entrega (dias úteis)</Label>
              <Input
                type="number"
                value={orcamentoData.prazo_dias}
                onChange={(e) => setOrcamentoData(prev => ({ ...prev, prazo_dias: parseInt(e.target.value) || 0 }))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOrcamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitOrcamento} className="bg-slate-900 hover:bg-slate-800">
              <DollarSign className="w-4 h-4 mr-2" /> Gerar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogChecklistFinal} onOpenChange={setDialogChecklistFinal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Serviço - OS {selectedOS?.codigo_os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <h3 className="font-semibold text-lg">Checklist de Finalização</h3>
            <p className="text-sm text-slate-600">Marque os itens que foram testados e estão funcionando</p>

            <div className="grid grid-cols-2 gap-3">
              {configChecklist.finalizacao.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`final-${item.id}`}
                    checked={checklistFinal[item.id] || false}
                    onChange={(e) => setChecklistFinal(prev => ({
                      ...prev,
                      [item.id]: e.target.checked
                    }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`final-${item.id}`} className="cursor-pointer text-sm">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>

            <div>
              <Label>Observações da Finalização</Label>
              <Textarea
                value={checklistFinal.observacoes_finalizacao || ""}
                onChange={(e) => setChecklistFinal(prev => ({
                  ...prev,
                  observacoes_finalizacao: e.target.value
                }))}
                rows={3}
                placeholder="Detalhes sobre os testes e a finalização do serviço..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogChecklistFinal(false)}>
              Cancelar
            </Button>
            <Button onClick={finalizarComChecklist} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como Pronto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impressão */}
      <Dialog open={dialogImpressao} onOpenChange={setDialogImpressao}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              Imprimir Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                OS <span className="font-mono text-lg">{osParaImprimir?.codigo_os}</span> criada com sucesso!
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Deseja imprimir a ordem de serviço agora?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => imprimirOS(osParaImprimir, 2)}
                className="h-24 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Printer className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-bold">2 Vias</div>
                  <div className="text-xs opacity-90">(Cliente + Loja)</div>
                </div>
              </Button>
              <Button
                onClick={() => imprimirOS(osParaImprimir, 1)}
                className="h-24 flex flex-col items-center justify-center bg-slate-600 hover:bg-slate-700 text-white gap-2"
              >
                <Printer className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-bold">1 Via</div>
                  <div className="text-xs opacity-90">(Cliente)</div>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogImpressao(false)} className="w-full">
              Não Imprimir Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Status */}
      <Dialog open={dialogAlterarStatus} onOpenChange={setDialogAlterarStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              OS: <strong className="font-mono">{selectedOS?.codigo_os}</strong>
            </p>
            <div className="text-sm text-slate-600 flex items-center gap-2">
              Status atual: <Badge className={`${STATUS_CONFIG[selectedOS?.status]?.color} text-white`}>
                {STATUS_CONFIG[selectedOS?.status]?.label}
              </Badge>
            </div>

            <div>
              <Label>Novo Status</Label>
              <Select value={novoStatusSelecionado} onValueChange={setNovoStatusSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-900">
                ⚠️ <strong>Atenção:</strong> Alterar o status manualmente pode afetar o fluxo normal da OS. Use apenas em caso de erro ou necessidade especial.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAlterarStatus(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAlterarStatus} className="bg-orange-600 hover:bg-orange-700">
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}