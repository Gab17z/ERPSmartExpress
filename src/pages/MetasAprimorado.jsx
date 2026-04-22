import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";
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
import { Target, Trophy, TrendingUp, Zap, Award, Star, Crown, Medal, Smartphone, Wallet, Search } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function MetasAprimorado({ vendedorOverride = null, filtro = null }) {
  const { user } = useAuth();
  const [dialogMetas, setDialogMetas] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [dialogAuditoria, setDialogAuditoria] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState({ title: '', items: [], type: '' });
  const isAdmin = user?.cargo?.nome?.toLowerCase().includes('admin') || 
                 (typeof user?.cargo === 'string' && user?.cargo?.toLowerCase().includes('admin')) || 
                 user?.permissoes?.administrador_sistema === true ||
                 user?.permissoes?.gerenciar_metas === true ||
                 user?.cargo_id === 'admin' || // Fallback para ID fixo se houver
                 user?.id === 'admin';
  const [metasConfig, setMetasConfig] = useState({
    vendas_loja: 50000,
    os_loja: 100,
    ticket_medio: 500,
    novos_clientes: 20,
    iphone_novo: 5,
    iphone_seminovo: 10,
    android: 15,
    metas_extra: [],
    recompensas: {
      vendas_loja: 200, os_loja: 150, ticket_medio: 100, novos_clientes: 50, iphone_novo: 100, iphone_seminovo: 80, android: 60
    },
    individuais: {}
  });

  const { lojaFiltroId } = useLoja();

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-data_venda' })
      : base44.entities.Venda.list('-data_venda'),
  });

  const { data: os = [] } = useQuery({
    queryKey: ['os', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.OrdemServico.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.Cliente.list('-created_date'),
  });

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios-sistema', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.UsuarioSistema.filter({ loja_id: lojaFiltroId })
      : base44.entities.UsuarioSistema.list(),
  });

  const { data: devolucoes = [] } = useQuery({
    queryKey: ['devolucoes'],
    queryFn: async () => {
      try { return await base44.entities.Devolucao.list(); } catch { return []; }
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Categoria.filter({ loja_id: lojaFiltroId }, { order: 'nome' })
      : base44.entities.Categoria.list('nome'),
  });

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Marca.filter({ loja_id: lojaFiltroId }, { order: 'nome' })
      : base44.entities.Marca.list('nome'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Produto.filter({ loja_id: lojaFiltroId }, { order: 'nome' })
      : base44.entities.Produto.list('nome'),
  });

  const categoriasMap = React.useMemo(() => {
    const map = {};
    categorias.forEach(c => { map[c.id] = c.nome?.toLowerCase() || ''; });
    return map;
  }, [categorias]);

  const marcasMap = React.useMemo(() => {
    const map = {};
    marcas.forEach(m => { map[m.id] = m.nome?.toLowerCase() || ''; });
    return map;
  }, [marcas]);

  const produtosMap = React.useMemo(() => {
    const map = {};
    produtos.forEach(p => {
      map[p.id] = {
        categoria_id: p.categoria_id || p.categoria,
        is_aparelho: p.is_aparelho,
        marca_id: p.marca_id || p.marca,
        condicao: p.condicao
      };
    });
    return map;
  }, [produtos]);

  const devolucoesPorVenda = React.useMemo(() => {
    const mapa = {};
    devolucoes.filter(d => d.status === 'aprovada').forEach(d => {
      if (!mapa[d.venda_id]) mapa[d.venda_id] = 0;
      mapa[d.venda_id] += parseFloat(d.valor_total) || 0;
    });
    return mapa;
  }, [devolucoes]);

  React.useEffect(() => {
    try {
      const metasSalvas = localStorage.getItem('metas_sistema');
      if (metasSalvas) {
        const parsed = JSON.parse(metasSalvas);
        setMetasConfig({
          vendas_loja: Math.max(1, parsed.vendas_loja || 50000),
          os_loja: Math.max(1, parsed.os_loja || 100),
          ticket_medio: Math.max(1, parsed.ticket_medio || 500),
          novos_clientes: Math.max(1, parsed.novos_clientes || 20),
          iphone_novo: Math.max(0, parsed.iphone_novo || 5),
          iphone_seminovo: Math.max(0, parsed.iphone_seminovo || 10),
          android: Math.max(0, parsed.android || 15),
          metas_extra: parsed.metas_extra || [],
          recompensas: {
            vendas_loja: parseFloat(parsed.recompensas?.vendas_loja) || 0,
            os_loja: parseFloat(parsed.recompensas?.os_loja) || 0,
            ticket_medio: parseFloat(parsed.recompensas?.ticket_medio) || 0,
            novos_clientes: parseFloat(parsed.recompensas?.novos_clientes) || 0,
            iphone_novo: parseFloat(parsed.recompensas?.iphone_novo) || 0,
            iphone_seminovo: parseFloat(parsed.recompensas?.iphone_seminovo) || 0,
            android: parseFloat(parsed.recompensas?.android) || 0
          },
          individuais: parsed.individuais || {}
        });
      }
    } catch (error) {
      console.error("Erro ao carregar metas do localStorage:", error);
    }
  }, []);

  const salvarMetas = () => {
    localStorage.setItem('metas_sistema', JSON.stringify(metasConfig));
    toast.success("Metas atualizadas!");
    setDialogMetas(false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };


  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const parseSafeDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.length === 10 && !dateStr.includes('T')) {
      return new Date(`${dateStr}T00:00:00`);
    }
    return new Date(dateStr);
  };

  const isAuditoria = !!vendedorOverride;
  const targetId = vendedorOverride || user?.id;

  // Encontrar o objeto completo do usuário para ter acesso ao user_id (UUID) além do ID interno
  const targetUserFull = React.useMemo(() => {
    return usuariosSistema.find(u => 
      u.id?.toString() === targetId?.toString() || 
      u.user_id?.toString() === targetId?.toString()
    );
  }, [usuariosSistema, targetId]);

  const targetUserId = targetUserFull?.user_id;

  const usuariosMap = React.useMemo(() => {
    const map = {};
    usuariosSistema.forEach(u => {
      if (u.id) map[u.id] = u.nome;
    });
    return map;
  }, [usuariosSistema]);

  const targetNome = targetUserFull?.nome || usuariosMap[targetId] || user?.nome;

  const filterByUser = (item, idFields = [], nameFields = []) => {
    // Se não é auditoria e é admin, mostra tudo
    if (!isAuditoria && isAdmin === true) return true;
    
    const tid = targetId?.toString().toLowerCase();
    const tuid = targetUserId?.toString().toLowerCase();
    const tnm = targetNome?.toString().toLowerCase().trim();

    // 1. Tentar por ID (campos numéricos ou UUID)
    for (const field of idFields) {
      const val = item[field]?.toString().toLowerCase();
      if (val) {
        if (val === tid || (tuid && val === tuid)) return true;
      }
    }

    // 2. Tentar por Nome
    if (tnm) {
      for (const field of nameFields) {
        const val = item[field]?.toString().toLowerCase().trim();
        if (val && val === tnm) return true;
      }
    }

    // 3. Tentar encontrar o nome dentro de campos de objeto
    if (tnm) {
      if (item.vendedor?.nome?.toLowerCase().trim() === tnm) return true;
      if (item.usuario?.nome?.toLowerCase().trim() === tnm) return true;
    }

    return false;
  };

  const vendasMes = vendas.filter(v => {
    const dataVenda = parseSafeDate(v.data_venda);
    if (filtro) {
      const inicio = new Date(`${filtro.dataInicio}T00:00:00`);
      const fim = new Date(`${filtro.dataFim}T23:59:59`);
      if (dataVenda < inicio || dataVenda > fim) return false;
    } else {
      const mesmoMes = dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
      if (!mesmoMes) return false;
    }
    
    if (!filterByUser(v, ['vendedor_id', 'usuario_id'], ['vendedor_nome'])) return false;
    return true;
  });

  const osMes = os.filter(o => {
    const dataOS = parseSafeDate(o.created_date);
    if (filtro) {
      const inicio = new Date(`${filtro.dataInicio}T00:00:00`);
      const fim = new Date(`${filtro.dataFim}T23:59:59`);
      if (dataOS < inicio || dataOS > fim) return false;
    } else {
      const mesmoMes = dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
      if (!mesmoMes) return false;
    }
    
    if (!filterByUser(o, ['vendedor_id', 'tecnico_id', 'atendente_id'], ['vendedor_nome', 'atendente_abertura', 'atendente_finalizacao', 'tecnico_responsavel'])) return false;
    return true;
  });

  const clientesMes = clientes.filter(c => {
    const dataC = parseSafeDate(c.created_date);
    if (filtro) {
      const inicio = new Date(`${filtro.dataInicio}T00:00:00`);
      const fim = new Date(`${filtro.dataFim}T23:59:59`);
      if (dataC < inicio || dataC > fim) return false;
    } else {
      const mesmoMes = dataC.getMonth() === mesAtual && dataC.getFullYear() === anoAtual;
      if (!mesmoMes) return false;
    }

    // REGRA 2: Clientes por usuário de CADASTRO (cadastrado_por_id)
    // FALLBACK: Se o cliente não tem a coluna 'cadastrado_por_id' (banco legado)
    // vamos considerar o vendedor que fez a PRIMEIRA VENDA para este cliente como o "captador"
    let cadastradoId = c.cadastrado_por_id || c.usuario_id;
    let cadastradoNome = c.cadastrado_por_nome || c.atendente_nome;

    if (!cadastradoId && !cadastradoNome) {
      const primeiraVenda = vendas
        .filter(v => v.cliente_id === c.id)
        .sort((a, b) => new Date(a.created_date || a.data_venda) - new Date(b.created_date || b.data_venda))[0];
      
      if (primeiraVenda) {
        cadastradoId = primeiraVenda.vendedor_id;
        cadastradoNome = primeiraVenda.vendedor_nome;
      }
    }

    const clienteAuditado = { 
      ...c, 
      cadastrado_por_id: cadastradoId, 
      cadastrado_por_nome: cadastradoNome 
    };

    if (!filterByUser(clienteAuditado, ['cadastrado_por_id', 'usuario_id'], ['cadastrado_por_nome', 'atendente_nome'])) return false;
    return true;
  }); 

  // --- DEFINIÇÃO DE METAS FINAIS (MOVIDO PARA CIMA PARA EVITAR ERRO DE INICIALIZAÇÃO) ---
  const metaVendasFinal = (isAuditoria || !isAdmin) 
    ? (metasConfig.individuais?.[targetId]?.vendas || Math.round((metasConfig.vendas_loja || 10000) / Math.max(1, usuariosSistema.length)))
    : metasConfig.vendas_loja;

  const metaOSFinal = (isAuditoria || !isAdmin)
    ? (metasConfig.individuais?.[targetId]?.os || Math.round((metasConfig.os_loja || 100) / Math.max(1, usuariosSistema.length)))
    : metasConfig.os_loja;

  const metaTicketFinal = metasConfig.ticket_medio || 0;
  
  const metaClientesFinal = (isAuditoria || !isAdmin)
    ? Math.round(metasConfig.novos_clientes / Math.max(1, usuariosSistema.length))
    : metasConfig.novos_clientes;

  const metaIphoneNovoFinal = (isAuditoria || !isAdmin) 
    ? Math.round((metasConfig.iphone_novo || 0) / Math.max(1, usuariosSistema.length))
    : (metasConfig.iphone_novo || 0);

  const metaIphoneSeminovoFinal = (isAuditoria || !isAdmin)
    ? Math.round((metasConfig.iphone_seminovo || 0) / Math.max(1, usuariosSistema.length))
    : (metasConfig.iphone_seminovo || 0);

  const metaAndroidFinal = (isAuditoria || !isAdmin)
    ? Math.round((metasConfig.android || 0) / Math.max(1, usuariosSistema.length))
    : (metasConfig.android || 0);

  // UNIFICAR ARRAYS PARA EVITAR DIVERGÊNCIA
  const vendasEstemes = vendasMes;

  const osEstemes = osMes;

  const clientesEstemes = clientesMes;

  const auditData = React.useMemo(() => {
    return {
      vendas: [],
      os: [],
      clientes: [],
      iphonesNovos: [],
      iphonesSeminovos: [],
      androids: [],
      metasExtra: {}
    };
  }, []); 

  const totalVendasEstemes = vendasEstemes.reduce((acc, current) => {
    const valorOriginal = parseFloat(current.valor_total) || 0;
    const valorDevolvido = devolucoesPorVenda[current.id] || 0;
    return acc + (valorOriginal - valorDevolvido);
  }, 0);

  const ticketMedioEstemes = vendasEstemes.length > 0 ? totalVendasEstemes / vendasEstemes.length : 0;
  const percentualVendasEstemes = metaVendasFinal > 0 ? (totalVendasEstemes / metaVendasFinal) * 100 : 0;
  const percentualOSEstemes = metaOSFinal > 0 ? (osEstemes.length / metaOSFinal) * 100 : 0;
  const percentualTicketEstemes = metaTicketFinal > 0 ? (ticketMedioEstemes / metaTicketFinal) * 100 : 0;
  const percentualClientesEstemes = metaClientesFinal > 0 ? (clientesEstemes.length / metaClientesFinal) * 100 : 0;

  // Limpar audit antes de popular
  auditData.vendas = [];
  auditData.iphonesNovos = [];
  auditData.iphonesSeminovos = [];
  auditData.androids = [];
  auditData.clientes = clientesEstemes.map(c => ({ id: c.id, data: c.created_date, titulo: c.nome_completo, subtitulo: `CPF/CNPJ: ${c.cpf_cnpj || 'N/A'}` }));
  auditData.os = osEstemes.map(o => ({ id: o.id, data: o.created_date || o.data_entrada, titulo: o.codigo_os, subtitulo: `${o.cliente_nome} - ${o.aparelho?.modelo || 'Equipamento'}` }));
  const progressoMetasExtrasEstemes = {};
  (metasConfig.metas_extra || []).forEach(m => { 
    progressoMetasExtrasEstemes[m.id] = 0; 
    auditData.metasExtra[m.id] = [];
  });

  const vendedoresRanking = {};

  vendasEstemes.forEach(venda => {
    const valorLiquido = Math.max(0, (parseFloat(venda.valor_total) || 0) - (devolucoesPorVenda[venda.id] || 0));
    auditData.vendas.push({ id: venda.id, data: venda.data_venda, titulo: `Venda #${venda.id}`, subtitulo: venda.cliente_nome || 'Consumidor Final', valor: valorLiquido });

    if (valorLiquido > 0) {
      const vendedor = venda.vendedor_nome || 'Sem vendedor';
      if (!vendedoresRanking[vendedor]) {
        vendedoresRanking[vendedor] = { nome: vendedor, vendas: 0, valor: 0 };
      }
      vendedoresRanking[vendedor].vendas += 1;
      vendedoresRanking[vendedor].valor += valorLiquido;
    }

    try {
      const itens = typeof venda.itens === 'string' ? JSON.parse(venda.itens) : (venda.itens || []);
      if (!Array.isArray(itens)) return;

      itens.forEach(item => {
        let prod = item.produto;
        if (typeof prod === 'string') {
          try { prod = JSON.parse(prod); } catch { prod = item; }
        } else if (!prod) {
          prod = item;
        }

        const qtd = parseInt(item.quantidade) || 0;
        let prodId = (prod?.id || prod?.produto_id || prod?.id_produto || item.id_produto || item.produto_id)?.toString();
        const pNome = (prod?.nome || prod?.produto_nome || item.produto_nome || item.nome || '').toLowerCase();

        if (prodId) {
          (metasConfig.metas_extra || []).forEach(meta => {
            const matchesId = meta.produto_ids?.some(pid => pid?.toString() === prodId);
            const matchesNome = meta.nome_produtos?.some(nm => nm?.toLowerCase() === pNome);
            
            if (matchesId || matchesNome) {
              progressoMetasExtrasEstemes[meta.id] += qtd;
              auditData.metasExtra[meta.id].push({ 
                id: venda.id, 
                data: venda.data_venda, 
                titulo: pNome, 
                subtitulo: venda.cliente_nome || `Venda #${venda.id}`, 
                valor: qtd 
              });
            }
          });
        }
      });
    } catch (e) {
      console.error("Erro ao processar itens da venda para Metas Extras:", e);
    }
  });

  let iphonesNovosEstemes = 0;
  let iphonesSeminovosEstemes = 0;
  let androidsEstemes = 0;

  vendasEstemes.forEach(venda => {
    try {
      const itens = typeof venda.itens === 'string' ? JSON.parse(venda.itens) : (venda.itens || []);
      if (!Array.isArray(itens)) return;

      itens.forEach(item => {
        try {
          let prod = item.produto;
          if (typeof prod === 'string') {
            try { prod = JSON.parse(prod); } catch { prod = item; }
          } else if (!prod) {
            prod = item;
          }

          const qtd = parseInt(item.quantidade) || 0;
          if (prod) {
            // RECURSO DE RESILIÊNCIA: Se não achar categoria na venda, tenta olhar no cadastro atual do produto
            const currentProdData = produtosMap[prod.id] || produtosMap[prod.produto_id] || {};
            
            const brandId = (prod.marca_id || prod.marca || prod.marca_nome || item.marca_id || currentProdData.marca_id || '').toString();
            const catId = (prod.categoria_id || prod.categoria || prod.categoria_nome || item.categoria_id || item.categoria || currentProdData.categoria_id || '').toString();
            
            const resolvedCategory = (categoriasMap[catId] || catId || '').toLowerCase();
            const resolvedBrand = (marcasMap[brandId] || brandId || '').toLowerCase();

            // REGRA 1: REGRA ESTRITA - CATEGORIA CELULAR OU IPHONE (Exata)
            const isIphone = resolvedCategory.trim() === 'iphone';
            const isAndroid = resolvedCategory.trim() === 'celular';
            
            // REGRA 2: SEGURANÇA ADICIONAL - Deve ser marcado como aparelho E não pode ser serviço/reparo
            const nomeStr = (prod.nome || prod.produto_nome || item.produto_nome || '').toLowerCase();
            const isService = nomeStr.includes('reparo') || nomeStr.includes('conserto') || nomeStr.includes('mão de obra') || nomeStr.includes('manutenção') || nomeStr.includes('serviço');
            const isAparelhoConfirmado = prod.is_aparelho === true || currentProdData.is_aparelho === true;
            
            const isAparelho = (isIphone || isAndroid) && isAparelhoConfirmado && !isService;
            
            if (isAparelho) {
              const nome = (prod.nome || prod.produto_nome || item.produto_nome || '').toLowerCase();
              // IPHONE é por categoria apple ou iphone
              const isApple = resolvedBrand.includes('apple') || resolvedCategory.includes('apple') || isIphone;
              const isNovo = prod.condicao === 'novo' || item.condicao === 'novo' || currentProdData.condicao === 'novo';
              
              if (isApple && isNovo) {
                iphonesNovosEstemes += qtd;
                auditData.iphonesNovos.push({ id: venda.id, data: venda.data_venda, titulo: nomeStr, subtitulo: `Venda #${venda.id}`, valor: qtd });
              }
              else if (isApple && !isNovo) {
                iphonesSeminovosEstemes += qtd;
                auditData.iphonesSeminovos.push({ id: venda.id, data: venda.data_venda, titulo: nomeStr, subtitulo: `Venda #${venda.id}`, valor: qtd });
              }
              else if (!isApple) {
                androidsEstemes += qtd;
                auditData.androids.push({ id: venda.id, data: venda.data_venda, titulo: nomeStr, subtitulo: `Venda #${venda.id}`, valor: qtd });
              }
            }
          }
        } catch {}
      });
    } catch {}
  });

  const pIphoneNovoEstemes = metaIphoneNovoFinal > 0 ? (iphonesNovosEstemes / metaIphoneNovoFinal) * 100 : 0;
  const pIphoneSemiEstemes = metaIphoneSeminovoFinal > 0 ? (iphonesSeminovosEstemes / metaIphoneSeminovoFinal) * 100 : 0;
  const pAndroidEstemes = metaAndroidFinal > 0 ? (androidsEstemes / metaAndroidFinal) * 100 : 0;

  // Limpeza: Variáveis redundantes de metas foram removidas (totalVendasMes, percentualVendas, etc.)
  // e o loop secundário de itens foi unificado no primeiro loop para evitar cálculos divergentes.
  
  const reC = metasConfig.recompensas || {};
  const conquistas = [
    { id: 1, nome: "Meta Vendas", icone: Trophy, alcancado: percentualVendasEstemes >= 100, cor: "text-yellow-500", valor: reC.vendas_loja || 0, percent: percentualVendasEstemes, check: `R$ ${totalVendasEstemes.toFixed(0)}/R$ ${metaVendasFinal.toFixed(0)}`, audit: auditData.vendas },
    { id: 2, nome: "Meta OS", icone: Zap, alcancado: percentualOSEstemes >= 100, cor: "text-purple-500", valor: reC.os_loja || 0, percent: percentualOSEstemes, check: `${osEstemes.length}/${metaOSFinal} unid.`, audit: auditData.os },
    { id: 3, nome: "Ticket Médio", icone: Award, alcancado: percentualTicketEstemes >= 100, cor: "text-blue-500", valor: reC.ticket_medio || 0, percent: percentualTicketEstemes, check: `R$ ${ticketMedioEstemes.toFixed(0)}/R$ ${metaTicketFinal.toFixed(0)}`, audit: auditData.vendas },
    { id: 4, nome: "Novos Clientes", icone: Star, alcancado: percentualClientesEstemes >= 100, cor: "text-green-500", valor: reC.novos_clientes || 0, percent: percentualClientesEstemes, check: `${clientesEstemes.length}/${metaClientesFinal} unid.`, audit: auditData.clientes },
    { id: 5, nome: "Meta iPhone Novo", icone: Smartphone, alcancado: pIphoneNovoEstemes >= 100, cor: "text-slate-800", valor: reC.iphone_novo || 0, percent: pIphoneNovoEstemes, check: `${iphonesNovosEstemes}/${metaIphoneNovoFinal} unid.`, audit: auditData.iphonesNovos },
    { id: 6, nome: "Meta iPhone Semi", icone: Smartphone, alcancado: pIphoneSemiEstemes >= 100, cor: "text-blue-400", valor: reC.iphone_seminovo || 0, percent: pIphoneSemiEstemes, check: `${iphonesSeminovosEstemes}/${metaIphoneSeminovoFinal} unid.`, audit: auditData.iphonesSeminovos },
    { id: 7, nome: "Meta Android", icone: Smartphone, alcancado: pAndroidEstemes >= 100, cor: "text-emerald-500", valor: reC.android || 0, percent: pAndroidEstemes, check: `${androidsEstemes}/${metaAndroidFinal} unid.`, audit: auditData.androids },
    ...(metasConfig.metas_extra || []).map(meta => ({
      id: `extra-${meta.id}`,
      nome: meta.nome,
      icone: Star,
      alcancado: (progressoMetasExtrasEstemes[meta.id] || 0) >= meta.objetivo,
      cor: "text-amber-500",
      valor: meta.recompensa || 0,
      percent: ((progressoMetasExtrasEstemes[meta.id] || 0) / meta.objetivo) * 100,
      check: `${progressoMetasExtrasEstemes[meta.id] || 0}/${meta.objetivo} unid.`,
      audit: auditData.metasExtra[meta.id] || []
    }))
  ];

  const conquistasAlcancadas = conquistas.filter(c => c.alcancado).length;
  const saldoBonusMensal = conquistas.filter(c => c.alcancado).reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const ranking = Object.values(vendedoresRanking).sort((a, b) => b.valor - a.valor);

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

  const rankingTecnicos = Object.values(tecnicosRanking).sort((a, b) => b.concluidas - a.concluidas);

  const dadosGrafico = ranking.slice(0, 5).map(v => ({
    nome: v.nome.split(' ')[0],
    vendas: v.vendas,
    valor: v.valor
  }));

  return (
    <div className="space-y-6">


      {/* Conquistas Gamificadas */}
      <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-600" />
            Conquistas e Bônus do Mês
          </CardTitle>
          <div className="flex items-center justify-between text-sm text-yellow-700 bg-yellow-100 p-2 border border-yellow-200 rounded-md">
            <span>{conquistasAlcancadas} de {conquistas.length} desbloqueadas</span>
            <span className="font-bold text-lg flex items-center gap-1 text-green-700">  
               <Wallet className="w-5 h-5"/> R$ {saldoBonusMensal.toFixed(2)} acumulado
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conquistas.map((conquista) => {
              const Icone = conquista.icone;
              return (
                <div
                  key={conquista.id}
                  onClick={() => {
                    setSelectedAudit({ 
                      title: conquista.nome, 
                      items: conquista.audit || [], 
                      type: conquista.nome.includes('Meta Vendas') || conquista.nome.includes('Ticket') ? 'valor' : 'qtd' 
                    });
                    setDialogAuditoria(true);
                  }}
                  className={`p-4 rounded-xl text-center transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-95 group border-2 ${
                    conquista.alcancado
                      ? 'bg-white border-green-400 shadow-md ring-4 ring-green-50'
                      : 'bg-white/60 border-slate-200 grayscale hover:grayscale-0 opacity-80 hover:opacity-100 shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-full w-fit mx-auto mb-3 transition-transform group-hover:rotate-12 ${conquista.alcancado ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <Icone className={`w-8 h-8 ${conquista.alcancado ? conquista.cor : 'text-slate-400'}`} />
                  </div>
                  
                  <p className={`text-sm font-bold truncate ${conquista.alcancado ? 'text-slate-900' : 'text-slate-500'}`}>
                    {conquista.nome}
                  </p>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
                      <span>{conquista.check}</span>
                      {conquista.alcancado ? (
                        <span className="text-green-600">✓ 100%</span>
                      ) : (
                        <span>{Math.min(99.9, conquista.percent || 0).toFixed(0)}%</span>
                      )}
                    </div>
                    <Progress value={Math.min(conquista.percent || 0, 100)} className={`h-2 ${conquista.alcancado ? 'bg-green-100' : 'bg-slate-200'}`} />
                  </div>

                  <div className="mt-3">
                    <p className={`text-xs font-black ${conquista.alcancado ? 'text-green-600' : 'text-blue-500'}`}>
                      + R$ {conquista.valor.toFixed(2)}
                    </p>
                  </div>

                  {conquista.alcancado && (
                    <Badge className="mt-2 bg-green-500 hover:bg-green-600 border-none animate-bounce shadow-sm">
                      Desbloqueado!
                    </Badge>
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
              <span>Realizado: R$ {totalVendasEstemes.toFixed(2)}</span>
              <span>Meta: R$ {metaVendasFinal.toFixed(2)}</span>
            </div>
            <Progress value={Math.min(percentualVendasEstemes, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-blue-600">{percentualVendasEstemes.toFixed(1)}%</span>
              {percentualVendasEstemes >= 100 && (
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
              <span>Meta: {metaOSFinal} OS</span>
            </div>
            <Progress value={Math.min(percentualOSEstemes, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-purple-600">{percentualOSEstemes.toFixed(1)}%</span>
              {percentualOSEstemes >= 100 && (
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
              <span>Realizado: R$ {ticketMedioEstemes.toFixed(2)}</span>
              <span>Meta: R$ {metaTicketFinal.toFixed(2)}</span>
            </div>
            <Progress value={Math.min(percentualTicketEstemes, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-green-600">{percentualTicketEstemes.toFixed(1)}%</span>
              {percentualTicketEstemes >= 100 && (
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
            <Progress value={Math.min(percentualClientesEstemes, 100)} className="h-3" />
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-orange-600">{percentualClientesEstemes.toFixed(1)}%</span>
              {percentualClientesEstemes >= 100 && (
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
              {ranking.slice(0, 10).map((vendedor, idx) => (
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

      {/* Audit Modal (Drill-down) */}
      <Dialog open={dialogAuditoria} onOpenChange={setDialogAuditoria}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-500" />
              Detalhamento: {selectedAudit.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {selectedAudit.items.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-600">Data</th>
                      <th className="text-left p-3 font-semibold text-slate-600">ID/Código</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Descrição/Cliente</th>
                      <th className="text-right p-3 font-semibold text-slate-600">
                        {selectedAudit.type === 'valor' ? 'Valor Líquido' : 'Quantidade'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedAudit.items.sort((a, b) => new Date(b.data) - new Date(a.data)).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-slate-500">
                          {new Date(item.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono text-xs font-semibold">
                          {item.titulo}
                        </td>
                        <td className="p-3 text-slate-600 italic">
                          {item.subtitulo}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {selectedAudit.type === 'valor' 
                            ? `R$ ${parseFloat(item.valor).toFixed(2)}` 
                            : `${item.valor || 1} un.`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Search className="w-12 h-12 mb-2 opacity-20" />
                <p>Nenhum registro encontrado para esta meta no período.</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogAuditoria(false)}>
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs Originais */}
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
              <Label>Novos Clientes</Label>
              <Input
                type="number"
                value={metasConfig.novos_clientes}
                onChange={(e) => setMetasConfig({...metasConfig, novos_clientes: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          {usuariosSistema && usuariosSistema.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <Label className="text-lg font-bold">Metas Individuais por Usuário</Label>
              <p className="text-xs text-slate-500 mb-4">Caso o usuário não possua meta registrada, será utilizada a divisão da Meta da Loja.</p>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {usuariosSistema.map(u => (
                  <div key={u.user_id} className="grid grid-cols-4 gap-4 items-end bg-slate-50 p-3 rounded-lg border">
                    <div className="col-span-2">
                      <Label className="font-semibold text-sm">{u.user_nome}</Label>
                      <p className="text-xs text-slate-500">{u.cargo_nome}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Vendas (R$)</Label>
                      <Input 
                        type="number"
                        placeholder="Ex: 5000"
                        className="h-8 text-sm"
                        value={metasConfig.individuais?.[u.user_id]?.vendas || ''}
                        onChange={(e) => setMetasConfig({
                          ...metasConfig,
                          individuais: {
                            ...(metasConfig.individuais || {}),
                            [u.user_id]: { ...(metasConfig.individuais?.[u.user_id] || {}), vendas: parseFloat(e.target.value) || 0 }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">O.S (Qtd)</Label>
                      <Input 
                        type="number"
                        placeholder="Ex: 10"
                        className="h-8 text-sm"
                        value={metasConfig.individuais?.[u.user_id]?.os || ''}
                        onChange={(e) => setMetasConfig({
                          ...metasConfig,
                          individuais: {
                            ...(metasConfig.individuais || {}),
                            [u.user_id]: { ...(metasConfig.individuais?.[u.user_id] || {}), os: parseInt(e.target.value) || 0 }
                          }
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
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
              <p><strong>Valor Total:</strong> R$ {totalVendasEstemes.toFixed(2)}</p>
              <p><strong>Ticket Médio:</strong> R$ {ticketMedioEstemes.toFixed(2)}</p>
              <p><strong>Maior Venda:</strong> R$ {(vendasMes.length > 0 ? Math.max(...vendasMes.map(v => parseFloat(v.valor_total) || 0)) : 0).toFixed(2)}</p>
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