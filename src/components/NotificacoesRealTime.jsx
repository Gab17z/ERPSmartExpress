import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Package, Wrench, AlertCircle, TrendingUp, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONES_TIPO = {
  estoque_baixo: Package,
  os_pronta: Wrench,
  venda_alta: TrendingUp,
  pagamento_vencido: AlertCircle,
  sistema: Bell
};

const CORES_TIPO = {
  estoque_baixo: "text-orange-600",
  os_pronta: "text-blue-600",
  venda_alta: "text-green-600",
  pagamento_vencido: "text-red-600",
  sistema: "text-slate-600"
};

export default function NotificacoesRealTime() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Buscar notificações
  const { data: notificacoes = [], refetch } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => base44.entities.Notificacao.list('-created_date', 50),
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Marcar como lida
  const marcarLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    }
  });

  // Deletar notificação
  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success("Notificação removida");
    }
  });

  const naoLidas = notificacoes.filter(n => !n.lida);

  const handleClick = (notif) => {
    marcarLidaMutation.mutate(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  // Gerar notificações automáticas (verificar a cada 2 minutos)
  useEffect(() => {
    const gerarNotificacoes = async () => {
      try {
        const produtos = await base44.entities.Produto.list();
        const produtosBaixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo && p.ativo);
        
        if (produtosBaixoEstoque.length > 0) {
          // Verificar se já existe notificação recente
          const notifExistente = notificacoes.find(n => 
            n.tipo === 'estoque_baixo' && 
            !n.lida && 
            new Date(n.created_date) > new Date(Date.now() - 3600000) // Última hora
          );

          if (!notifExistente) {
            await base44.entities.Notificacao.create({
              tipo: 'estoque_baixo',
              titulo: 'Estoque Baixo',
              mensagem: `${produtosBaixoEstoque.length} produto(s) com estoque baixo`,
              link: createPageUrl('Produtos')
            });
            refetch();
          }
        }

        const os = await base44.entities.OrdemServico.list();
        const osProntas = os.filter(o => o.status === 'pronto');
        
        if (osProntas.length > 0) {
          const notifExistente = notificacoes.find(n => 
            n.tipo === 'os_pronta' && 
            !n.lida && 
            new Date(n.created_date) > new Date(Date.now() - 3600000)
          );

          if (!notifExistente) {
            await base44.entities.Notificacao.create({
              tipo: 'os_pronta',
              titulo: 'OS Prontas',
              mensagem: `${osProntas.length} ordem(ns) de serviço pronta(s) para entrega`,
              link: createPageUrl('OrdensServico')
            });
            refetch();
          }
        }
      } catch (error) {
        console.error("Erro ao gerar notificações:", error);
      }
    };

    const interval = setInterval(gerarNotificacoes, 120000); // A cada 2 minutos
    gerarNotificacoes(); // Executar imediatamente

    return () => clearInterval(interval);
  }, [notificacoes, refetch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {naoLidas.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-lg">
              {naoLidas.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center justify-between">
            <span>Notificações</span>
            {naoLidas.length > 0 && (
              <Badge variant="destructive">{naoLidas.length} nova(s)</Badge>
            )}
          </h3>
        </div>

        <ScrollArea className="h-[400px]">
          {notificacoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notif) => {
                const Icon = ICONES_TIPO[notif.tipo];
                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.lida ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${!notif.lida ? 'bg-blue-100' : 'bg-slate-100'} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${CORES_TIPO[notif.tipo]}`} />
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => handleClick(notif)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-semibold text-sm ${!notif.lida ? 'text-blue-900' : 'text-slate-900'}`}>
                            {notif.titulo}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{notif.mensagem}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletarMutation.mutate(notif.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              notificacoes.forEach(n => {
                if (!n.lida) marcarLidaMutation.mutate(n.id);
              });
            }}
            disabled={naoLidas.length === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}