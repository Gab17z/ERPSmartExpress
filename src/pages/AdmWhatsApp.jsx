import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";;
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  User,
  Check,
  CheckCheck,
  Tag,
  Folder,
  Plus,
  Settings,
  MessageCircle,
  ArrowLeft,
  Smile,
  Circle,
  RefreshCw,
  Wifi,
  WifiOff,
  Archive,
  Star,
  Mic,
  Zap,
  Clock,
  ArrowRightLeft,
  DollarSign,
  Wrench,
  Building2,
  ShoppingCart,
  HelpCircle,
  MessageSquareWarning,
  FileText,
  Headphones,
  Receipt,
  Pin,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// URL do servidor WhatsApp local
const WHATSAPP_SERVER_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

const CORES_ETIQUETAS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6b7280"
];

const SETORES = [
  { id: "geral", nome: "Geral", icon: MessageSquare, cor: "#6b7280" },
  { id: "vendas", nome: "Vendas", icon: ShoppingCart, cor: "#10b981" },
  { id: "financeiro", nome: "Financeiro", icon: DollarSign, cor: "#f59e0b" },
  { id: "assistencia_tecnica", nome: "Assistência Técnica", icon: Wrench, cor: "#3b82f6" },
  { id: "administracao", nome: "Administração", icon: Building2, cor: "#8b5cf6" },
];

const CATEGORIAS = [
  { id: "geral", nome: "Geral", icon: MessageSquare, cor: "#6b7280" },
  { id: "orcamento", nome: "Orçamento", icon: FileText, cor: "#3b82f6" },
  { id: "suporte", nome: "Suporte", icon: Headphones, cor: "#10b981" },
  { id: "reclamacao", nome: "Reclamação", icon: MessageSquareWarning, cor: "#ef4444" },
  { id: "informacao", nome: "Informação", icon: HelpCircle, cor: "#06b6d4" },
  { id: "pos_venda", nome: "Pós-Venda", icon: CheckCircle, cor: "#84cc16" },
  { id: "cobranca", nome: "Cobrança", icon: Receipt, cor: "#f59e0b" },
];

