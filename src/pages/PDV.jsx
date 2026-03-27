import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  DollarSign,
  Printer,
  CheckCircle2,
  User,
  Package,
  Maximize2,
  Minimize2,
  Camera,
  Wrench,
  Smartphone,
  Lock,
  AlertTriangle,
  Tag,
  Ticket
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import BarcodeScanner from "@/components/pdv/BarcodeScanner";
import ClienteFormDialog from "@/components/clientes/ClienteFormDialog";
import OSFormComplete from "@/components/os/OSFormComplete";
import AvaliacaoFormComplete from "@/components/seminovos/AvaliacaoFormComplete";
import CalculadoraQuick from "@/components/calculadora/CalculadoraQuick";
import PixPayment from "@/components/pdv/PixPayment";
import { useConfirm } from '@/contexts/ConfirmContext';
import { imprimirCupomVenda } from "@/utils/imprimirCupom";

export default function PDV() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Usar autenticação customizada
  const searchRef = useRef(null);
  const inputBuscaRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dialogCliente, setDialogCliente] = useState(false);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogSucesso, setDialogSucesso] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [pagamentos, setPagamentos] = useState([
    { forma_pagamento: "dinheiro", valor: 0, parcelas: 1 }
  ]);
  const [fullscreen, setFullscreen] = useState(false);
  const [dialogSenhaDesconto, setDialogSenhaDesconto] = useState(false);
  const [codigoBarrasDigitado, setCodigoBarrasDigitado] = useState("");
  const [configuracoes, setConfiguracoes] = useState(null);
  const [descontoTemporario, setDescontoTemporario] = useState(0);
  const barcodeInputRef = useRef(null);
  const [dialogScanner, setDialogScanner] = useState(false);
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [dialogCalculadora, setDialogCalculadora] = useState(false);
  const [dialogOS, setDialogOS] = useState(false);
  const [dialogAvaliador, setDialogAvaliador] = useState(false);
  const [dialogPix, setDialogPix] = useState(false);
  const [valorPix, setValorPix] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false); // CORREÇÃO: Mutex para evitar venda duplicada
  const [osVinculada, setOsVinculada] = useState(null); // OS vinculada à venda (quando faturando OS)
  const [dialogReimprimir, setDialogReimprimir] = useState(false);
  const [buscaReimprimir, setBuscaReimprimir] = useState("");

  // Estado de busca no dialog de cliente
  const [buscaClientePDV, setBuscaClientePDV] = useState("");

  // Estados para cupom de desconto
  const [cupomAplicado, setCupomAplicado] = useState(null);
  const [dialogCupom, setDialogCupom] = useState(false);
  const [codigoCupom, setCodigoCupom] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);

  // Estados para autenticação do vendedor na venda
  const [dialogVendedor, setDialogVendedor] = useState(false);
  const [senhaVendedor, setSenhaVendedor] = useState("");
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);
  const [validandoVendedor, setValidandoVendedor] = useState(false);
  const senhaVendedorRef = useRef(null);

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const prods = await base44.entities.Produto.list('nome');
      return prods;
    },
  });

  const { data: clientes = [], refetch: refetchClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
    staleTime: 0, // Sempre considera os dados desatualizados para buscar frescos
  });

  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas'],
    queryFn: () => base44.entities.Caixa.list('-created_date', 1),
  });

  // Carregar usuários do sistema para autenticação de vendedor
  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios_sistema'],
    queryFn: () => base44.entities.UsuarioSistema.list('nome'),
  });

  // Vendas recentes para reimpressão (carrega só quando dialog aberto)
  const { data: vendasRecentes = [] } = useQuery({
    queryKey: ['vendas-reimpressao'],
    queryFn: () => base44.entities.Venda.list('-created_date', 30),
    enabled: dialogReimprimir,
  });

  useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        setConfiguracoes(config);

        // Tela cheia automática ao abrir o PDV
        if (config?.pdv?.tela_cheia_automatica && !document.fullscreenElement) {
          setTimeout(() => {
            document.documentElement.requestFullscreen()
              .then(() => {
                toast.success("🖥️ Modo tela cheia ativado automaticamente!");
              })
              .catch(() => {
              });
          }, 500);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }


    // Focar no campo de busca após carregar
    setTimeout(() => {
      if (inputBuscaRef.current) {
        inputBuscaRef.current.focus();
      }
    }, 300);
  }, []);

  // Efeito para carregar OS passada via Router State
  useEffect(() => {
    if (location.state?.osToBill) {
      const os = location.state.osToBill;
      
      // CRÍTICO: Bloquear se a OS já estiver faturada
      if (os.status === 'faturada' || os.venda_id) {
        toast.error("Esta Ordem de Serviço já foi faturada anteriormente.");
        window.history.replaceState({}, document.title);
        return;
      }

      setOsVinculada(os); // Salvar referência da OS para vincular à venda

      // Preencher cliente — usa cliente_id quando disponível, senão faz fallback pelo nome
      if (os.cliente_id) {
        setClienteSelecionado({ id: os.cliente_id, nome_completo: os.cliente_nome || "Cliente OS" });
      } else if (os.cliente_nome) {
        // OS sem cliente_id cadastrado: exibe o nome salvo na OS (cliente não cadastrado no sistema)
        setClienteSelecionado({ id: null, nome_completo: os.cliente_nome });
      }

      const itensCarrinho = [];
      const orcamento = os.orcamento || {};

      // Adicionar serviços
      if (orcamento.servicos) {
        // CORREÇÃO: Filtra serviços vazios antes de adicionar ao PDV
        orcamento.servicos.filter(s => s.descricao?.trim() && parseFloat(s.valor) > 0).forEach(s => {
          itensCarrinho.push({
            produto_id: `servico-${Math.random().toString(36).substr(2, 9)}`,
            produto_nome: `Serviço (OS ${os.codigo_os}): ${s.descricao}`,
            imagem_url: null,
            quantidade: 1,
            preco_unitario: parseFloat(s.valor) || 0,
            desconto_item: 0,
            subtotal: parseFloat(s.valor) || 0,
            is_servico: true // flag importante para contornar estoque
          });
        });
      }

      // Adicionar peças do orçamento
      if (orcamento.pecas) {
        orcamento.pecas.forEach(p => {
          // Filtrar peças completamente vazias (sem nome e sem valor)
          const temNome = p.produto_nome?.trim();
          const temValor = parseFloat(p.valor_unitario) > 0;
          if (!temNome && !temValor) return;

          if (p.produto_id) {
            // ✅ Peça vinculada ao estoque: deduz estoque normalmente
            itensCarrinho.push({
              produto_id: p.produto_id,
              produto_nome: p.produto_nome,
              imagem_url: null,
              quantidade: parseInt(p.quantidade) || 1,
              preco_unitario: parseFloat(p.valor_unitario) || 0,
              desconto_item: 0,
              subtotal: (parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 1)
            });
          } else {
            // ✅ CORREÇÃO: Peça manual (sem produto_id) → tratada como serviço avulso
            // Não deduz estoque (is_servico: true) mas aparece no carrinho e no total
            itensCarrinho.push({
              produto_id: `peca-avulsa-${Math.random().toString(36).substr(2, 9)}`,
              produto_nome: `Peça (OS ${os.codigo_os}): ${p.produto_nome || 'Peça avulsa'}`,
              imagem_url: null,
              quantidade: parseInt(p.quantidade) || 1,
              preco_unitario: parseFloat(p.valor_unitario) || 0,
              desconto_item: 0,
              subtotal: (parseFloat(p.valor_unitario) || 0) * (parseInt(p.quantidade) || 1),
              is_servico: true // Não deduz estoque pois não está cadastrada no sistema
            });
          }
        });
      }

      if (itensCarrinho.length > 0) {
        setCarrinho(itensCarrinho);
        toast.info(`Orçamento da OS ${os.codigo_os} carregado no PDV!`);
      }

      // Limpa o state para não recarregar num refresh acidental
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Manter foco no campo após fechar diálogos
  useEffect(() => {
    if (!dialogPagamento && !dialogCliente && !dialogSucesso && !dialogCalculadora && !dialogOS) {
      setTimeout(() => {
        if (inputBuscaRef.current && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          inputBuscaRef.current.focus();
        }
      }, 100);
    }
  }, [dialogPagamento, dialogCliente, dialogSucesso, dialogCalculadora, dialogOS]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const caixaAberto = caixas.find(c => c.status === 'aberto');

  const finalizarVendaMutation = useMutation({
    mutationFn: async (vendaData) => {
      // CRÍTICO: Se houver OS vinculada, verificar status em tempo real para evitar venda duplicada
      if (vendaData.os_id) {
        try {
          const osStatus = await base44.entities.OrdemServico.get(vendaData.os_id);
          if (osStatus && (osStatus.status === 'faturada' || osStatus.venda_id)) {
            throw new Error("ERRO: Esta OS já foi faturada em outra transação!");
          }
        } catch (err) {
          if (err.message.includes("ERRO:")) throw err;
          console.error("Erro ao validar status da OS:", err);
        }
      }

      // CORREÇÃO: Buscar dados FRESCOS do banco para evitar cache stale
      const produtosAtualizados = await base44.entities.Produto.list('nome');
      const produtosAtualizadosMap = new Map(produtosAtualizados.map(p => [p.id, p]));

      // CRÍTICO: Validação final de estoque com dados frescos do banco
      for (const item of vendaData.itens) {
        if (item.is_servico) continue; // Pula validação de estoque para serviços

        const produto = produtosAtualizadosMap.get(item.produto_id);
        if (!produto) {
          throw new Error(`Produto ${item.produto_nome} não encontrado!`);
        }
        if (produto.estoque_atual < item.quantidade) {
          throw new Error(`Estoque insuficiente para ${produto.nome}! Disponível: ${produto.estoque_atual}, Solicitado: ${item.quantidade}`);
        }
      }

      const venda = await base44.entities.Venda.create(vendaData);

      // CORREÇÃO: Array para rastrear atualizações para possível rollback
      const atualizacoesRealizadas = [];

      try {
        // CRÍTICO: Atualizar estoque de forma sequencial e registrar movimentações
        for (const item of vendaData.itens) {
          if (item.is_servico) continue; // Pula baixa de estoque para serviços

          const produto = produtosAtualizadosMap.get(item.produto_id);
          if (produto) {
            const estoqueAnterior = produto.estoque_atual;
            const novoEstoque = estoqueAnterior - item.quantidade;

            // CRÍTICO: Garantir que estoque não fique negativo
            if (novoEstoque < 0) {
              throw new Error(`Erro crítico: Estoque negativo detectado para ${produto.nome}`);
            }

            await base44.entities.Produto.update(produto.id, {
              estoque_atual: novoEstoque
            });

            // Rastrear para possível rollback
            atualizacoesRealizadas.push({
              produto_id: produto.id,
              estoque_anterior: estoqueAnterior,
              estoque_novo: novoEstoque
            });

            await base44.entities.MovimentacaoEstoque.create({
              tipo: "venda",
              produto_id: produto.id,
              produto_nome: produto.nome,
              quantidade: item.quantidade,
              estoque_anterior: estoqueAnterior,
              estoque_novo: novoEstoque,
              motivo: "Venda PDV",
              documento_referencia: venda.codigo_venda,
              usuario_responsavel: user?.nome,
              data_movimentacao: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        // CORREÇÃO: Rollback das atualizações de estoque em caso de erro
        console.error("Erro ao atualizar estoque, iniciando rollback:", error);
        for (const atualizacao of atualizacoesRealizadas) {
          try {
            await base44.entities.Produto.update(atualizacao.produto_id, {
              estoque_atual: atualizacao.estoque_anterior
            });
          } catch (rollbackError) {
            console.error("Erro no rollback:", rollbackError);
          }
        }
        throw error;
      }

      // CRÍTICO: Gerar comissão usando configurações ou padrão 5%
      try {
        const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
        const percentualComissao = config?.pdv?.percentual_comissao || 5;
        const valorComissao = (venda.valor_total * percentualComissao) / 100;

        await base44.entities.Comissao.create({
          vendedor_id: venda.vendedor_id,
          vendedor_nome: venda.vendedor_nome,
          venda_id: venda.id,
          valor_venda: venda.valor_total,
          percentual: percentualComissao,
          valor_comissao: valorComissao,
          status: "pendente"
        });
      } catch (error) {
        console.error("Erro ao gerar comissão:", error);
      }

      // CRÍTICO: Registrar transações financeiras no Caixa Aberto
      try {
        if (caixaAberto && venda.pagamentos && venda.pagamentos.length > 0) {

          let somaDinheiro = 0;
          let somaCartao = 0;
          let somaPix = 0;
          let somaTotal = 0;

          // Processar cada forma de pagamento separadamente e registrar uma transação
          for (const pag of venda.pagamentos) {
            const valorLiquidoPagamento = parseFloat(pag.valor);

            // Só lança transação se o valor for maior que zero
            if (valorLiquidoPagamento > 0) {
              await base44.entities.MovimentacaoCaixa.create({
                caixa_id: caixaAberto.id,
                venda_id: venda.id,
                tipo: 'entrada',
                descricao: `Venda PDV - ${venda.codigo_venda} (${pag.forma_pagamento})`,
                valor: valorLiquidoPagamento,
                forma_pagamento: pag.forma_pagamento,
                data: new Date().toISOString(),
                usuario: user?.nome || 'Sistema'
              });

              somaTotal += valorLiquidoPagamento;
              if (pag.forma_pagamento === 'dinheiro') somaDinheiro += valorLiquidoPagamento;
              else if (pag.forma_pagamento === 'pix') somaPix += valorLiquidoPagamento;
              else if (pag.forma_pagamento === 'cartao_credito' || pag.forma_pagamento === 'cartao_debito' || pag.forma_pagamento === 'credito_parcelado') somaCartao += valorLiquidoPagamento;
              // 'a_prazo' e 'cheque' entram na somaTotal mas não incrementam dinheiro, pix ou cartao no saldo resumido
            }
          }

          // Se houve troco, registrar transação de saída para rastreabilidade
          const trocoGerado = parseFloat(venda.troco || 0);
          if (trocoGerado > 0) {
            await base44.entities.MovimentacaoCaixa.create({
              caixa_id: caixaAberto.id,
              venda_id: venda.id,
              tipo: 'saida',
              descricao: `Troco - ${venda.codigo_venda}`,
              valor: trocoGerado,
              forma_pagamento: 'dinheiro',
              data: new Date().toISOString(),
              usuario: user?.nome || 'Sistema'
            });

            // Ajustar saldos: troco sai do dinheiro
            somaDinheiro -= trocoGerado;
            somaTotal -= trocoGerado;
          }

          // Atualizar saldos globais do registro do Caixa
          if (somaTotal > 0) {
            await base44.entities.Caixa.update(caixaAberto.id, {
              total_entradas: parseFloat(caixaAberto.total_entradas || 0) + somaTotal,
              saldo_dinheiro: parseFloat(caixaAberto.saldo_dinheiro || 0) + somaDinheiro,
              saldo_cartao: parseFloat(caixaAberto.saldo_cartao || 0) + somaCartao,
              saldo_pix: parseFloat(caixaAberto.saldo_pix || 0) + somaPix,
              saldo_final: parseFloat(caixaAberto.saldo_final || 0) + somaTotal
            });
          }
        }
      } catch (error) {
        console.error("Erro crítico ao lançar transações no caixa:", error);
      }

      // CRÍTICO: Criar Conta a Receber para vendas A Prazo
      try {
        const pagamentosAPrazo = (venda.pagamentos || []).filter(p => p.forma_pagamento === 'a_prazo');
        if (pagamentosAPrazo.length > 0 && vendaData.cliente_id) {
          const valorAPrazo = pagamentosAPrazo.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
          const dataVencimento = new Date();
          dataVencimento.setDate(dataVencimento.getDate() + 30); // Vencimento padrão: 30 dias

          await base44.entities.ContaReceber.create({
            cliente_id: vendaData.cliente_id,
            cliente_nome: vendaData.cliente_nome,
            descricao: `Venda A Prazo - ${venda.codigo_venda}`,
            valor: valorAPrazo,
            valor_pago: 0,
            status: "pendente",
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            venda_id: venda.id
          });
        }
      } catch (error) {
        console.error("Erro ao criar conta a receber para venda a prazo:", error);
      }

      // ENVIAR EMAIL DE NOVA VENDA
      try {
        const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
        const emailNotif = config?.sistema?.emails_notificacao_vendas;

        if (emailNotif && config?.notificacoes?.email_nova_venda) {
          const itensTexto = (venda.itens || []).map(i => `${i.produto_nome} (x${i.quantidade}) - R$ ${(parseFloat(i.subtotal) || 0).toFixed(2)}`).join('\n');

          await base44.integrations.Core.SendEmail({
            to: emailNotif,
            subject: `NOVA VENDA PDV - ${venda.codigo_venda}`,
            body: `NOVA VENDA REGISTRADA!

Código: ${venda.codigo_venda}
Vendedor: ${venda.vendedor_nome}
Cliente: ${venda.cliente_nome}
Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

ITENS:
${itensTexto}

Subtotal: R$ ${(parseFloat(venda.subtotal) || 0).toFixed(2)}
Desconto: R$ ${(parseFloat(venda.desconto_total) || 0).toFixed(2)}
TOTAL: R$ ${(parseFloat(venda.valor_total) || 0).toFixed(2)}

Forma(s) de Pagamento: ${(venda.pagamentos || []).map(p => p.forma_pagamento).join(', ')}`
          });
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
      }

      // CRÍTICO: Atualizar OS para "faturada" e vincular venda_id
      if (vendaData.os_id) {
        try {
          await base44.entities.OrdemServico.update(vendaData.os_id, {
            status: 'faturada',
            venda_id: venda.id,
            data_faturamento: new Date().toISOString()
          });
        } catch (error) {
          console.error("Erro ao atualizar status da OS:", error);
        }
      }

      return venda;
    },
    onSuccess: (venda) => {
      setIsSubmitting(false); // CORREÇÃO: Liberar mutex após sucesso
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      setVendaFinalizada(venda);
      setDialogPagamento(false);
      setDialogSucesso(true);
      limparVenda();

      // Impressão automática do cupom
      if (configuracoes?.pdv?.impressao_automatica_cupom) {
        setTimeout(() => {
          try {
            toast.loading("📄 Imprimindo Venda...", { duration: 3000 });
            setTimeout(() => {
              imprimirCupom();
              toast.success("✅ Cupom impresso com sucesso!");
            }, 800);
          } catch (error) {
            toast.error("❌ Erro ao imprimir cupom automaticamente!");
            console.error("Erro impressão:", error);
          }
        }, 1200);
      }
    },
    onError: (error) => {
      // CORREÇÃO: Liberar mutex e mostrar erro
      setIsSubmitting(false);
      console.error("Erro ao finalizar venda:", error);
      toast.error(`Erro ao finalizar venda: ${error.message}`);
    },
  });

  const produtosFiltrados = produtos.filter(p =>
    p.ativo !== false &&
    (p.estoque_atual === undefined || p.estoque_atual > 0) &&
    (p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo_barras?.includes(searchTerm))
  );

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.produto_id === produto.id);

    if (itemExistente) {
      // CRÍTICO: Verificar estoque antes de adicionar
      if (itemExistente.quantidade >= produto.estoque_atual) {
        toast.error(`Estoque insuficiente! Disponível: ${produto.estoque_atual}`);
        return;
      }
      setCarrinho(carrinho.map(item =>
        item.produto_id === produto.id
          ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_unitario }
          : item
      ));
    } else {
      // CRÍTICO: Verificar se tem estoque antes de adicionar pela primeira vez
      if (!produto.estoque_atual || produto.estoque_atual < 1) {
        toast.error(`Produto sem estoque disponível!`);
        return;
      }
      setCarrinho([...carrinho, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        imagem_url: produto.imagem_url || null,
        quantidade: 1,
        preco_unitario: produto.preco_venda,
        desconto_item: 0,
        subtotal: produto.preco_venda
      }]);
    }

    // Som ao adicionar produto
    if (configuracoes?.pdv?.som_ao_adicionar) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKnn77JlGwc+ku7w0ogxBSN4x/DdkUAKFF607uunVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmVEND1Sp5++yZRsHPpLu8NKIMQ==');
      audio.volume = 0.3;
      audio.play().catch(() => { });
    }

    setSearchTerm("");
    // Não dar foco no mobile para evitar abrir teclado
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      inputBuscaRef.current?.focus();
    }
    toast.success(`${produto.nome} adicionado!`);
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.produto_id !== produtoId));
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    // Verificar se é um item de serviço/peça avulsa (não tem estoque)
    const itemCarrinho = carrinho.find(item => item.produto_id === produtoId);
    if (itemCarrinho?.is_servico) {
      // Serviços e peças avulsas: sem validação de estoque
      if (novaQuantidade <= 0) {
        removerDoCarrinho(produtoId);
        return;
      }
      setCarrinho(carrinho.map(item =>
        item.produto_id === produtoId
          ? { ...item, quantidade: novaQuantidade, subtotal: novaQuantidade * item.preco_unitario }
          : item
      ));
      return;
    }

    const produto = produtos.find(p => p.id === produtoId);

    // CRÍTICO: Verificação robusta de estoque
    if (!produto) {
      toast.error("Produto não encontrado!");
      return;
    }

    if (novaQuantidade > produto.estoque_atual) {
      toast.error(`Estoque insuficiente! Disponível: ${produto.estoque_atual}`);
      return;
    }

    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }

    setCarrinho(carrinho.map(item =>
      item.produto_id === produtoId
        ? { ...item, quantidade: novaQuantidade, subtotal: novaQuantidade * item.preco_unitario }
        : item
    ));
  };

  const calcularSubtotal = () => carrinho.reduce((sum, item) => sum + item.subtotal, 0);

  // Calcula o valor do desconto baseado no percentual
  const calcularDescontoValor = () => {
    const subtotal = calcularSubtotal();
    return (subtotal * descontoPercentual) / 100;
  };

  const validarSenhaDesconto = async () => {
    if (!codigoBarrasDigitado) {
      toast.error("Digite ou escaneie o código de barras!");
      return false;
    }

    try {
      const usuarios = await base44.entities.UsuarioSistema.list();
      const usuarioAutorizador = usuarios.find(u => u.codigo_barras_autorizacao === codigoBarrasDigitado);

      if (!usuarioAutorizador) {
        toast.error("❌ Código inválido! Usuário não encontrado ou sem permissão.");
        setCodigoBarrasDigitado("");
        barcodeInputRef.current?.focus();
        return false;
      }

      const cargos = await base44.entities.Cargo.list();
      const cargo = cargos.find(c => c.id === usuarioAutorizador.cargo_id);

      if (!cargo || !cargo.permissoes?.aplicar_descontos) {
        toast.error(`❌ ${usuarioAutorizador.user_nome} não tem permissão para autorizar descontos!`);
        setCodigoBarrasDigitado("");
        barcodeInputRef.current?.focus();
        return false;
      }

      try {
        const valorDesconto = (calcularSubtotal() * descontoTemporario) / 100;
        await base44.entities.LogDesconto.create({
          venda_id: null,
          usuario_id: user?.id,
          usuario_nome: user?.nome || "N/A",
          percentual_desconto: descontoTemporario,
          valor_desconto: valorDesconto,
          motivo: "Desconto autorizado via Supervisor no PDV",
          aprovador_nome: usuarioAutorizador.user_nome,
          aprovador_id: usuarioAutorizador.user_id,
        });
      } catch (logError) {
        console.error("Erro ao registrar log:", logError);
      }

      toast.success(`✅ Desconto autorizado por ${usuarioAutorizador.user_nome}!`);
      setDialogSenhaDesconto(false);
      setCodigoBarrasDigitado("");
      setDescontoPercentual(descontoTemporario);
      setDescontoTemporario(0);
      return true;
    } catch (error) {
      console.error("Erro ao validar:", error);
      toast.error("Erro ao validar autorização");
      return false;
    }
  };

  const aplicarDesconto = (percentual) => {
    const subtotalAtual = calcularSubtotal();
    // CRÍTICO: Bloquear valores negativos e acima de 100
    const percentualLimitado = Math.max(0, Math.min(percentual, 100));

    if (subtotalAtual === 0 || percentualLimitado === 0) {
      setDescontoPercentual(percentualLimitado);
      return true;
    }
    const limiteDesconto = configuracoes?.pdv?.solicitar_senha_desconto_acima || 10;
    const exigeSenha = configuracoes?.pdv?.exigir_senha_desconto !== false;

    if (exigeSenha && percentualLimitado > limiteDesconto) {
      setDescontoTemporario(percentualLimitado);
      setDescontoPercentual(0); // CRÍTICO: Reseta desconto até ser autorizado
      setDialogSenhaDesconto(true);
      return false;
    }

    // Registrar log de desconto dentro do limite (sem necessidade de autorização)
    try {
      const valorDesconto = (subtotalAtual * percentualLimitado) / 100;
      base44.entities.LogDesconto.create({
        venda_id: null,
        usuario_id: user?.id,
        usuario_nome: user?.nome || "N/A",
        percentual_desconto: percentualLimitado,
        valor_desconto: valorDesconto,
        motivo: "Desconto dentro do limite permitido",
        aprovador_nome: user?.nome || "N/A",
        aprovador_id: user?.id,
      });
    } catch (e) {
      console.error("Erro ao registrar log de desconto:", e);
    }

    setDescontoPercentual(percentualLimitado);
    return true;
  };

  // Calcular desconto do cupom
  const calcularDescontoCupom = () => {
    if (!cupomAplicado) return 0;
    const subtotalComDesconto = calcularSubtotal() - calcularDescontoValor();
    if (cupomAplicado.tipo === 'percentual') {
      return Math.round((subtotalComDesconto * (cupomAplicado.valor / 100)) * 100) / 100;
    }
    return Math.min(cupomAplicado.valor, subtotalComDesconto);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const descontoManual = calcularDescontoValor();
    const descontoCupom = calcularDescontoCupom();
    return Math.max(0, subtotal - descontoManual - descontoCupom);
  };

  // Validar e aplicar cupom de desconto
  const validarCupom = async () => {
    if (!codigoCupom.trim()) {
      toast.error("Digite o codigo do cupom!");
      return;
    }

    setValidandoCupom(true);
    try {
      const cupons = await base44.entities.CupomDesconto.list();
      const cupom = cupons.find(c =>
        c.codigo?.toUpperCase() === codigoCupom.toUpperCase().trim() &&
        c.ativo !== false
      );

      if (!cupom) {
        toast.error("Cupom invalido ou inativo!");
        return;
      }

      // Verificar data de inicio
      if (cupom.data_inicio && new Date(cupom.data_inicio) > new Date()) {
        toast.error("Este cupom ainda nao esta ativo!");
        return;
      }

      // Verificar validade
      if (cupom.data_fim && new Date(cupom.data_fim) < new Date()) {
        toast.error("Cupom expirado!");
        return;
      }

      // Verificar uso maximo
      if (cupom.uso_maximo && cupom.uso_maximo > 0 && (cupom.uso_atual || 0) >= cupom.uso_maximo) {
        toast.error("Este cupom ja atingiu o limite de uso!");
        return;
      }

      // Verificar valor minimo
      const subtotal = calcularSubtotal() - calcularDescontoValor();
      if (cupom.valor_minimo && subtotal < cupom.valor_minimo) {
        toast.error(`Valor minimo para este cupom: R$ ${parseFloat(cupom.valor_minimo).toFixed(2)}`);
        return;
      }

      setCupomAplicado(cupom);
      setDialogCupom(false);
      setCodigoCupom("");

      const descontoTexto = cupom.tipo === 'percentual'
        ? `${cupom.valor}%`
        : `R$ ${parseFloat(cupom.valor).toFixed(2)}`;
      toast.success(`Cupom "${cupom.codigo}" aplicado! Desconto: ${descontoTexto}`);
    } catch (error) {
      console.error("Erro ao validar cupom:", error);
      toast.error("Erro ao validar cupom. Tente novamente.");
    } finally {
      setValidandoCupom(false);
    }
  };

  const removerCupom = () => {
    setCupomAplicado(null);
    toast.info("Cupom removido!");
  };

  const limparVenda = () => {
    setCarrinho([]);
    setClienteSelecionado(null);
    setDescontoPercentual(0);
    setDescontoTemporario(0);
    setCupomAplicado(null);
    setCodigoCupom("");
    setPagamentos([{ forma_pagamento: "dinheiro", valor: 0, parcelas: 1 }]);
    setVendedorSelecionado(null);
    setOsVinculada(null);
  };

  const abrirPagamento = () => {
    if (!caixaAberto) {
      toast.error("Abra o caixa primeiro!");
      return;
    }
    if (carrinho.length === 0) {
      toast.error("Adicione produtos!");
      return;
    }
    // Abrir dialog para autenticar vendedor antes do pagamento
    setSenhaVendedor("");
    setVendedorSelecionado(null);
    setDialogVendedor(true);
    setTimeout(() => senhaVendedorRef.current?.focus(), 100);
  };

  // Validar senha do vendedor e abrir pagamento
  const validarVendedor = async () => {
    if (!senhaVendedor.trim()) {
      toast.error("Digite a senha do vendedor!");
      return;
    }

    setValidandoVendedor(true);
    try {
      // Buscar vendedor pela senha de autorização
      const vendedor = usuariosSistema.find(
        u => u.senha_autorizacao === senhaVendedor && u.ativo !== false
      );

      if (!vendedor) {
        toast.error("Senha inválida! Vendedor não encontrado.");
        setSenhaVendedor("");
        senhaVendedorRef.current?.focus();
        return;
      }

      // Vendedor autenticado com sucesso
      setVendedorSelecionado(vendedor);
      setDialogVendedor(false);
      setSenhaVendedor("");

      // Agora abre o dialog de pagamento
      setPagamentos([{ forma_pagamento: "dinheiro", valor: calcularTotal(), parcelas: 1 }]);
      setDialogPagamento(true);

      toast.success(`Vendedor: ${vendedor.nome}`);
    } catch (error) {
      console.error("Erro ao validar vendedor:", error);
      toast.error("Erro ao validar vendedor");
    } finally {
      setValidandoVendedor(false);
    }
  };

  const finalizarVenda = async () => {
    // CORREÇÃO: Mutex para evitar venda duplicada por duplo clique
    if (isSubmitting) {
      toast.warning("Aguarde, processando venda...");
      return;
    }

    // CRÍTICO: Validação obrigatória de vendedor autenticado
    if (!vendedorSelecionado) {
      toast.error("Vendedor não autenticado! Feche e abra o pagamento novamente.");
      return;
    }

    // CRÍTICO: Validação rigorosa antes de finalizar
    // CORREÇÃO: Usar matemática de centavos para evitar erros de floating point
    const totalPagamentosCentavos = pagamentos.reduce((sum, p) => sum + Math.round((parseFloat(p.valor) || 0) * 100), 0);
    const totalVendaCentavos = Math.round(calcularTotal() * 100);

    if (totalPagamentosCentavos < totalVendaCentavos) {
      const diferencaCentavos = totalVendaCentavos - totalPagamentosCentavos;
      toast.error(`Valor pago insuficiente! Falta R$ ${(diferencaCentavos / 100).toFixed(2)}`);
      return;
    }

    // CRÍTICO: Validar formas de pagamento
    const pagamentosInvalidos = pagamentos.filter(p => !p.forma_pagamento || p.valor <= 0);
    if (pagamentosInvalidos.length > 0) {
      toast.error("Todas as formas de pagamento devem ter valor maior que zero!");
      return;
    }

    // Validação de A Prazo (Exige Cliente)
    const pagamentoAPrazo = pagamentos.find(p => p.forma_pagamento === "a_prazo");
    if (pagamentoAPrazo && !clienteSelecionado) {
      toast.error("Para vendas A Prazo, é obrigatório selecionar um cliente!");
      return;
    }

    // Validação Crédito Parcelado
    const pagamentoParcelado = pagamentos.find(p => p.forma_pagamento === "credito_parcelado");
    if (pagamentoParcelado && (!pagamentoParcelado.parcelas || pagamentoParcelado.parcelas < 2)) {
      toast.error("Para Crédito Parcelado, a quantidade mínima de parcelas é 2!");
      return;
    }

    // Verificar se tem PIX nos pagamentos
    const pagamentoPix = pagamentos.find(p => p.forma_pagamento === "pix");
    if (pagamentoPix && pagamentoPix.valor > 0) {
      // Abrir dialog PIX
      setValorPix(pagamentoPix.valor);
      setDialogPix(true);
      return;
    }

    // Se não tem PIX, finaliza direto e gera comissão
    // CORREÇÃO: Ativar mutex ANTES de chamar processarVenda para evitar race condition
    setIsSubmitting(true);
    await processarVenda();
  };

  const processarVenda = async () => {
    // O mutex já foi ativado antes de chamar esta função

    try {
      const totalPagamentos = pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
      const codigoVenda = `VND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; // CORREÇÃO: ID mais único

      // CORREÇÃO: Usar Math.round para valores monetários
      const subtotalCalculado = Math.round(calcularSubtotal() * 100) / 100;
      const descontoCalculado = Math.round(calcularDescontoValor() * 100) / 100;
      const descontoCupomCalculado = Math.round(calcularDescontoCupom() * 100) / 100;
      const totalCalculado = Math.round(calcularTotal() * 100) / 100;
      const trocoCalculado = Math.round((totalPagamentos - calcularTotal()) * 100) / 100;

      const vendaData = {
        codigo_venda: codigoVenda,
        cliente_id: clienteSelecionado?.id,
        cliente_nome: clienteSelecionado?.nome_completo || "Cliente não identificado",
        vendedor_id: vendedorSelecionado?.user_id || vendedorSelecionado?.id,
        vendedor_nome: vendedorSelecionado?.nome,
        caixa_id: caixaAberto.id,
        itens: carrinho,
        subtotal: subtotalCalculado,
        desconto_total: descontoCalculado + descontoCupomCalculado,
        cupom_id: cupomAplicado?.id || null,
        cupom_codigo: cupomAplicado?.codigo || null,
        valor_total: totalCalculado,
        pagamentos: pagamentos,
        troco: Math.max(0, trocoCalculado),
        data_venda: new Date().toISOString(),
        status: "finalizada",
        // Campos de OS: só incluídos quando há uma OS vinculada para evitar erro PGRST204
        ...(osVinculada ? { os_id: osVinculada.id } : {}),
      };

      // Se tem cupom aplicado, incrementar uso_atual após a venda
      if (cupomAplicado) {
        try {
          await base44.entities.CupomDesconto.update(cupomAplicado.id, {
            uso_atual: (cupomAplicado.uso_atual || 0) + 1
          });
        } catch (err) {
          console.error("Erro ao atualizar uso do cupom:", err);
        }
      }

      finalizarVendaMutation.mutate(vendaData, {
        onError: () => {
          setIsSubmitting(false); // CORREÇÃO: Liberar mutex em caso de erro
        }
      });
    } catch (error) {
      setIsSubmitting(false); // CORREÇÃO: Liberar mutex em caso de erro
      toast.error("Erro ao processar venda: " + error.message);
    }
  };

  const adicionarFormaPagamento = () => {
    setPagamentos([...pagamentos, {
      forma_pagamento: "dinheiro",
      valor: 0,
      parcelas: 1
    }]);
  };

  const removerFormaPagamento = (index) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const imprimirCupom = () => {
    imprimirCupomVenda(vendaFinalizada);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setFullscreen(true);
        toast.success("Modo tela cheia ativado!");
      }).catch(err => {
        toast.error("Erro ao ativar tela cheia");
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setFullscreen(false);
        toast.success("Modo tela cheia desativado!");
      }).catch(err => {
        toast.error("Erro ao desativar tela cheia");
        console.error("Fullscreen error:", err);
      });
    }
  };

  // Se o caixa estiver fechado, mostrar mensagem de bloqueio
  if (!caixaAberto) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-slate-100">
        <Card className="max-w-lg w-full mx-4 border-2 border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-600" />
            </div>

            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg">Caixa Fechado</AlertTitle>
              <AlertDescription className="text-base mt-2">
                O PDV não pode ser utilizado enquanto o caixa estiver fechado.
                <br />
                Abra o caixa primeiro para começar a vender.
              </AlertDescription>
            </Alert>

            <p className="text-slate-600 mb-6">
              Para abrir o caixa, acesse a página de <strong>Controle de Caixa</strong> e clique em "Abrir Caixa".
            </p>

            <Button
              onClick={() => window.location.href = '/caixa'}
              className="bg-green-600 hover:bg-green-700 w-full h-12 text-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              Ir para Controle de Caixa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          html { -webkit-text-size-adjust: 100%; }
          * { -webkit-tap-highlight-color: transparent; }
        }
      `}</style>
      <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-slate-50">
        {/* ÁREA DE PRODUTOS */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 sm:p-3 bg-white border-b space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  ref={inputBuscaRef}
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-11 text-sm sm:text-base"
                  autoFocus
                />
              </div>

              <Button
                onClick={() => setDialogReimprimir(true)}
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 text-cyan-600 border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                title="Reimprimir Cupom"
              >
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                onClick={() => setDialogOS(true)}
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                title="Nova Ordem de Serviço"
              >
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                onClick={() => setDialogCalculadora(true)}
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                title="Calculadora de Taxas"
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                onClick={() => setDialogAvaliador(true)}
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                title="Avaliador de Seminovos"
              >
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              <Button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                      toast.success("🖥️ Tela cheia ativada!");
                    });
                  } else {
                    document.exitFullscreen().then(() => {
                      toast.success("🖥️ Tela cheia desativada!");
                    });
                  }
                }}
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0"
                title="Alternar tela cheia"
              >
                {fullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            {loadingProdutos ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-600 text-sm">Carregando...</p>
                </div>
              </div>
            ) : produtos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Nenhum produto</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {(searchTerm ? produtosFiltrados : produtos.filter(p => p.ativo !== false && (p.estoque_atual === undefined || p.estoque_atual > 0)).slice(0, 20)).map((produto) => (
                  <Card key={produto.id} className="cursor-pointer hover:shadow-lg transition-all active:scale-95" onClick={() => adicionarAoCarrinho(produto)}>
                    <CardContent className="p-2 sm:p-3">
                      <div className="aspect-square bg-slate-100 rounded mb-1 sm:mb-2 flex items-center justify-center overflow-hidden">
                        {produto.imagem_url ? (
                          <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover rounded" />
                        ) : (
                          <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-[10px] sm:text-xs mb-1 truncate leading-tight">{produto.nome}</h3>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-base font-bold text-green-600">R$ {(parseFloat(produto.preco_venda) || 0).toFixed(2)}</span>
                        <Badge variant="secondary" className="text-[9px] sm:text-xs px-1 py-0">Est: {produto.estoque_atual || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* BOTÃO CARRINHO MOBILE */}
          {carrinho.length > 0 && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-2xl z-50">
              <Button
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 flex items-center justify-between"
                onClick={() => {
                  const carrinhoEl = document.getElementById('carrinho-mobile');
                  if (carrinhoEl) {
                    carrinhoEl.classList.toggle('hidden');
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Ver Carrinho ({carrinho.length})
                </span>
                <span className="font-bold">R$ {calcularTotal().toFixed(2)}</span>
              </Button>
            </div>
          )}
        </div>

        {/* CARRINHO - DESKTOP: LATERAL / MOBILE: OVERLAY */}
        <div id="carrinho-mobile" className="hidden lg:flex lg:w-96 bg-white border-l flex-col shadow-2xl overflow-hidden fixed lg:relative inset-0 lg:inset-auto z-40">
          <div className="p-2 sm:p-3 border-b bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                Carrinho ({carrinho.length})
              </h2>
              <div className="flex items-center gap-1">
                {carrinho.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const resposta = await confirm({
                        title: "Limpar Carrinho",
                        description: "Deseja realmente limpar todo o carrinho?",
                        confirmText: "Sim, Limpar",
                        cancelText: "Não",
                        type: "confirm"
                      });
                      if (resposta) {
                        limparVenda();
                      }
                    }}
                    className="text-red-600 h-7 sm:h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-7 sm:h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    const carrinhoEl = document.getElementById('carrinho-mobile');
                    if (carrinhoEl) {
                      carrinhoEl.classList.add('hidden');
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setDialogCliente(true)}>
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
              {clienteSelecionado ? (
                <span className="truncate">{clienteSelecionado.nome_completo}</span>
              ) : "Cliente"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-center">Carrinho vazio</p>
              </div>
            ) : (
              carrinho.map((item) => (
                <Card key={item.produto_id} className="border">
                  <CardContent className="p-2 sm:p-2.5">
                    <div className="flex items-start gap-2 mb-1 sm:mb-2">
                      {/* Imagem do produto */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.produto_nome} className="w-full h-full object-cover rounded" />
                        ) : (
                          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[11px] sm:text-xs truncate">{item.produto_nome}</h4>
                        <p className="text-[10px] sm:text-xs text-green-600 font-semibold">R$ {(parseFloat(item.preco_unitario) || 0).toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-600 h-6 w-6 flex-shrink-0" onClick={() => removerDoCarrinho(item.produto_id)}>
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 sm:w-8 text-center font-semibold text-xs sm:text-sm">{item.quantidade}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-xs sm:text-sm">R$ {(parseFloat(item.subtotal) || 0).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {carrinho.length > 0 && (
            <div className="border-t p-2 sm:p-3 bg-slate-50 space-y-2">
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">R$ {calcularSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-slate-600">Desconto (%):</span>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={descontoPercentual}
                      onChange={(e) => {
                        const valor = Math.max(0, Math.min(parseFloat(e.target.value) || 0, 100));
                        // Aplica validação imediatamente (não esperar onBlur)
                        const aplicou = aplicarDesconto(valor);
                        if (!aplicou) {
                          // Se não aplicou (precisa autorização), não muda o valor
                          // aplicarDesconto já reseta para 0 e abre dialog
                        }
                      }}
                      className="w-20 sm:w-24 h-7 sm:h-8 text-right text-xs sm:text-sm pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                  </div>
                </div>

                {descontoPercentual > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs text-orange-600">
                    <span>Valor do desconto:</span>
                    <span>- R$ {calcularDescontoValor().toFixed(2)}</span>
                  </div>
                )}

                {/* Cupom de Desconto */}
                <div className="flex justify-between items-center py-1">
                  {cupomAplicado ? (
                    <div className="flex items-center justify-between w-full bg-green-50 border border-green-200 rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <Ticket className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        <span className="text-[10px] sm:text-xs font-medium text-green-700">
                          {cupomAplicado.codigo}
                          {cupomAplicado.tipo === 'percentual'
                            ? ` (${cupomAplicado.valor}%)`
                            : ` (R$ ${parseFloat(cupomAplicado.valor).toFixed(2)})`}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={removerCupom}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px] sm:text-xs"
                      onClick={() => setDialogCupom(true)}
                    >
                      <Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Aplicar Cupom
                    </Button>
                  )}
                </div>

                {cupomAplicado && calcularDescontoCupom() > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs text-green-600">
                    <span>Desconto do cupom:</span>
                    <span>- R$ {calcularDescontoCupom().toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base sm:text-lg font-bold pt-1 sm:pt-2 border-t-2 border-slate-300">
                  <span>TOTAL:</span>
                  <span className="text-green-600">R$ {calcularTotal().toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full h-10 sm:h-11 text-sm sm:text-base bg-green-600 hover:bg-green-700" onClick={abrirPagamento}>
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Finalizar Venda
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogCliente} onOpenChange={(open) => { setDialogCliente(open); if (open) refetchClientes(); if (!open) setBuscaClientePDV(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="sticky top-0 bg-white z-10 pb-3 space-y-2">
              <Input
                placeholder="Buscar cliente por nome, telefone ou CPF..."
                value={buscaClientePDV}
                onChange={(e) => setBuscaClientePDV(e.target.value)}
                autoFocus
                className="w-full"
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setClienteSelecionado(null);
                  setBuscaClientePDV("");
                  setDialogCliente(false);
                }}
              >
                Sem cliente identificado
              </Button>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  setBuscaClientePDV("");
                  setDialogCliente(false);
                  setDialogNovoCliente(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Novo Cliente
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clientes
                .filter(c => c.ativo !== false)
                .filter(c => {
                  if (!buscaClientePDV) return true;
                  const termo = buscaClientePDV.toLowerCase();
                  return (
                    (c.nome_completo || "").toLowerCase().includes(termo) ||
                    (c.telefone1 || "").toLowerCase().includes(termo) ||
                    (c.telefone2 || "").toLowerCase().includes(termo) ||
                    (c.cpf || "").toLowerCase().includes(termo) ||
                    (c.email || "").toLowerCase().includes(termo)
                  );
                })
                .map((cliente) => (
                  <Button
                    key={cliente.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setClienteSelecionado(cliente);
                      setBuscaClientePDV("");
                      setDialogCliente(false);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{cliente.nome_completo}</div>
                      <div className="text-sm text-slate-500">{cliente.telefone1 || cliente.email || ""}</div>
                    </div>
                  </Button>
                ))
              }
              {clientes.filter(c => c.ativo !== false).filter(c => {
                if (!buscaClientePDV) return false;
                const termo = buscaClientePDV.toLowerCase();
                return (
                  (c.nome_completo || "").toLowerCase().includes(termo) ||
                  (c.telefone1 || "").toLowerCase().includes(termo) ||
                  (c.telefone2 || "").toLowerCase().includes(termo) ||
                  (c.cpf || "").toLowerCase().includes(termo) ||
                  (c.email || "").toLowerCase().includes(termo)
                );
              }).length === 0 && buscaClientePDV && (
                  <p className="text-center text-slate-400 text-sm py-4">Nenhum cliente encontrado para "{buscaClientePDV}"</p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total a Pagar:</span>
                <span className="text-green-600">R$ {calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            {pagamentos.map((pagamento, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold">Pagamento {index + 1}</span>
                    {pagamentos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerFormaPagamento(index)}
                        className="ml-auto"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className={`grid ${pagamento.forma_pagamento === 'credito_parcelado' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select
                        value={pagamento.forma_pagamento}
                        onValueChange={(value) => {
                          const newPagamentos = [...pagamentos];
                          newPagamentos[index].forma_pagamento = value;
                          if (value !== 'credito_parcelado') {
                            newPagamentos[index].parcelas = 1;
                          } else {
                            if (newPagamentos[index].parcelas < 2) newPagamentos[index].parcelas = 2;
                          }
                          setPagamentos(newPagamentos);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">💳 Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">💳 Cartão de Débito</SelectItem>
                          <SelectItem value="pix">🔵 PIX</SelectItem>
                          <SelectItem value="cheque">📄 Cheque</SelectItem>
                          <SelectItem value="a_prazo">🗓️ A Prazo</SelectItem>
                          <SelectItem value="credito_parcelado">💳 Crédito Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Valor</Label>
                      <InputMoeda
                        value={pagamento.valor}
                        onChange={(valor) => {
                          const newPagamentos = [...pagamentos];
                          newPagamentos[index].valor = valor;
                          setPagamentos(newPagamentos);
                        }}
                      />
                    </div>

                    {pagamento.forma_pagamento === 'credito_parcelado' && (
                      <div>
                        <Label>Parcelas</Label>
                        <Input
                          type="number"
                          min="2"
                          max="24"
                          value={pagamento.parcelas || 2}
                          onChange={(e) => {
                            const newPagamentos = [...pagamentos];
                            newPagamentos[index].parcelas = parseInt(e.target.value) || 2;
                            setPagamentos(newPagamentos);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={adicionarFormaPagamento}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Forma de Pagamento
            </Button>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Total Pago:</span>
                <span className="font-bold">
                  R$ {pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Troco:</span>
                <span className="font-bold text-green-600">
                  R$ {Math.max(0, pagamentos.reduce((sum, p) => sum + (p.valor || 0), 0) - calcularTotal()).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagamento(false)}>
              Cancelar
            </Button>
            <Button
              onClick={finalizarVenda}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Venda
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSucesso} onOpenChange={setDialogSucesso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              Venda Finalizada com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3">
            <p className="text-2xl font-bold text-green-600">
              R$ {vendaFinalizada?.valor_total?.toFixed(2)}
            </p>
            <p className="text-sm text-slate-600">
              Venda #{vendaFinalizada?.codigo_venda}
            </p>
            <p className="text-sm text-slate-600">
              {vendaFinalizada?.itens?.length} item(ns)
            </p>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button
              onClick={imprimirCupom}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Cupom
            </Button>
            <Button
              onClick={() => setDialogSucesso(false)}
              variant="outline"
              className="w-full"
            >
              Nova Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSenhaDesconto} onOpenChange={(open) => {
          if (!open) {
            // CRÍTICO: Reseta tudo ao fechar sem autorizar (X, clique fora, ESC)
            setDescontoPercentual(0);
            setDescontoTemporario(0);
            setCodigoBarrasDigitado("");
          }
          setDialogSenhaDesconto(open);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorização Necessária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900">
                <strong>Desconto acima do permitido!</strong>
                <br />Escaneie o cartão de autorização de um supervisor/gerente.
              </p>
            </div>

            <div>
              <Label>Código de Barras do Cartão de Autorização</Label>
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="Escaneie o código de barras..."
                value={codigoBarrasDigitado}
                onChange={(e) => setCodigoBarrasDigitado(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    validarSenhaDesconto();
                  }
                }}
                autoFocus
                className="font-mono text-lg"
              />
              <p className="text-xs text-slate-500 mt-1">
                💡 Use o leitor de código de barras ou digite manualmente
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="text-slate-600">
                Desconto solicitado: <strong className="text-orange-600">{descontoTemporario.toFixed(1)}%</strong> (
                R$ {((calcularSubtotal() * descontoTemporario) / 100).toFixed(2)})
              </p>
              <p className="text-slate-600">
                Limite sem autorização: <strong className="text-orange-600">{configuracoes?.pdv?.solicitar_senha_desconto_acima || 10}%</strong> (
                R$ {((calcularSubtotal() * (configuracoes?.pdv?.solicitar_senha_desconto_acima || 10)) / 100).toFixed(2)})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogSenhaDesconto(false);
                setCodigoBarrasDigitado("");
                setDescontoPercentual(0);
                setDescontoTemporario(0);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={validarSenhaDesconto} className="bg-orange-600 hover:bg-orange-700">
              Validar e Autorizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={dialogScanner}
        onClose={() => setDialogScanner(false)}
        onDetected={(codigo) => {
          setSearchTerm(codigo);
          setDialogScanner(false);
          const produto = produtos.find(p => p.codigo_barras === codigo);
          if (produto) {
            adicionarAoCarrinho(produto);
          } else {
            toast.error("Produto não encontrado!");
          }
        }}
      />

      <ClienteFormDialog
        open={dialogNovoCliente}
        onOpenChange={(open) => {
          setDialogNovoCliente(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
          }
        }}
      />

      {/* Dialog Calculadora */}
      <Dialog open={dialogCalculadora} onOpenChange={setDialogCalculadora}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Calculadora de Pagamentos
            </DialogTitle>
          </DialogHeader>
          <CalculadoraQuick />
        </DialogContent>
      </Dialog>

      {/* Dialog OS */}
      <Dialog open={dialogOS} onOpenChange={setDialogOS}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Nova Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          <OSFormComplete onSuccess={() => setDialogOS(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog Avaliador de Seminovos */}
      <Dialog open={dialogAvaliador} onOpenChange={setDialogAvaliador}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              Nova Avaliação de Seminovo
            </DialogTitle>
          </DialogHeader>
          <AvaliacaoFormComplete onSuccess={() => setDialogAvaliador(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog Cupom de Desconto */}
      <Dialog open={dialogCupom} onOpenChange={setDialogCupom}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-600" />
              Aplicar Cupom de Desconto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="codigo-cupom">Codigo do Cupom</Label>
              <Input
                id="codigo-cupom"
                placeholder="Digite o codigo do cupom..."
                value={codigoCupom}
                onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !validandoCupom) {
                    validarCupom();
                  }
                }}
                className="uppercase"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDialogCupom(false);
                  setCodigoCupom("");
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={validarCupom}
                disabled={validandoCupom || !codigoCupom.trim()}
              >
                {validandoCupom ? "Validando..." : "Aplicar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Autenticação do Vendedor */}
      <Dialog open={dialogVendedor} onOpenChange={setDialogVendedor}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Identificação do Vendedor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Digite sua senha de vendedor para registrar esta venda em seu nome.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-vendedor">Senha do Vendedor</Label>
              <Input
                ref={senhaVendedorRef}
                id="senha-vendedor"
                type="password"
                placeholder="Digite sua senha..."
                value={senhaVendedor}
                onChange={(e) => setSenhaVendedor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !validandoVendedor) {
                    validarVendedor();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Total da Venda:</strong>{" "}
                <span className="text-green-600 font-bold">
                  R$ {calcularTotal().toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                <strong>Itens:</strong> {carrinho.length} produto(s)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogVendedor(false);
                setSenhaVendedor("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={validarVendedor}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={validandoVendedor || !senhaVendedor.trim()}
            >
              {validandoVendedor ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Validando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reimprimir Cupom */}
      <Dialog open={dialogReimprimir} onOpenChange={(open) => { setDialogReimprimir(open); if (!open) setBuscaReimprimir(""); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-cyan-600" />
              Reimprimir Cupom
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por codigo da venda, cliente ou vendedor..."
              value={buscaReimprimir}
              onChange={(e) => setBuscaReimprimir(e.target.value)}
              autoFocus
            />
            <div className="max-h-[50vh] overflow-y-auto space-y-1">
              {vendasRecentes
                .filter(v => {
                  if (!buscaReimprimir) return true;
                  const termo = buscaReimprimir.toLowerCase();
                  return (
                    (v.codigo_venda || '').toLowerCase().includes(termo) ||
                    (v.cliente_nome || '').toLowerCase().includes(termo) ||
                    (v.vendedor_nome || '').toLowerCase().includes(termo)
                  );
                })
                .map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      imprimirCupomVenda({ ...v, _reimpressao: true });
                      setDialogReimprimir(false);
                      setBuscaReimprimir("");
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{v.codigo_venda}</span>
                        <Badge variant="outline" className="text-xs">
                          R$ {(parseFloat(v.valor_total) || 0).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {v.data_venda ? format(new Date(v.data_venda), 'dd/MM/yyyy HH:mm') : '-'} | {v.vendedor_nome || '-'} | {v.cliente_nome || 'Consumidor'}
                      </div>
                    </div>
                    <Printer className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                  </div>
                ))
              }
              {vendasRecentes.length === 0 && (
                <div className="text-center text-slate-400 py-6">Carregando vendas...</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog PIX */}
      <PixPayment
        open={dialogPix}
        onClose={() => setDialogPix(false)}
        valor={valorPix}
        onSuccess={() => {
          setDialogPix(false);
          // CORREÇÃO: Ativar mutex antes de processar venda via PIX
          setIsSubmitting(true);
          processarVenda();
        }}
        onReject={() => {
          setDialogPix(false);
          toast.error("Pagamento PIX não confirmado. Venda não finalizada.");
        }}
      />
    </>
  );
}