export default function AdmWhatsApp() {
  const { lojaFiltroId } = useLoja();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [sugestoesResposta, setSugestoesResposta] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("todas");
  const [painelAtivo, setPainelAtivo] = useState("conversas");
  const [dialogPasta, setDialogPasta] = useState(false);
  const [dialogEtiqueta, setDialogEtiqueta] = useState(false);
  const [dialogNovaConversa, setDialogNovaConversa] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogRespostaRapida, setDialogRespostaRapida] = useState(false);
  const [dialogTransferir, setDialogTransferir] = useState(false);
  const [dialogConectar, setDialogConectar] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [dialogExcluirTodas, setDialogExcluirTodas] = useState(false);
  const [excluindoTodas, setExcluindoTodas] = useState(false);
  const [dialogVincularCliente, setDialogVincularCliente] = useState(false);
  const [novaPasta, setNovaPasta] = useState({ nome: "", cor: "#3b82f6" });
  const [novaEtiqueta, setNovaEtiqueta] = useState({ nome: "", cor: "#10b981" });
  const [novaConversa, setNovaConversa] = useState({ telefone: "", nome: "" });
  const [novaResposta, setNovaResposta] = useState({ atalho: "", titulo: "", mensagem: "" });
  const [transferencia, setTransferencia] = useState({ setor: "", motivo: "" });
  const [testando, setTestando] = useState(false);
  const [mobileView, setMobileView] = useState("lista");
  const messagesEndRef = useRef(null);

  // Estados para conexão Socket.IO e QR Code
  const [qrCode, setQrCode] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [connectedNumber, setConnectedNumber] = useState(null);
  const socketRef = useRef(null);
  const syncCompletedRef = useRef(false); // Flag para evitar REST fallback se Socket funcionou
  const syncStartedRef = useRef(false); // Flag para evitar syncs duplicados na mesma sessão
  const photosFetchStartedRef = useRef(false); // Flag para evitar busca de fotos duplicada

  // Estados para sincronização progressiva
  const [syncProgress, setSyncProgress] = useState(null); // { processed, total, percentage }
  const [isSyncing, setIsSyncing] = useState(false);
  // Carregar conversas do localStorage se existirem
  const [syncedConversations, setSyncedConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('whatsapp_conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
    }
    return [];
  });
  const [forceFullSync, setForceFullSync] = useState(false); // Flag para forçar sync completo

  // Estado para evitar envios duplicados
  const [isSending, setIsSending] = useState(false);

  // Estado para anexos
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const fileInputRef = useRef(null);

  // Estado para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Estado para emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Estado para visualização de imagem ampliada
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  // Emojis comuns organizados por categoria
  const emojis = {
    "Mais usados": ["😀", "😂", "🥰", "😍", "😊", "🙏", "👍", "❤️", "🔥", "✨", "💯", "🎉"],
    "Rostos": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥"],
    "Gestos": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "✍️", "💪", "👏", "🙌"],
    "Coração": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
    "Objetos": ["🎁", "🎈", "🎉", "🎊", "🎂", "🎄", "🎃", "💰", "💵", "📱", "💻", "⌚", "📷", "🎵", "🎶", "🔔", "⭐", "🌟", "💫", "✨", "🔥", "💯"]
  };

  // Conexão Socket.IO com servidor WhatsApp
  useEffect(() => {
    // Conectar ao servidor WhatsApp via Socket.IO
    const socket = io(WHATSAPP_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
    });

    socket.on('status', (data) => {
      setWhatsappStatus(data.status);
      if (data.number) {
        setConnectedNumber(data.number);
      }
      // Atualizar configWpp no banco se conectado
      if (data.status === 'connected') {
        setQrCode(null);
        salvarConfigMutation.mutate({
          tipo_integracao: 'whatsapp-web.js',
          conectado: true,
          ultimo_status: "Conectado em " + new Date().toLocaleString('pt-BR'),
          numero_conectado: data.number || ''
        });
        // A sincronização será iniciada automaticamente pelo useEffect
      } else if (data.status === 'disconnected') {
        salvarConfigMutation.mutate({
          conectado: false,
          ultimo_status: "Desconectado"
        });
      }
    });

    socket.on('qr', (data) => {
      setQrCode(data.qr);
      setWhatsappStatus('qr_ready');
    });

    socket.on('ready', (data) => {
      setQrCode(null);
      setWhatsappStatus('connected');
      setConnectedNumber(data.number);
      toast.success('WhatsApp conectado com sucesso!');
      setDialogConectar(false);
      // A sincronização será iniciada automaticamente pelo useEffect
    });

    socket.on('disconnected', (data) => {
      setWhatsappStatus('disconnected');
      setConnectedNumber(null);
      setQrCode(null);
      // Limpar lista de conversas e conversa selecionada
      setSyncedConversations([]);
      setConversaSelecionada(null);
      // Limpar estados de sincronização
      setIsSyncing(false);
      setSyncProgress(null);
      // Resetar flags de sync para próxima conexão
      syncStartedRef.current = false;
      syncCompletedRef.current = false;
      photosFetchStartedRef.current = false;
    });

    // Eventos de sincronização progressiva
    socket.on('sync_start', (data) => {
      syncCompletedRef.current = true; // Marcar que socket respondeu
      photosFetchStartedRef.current = false; // Resetar para buscar fotos após sync
      setIsSyncing(true);
      setSyncProgress({ processed: 0, total: data.total, percentage: 0 });
      setSyncedConversations([]);
    });

    socket.on('sync_progress', (data) => {
      setSyncProgress({
        processed: data.processed,
        total: data.total,
        percentage: data.percentage
      });
      setSyncedConversations(data.conversations);
    });

    socket.on('sync_complete', (data) => {
      setIsSyncing(false);
      setSyncProgress(null);
      setSyncedConversations(data.conversations);
      // Salvar no localStorage para cache
      try {
        localStorage.setItem('whatsapp_conversations', JSON.stringify(data.conversations));
        localStorage.setItem('whatsapp_conversations_timestamp', Date.now().toString());
      } catch (e) {
      }
      // Resetar flag para permitir refresh manual posterior
      syncStartedRef.current = false;
      setForceFullSync(false);
      // Invalidar query do banco para atualizar dados mesclados
      queryClient.invalidateQueries({ queryKey: ['conversas-banco'] });
    });

    socket.on('sync_error', (data) => {
      console.error('🔴 SOCKET sync_error:', data.error);
      setIsSyncing(false);
      setSyncProgress(null);
      syncStartedRef.current = false; // Resetar flag para permitir retry
      toast.error('Erro ao sincronizar conversas');
    });

    // Atualização de fotos de perfil em background
    socket.on('profile_pics_update', (data) => {
      if (data.updates && data.updates.length > 0) {
        setSyncedConversations(prev => {
          const updated = [...prev];
          for (const update of data.updates) {
            const idx = updated.findIndex(c => c.id === update.id);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], profilePicUrl: update.profilePicUrl };
            }
          }
          return updated;
        });
      }
    });

    socket.on('message', (data) => {
      // Atualizar query do banco
      queryClient.invalidateQueries({ queryKey: ['conversas-banco'] });

      // Se a mensagem é nossa (fromMe), não adicionar pois já foi adicionada localmente com os dados de mídia
      if (data.fromMe) {
        return;
      }

      // Atualizar a lista de conversas sincronizadas (mover para o topo e atualizar última mensagem)
      setSyncedConversations(prev => {
        const chatId = data.from;
        const existingIdx = prev.findIndex(c => c.id === chatId);

        if (existingIdx !== -1) {
          // Conversa existe - atualizar e mover para o topo
          const updated = [...prev];
          const conv = { ...updated[existingIdx] };
          conv.lastMessage = data.body;
          conv.timestamp = data.timestamp;
          conv.unreadCount = (conv.unreadCount || 0) + 1;

          // Se veio nome do contato, atualizar
          if (data.contactName && !data.contactName.startsWith('+')) {
            conv.name = data.contactName;
          }

          // Remover da posição atual e adicionar no início
          updated.splice(existingIdx, 1);
          updated.unshift(conv);

          // Salvar no localStorage
          try {
            localStorage.setItem('whatsapp_conversations', JSON.stringify(updated));
          } catch (e) {}

          return updated;
        } else {
          // Conversa nova - adicionar no topo
          const newConv = {
            id: chatId,
            name: data.contactName || chatId.split('@')[0],
            phoneNumber: chatId.split('@')[0],
            isGroup: chatId.includes('@g.us'),
            unreadCount: 1,
            lastMessage: data.body,
            timestamp: data.timestamp,
            profilePicUrl: data.profilePicUrl || null
          };

          const updated = [newConv, ...prev];

          // Salvar no localStorage
          try {
            localStorage.setItem('whatsapp_conversations', JSON.stringify(updated));
          } catch (e) {}

          return updated;
        }
      });

      // Se a mensagem é da conversa atual, adicionar em tempo real
      setConversaSelecionada(prev => {
        if (prev && data.from === prev.id) {
          // Verificar se a mensagem já existe para evitar duplicatas
          const mensagemExiste = (prev.mensagens || []).some(m => m.id === data.id);
          if (mensagemExiste) {
            return prev;
          }

          const novaMensagem = {
            id: data.id,
            tipo: 'entrada',
            texto: data.body,
            data: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
            lida: false,
            hasMedia: data.hasMedia,
            messageType: data.type,
            media: data.media // Incluir dados de mídia se disponíveis
          };
          return {
            ...prev,
            mensagens: [...(prev.mensagens || []), novaMensagem]
          };
        }
        return prev;
      });

      // Notificação sonora para mensagens recebidas
      if (!data.fromMe) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZeUj4F1aWRqc4OQm5+bkYN0Z2NqeIuanp2Sg3JmZGx6jZygnpKBb2RlbnuPnqKfk4BuY2Vvf5GfoaCUgW1jZnGBk6GjoJOAbWNncYKUoqShlIFsYmdyhZajpaKUgWtjaHOGl6WmpqSWgmpianWImqiqp6WXgWlianWJm6mqqqiZgmhianaMnKusrKqbg2dianaNnqyurrCtnoRmZ2p3j5+ur7CsnoVlZ2p4kKCvsLGtnoVkZmp5kaCwsbKun4VjZmp6kqGxsrOvoIZiZmt7k6KytLWwoYZhZmt7k6OytbaxoodhZWt8lKSzt7eyo4dgZGt8laW0uLmzpIhfZGt9lqa1ubq1pYheY2t+l6e2ur23pohcYmp+l6i3vL65qIlbYmp/mKm4vb+6qYpaYWqAmai5vsC7q4tZYGqBmqm6v8G9rIxXX2mBm6q7wMK+rY1XX2mCnKu8wcO/r45VXmqCnay9wsXBsJBUXWmDnq2+w8bCs5FTXGmEn66/xMfEtJJSW2iFoK/AxcjFtZNRWmmGoLHBxsnHt5VPWGWGMVPC');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    });

    socket.on('message_sent', (data) => {
    });

    socket.on('connect_error', (error) => {
      console.error('Erro de conexão Socket.IO:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Função para iniciar sincronização progressiva via Socket (com fallback REST)
  // Usada apenas pelo botão de refresh manual
  const iniciarSincronizacao = useCallback(async () => {
    if (whatsappStatus !== 'connected') {
      toast.error('WhatsApp não conectado');
      return;
    }
    if (isSyncing || syncStartedRef.current) {
      return;
    }

    syncStartedRef.current = true; // Marcar sync como iniciado
    syncCompletedRef.current = false;

    // Tentar via Socket primeiro
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('sync_conversations', { limit: 500 });

      // Aguardar 5 segundos para ver se o socket responde
      setTimeout(async () => {
        if (syncCompletedRef.current) {
          return;
        }
        // Socket não respondeu, usar REST
        await sincronizarViaREST();
      }, 5000);
    } else {
      // Fallback: usar REST API diretamente
      await sincronizarViaREST();
    }
  }, [whatsappStatus, isSyncing]);

  // Fallback: sincronização via REST API
  const sincronizarViaREST = useCallback(async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncProgress({ processed: 0, total: 0, percentage: 0 });
      toast.info('Carregando conversas...');

      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/conversations?limit=500`);
      const data = await response.json();

      if (data.conversations) {
        setSyncedConversations(data.conversations);
        // Salvar no localStorage
        try {
          localStorage.setItem('whatsapp_conversations', JSON.stringify(data.conversations));
          localStorage.setItem('whatsapp_conversations_timestamp', Date.now().toString());
        } catch (e) {
        }
        toast.success(`${data.conversations.length} conversas carregadas!`);
      } else if (data.error) {
        console.error('Erro REST:', data.error);
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Erro ao sincronizar via REST:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
      syncStartedRef.current = false; // Resetar flag para permitir refresh manual
      setForceFullSync(false);
    }
  }, [isSyncing]);

  // Auto-sincronizar quando conectado e sem conversas carregadas OU quando forçado
  useEffect(() => {

    // Verificar se já iniciamos sync nesta sessão (exceto se for forçado)
    if (syncStartedRef.current && !forceFullSync) {
      return;
    }

    // Se já tem conversas no cache e não está forçando sync, não fazer nada
    if (syncedConversations.length > 0 && !forceFullSync) {
      return;
    }

    // Sincronizar se: (não tem conversas E conectado) OU (forçou sync E conectado)
    const shouldSync = whatsappStatus === 'connected' && !isSyncing && (syncedConversations.length === 0 || forceFullSync);

    if (shouldSync) {

      const timer = setTimeout(async () => {
        // Double-check se ainda não iniciou (pode ter mudado durante o timeout)
        if (syncStartedRef.current) {
          return;
        }
        syncStartedRef.current = true; // Marcar que iniciamos sync

        // Tentar via Socket primeiro
        if (socketRef.current && socketRef.current.connected) {
          syncCompletedRef.current = false; // Reset flag antes de tentar
          socketRef.current.emit('sync_conversations', { limit: 500 });

          // Se não receber resposta em 5s, usar REST API
          setTimeout(async () => {

            // Se o socket já respondeu (syncCompletedRef = true), não precisamos do REST fallback
            if (syncCompletedRef.current) {
              return;
            }

            // Socket não respondeu, usar REST API como fallback
            try {
              setIsSyncing(true);
              toast.info('Carregando conversas via REST...');
              const url = `${WHATSAPP_SERVER_URL}/api/conversations?limit=500`;
              const response = await fetch(url);
              const data = await response.json();
              if (data.conversations) {
                setSyncedConversations(data.conversations);
                toast.success(`${data.conversations.length} conversas carregadas!`);
              } else if (data.error) {
                console.error('REST API Error:', data.error);
                toast.error(data.error);
              } else {
              }
            } catch (e) {
              console.error('REST API Exception:', e);
              toast.error('Erro ao carregar conversas');
            } finally {
              setIsSyncing(false);
              syncStartedRef.current = false; // Permitir retry
            }
          }, 5000);
        } else {
          // Usar REST API diretamente
          try {
            setIsSyncing(true);
            toast.info('Carregando conversas...');
            const response = await fetch(`${WHATSAPP_SERVER_URL}/api/conversations?limit=500`);
            const data = await response.json();
            if (data.conversations) {
              setSyncedConversations(data.conversations);
              toast.success(`${data.conversations.length} conversas carregadas!`);
            }
          } catch (e) {
            console.error('Erro REST:', e);
            toast.error('Erro ao carregar conversas');
          } finally {
            setIsSyncing(false);
            syncStartedRef.current = false; // Permitir retry
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [whatsappStatus, isSyncing, syncedConversations.length, forceFullSync]);

  // Buscar fotos de perfil em background quando usando cache
  useEffect(() => {
    // Só executar se:
    // 1. WhatsApp está conectado
    // 2. Temos conversas carregadas (provavelmente do cache)
    // 3. Não estamos sincronizando
    // 4. Ainda não iniciamos busca de fotos
    if (whatsappStatus !== 'connected' || syncedConversations.length === 0 || isSyncing || photosFetchStartedRef.current) {
      return;
    }

    // Verificar quantas conversas estão sem foto
    const conversasSemFoto = syncedConversations.filter(c => !c.profilePicUrl && !c.isGroup);
    const percentualSemFoto = (conversasSemFoto.length / syncedConversations.length) * 100;

    // Se mais de 50% das conversas estão sem foto, provavelmente vieram do cache
    if (percentualSemFoto < 50) {
      return;
    }

    // Marcar que iniciamos a busca de fotos
    photosFetchStartedRef.current = true;

    // Buscar fotos em lotes de 10
    const fetchPhotosInBatches = async () => {
      const batchSize = 10;
      const conversasParaBuscar = conversasSemFoto.slice(0, 100); // Limitar a 100 para não sobrecarregar

      for (let i = 0; i < conversasParaBuscar.length; i += batchSize) {
        const batch = conversasParaBuscar.slice(i, i + batchSize);
        const updates = [];

        await Promise.all(batch.map(async (conv) => {
          try {
            const response = await fetch(`${WHATSAPP_SERVER_URL}/api/profile-pic/${encodeURIComponent(conv.id)}`);
            const data = await response.json();
            if (data.profilePicUrl) {
              updates.push({ id: conv.id, profilePicUrl: data.profilePicUrl });
            }
          } catch (e) {
            // Ignorar erros de foto
          }
        }));

        // Atualizar estado com as fotos encontradas
        if (updates.length > 0) {
          setSyncedConversations(prev => {
            const updated = [...prev];
            for (const update of updates) {
              const idx = updated.findIndex(c => c.id === update.id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], profilePicUrl: update.profilePicUrl };
              }
            }
            // Salvar no localStorage com fotos atualizadas
            try {
              localStorage.setItem('whatsapp_conversations', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        // Pequena pausa entre lotes para não sobrecarregar
        if (i + batchSize < conversasParaBuscar.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    };

    // Executar após um pequeno delay para não competir com outras operações
    const timer = setTimeout(fetchPhotosInBatches, 2000);

    return () => clearTimeout(timer);
  }, [whatsappStatus, syncedConversations.length, isSyncing]);

  // Buscar conversas do banco de dados
  const { data: conversasBanco = [], isLoading: loadingConversasBanco } = useQuery({
    queryKey: ['conversas-banco'],
    queryFn: () => lojaFiltroId ? base44.entities.ConversaWhatsApp.filter({ loja_id: lojaFiltroId }, { order: '-ultima_mensagem_data' }) : base44.entities.ConversaWhatsApp.list('-ultima_mensagem_data'),
    staleTime: 60000
  });

  // Mesclar conversas do WhatsApp com dados do banco
  const mesclarConversas = useCallback((conversasWhatsApp) => {
    if (!conversasWhatsApp || conversasWhatsApp.length === 0) return [];

    const mapaBanco = new Map();
    conversasBanco.forEach(conv => {
      if (conv.whatsapp_id) {
        mapaBanco.set(conv.whatsapp_id, conv);
      }
    });

    return conversasWhatsApp.map(conv => {
      const phoneNumber = conv.phoneNumber || conv.id.split('@')[0];
      const conversaBanco = mapaBanco.get(conv.id);

      if (conversaBanco) {
        return {
          ...conversaBanco,
          telefone: phoneNumber,
          nome_cliente: conv.name || conversaBanco.nome_cliente || phoneNumber,
          ultima_mensagem: conv.lastMessage || conversaBanco.ultima_mensagem,
          ultima_mensagem_data: conv.timestamp ? new Date(conv.timestamp * 1000).toISOString() : conversaBanco.ultima_mensagem_data,
          nao_lida: conv.unreadCount > 0,
          unread_count: conv.unreadCount || 0,
          is_group: conv.isGroup,
          profilePicUrl: conv.profilePicUrl,
          whatsapp_id: conv.id
        };
      } else {
        return {
          id: conv.id,
          whatsapp_id: conv.id,
          telefone: phoneNumber,
          nome_cliente: conv.name || phoneNumber,
          ultima_mensagem: conv.lastMessage || '',
          ultima_mensagem_data: conv.timestamp ? new Date(conv.timestamp * 1000).toISOString() : null,
          nao_lida: conv.unreadCount > 0,
          unread_count: conv.unreadCount || 0,
          is_group: conv.isGroup,
          profilePicUrl: conv.profilePicUrl,
          mensagens: [],
          setor: 'geral',
          categoria: 'geral',
          status: 'novo',
          favorita: false,
          fixada: false,
          arquivada: false
        };
      }
    });
  }, [conversasBanco]);

  // Conversas finais (mescladas com dados do banco)
  const conversas = whatsappStatus !== 'connected'
    ? []
    : mesclarConversas(syncedConversations);

  const loadingConversas = isSyncing || loadingConversasBanco;

  // Função para atualizar conversas (usado pelo botão de refresh)
  const refetchConversas = iniciarSincronizacao;

  const { data: pastas = [] } = useQuery({
    queryKey: ['pastas-whatsapp'],
    queryFn: () => lojaFiltroId ? base44.entities.PastaWhatsApp.filter({ loja_id: lojaFiltroId }, { order: 'ordem' }) : base44.entities.PastaWhatsApp.list('ordem'),
    staleTime: 60000
  });

  const { data: etiquetas = [] } = useQuery({
    queryKey: ['etiquetas-whatsapp'],
    queryFn: () => lojaFiltroId ? base44.entities.EtiquetaWhatsApp.filter({ loja_id: lojaFiltroId }, { order: 'nome' }) : base44.entities.EtiquetaWhatsApp.list('nome'),
    staleTime: 60000
  });

  const { data: configWpp } = useQuery({
    queryKey: ['config-whatsapp'],
    queryFn: async () => {
      const configs = lojaFiltroId ? await base44.entities.ConfigWhatsApp.filter({ loja_id: lojaFiltroId }) : await base44.entities.ConfigWhatsApp.list();
      return configs[0] || null;
    },
    staleTime: 60000
  });

  const { data: chatbotConfig } = useQuery({
    queryKey: ['chatbot-config'],
    queryFn: async () => {
      const configs = lojaFiltroId ? await base44.entities.ChatbotConfig.filter({ loja_id: lojaFiltroId }) : await base44.entities.ChatbotConfig.list();
      return configs[0] || null;
    },
    staleTime: 30000
  });

  // Query para buscar todos os clientes (para verificar se contato é cliente)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }) : base44.entities.Cliente.list(),
    staleTime: 60000
  });

  // Função para verificar se um telefone é de um cliente
  const verificarSeCliente = (telefone) => {
    if (!telefone || clientes.length === 0) return null;
    // Limpar telefone para comparação (remover caracteres não numéricos)
    const telLimpo = telefone.replace(/\D/g, '');
    // Remover 55 do início se tiver
    const telSemDDI = telLimpo.startsWith('55') ? telLimpo.slice(2) : telLimpo;

    return clientes.find(c => {
      const tel1 = (c.telefone1 || '').replace(/\D/g, '');
      const tel2 = (c.telefone2 || '').replace(/\D/g, '');
      return tel1 === telSemDDI || tel2 === telSemDDI ||
             tel1 === telLimpo || tel2 === telLimpo ||
             telSemDDI.endsWith(tel1) || telSemDDI.endsWith(tel2) ||
             tel1.endsWith(telSemDDI) || tel2.endsWith(telSemDDI);
    });
  };

  // Função para processar resposta do chatbot
  const processarChatbot = async (mensagemTexto, telefone, conversaId) => {
    if (!chatbotConfig?.ativo) return null;

    const msgLower = mensagemTexto.toLowerCase().trim();
    
    // Verificar horário de atendimento
    const agora = new Date();
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaAtual = diasSemana[agora.getDay()];
    const horarioAtual = chatbotConfig.horario_atendimento?.[diaAtual];
    
    let dentroHorario = true;
    if (horarioAtual && !horarioAtual.ativo) {
      dentroHorario = false;
    } else if (horarioAtual?.inicio && horarioAtual?.fim) {
      const horaAtual = agora.getHours() * 60 + agora.getMinutes();
      const [hInicio, mInicio] = horarioAtual.inicio.split(':').map(Number);
      const [hFim, mFim] = horarioAtual.fim.split(':').map(Number);
      const inicio = hInicio * 60 + mInicio;
      const fim = hFim * 60 + mFim;
      dentroHorario = horaAtual >= inicio && horaAtual <= fim;
    }

    if (!dentroHorario && chatbotConfig.mensagem_fora_horario) {
      return chatbotConfig.mensagem_fora_horario;
    }

    // Verificar palavras-chave
    if (chatbotConfig.palavras_chave?.length > 0) {
      const palavrasOrdenadas = [...chatbotConfig.palavras_chave].sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99));
      for (const pc of palavrasOrdenadas) {
        if (pc.palavras?.some(p => msgLower.includes(p.toLowerCase()))) {
          if (pc.resposta) return pc.resposta;
          // Se não tem resposta, é saudação - enviar boas-vindas
          break;
        }
      }
    }

    // Verificar se é opção do menu
    if (chatbotConfig.menu_opcoes?.length > 0) {
      const opcao = chatbotConfig.menu_opcoes.find(m => m.numero === msgLower);
      if (opcao) return opcao.resposta;
    }

    // Verificar se é saudação para enviar boas-vindas + menu
    const saudacoes = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'eae', 'eai', 'hey', 'hi', 'hello'];
    if (saudacoes.some(s => msgLower.includes(s))) {
      let resposta = chatbotConfig.mensagem_boas_vindas || 'Olá! Como posso ajudar?';
      if (chatbotConfig.menu_opcoes?.length > 0) {
        resposta += '\n\n' + chatbotConfig.menu_opcoes.map(m => `${m.numero}. ${m.titulo}`).join('\n');
      }
      return resposta;
    }

    return null;
  };

  // Função para enviar resposta do bot
  const enviarRespostaBot = async (telefone, texto, conversaId, mensagensAtuais) => {
    try {
      const telefoneFormatado = telefone.replace(/\D/g, '');

      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: telefoneFormatado,
          message: texto
        })
      });

      const data = await response.json();

      if (data.success) {
        const novaMensagem = {
          id: `bot_${Date.now()}`,
          tipo: "saida",
          texto: texto,
          data: new Date().toISOString(),
          lida: true,
          bot: true
        };

        await base44.entities.ConversaWhatsApp.update(conversaId, {
          mensagens: [...mensagensAtuais, novaMensagem],
          ultima_mensagem: texto,
          ultima_mensagem_data: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Erro ao enviar resposta do bot:", error);
    }
  };

  // As mensagens são recebidas em tempo real via Socket.IO

  const updateConversaMutation = useMutation({
    mutationFn: async ({ id, dados }) => {
      // Verificar se o ID é um UUID válido (não contém @)
      if (id && !id.includes('@')) {
        return base44.entities.ConversaWhatsApp.update(id, dados);
      }
      // Se não é UUID, a conversa ainda não foi sincronizada - ignorar
      return null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversas-banco'] })
  });

  const criarConversaMutation = useMutation({
    mutationFn: (dados) => base44.entities.ConversaWhatsApp.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-banco'] });
      setDialogNovaConversa(false);
      setNovaConversa({ telefone: "", nome: "" });
      toast.success("Conversa criada!");
    }
  });

  const criarPastaMutation = useMutation({
    mutationFn: (dados) => base44.entities.PastaWhatsApp.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastas-whatsapp'] });
      setDialogPasta(false);
      setNovaPasta({ nome: "", cor: "#3b82f6" });
      toast.success("Pasta criada!");
    }
  });

  const criarEtiquetaMutation = useMutation({
    mutationFn: (dados) => base44.entities.EtiquetaWhatsApp.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-whatsapp'] });
      setDialogEtiqueta(false);
      setNovaEtiqueta({ nome: "", cor: "#10b981" });
      toast.success("Etiqueta criada!");
    }
  });

  const salvarConfigMutation = useMutation({
    mutationFn: async (dados) => {
      // Sempre buscar o registro existente primeiro para evitar duplicados
      const configs = lojaFiltroId ? await base44.entities.ConfigWhatsApp.filter({ loja_id: lojaFiltroId }) : await base44.entities.ConfigWhatsApp.list();
      const existingConfig = configs[0];

      if (existingConfig?.id) {
        return base44.entities.ConfigWhatsApp.update(existingConfig.id, dados);
      } else {
        return base44.entities.ConfigWhatsApp.create(dados);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-whatsapp'] });
      toast.success("Configurações salvas!");
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversaSelecionada?.mensagens]);

  // Função para selecionar arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificar tamanho (max 16MB)
      if (file.size > 16 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 16MB.");
        return;
      }

      setArquivoSelecionado(file);

      // Criar preview para imagens
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewArquivo(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreviewArquivo(null);
      }
    }
  };

  // Função para remover arquivo selecionado
  const removerArquivo = () => {
    setArquivoSelecionado(null);
    setPreviewArquivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Função para converter arquivo para base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Ref para chunks de áudio (evita problemas de closure)
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);

  // Iniciar gravação de áudio
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Verificar formatos suportados - priorizar OGG (compatível com WhatsApp nota de voz)
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
        }

        if (blob.size > 0) {
          await enviarAudio(blob, mimeType);
        } else {
          console.error('Blob vazio, não há áudio para enviar');
          toast.error('Nenhum áudio gravado');
        }
      };

      // Gravar em chunks de 250ms
      recorder.start(250);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  // Parar gravação de áudio e enviar
  const pararGravacao = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    } else {
    }
  };

  // Cancelar gravação
  const cancelarGravacao = () => {
    if (mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setMediaRecorder(null);
    audioChunksRef.current = [];
  };

  // Enviar áudio gravado
  const enviarAudio = async (blob, mimeType = 'audio/webm') => {
    if (!conversaSelecionada) {
      toast.error('Selecione uma conversa primeiro');
      return;
    }

    try {
      // Converter blob para base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (result) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error('Erro ao ler áudio'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Usar o whatsapp_id (ID completo do WhatsApp como @c.us, @lid, @g.us, etc)
      const chatId = conversaSelecionada.whatsapp_id || conversaSelecionada.id;

      // Determinar extensão e mimetype base (sem codecs)
      let ext = 'webm';
      let baseMimeType = 'audio/webm';
      if (mimeType.includes('ogg')) {
        ext = 'ogg';
        baseMimeType = 'audio/ogg';
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        ext = 'mp3';
        baseMimeType = 'audio/mpeg';
      }


      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: chatId,
          message: '',
          media: {
            mimetype: baseMimeType,
            data: base64,
            filename: `audio.${ext}`
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Áudio enviado!');
        // Adicionar mensagem na lista com dados do áudio para o player
        const novaMensagem = {
          id: data.messageId || `audio_${Date.now()}`,
          tipo: 'saida',
          fromMe: true,
          texto: '',
          data: new Date().toISOString(),
          timestamp: Math.floor(Date.now() / 1000),
          lida: true,
          hasMedia: true,
          messageType: 'ptt', // ptt = push-to-talk (nota de voz)
          media: {
            mimetype: baseMimeType,
            data: base64,
            filename: `audio.${ext}`
          }
        };
        setConversaSelecionada(prev => {
          if (!prev) return prev;
          const novasMensagens = [...(prev.mensagens || []), novaMensagem];
          return {
            ...prev,
            mensagens: novasMensagens
          };
        });
      } else {
        toast.error(data.error || 'Erro ao enviar áudio');
      }
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
      toast.error('Erro ao enviar áudio');
    }
  };

  const enviarMensagem = async () => {
    // CORREÇÃO: Verificar mutex para evitar envios duplicados
    if (isSending) {
      return;
    }

    // Verificar se tem mensagem ou arquivo
    if (!mensagem.trim() && !arquivoSelecionado) return;
    if (!conversaSelecionada) return;

    const textoMensagem = mensagem;
    const arquivo = arquivoSelecionado;
    setMensagem("");
    setArquivoSelecionado(null);
    setPreviewArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsSending(true);

    try {
      // Enviar via API REST do servidor local
      if (whatsappStatus === 'connected' || configWpp?.conectado) {
        // Usar o whatsapp_id (ID completo do WhatsApp como @c.us, @lid, @g.us, etc)
        const chatId = conversaSelecionada.whatsapp_id || conversaSelecionada.id;

        let mediaData = null;
        if (arquivo) {
          const base64 = await fileToBase64(arquivo);
          mediaData = {
            mimetype: arquivo.type,
            data: base64,
            filename: arquivo.name
          };
        }

        const response = await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: chatId,
            message: textoMensagem || '',
            media: mediaData
          })
        });

        const data = await response.json();

        if (!data.success) {
          console.error("Erro no envio:", data);
          toast.error(data.error || "Erro ao enviar mensagem");
          setMensagem(textoMensagem);
          setIsSending(false);
          return;
        }
      } else {
        toast.error("WhatsApp não está conectado. Clique no ícone de WiFi para conectar.");
        setMensagem(textoMensagem);
        setIsSending(false);
        return;
      }

      // Gerar ID único para a mensagem enviada (apenas em memória)
      const novaMensagem = {
        id: `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tipo: "saida",
        texto: textoMensagem || (arquivo ? `📎 ${arquivo.name}` : ''),
        data: new Date().toISOString(),
        lida: true,
        hasMedia: !!arquivo,
        media: arquivo && previewArquivo ? { mimetype: arquivo.type, data: previewArquivo.split(',')[1] } : null
      };

      const mensagensAtualizadas = [...(conversaSelecionada.mensagens || []), novaMensagem];

      // Atualizar apenas metadados no banco (mensagens ficam no servidor WhatsApp)
      await updateConversaMutation.mutateAsync({
        id: conversaSelecionada.id,
        dados: {
          ultima_mensagem: textoMensagem,
          ultima_mensagem_data: new Date().toISOString(),
          aguardando_resposta: false,
          status: "respondido"
        }
      });

      // Atualizar mensagens apenas em memória (serão sincronizadas do servidor WhatsApp)
      setConversaSelecionada(prev => ({ ...prev, mensagens: mensagensAtualizadas, aguardando_resposta: false }));
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("=== ERRO ENVIO ===");
      console.error("Erro:", error);
      console.error("Response:", error.response);
      toast.error("Erro ao enviar: " + (error.response?.data?.error || error.message));
      setMensagem(textoMensagem);
    } finally {
      setIsSending(false); // CORREÇÃO: Sempre liberar mutex
    }
  };

  const selecionarConversa = async (conversa) => {
    setMobileView("chat");

    // Usar whatsapp_id para buscar do servidor WhatsApp (fallback para id se não existir)
    const chatId = conversa.whatsapp_id || conversa.id;

    // Carregar mensagens do servidor WhatsApp
    if (whatsappStatus === 'connected' && chatId) {
      try {
        const response = await fetch(`${WHATSAPP_SERVER_URL}/api/messages/${encodeURIComponent(chatId)}`);
        const data = await response.json();

        if (data.messages) {
          const mensagensFormatadas = data.messages.map(msg => ({
            id: msg.id,
            tipo: msg.fromMe ? 'saida' : 'entrada',
            texto: msg.body,
            data: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
            lida: true,
            hasMedia: msg.hasMedia,
            media: msg.media,
            messageType: msg.type
          }));

          // Se veio contactInfo com nome, usar o nome real do contato
          let nomeAtualizado = conversa.nome_cliente;
          if (data.contactInfo && data.contactInfo.name && !data.contactInfo.name.startsWith('+')) {
            nomeAtualizado = data.contactInfo.name;

            // Atualizar também na lista de conversas sincronizadas
            setSyncedConversations(prev => prev.map(c =>
              c.id === chatId || c.whatsapp_id === chatId
                ? { ...c, name: nomeAtualizado }
                : c
            ));
          }

          setConversaSelecionada({
            ...conversa,
            nome_cliente: nomeAtualizado,
            mensagens: mensagensFormatadas
          });

          // Marcar como lida no WhatsApp
          try {
            await fetch(`${WHATSAPP_SERVER_URL}/api/read/${encodeURIComponent(chatId)}`, { method: 'POST' });
          } catch (e) {
          }
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
      }
    }

    // Fallback - usar dados do banco
    setConversaSelecionada(conversa);
    if (conversa.nao_lida) {
      await updateConversaMutation.mutateAsync({
        id: conversa.id,
        dados: { nao_lida: false }
      });
    }
  };

  const transferirConversa = async () => {
    if (!conversaSelecionada || !transferencia.setor) return;
    
    const historico = conversaSelecionada.historico_transferencias || [];
    historico.push({
      de_setor: conversaSelecionada.setor || "geral",
      para_setor: transferencia.setor,
      de_atendente: conversaSelecionada.atendente || user?.nome,
      data: new Date().toISOString(),
      motivo: transferencia.motivo
    });

    await updateConversaMutation.mutateAsync({
      id: conversaSelecionada.id,
      dados: {
        setor: transferencia.setor,
        historico_transferencias: historico,
        atendente: null,
        atendente_id: null
      }
    });

    setConversaSelecionada(prev => ({ ...prev, setor: transferencia.setor }));
    setDialogTransferir(false);
    setTransferencia({ setor: "", motivo: "" });
    toast.success(`Transferido para ${SETORES.find(s => s.id === transferencia.setor)?.nome}`);
  };

  // Função para iniciar conexão com WhatsApp (gera QR code)
  const iniciarConexaoWhatsApp = async () => {
    setTestando(true);

    try {
      // Chamar API REST para iniciar conexão
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        if (data.message === 'Já conectado') {
          toast.success(`WhatsApp já está conectado! Número: ${data.number}`);
          setWhatsappStatus('connected');
          setConnectedNumber(data.number);
        } else {
          toast.info("Iniciando conexão... Aguarde o QR Code aparecer.");
          setWhatsappStatus('initializing');
        }
      } else {
        toast.error(data.error || "Erro ao iniciar conexão");
      }
    } catch (error) {
      console.error("Erro ao conectar:", error);
      toast.error("Servidor WhatsApp não disponível. Certifique-se de que o servidor está rodando em " + WHATSAPP_SERVER_URL);
    }

    setTestando(false);
  };

  // Função para verificar status da conexão
  const verificarStatusWhatsApp = async () => {
    setTestando(true);

    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/status`);
      const data = await response.json();

      setWhatsappStatus(data.status);
      if (data.connected) {
        setConnectedNumber(data.number);
        await salvarConfigMutation.mutateAsync({
          tipo_integracao: 'whatsapp-web.js',
          conectado: true,
          ultimo_status: "Conectado em " + new Date().toLocaleString('pt-BR'),
          numero_conectado: data.number || ''
        });
        toast.success("WhatsApp conectado!");
      } else {
        toast.info(`Status: ${data.status}`);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      toast.error("Servidor não disponível em " + WHATSAPP_SERVER_URL);
    }

    setTestando(false);
  };

  // Função para desconectar WhatsApp
  const desconectarWhatsApp = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setWhatsappStatus('disconnected');
        setConnectedNumber(null);
        setQrCode(null);
        // Limpar lista de conversas e conversa selecionada
        setSyncedConversations([]);
        setConversaSelecionada(null);
        setIsSyncing(false);
        setSyncProgress(null);
        await salvarConfigMutation.mutateAsync({
          conectado: false,
          ultimo_status: "Desconectado manualmente"
        });
        toast.success("WhatsApp desconectado!");
      }
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast.error("Erro ao desconectar");
    }
  };

  // Filtros de conversas
  const conversasFiltradas = conversas.filter(c => {
    if (c.arquivada && filtroAtivo !== "arquivadas") return false;
    
    const matchBusca = !busca || 
      c.nome_cliente?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca);
    
    if (filtroAtivo === "todas") return matchBusca && !c.arquivada;
    if (filtroAtivo === "nao_lidas") return matchBusca && c.nao_lida;
    if (filtroAtivo === "nao_respondidas") return matchBusca && c.aguardando_resposta;
    if (filtroAtivo === "favoritas") return matchBusca && c.favorita;
    if (filtroAtivo === "arquivadas") return matchBusca && c.arquivada;
    if (filtroAtivo.startsWith("setor_")) return matchBusca && c.setor === filtroAtivo.replace("setor_", "");
    if (filtroAtivo.startsWith("categoria_")) return matchBusca && c.categoria === filtroAtivo.replace("categoria_", "");
    if (filtroAtivo.startsWith("pasta_")) return matchBusca && c.pasta === filtroAtivo.replace("pasta_", "");
    if (filtroAtivo.startsWith("etiqueta_")) return matchBusca && c.etiquetas?.includes(filtroAtivo.replace("etiqueta_", ""));
    
    return matchBusca;
  });

  // Ordenar: fixadas primeiro
  const conversasOrdenadas = [...conversasFiltradas].sort((a, b) => {
    if (a.fixada && !b.fixada) return -1;
    if (!a.fixada && b.fixada) return 1;
    return 0;
  });

  const contadores = {
    todas: conversas.filter(c => !c.arquivada).length,
    naoLidas: conversas.filter(c => c.nao_lida && !c.arquivada).length,
    naoRespondidas: conversas.filter(c => c.aguardando_resposta && !c.arquivada).length,
    favoritas: conversas.filter(c => c.favorita && !c.arquivada).length,
    arquivadas: conversas.filter(c => c.arquivada).length
  };

  const formatarData = (data) => {
    if (!data) return "";
    try {
      const d = new Date(data);
      // Verificar se a data é válida
      if (isNaN(d.getTime())) return "";
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataComparar = new Date(d);
      dataComparar.setHours(0, 0, 0, 0);
      if (dataComparar.getTime() === hoje.getTime()) return format(d, "HH:mm");
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      if (dataComparar.getTime() === ontem.getTime()) return "Ontem";
      return format(d, "dd/MM/yy");
    } catch {
      return "";
    }
  };

  // Menu lateral
  const menuIcones = [
    { id: "todas", icon: MessageSquare, label: "Todas", badge: contadores.todas },
    { id: "nao_lidas", icon: Circle, label: "Não Lidas", badge: contadores.naoLidas },
    { id: "nao_respondidas", icon: Clock, label: "Aguardando Resposta", badge: contadores.naoRespondidas },
    { id: "divider1", divider: true },
    { id: "favoritas", icon: Star, label: "Favoritas", badge: contadores.favoritas },
    { id: "arquivadas", icon: Archive, label: "Arquivadas", badge: contadores.arquivadas },
    { id: "divider2", divider: true },
    { id: "setores", icon: ArrowRightLeft, label: "Por Setor", submenu: true },
    { id: "categorias", icon: Tag, label: "Por Categoria", submenu: true },
    { id: "divider3", divider: true },
    { id: "pastas", icon: Folder, label: "Pastas" },
    { id: "etiquetas", icon: Tag, label: "Etiquetas" },
    { id: "respostas", icon: Zap, label: "Respostas Rápidas" },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex bg-[#f0f2f5]">
      {/* Barra lateral esquerda - Ícones */}
      <div className="w-[68px] bg-[#f0f2f5] border-r border-[#e9edef] flex flex-col items-center py-2">
        {/* Status de conexão */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setDialogConectar(true)}
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  whatsappStatus === 'connected' ? 'bg-green-100' :
                  whatsappStatus === 'qr_ready' ? 'bg-blue-100' :
                  whatsappStatus === 'initializing' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}
              >
                {whatsappStatus === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : whatsappStatus === 'qr_ready' ? (
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                ) : whatsappStatus === 'initializing' ? (
                  <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{
                whatsappStatus === 'connected' ? `Conectado${connectedNumber ? ` (${connectedNumber})` : ''}` :
                whatsappStatus === 'qr_ready' ? "QR Code pronto - Clique para escanear" :
                whatsappStatus === 'initializing' ? "Iniciando conexão..." :
                "Clique para conectar"
              }</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-10 h-px bg-[#e9edef] my-2" />

        {/* Ícones do menu */}
        <div className="flex-1 flex flex-col items-center gap-1 w-full overflow-y-auto">
          {menuIcones.map((item) => {
            if (item.divider) {
              return <div key={item.id} className="w-10 h-px bg-[#e9edef] my-2" />;
            }
            
            const isActive = filtroAtivo === item.id || 
              (item.id === "setores" && filtroAtivo.startsWith("setor_")) ||
              (item.id === "categorias" && filtroAtivo.startsWith("categoria_"));
            
            if (item.submenu) {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`w-12 h-12 rounded-full flex items-center justify-center relative transition-all
                        ${isActive ? 'bg-[#e9edef]' : 'hover:bg-[#e9edef]'}`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[#00a884]' : 'text-[#54656f]'}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    {item.id === "setores" && SETORES.map(setor => (
                      <DropdownMenuItem 
                        key={setor.id}
                        onClick={() => { setFiltroAtivo(`setor_${setor.id}`); setPainelAtivo("conversas"); }}
                      >
                        <setor.icon className="w-4 h-4 mr-2" style={{ color: setor.cor }} />
                        {setor.nome}
                        <Badge variant="secondary" className="ml-auto">
                          {conversas.filter(c => c.setor === setor.id && !c.arquivada).length}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                    {item.id === "categorias" && CATEGORIAS.map(cat => (
                      <DropdownMenuItem 
                        key={cat.id}
                        onClick={() => { setFiltroAtivo(`categoria_${cat.id}`); setPainelAtivo("conversas"); }}
                      >
                        <cat.icon className="w-4 h-4 mr-2" style={{ color: cat.cor }} />
                        {cat.nome}
                        <Badge variant="secondary" className="ml-auto">
                          {conversas.filter(c => c.categoria === cat.id && !c.arquivada).length}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            return (
              <TooltipProvider key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (["pastas", "etiquetas", "respostas"].includes(item.id)) {
                          setPainelAtivo(item.id);
                        } else {
                          setFiltroAtivo(item.id);
                          setPainelAtivo("conversas");
                        }
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center relative transition-all
                        ${isActive ? 'bg-[#e9edef]' : 'hover:bg-[#e9edef]'}`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[#00a884]' : 'text-[#54656f]'}`} />
                      {item.badge > 0 && (
                        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-[#25d366] rounded-full text-white text-[10px] flex items-center justify-center font-medium px-1">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Config */}
        <div className="pt-2 border-t border-[#e9edef]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setDialogConfig(true)}
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef]"
                >
                  <Settings className="w-5 h-5 text-[#54656f]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Configurações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Painel de Conversas */}
      <div className={`w-[340px] bg-white border-r border-[#e9edef] flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between">
          <span className="text-[#111b21] font-medium text-lg">
            {painelAtivo === "conversas" && (
              filtroAtivo === "todas" ? "Conversas" :
              filtroAtivo === "nao_lidas" ? "Não Lidas" :
              filtroAtivo === "nao_respondidas" ? "Aguardando Resposta" :
              filtroAtivo === "favoritas" ? "Favoritas" :
              filtroAtivo === "arquivadas" ? "Arquivadas" :
              filtroAtivo.startsWith("setor_") ? SETORES.find(s => s.id === filtroAtivo.replace("setor_", ""))?.nome :
              filtroAtivo.startsWith("categoria_") ? CATEGORIAS.find(c => c.id === filtroAtivo.replace("categoria_", ""))?.nome :
              "Conversas"
            )}
            {painelAtivo === "etiquetas" && "Etiquetas"}
            {painelAtivo === "pastas" && "Pastas"}
            {painelAtivo === "respostas" && "Respostas Rápidas"}
          </span>
          <div className="flex items-center gap-1">
            {painelAtivo === "conversas" && (
              <button onClick={() => setDialogNovaConversa(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                <Plus className="w-5 h-5 text-[#54656f]" />
              </button>
            )}
            {painelAtivo === "etiquetas" && (
              <button onClick={() => setDialogEtiqueta(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                <Plus className="w-5 h-5 text-[#54656f]" />
              </button>
            )}
            {painelAtivo === "pastas" && (
              <button onClick={() => setDialogPasta(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                <Plus className="w-5 h-5 text-[#54656f]" />
              </button>
            )}
            {painelAtivo === "respostas" && (
              <button onClick={() => setDialogRespostaRapida(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                <Plus className="w-5 h-5 text-[#54656f]" />
              </button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={iniciarSincronizacao}
                    disabled={isSyncing}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 text-[#54656f] ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar conversas do WhatsApp</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {painelAtivo === "conversas" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                    <MoreVertical className="w-5 h-5 text-[#54656f]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDialogExcluirTodas(true)}
                    disabled={conversas.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir todas as conversas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Busca */}
        {painelAtivo === "conversas" && (
          <div className="px-3 py-2 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#54656f]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar conversas..."
                className="w-full h-[35px] pl-10 pr-4 bg-[#f0f2f5] rounded-lg text-sm text-[#111b21] placeholder-[#667781] outline-none"
              />
            </div>
          </div>
        )}

        {/* Barra de progresso da sincronização */}
        {isSyncing && syncProgress && (
          <div className="px-3 py-2 bg-[#f0f2f5] border-b border-[#e9edef]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#667781]">
                Sincronizando conversas...
              </span>
              <span className="text-xs font-medium text-[#25d366]">
                {syncProgress.processed}/{syncProgress.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#e9edef] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#25d366] rounded-full transition-all duration-300"
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista */}
        <ScrollArea className="flex-1">
          {/* Conversas */}
          {painelAtivo === "conversas" && (
            <>
              {loadingConversas && !isSyncing ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#25d366]" />
                </div>
              ) : conversasOrdenadas.length === 0 && !isSyncing ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#e9edef]" />
                  <p className="text-[#667781] mb-2">
                    {whatsappStatus === 'connected'
                      ? 'Nenhuma conversa carregada'
                      : 'WhatsApp não conectado'}
                  </p>
                  {whatsappStatus === 'connected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={iniciarSincronizacao}
                      className="mt-2"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar conversas
                    </Button>
                  )}
                  <p className="text-xs text-[#667781] mt-4">
                    Status: {whatsappStatus} | Socket: {socketRef.current?.connected ? 'conectado' : 'desconectado'}
                  </p>
                </div>
              ) : (
                conversasOrdenadas.map(conversa => {
                  const setorInfo = SETORES.find(s => s.id === conversa.setor);
                  const categoriaInfo = CATEGORIAS.find(c => c.id === conversa.categoria);
                  
                  return (
                    <div
                      key={conversa.id}
                      className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-[#e9edef]
                        ${conversaSelecionada?.id === conversa.id ? 'bg-[#f0f2f5]' : ''}
                        ${conversa.aguardando_resposta ? 'bg-orange-50' : ''}`}
                      onClick={() => selecionarConversa(conversa)}
                    >
                      <div className="relative">
                        {conversa.profilePicUrl ? (
                          <img
                            src={conversa.profilePicUrl}
                            alt={conversa.nome_cliente || conversa.telefone}
                            className="w-[49px] h-[49px] rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-[49px] h-[49px] rounded-full bg-[#dfe5e7] items-center justify-center"
                          style={{ display: conversa.profilePicUrl ? 'none' : 'flex' }}
                        >
                          <User className="w-6 h-6 text-white" />
                        </div>
                        {setorInfo && setorInfo.id !== "geral" && (
                          <div 
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: setorInfo.cor }}
                          >
                            <setorInfo.icon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1">
                            {conversa.fixada && <Pin className="w-3 h-3 text-[#667781]" />}
                            <span className={`text-[15px] truncate ${conversa.nao_lida ? 'text-[#111b21] font-semibold' : 'text-[#111b21]'}`}>
                              {conversa.nome_cliente || conversa.telefone}
                            </span>
                            {verificarSeCliente(conversa.telefone) && (
                              <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0" title="Cliente cadastrado">
                                <User className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          <span className={`text-xs ${conversa.nao_lida ? 'text-[#25d366]' : 'text-[#667781]'}`}>
                            {formatarData(conversa.ultima_mensagem_data)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {conversa.aguardando_resposta && <Clock className="w-3 h-3 text-orange-500 shrink-0" />}
                            <p className={`text-sm truncate ${conversa.nao_lida ? 'text-[#111b21] font-medium' : 'text-[#667781]'}`}>
                              {conversa.ultima_mensagem || "Sem mensagens"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-1">
                            {categoriaInfo && categoriaInfo.id !== "geral" && (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoriaInfo.cor }} />
                            )}
                            {conversa.etiquetas?.slice(0, 1).map(et => {
                              const etq = etiquetas.find(e => e.nome === et);
                              return <div key={et} className="w-2 h-2 rounded-full" style={{ backgroundColor: etq?.cor || '#ccc' }} />;
                            })}
                            {conversa.nao_lida && (
                              <span className="min-w-[20px] h-5 bg-[#25d366] rounded-full text-white text-xs flex items-center justify-center px-1.5">
                                1
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* Etiquetas */}
          {painelAtivo === "etiquetas" && (
            <div className="p-3 space-y-2">
              {etiquetas.map(et => (
                <div 
                  key={et.id} 
                  className="flex items-center justify-between p-3 bg-[#f0f2f5] rounded-lg cursor-pointer hover:bg-[#e9edef]"
                  onClick={() => { setFiltroAtivo(`etiqueta_${et.nome}`); setPainelAtivo("conversas"); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: et.cor }} />
                    <span>{et.nome}</span>
                  </div>
                  <Badge variant="secondary">{conversas.filter(c => c.etiquetas?.includes(et.nome)).length}</Badge>
                </div>
              ))}
              {etiquetas.length === 0 && (
                <div className="text-center py-8 text-[#667781]">
                  <Tag className="w-12 h-12 mx-auto mb-2 text-[#e9edef]" />
                  <p>Nenhuma etiqueta</p>
                  <Button onClick={() => setDialogEtiqueta(true)} className="mt-4 bg-[#00a884]">
                    <Plus className="w-4 h-4 mr-1" /> Criar Etiqueta
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pastas */}
          {painelAtivo === "pastas" && (
            <div className="p-3 space-y-2">
              <div 
                className="flex items-center justify-between p-3 bg-[#f0f2f5] rounded-lg cursor-pointer hover:bg-[#e9edef]"
                onClick={() => { setFiltroAtivo("todas"); setPainelAtivo("conversas"); }}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-[#54656f]" />
                  <span>Geral</span>
                </div>
                <Badge variant="secondary">{conversas.filter(c => !c.pasta || c.pasta === "geral").length}</Badge>
              </div>
              {pastas.map(p => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3 bg-[#f0f2f5] rounded-lg cursor-pointer hover:bg-[#e9edef]"
                  onClick={() => { setFiltroAtivo(`pasta_${p.nome}`); setPainelAtivo("conversas"); }}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5" style={{ color: p.cor }} />
                    <span>{p.nome}</span>
                  </div>
                  <Badge variant="secondary">{conversas.filter(c => c.pasta === p.nome).length}</Badge>
                </div>
              ))}
              {pastas.length === 0 && (
                <div className="text-center py-4">
                  <Button onClick={() => setDialogPasta(true)} className="bg-[#00a884]">
                    <Plus className="w-4 h-4 mr-1" /> Criar Pasta
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Respostas Rápidas */}
          {painelAtivo === "respostas" && (
            <div className="p-3 space-y-2">
              {(configWpp?.respostas_rapidas || []).map((resp, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#f0f2f5] rounded-lg cursor-pointer hover:bg-[#e9edef] transition-colors"
                  onClick={() => {
                    if (conversaSelecionada) {
                      setMensagem(resp.mensagem);
                      setPainelAtivo("conversas");
                      toast.success(`Resposta "${resp.titulo}" inserida`);
                    } else {
                      toast.info("Selecione uma conversa primeiro");
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">{resp.atalho}</Badge>
                      <span className="font-medium text-sm">{resp.titulo}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remover resposta rápida
                        const novasRespostas = configWpp.respostas_rapidas.filter((_, i) => i !== idx);
                        salvarConfigMutation.mutate({ respostas_rapidas: novasRespostas });
                      }}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                  <p className="text-xs text-[#667781] line-clamp-2">{resp.mensagem}</p>
                </div>
              ))}
              {(!configWpp?.respostas_rapidas || configWpp.respostas_rapidas.length === 0) && (
                <div className="text-center py-8 text-[#667781]">
                  <Zap className="w-12 h-12 mx-auto mb-2 text-[#e9edef]" />
                  <p>Nenhuma resposta rápida</p>
                  <Button onClick={() => setDialogRespostaRapida(true)} className="mt-4 bg-[#00a884]">
                    <Plus className="w-4 h-4 mr-1" /> Criar Resposta
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área do Chat */}
      <div className={`flex-1 flex flex-col ${mobileView === 'lista' ? 'hidden md:flex' : 'flex'}`}
        style={{ backgroundColor: '#efeae2', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cpath fill=\'%23ddd\' fill-opacity=\'0.4\' d=\'M0 0h100v100H0z\'/%3E%3C/svg%3E")' }}
      >
        {conversaSelecionada ? (
          <>
            {/* Header Chat */}
            <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-[#e9edef]">
              <div className="flex items-center gap-3">
                <button className="md:hidden" onClick={() => setMobileView("lista")}>
                  <ArrowLeft className="w-5 h-5 text-[#54656f]" />
                </button>
                <div className="cursor-pointer" onClick={() => setDialogDetalhes(true)}>
                  {conversaSelecionada.profilePicUrl ? (
                    <img
                      src={conversaSelecionada.profilePicUrl}
                      alt={conversaSelecionada.nome_cliente || conversaSelecionada.telefone}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="cursor-pointer" onClick={() => setDialogDetalhes(true)}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[#111b21] font-medium">{conversaSelecionada.nome_cliente || conversaSelecionada.telefone}</h3>
                    {(() => {
                      const clienteEncontrado = verificarSeCliente(conversaSelecionada.telefone);
                      return clienteEncontrado ? (
                        <Badge className="text-xs bg-green-500 text-white hover:bg-green-600">
                          <User className="w-3 h-3 mr-1" />
                          Cliente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-500 cursor-pointer hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); setDialogVincularCliente(true); }}>
                          <Plus className="w-3 h-3 mr-1" />
                          Cadastrar
                        </Badge>
                      );
                    })()}
                    {conversaSelecionada.setor && conversaSelecionada.setor !== "geral" && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: SETORES.find(s => s.id === conversaSelecionada.setor)?.cor }}>
                        {SETORES.find(s => s.id === conversaSelecionada.setor)?.nome}
                      </Badge>
                    )}
                    {conversaSelecionada.etiquetas?.map(et => {
                      const etq = etiquetas.find(e => e.nome === et);
                      return (
                        <Badge key={et} className="text-xs text-white" style={{ backgroundColor: etq?.cor || '#ccc' }}>
                          {et}
                        </Badge>
                      );
                    })}
                    {conversaSelecionada.pasta && conversaSelecionada.pasta !== "geral" && (() => {
                      const pastaInfo = pastas.find(p => p.nome === conversaSelecionada.pasta);
                      return (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: pastaInfo?.cor || '#3b82f6', color: pastaInfo?.cor || '#3b82f6' }}>
                          <Folder className="w-3 h-3 mr-1" />
                          {conversaSelecionada.pasta}
                        </Badge>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-[#667781]">{conversaSelecionada.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => setDialogTransferir(true)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                        <ArrowRightLeft className="w-5 h-5 text-[#54656f]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Transferir</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                  <Search className="w-5 h-5 text-[#54656f]" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]">
                      <MoreVertical className="w-5 h-5 text-[#54656f]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setDialogDetalhes(true)}>
                      <User className="w-4 h-4 mr-2" /> Ver contato
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { favorita: !conversaSelecionada.favorita } });
                      setConversaSelecionada(prev => ({ ...prev, favorita: !prev.favorita }));
                    }}>
                      <Star className={`w-4 h-4 mr-2 ${conversaSelecionada.favorita ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      {conversaSelecionada.favorita ? "Remover favorito" : "Favoritar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { fixada: !conversaSelecionada.fixada } });
                      setConversaSelecionada(prev => ({ ...prev, fixada: !prev.fixada }));
                    }}>
                      <Pin className="w-4 h-4 mr-2" />
                      {conversaSelecionada.fixada ? "Desafixar" : "Fixar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      const novoEstado = !conversaSelecionada.arquivada;
                      const chatId = conversaSelecionada.whatsapp_id || conversaSelecionada.id;

                      // Arquivar/Desarquivar no WhatsApp
                      if (whatsappStatus === 'connected' && chatId) {
                        try {
                          const endpoint = novoEstado ? 'archive' : 'unarchive';
                          await fetch(`${WHATSAPP_SERVER_URL}/api/chat/${endpoint}/${encodeURIComponent(chatId)}`, {
                            method: 'POST'
                          });
                        } catch (err) {
                          console.error('Erro ao arquivar/desarquivar no WhatsApp:', err);
                        }
                      }

                      // Atualizar no banco
                      updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { arquivada: novoEstado } });

                      if (novoEstado) {
                        setConversaSelecionada(null);
                        toast.success("Conversa arquivada");
                      } else {
                        setConversaSelecionada(prev => ({ ...prev, arquivada: false }));
                        toast.success("Conversa desarquivada");
                      }
                    }}>
                      <Archive className="w-4 h-4 mr-2" />
                      {conversaSelecionada.arquivada ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                                              <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => setDialogExcluir(true)}>
                                                <Trash2 className="w-4 h-4 mr-2" /> Excluir conversa
                                              </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-[#667781]">Categoria</div>
                    {CATEGORIAS.map(cat => (
                      <DropdownMenuItem key={cat.id} onClick={() => {
                        updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { categoria: cat.id } });
                        setConversaSelecionada(prev => ({ ...prev, categoria: cat.id }));
                        toast.success(`Categoria: ${cat.nome}`);
                      }}>
                        <cat.icon className="w-4 h-4 mr-2" style={{ color: cat.cor }} />
                        {cat.nome}
                        {conversaSelecionada.categoria === cat.id && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-[#667781]">Etiquetas</div>
                    {etiquetas.map(et => {
                      const temEtiqueta = conversaSelecionada.etiquetas?.includes(et.nome);
                      return (
                        <DropdownMenuItem key={et.id} onClick={() => {
                          const etiquetasAtuais = conversaSelecionada.etiquetas || [];
                          const novasEtiquetas = temEtiqueta
                            ? etiquetasAtuais.filter(e => e !== et.nome)
                            : [...etiquetasAtuais, et.nome];
                          updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { etiquetas: novasEtiquetas } });
                          setConversaSelecionada(prev => ({ ...prev, etiquetas: novasEtiquetas }));
                          toast.success(temEtiqueta ? `Etiqueta "${et.nome}" removida` : `Etiqueta "${et.nome}" adicionada`);
                        }}>
                          <div className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: et.cor }} />
                          {et.nome}
                          {temEtiqueta && <Check className="w-4 h-4 ml-auto" />}
                        </DropdownMenuItem>
                      );
                    })}
                    {etiquetas.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-[#667781] italic">Nenhuma etiqueta criada</div>
                    )}
                    <DropdownMenuItem onClick={() => setDialogEtiqueta(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova etiqueta
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-[#667781]">Pastas</div>
                    <DropdownMenuItem onClick={() => {
                      updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { pasta: null } });
                      setConversaSelecionada(prev => ({ ...prev, pasta: null }));
                      toast.success("Conversa removida da pasta");
                    }}>
                      <Folder className="w-4 h-4 mr-2 text-gray-400" />
                      Sem pasta
                      {(!conversaSelecionada.pasta || conversaSelecionada.pasta === "geral") && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    {pastas.map(p => {
                      const estaNaPasta = conversaSelecionada.pasta === p.nome;
                      return (
                        <DropdownMenuItem key={p.id} onClick={() => {
                          updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { pasta: p.nome } });
                          setConversaSelecionada(prev => ({ ...prev, pasta: p.nome }));
                          toast.success(`Movido para pasta "${p.nome}"`);
                        }}>
                          <Folder className="w-4 h-4 mr-2" style={{ color: p.cor }} />
                          {p.nome}
                          {estaNaPasta && <Check className="w-4 h-4 ml-auto" />}
                        </DropdownMenuItem>
                      );
                    })}
                    {pastas.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-[#667781] italic">Nenhuma pasta criada</div>
                    )}
                    <DropdownMenuItem onClick={() => setDialogPasta(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova pasta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 px-[63px] py-4">
              <div className="space-y-1">
                {(conversaSelecionada.mensagens || []).map((msg, index) => {
                  // Log para depuração de mídia
                  if (msg.hasMedia) {
                  }
                  return (
                  <div key={msg.id || index} className={`flex ${msg.tipo === 'saida' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[65%] rounded-lg shadow-sm overflow-hidden ${msg.tipo === 'saida' ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                      {/* Mídia (imagem/vídeo) */}
                      {msg.media && msg.media.mimetype?.startsWith('image/') && (
                        <img
                          src={`data:${msg.media.mimetype};base64,${msg.media.data}`}
                          alt="Imagem"
                          className="max-w-[220px] max-h-[280px] object-contain rounded-t-lg cursor-pointer hover:opacity-90"
                          onClick={() => setImagemAmpliada(`data:${msg.media.mimetype};base64,${msg.media.data}`)}
                        />
                      )}
                      {msg.media && msg.media.mimetype?.startsWith('video/') && (
                        <video
                          src={`data:${msg.media.mimetype};base64,${msg.media.data}`}
                          controls
                          className="max-w-[220px] max-h-[280px] rounded-t-lg"
                        />
                      )}
                      {msg.media && msg.media.mimetype?.startsWith('audio/') && (
                        <div className="px-[9px] pt-[6px]">
                          <audio
                            src={`data:${msg.media.mimetype};base64,${msg.media.data}`}
                            controls
                            className="w-[200px]"
                          />
                        </div>
                      )}
                      {/* Indicador de mídia não carregada */}
                      {msg.hasMedia && !msg.media && (
                        <div className="px-[9px] pt-[6px] text-[12px] text-[#667781] italic">
                          📎 Mídia não disponível
                        </div>
                      )}
                      {/* Texto e horário */}
                      <div className="px-[9px] py-[6px]">
                        <div className="flex flex-wrap items-end gap-x-2">
                          {msg.texto && (
                            <p className="text-[14.2px] text-[#111b21] whitespace-pre-wrap break-words">{msg.texto}</p>
                          )}
                          <span className="text-[11px] text-[#667781] flex items-center gap-1 ml-auto shrink-0">
                            {msg.data ? format(new Date(msg.data), "HH:mm") : ""}
                            {msg.tipo === 'saida' && <CheckCheck className={`w-4 h-4 ${msg.lida ? 'text-[#53bdeb]' : 'text-[#667781]'}`} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Preview de arquivo */}
            {arquivoSelecionado && (
              <div className="bg-[#f0f2f5] px-4 py-2 border-t border-[#e9edef]">
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
                  {previewArquivo ? (
                    <img src={previewArquivo} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-[#e9edef] rounded flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-[#54656f]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111b21] truncate">{arquivoSelecionado.name}</p>
                    <p className="text-xs text-[#667781]">{(arquivoSelecionado.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={removerArquivo}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#e9edef]"
                  >
                    <XCircle className="w-5 h-5 text-[#54656f]" />
                  </button>
                </div>
              </div>
            )}

            {/* Gravação de áudio */}
            {isRecording && (
              <div className="bg-[#f0f2f5] px-4 py-3 border-t border-[#e9edef]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={cancelarGravacao}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 hover:bg-red-200"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-[#111b21]">Gravando...</span>
                  </div>
                  <button
                    onClick={pararGravacao}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25d366] hover:bg-[#128c7e]"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-[60px] left-4 z-50 bg-white rounded-lg shadow-lg border border-[#e9edef] w-[320px] max-h-[300px] overflow-hidden">
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    {Object.entries(emojis).map(([categoria, emojiList]) => (
                      <div key={categoria} className="mb-3">
                        <p className="text-xs text-[#667781] mb-2 px-1">{categoria}</p>
                        <div className="grid grid-cols-8 gap-1">
                          {emojiList.map((emoji, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setMensagem(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[#f0f2f5] rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Input */}
            {!isRecording && (
              <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-2 border-t border-[#e9edef] relative">
                {/* Input file hidden */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                />

                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] ${showEmojiPicker ? 'bg-[#e9edef]' : ''}`}
                >
                  <Smile className="w-6 h-6 text-[#54656f]" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]"
                >
                  <Paperclip className="w-6 h-6 text-[#54656f]" />
                </button>
                <div className="flex-1 relative">
                  <input
                    value={mensagem}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setMensagem(valor);

                      // Verificar se está digitando um atalho de resposta rápida
                      if (valor.startsWith('/') && configWpp?.respostas_rapidas?.length > 0) {
                        const atalhoDigitado = valor.toLowerCase();
                        const sugestoes = configWpp.respostas_rapidas.filter(r =>
                          r.atalho.toLowerCase().startsWith(atalhoDigitado) ||
                          r.titulo.toLowerCase().includes(atalhoDigitado.substring(1))
                        );
                        setSugestoesResposta(sugestoes);
                      } else {
                        setSugestoesResposta([]);
                      }

                      // Enviar status de digitando
                      if (conversaSelecionada && whatsappStatus === 'connected') {
                        const typingChatId = conversaSelecionada.whatsapp_id || conversaSelecionada.id;
                        fetch(`${WHATSAPP_SERVER_URL}/api/typing/${encodeURIComponent(typingChatId)}`, { method: 'POST' }).catch(() => {});
                      }
                    }}
                    placeholder="Mensagem (digite / para atalhos)"
                    className="w-full h-[42px] px-4 bg-white rounded-lg text-[15px] text-[#111b21] placeholder-[#667781] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (sugestoesResposta.length > 0) {
                          setMensagem(sugestoesResposta[0].mensagem);
                          setSugestoesResposta([]);
                        } else {
                          enviarMensagem();
                        }
                      } else if (e.key === 'Escape') {
                        setSugestoesResposta([]);
                      }
                    }}
                  />
                  {/* Dropdown de sugestões de respostas rápidas */}
                  {sugestoesResposta.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-[#e9edef] max-h-[200px] overflow-y-auto z-50">
                      {sugestoesResposta.map((resp, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMensagem(resp.mensagem);
                            setSugestoesResposta([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-[#f0f2f5] border-b border-[#e9edef] last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">{resp.atalho}</Badge>
                            <span className="font-medium text-sm text-[#111b21]">{resp.titulo}</span>
                          </div>
                          <p className="text-xs text-[#667781] mt-1 line-clamp-1">{resp.mensagem}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {mensagem.trim() || arquivoSelecionado ? (
                  <button
                    onClick={enviarMensagem}
                    disabled={isSending}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e9edef]'}`}
                  >
                    {isSending ? (
                      <Loader2 className="w-6 h-6 text-[#54656f] animate-spin" />
                    ) : (
                      <Send className="w-6 h-6 text-[#54656f]" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={iniciarGravacao}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef]"
                  >
                    <Mic className="w-6 h-6 text-[#54656f]" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center max-w-md">
              <MessageCircle className="w-32 h-32 mx-auto mb-6 text-[#e9edef]" />
              <h2 className="text-[32px] font-light text-[#41525d] mb-4">ADM WhatsApp</h2>
              <p className="text-[14px] text-[#667781]">Selecione uma conversa para começar</p>
              {whatsappStatus !== 'connected' && (
                <Button onClick={() => setDialogConectar(true)} className="mt-6 bg-[#00a884] hover:bg-[#008f6f]">
                  <Wifi className="w-4 h-4 mr-2" /> Conectar WhatsApp
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog Conectar WhatsApp */}
      <Dialog open={dialogConectar} onOpenChange={setDialogConectar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" /> Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>Integração via WhatsApp Web</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status da conexão */}
            <div className={`p-3 rounded-lg flex items-center gap-3 ${
              whatsappStatus === 'connected' ? 'bg-green-50 border border-green-200' :
              whatsappStatus === 'qr_ready' ? 'bg-blue-50 border border-blue-200' :
              whatsappStatus === 'initializing' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              {whatsappStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Conectado</p>
                    {connectedNumber && (
                      <p className="text-xs text-green-600">Número: {connectedNumber}</p>
                    )}
                  </div>
                </>
              ) : whatsappStatus === 'qr_ready' ? (
                <>
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">QR Code Pronto</p>
                    <p className="text-xs text-blue-600">Escaneie com seu celular</p>
                  </div>
                </>
              ) : whatsappStatus === 'initializing' ? (
                <>
                  <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                  <div>
                    <p className="font-medium text-yellow-800">Iniciando...</p>
                    <p className="text-xs text-yellow-600">Aguarde o QR Code</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Desconectado</p>
                    <p className="text-xs text-red-600">Clique em "Conectar WhatsApp" para iniciar</p>
                  </div>
                </>
              )}
            </div>

            {/* QR Code Display */}
            {qrCode && (
              <div className="flex flex-col items-center p-4 bg-white border rounded-lg">
                <p className="text-sm text-slate-600 mb-3">Escaneie o QR Code com seu WhatsApp:</p>
                <div className="p-4 bg-white rounded-lg shadow-md">
                  <QRCodeSVG value={qrCode} size={200} level="M" />
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Abra o WhatsApp no seu celular {'>'}  Dispositivos Conectados {'>'} Conectar Dispositivo
                </p>
              </div>
            )}

            {/* Instruções quando não há QR code */}
            {!qrCode && whatsappStatus !== 'connected' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  <strong>Como conectar:</strong>
                </p>
                <ol className="text-sm text-amber-700 list-decimal list-inside mt-2 space-y-1">
                  <li>Clique no botão "Conectar WhatsApp"</li>
                  <li>Aguarde o QR Code aparecer</li>
                  <li>Escaneie com seu celular</li>
                  <li>Pronto! As mensagens aparecerão automaticamente</li>
                </ol>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogConectar(false)}>Fechar</Button>
            {whatsappStatus === 'connected' && (
              <Button
                variant="destructive"
                onClick={desconectarWhatsApp}
              >
                <WifiOff className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            )}
            {whatsappStatus !== 'connected' && (
              <Button onClick={iniciarConexaoWhatsApp} disabled={testando || whatsappStatus === 'initializing'} className="bg-[#00a884] hover:bg-[#008f6f]">
                {testando || whatsappStatus === 'initializing' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 mr-2" />
                )}
                {testando || whatsappStatus === 'initializing' ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Transferir */}
      <Dialog open={dialogTransferir} onOpenChange={setDialogTransferir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" /> Transferir Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Setor de Destino</Label>
              <Select value={transferencia.setor} onValueChange={(v) => setTransferencia(prev => ({ ...prev, setor: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map(setor => (
                    <SelectItem key={setor.id} value={setor.id}>
                      <div className="flex items-center gap-2">
                        <setor.icon className="w-4 h-4" style={{ color: setor.cor }} />
                        {setor.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={transferencia.motivo}
                onChange={(e) => setTransferencia(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Motivo da transferência..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferir(false)}>Cancelar</Button>
            <Button onClick={transferirConversa} disabled={!transferencia.setor} className="bg-[#00a884] hover:bg-[#008f6f]">
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Pasta */}
      <Dialog open={dialogPasta} onOpenChange={setDialogPasta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={novaPasta.nome} onChange={(e) => setNovaPasta(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Orçamentos" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {CORES_ETIQUETAS.map(cor => (
                  <button key={cor} className={`w-8 h-8 rounded-full border-2 ${novaPasta.cor === cor ? 'border-black' : 'border-transparent'}`} style={{ backgroundColor: cor }} onClick={() => setNovaPasta(prev => ({ ...prev, cor }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPasta(false)}>Cancelar</Button>
            <Button onClick={() => criarPastaMutation.mutate(novaPasta)} className="bg-[#00a884]">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Etiqueta */}
      <Dialog open={dialogEtiqueta} onOpenChange={setDialogEtiqueta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Etiqueta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={novaEtiqueta.nome} onChange={(e) => setNovaEtiqueta(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: VIP" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {CORES_ETIQUETAS.map(cor => (
                  <button key={cor} className={`w-8 h-8 rounded-full border-2 ${novaEtiqueta.cor === cor ? 'border-black' : 'border-transparent'}`} style={{ backgroundColor: cor }} onClick={() => setNovaEtiqueta(prev => ({ ...prev, cor }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEtiqueta(false)}>Cancelar</Button>
            <Button onClick={() => criarEtiquetaMutation.mutate(novaEtiqueta)} className="bg-[#00a884]">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Conversa */}
      <Dialog open={dialogNovaConversa} onOpenChange={setDialogNovaConversa}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conversa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Telefone</Label>
              <Input value={novaConversa.telefone} onChange={(e) => setNovaConversa(prev => ({ ...prev, telefone: e.target.value }))} placeholder="+55 11 99999-9999" />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input value={novaConversa.nome} onChange={(e) => setNovaConversa(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do contato" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovaConversa(false)}>Cancelar</Button>
            <Button onClick={() => {
              // Validar telefone
              const telefoneFormatado = novaConversa.telefone.replace(/\D/g, '');
              if (telefoneFormatado.length < 10 || telefoneFormatado.length > 13) {
                toast.error("Telefone inválido! Use formato: 5511999999999");
                return;
              }
              criarConversaMutation.mutate({ telefone: telefoneFormatado, nome_cliente: novaConversa.nome, status: "novo", setor: "geral", categoria: "geral", pasta: "geral", aguardando_resposta: true });
            }} className="bg-[#00a884]">Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Imagem Ampliada */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setImagemAmpliada(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setImagemAmpliada(null)}
          >
            <XCircle className="w-10 h-10" />
          </button>
          <img
            src={imagemAmpliada}
            alt="Imagem ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Dialog Detalhes */}
      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dados do Contato</DialogTitle></DialogHeader>
          {conversaSelecionada && (
            <div className="space-y-4">
              <div className="text-center">
                {conversaSelecionada.profilePicUrl ? (
                  <img
                    src={conversaSelecionada.profilePicUrl}
                    alt={conversaSelecionada.nome_cliente || conversaSelecionada.telefone}
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#dfe5e7] flex items-center justify-center mx-auto mb-3">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <h3 className="text-xl font-medium">{conversaSelecionada.nome_cliente || conversaSelecionada.telefone || "Sem nome"}</h3>
                <p className="text-[#667781]">
                  {(() => {
                    // Formatar telefone para exibição
                    const tel = conversaSelecionada.telefone?.replace(/\D/g, '') || '';
                    if (tel.length === 13 && tel.startsWith('55')) {
                      // 5511999999999 -> +55 11 99999-9999
                      return `+${tel.slice(0,2)} ${tel.slice(2,4)} ${tel.slice(4,9)}-${tel.slice(9)}`;
                    } else if (tel.length === 12 && tel.startsWith('55')) {
                      // 551199999999 -> +55 11 9999-9999
                      return `+${tel.slice(0,2)} ${tel.slice(2,4)} ${tel.slice(4,8)}-${tel.slice(8)}`;
                    } else if (tel.length >= 10) {
                      return tel;
                    }
                    return conversaSelecionada.telefone;
                  })()}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b"><span className="text-[#667781]">Setor</span><Badge style={{ backgroundColor: SETORES.find(s => s.id === conversaSelecionada.setor)?.cor }}>{SETORES.find(s => s.id === conversaSelecionada.setor)?.nome || "Geral"}</Badge></div>
                <div className="flex justify-between py-2 border-b"><span className="text-[#667781]">Categoria</span><Badge variant="outline">{CATEGORIAS.find(c => c.id === conversaSelecionada.categoria)?.nome || "Geral"}</Badge></div>
                <div className="flex justify-between py-2 border-b"><span className="text-[#667781]">Status</span><Badge variant="outline">{conversaSelecionada.status}</Badge></div>
              </div>
              {conversaSelecionada.historico_transferencias?.length > 0 && (
                <div>
                  <Label className="text-sm text-[#667781]">Histórico de Transferências</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {conversaSelecionada.historico_transferencias.map((t, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded">
                        <span className="font-medium">{SETORES.find(s => s.id === t.de_setor)?.nome}</span> → <span className="font-medium">{SETORES.find(s => s.id === t.para_setor)?.nome}</span>
                        <div className="text-[#667781]">{format(new Date(t.data), "dd/MM/yy HH:mm")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Anotações</Label>
                <Textarea value={conversaSelecionada.anotacoes || ""} onChange={(e) => setConversaSelecionada(prev => ({ ...prev, anotacoes: e.target.value }))} onBlur={() => updateConversaMutation.mutate({ id: conversaSelecionada.id, dados: { anotacoes: conversaSelecionada.anotacoes } })} rows={3} placeholder="Adicionar anotações..." />
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setDialogDetalhes(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Vincular Cliente */}
      <Dialog open={dialogVincularCliente} onOpenChange={setDialogVincularCliente}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Cliente</DialogTitle>
            <DialogDescription>
              Este contato ainda não está cadastrado como cliente no sistema.
            </DialogDescription>
          </DialogHeader>
          {conversaSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {conversaSelecionada.profilePicUrl ? (
                    <img src={conversaSelecionada.profilePicUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#dfe5e7] flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{conversaSelecionada.nome_cliente || "Sem nome"}</p>
                    <p className="text-sm text-[#667781]">{conversaSelecionada.telefone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-[#00a884] hover:bg-[#00a884]/90"
                  onClick={() => {
                    // Verificar se nome_cliente é na verdade um telefone
                    const nomeCliente = conversaSelecionada.nome_cliente || '';
                    const nomePareceNumero = /^[\d\s\+\-\(\)]+$/.test(nomeCliente) || nomeCliente.startsWith('+');

                    // Usar o telefone do nome se parecer número, senão usar telefone normal
                    let tel = conversaSelecionada.telefone?.replace(/\D/g, '') || '';
                    if (nomePareceNumero && nomeCliente) {
                      tel = nomeCliente.replace(/\D/g, '');
                    }

                    // Formatar telefone para o padrão brasileiro (remover 55)
                    const telFormatado = tel.startsWith('55') ? tel.slice(2) : tel;

                    // Redirecionar para página de clientes com telefone preenchido (nome vazio)
                    const params = new URLSearchParams({
                      novo: 'true',
                      telefone1: telFormatado
                    });
                    window.open(`/clientes?${params.toString()}`, '_blank');
                    setDialogVincularCliente(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Cliente
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open('/clientes', '_blank');
                    setDialogVincularCliente(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Abrir Lista de Clientes
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogVincularCliente(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Resposta Rápida */}
      <Dialog open={dialogRespostaRapida} onOpenChange={setDialogRespostaRapida}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Resposta Rápida</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Atalho (ex: /preco)</Label>
              <Input value={novaResposta.atalho} onChange={(e) => setNovaResposta(prev => ({ ...prev, atalho: e.target.value }))} placeholder="/atalho" />
            </div>
            <div>
              <Label>Título</Label>
              <Input value={novaResposta.titulo} onChange={(e) => setNovaResposta(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ex: Consulta de preço" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={novaResposta.mensagem} onChange={(e) => setNovaResposta(prev => ({ ...prev, mensagem: e.target.value }))} rows={4} placeholder="Digite a mensagem..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRespostaRapida(false)}>Cancelar</Button>
            <Button onClick={async () => {
              const respostas = [...(configWpp?.respostas_rapidas || []), novaResposta];
              await salvarConfigMutation.mutateAsync({ respostas_rapidas: respostas });
              setDialogRespostaRapida(false);
              setNovaResposta({ atalho: "", titulo: "", mensagem: "" });
            }} className="bg-[#00a884]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Config */}
      <Dialog open={dialogConfig} onOpenChange={setDialogConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer ${configWpp?.conectado ? 'bg-green-50' : 'bg-red-50'}`} onClick={() => { setDialogConfig(false); setDialogConectar(true); }}>
              {configWpp?.conectado ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-500" />}
              <div>
                <p className="font-medium">{configWpp?.conectado ? "Conectado" : "Desconectado"}</p>
                <p className="text-xs text-[#667781]">Clique para configurar</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Pastas ({pastas.length})</h4>
              {pastas.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" style={{ color: p.cor }} />
                    <span>{p.nome}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Etiquetas ({etiquetas.length})</h4>
              {etiquetas.map(e => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: e.cor }} />
                    <span>{e.nome}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setDialogConfig(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Excluir Conversa
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogExcluir(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (conversaSelecionada) {
                  const chatId = conversaSelecionada.whatsapp_id || conversaSelecionada.id;

                  // Excluir no servidor WhatsApp local
                  if (whatsappStatus === 'connected' && chatId) {
                    try {
                      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/chat/${encodeURIComponent(chatId)}`, {
                        method: 'DELETE'
                      });
                      const data = await response.json();
                      if (!data.success) {
                        console.error('Erro ao excluir no WhatsApp:', data.error);
                      }
                    } catch (err) {
                      console.error('Erro ao excluir conversa no WhatsApp:', err);
                    }
                  }

                  // Excluir metadados do banco se existir
                  const isUUID = conversaSelecionada.id && !conversaSelecionada.id.includes('@');
                  if (isUUID) {
                    try {
                      await base44.entities.ConversaWhatsApp.delete(conversaSelecionada.id);
                    } catch (err) {
                      console.error('Erro ao excluir metadados:', err);
                    }
                  }

                  // Atualizar lista de conversas
                  iniciarSincronizacao();
                  queryClient.invalidateQueries({ queryKey: ['conversas-banco'] });
                  setConversaSelecionada(null);
                  setDialogExcluir(false);
                  toast.success("Conversa excluída");
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Todas as Conversas */}
      <Dialog open={dialogExcluirTodas} onOpenChange={setDialogExcluirTodas}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Excluir Todas as Conversas
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-red-600">ATENÇÃO:</span> Você está prestes a excluir <span className="font-bold">{conversas.length}</span> conversas.
              Esta ação irá remover todas as conversas do WhatsApp e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Para confirmar, digite <span className="font-mono font-bold bg-gray-100 px-1 rounded">EXCLUIR</span> abaixo:
            </p>
            <Input
              id="confirmar-exclusao"
              placeholder="Digite EXCLUIR para confirmar"
              className="mt-2"
              onChange={(e) => {
                const btn = document.getElementById('btn-excluir-todas');
                if (btn) {
                  btn.disabled = e.target.value !== 'EXCLUIR';
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogExcluirTodas(false)} disabled={excluindoTodas}>
              Cancelar
            </Button>
            <Button
              id="btn-excluir-todas"
              variant="destructive"
              disabled={true}
              onClick={async () => {
                setExcluindoTodas(true);
                let excluidas = 0;
                let erros = 0;

                for (const conversa of conversas) {
                  try {
                    const chatId = conversa.whatsapp_id || conversa.id;

                    // Excluir no servidor WhatsApp local
                    if (whatsappStatus === 'connected' && chatId) {
                      try {
                        const response = await fetch(`${WHATSAPP_SERVER_URL}/api/chat/${encodeURIComponent(chatId)}`, {
                          method: 'DELETE'
                        });
                        const data = await response.json();
                        if (data.success) {
                          excluidas++;
                        } else {
                          erros++;
                        }
                      } catch (err) {
                        erros++;
                      }
                    }

                    // Excluir metadados do banco se existir
                    const isUUID = conversa.id && !conversa.id.includes('@');
                    if (isUUID) {
                      try {
                        await base44.entities.ConversaWhatsApp.delete(conversa.id);
                      } catch (err) {
                        console.error('Erro ao excluir metadados:', err);
                      }
                    }
                  } catch (err) {
                    erros++;
                    console.error('Erro ao excluir conversa:', err);
                  }
                }

                // Atualizar lista de conversas
                iniciarSincronizacao();
                queryClient.invalidateQueries({ queryKey: ['conversas-banco'] });
                setConversaSelecionada(null);
                setDialogExcluirTodas(false);
                setExcluindoTodas(false);

                if (erros > 0) {
                  toast.warning(`${excluidas} conversas excluídas, ${erros} erros`);
                } else {
                  toast.success(`${excluidas} conversas excluídas com sucesso!`);
                }
              }}
            >
              {excluindoTodas ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Todas'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}