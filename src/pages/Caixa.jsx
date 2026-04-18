import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL, formatarValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Lock, Unlock, Calculator, TrendingUp, Clock, ArrowDown, ArrowUp, AlertTriangle, ShieldCheck, ShieldAlert, Eye, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours } from "date-fns";
import ContagemNotas from "@/components/caixa/ContagemNotas";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import { imprimirFechamento80mm, imprimirFechamentoA4 } from "@/components/caixa/RelatorioFechamento";

// CORREÇÃO: Constantes de configuração para validações
const LIMITE_DIFERENCA_SEM_APROVACAO = 50; // R$ 50 de diferença máxima sem aprovação
const LIMITE_SANGRIA_SEM_APROVACAO = 500; // R$ 500 de sangria máxima sem aprovação
const HORAS_ALERTA_CAIXA_ABERTO = 24; // Alerta após 24 horas

export default function Caixa() {
  const [dialogAbertura, setDialogAbertura] = useState(false);
  const [dialogFechamento, setDialogFechamento] = useState(false);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [dialogSangria, setDialogSangria] = useState(false);
  const [dialogSuprimento, setDialogSuprimento] = useState(false);
  const [valorInicial, setValorInicial] = useState(0);
  const [valorMovimentacao, setValorMovimentacao] = useState(0);
  const [descricaoMovimentacao, setDescricaoMovimentacao] = useState("");
  const [valorContado, setValorContado] = useState({
    dinheiro: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    pix: 0,
    cheque: 0,
    outros: 0
  });

  // Contagem de notas/moedas para abertura e fechamento
  const [contagemAbertura, setContagemAbertura] = useState({
    notas: { "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0 },
    moedas: { "1": 0, "0.5": 0, "0.25": 0, "0.10": 0, "0.05": 0 },
    total: 0
  });

  const [contagemNotas, setContagemNotas] = useState({
    notas: { "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0 },
    moedas: { "1": 0, "0.5": 0, "0.25": 0, "0.10": 0, "0.05": 0 },
    total: 0
  });

  // Detalhe de caixa no histórico
  const [dialogDetalhe, setDialogDetalhe] = useState(false);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);

  // CORREÇÃO: Estados para aprovação de operações sensíveis
  const [dialogAprovacaoSangria, setDialogAprovacaoSangria] = useState(false);
  const [dialogAprovacaoDiferenca, setDialogAprovacaoDiferenca] = useState(false);
  const [senhaAprovacao, setSenhaAprovacao] = useState("");
  const [justificativaDiferenca, setJustificativaDiferenca] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Mutex para evitar duplo clique

  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();

  // Verificar se usuário pode gerenciar caixa (sangria/suprimento)
  const podeGerenciarCaixa = hasPermission('gerenciar_caixa');
  const podeSangriaSuprimento = podeGerenciarCaixa || hasPermission('fazer_sangria_suprimento');

  const { data: caixas = [], isLoading } = useQuery({
    queryKey: ['caixas'],
    queryFn: () => base44.entities.Caixa.list('-created_date'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const { data: movimentacoesCaixa = [] } = useQuery({
    queryKey: ['movimentacoes-caixa'],
    queryFn: async () => {
      try {
        return await base44.entities.MovimentacaoCaixa.list('-created_date');
      } catch (e) {
        console.error("Erro ao buscar movimentações do caixa:", e);
        return [];
      }
    },
    refetchOnWindowFocus: true, // Atualiza ao voltar para a aba
  });

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios_sistema_caixa'],
    queryFn: () => base44.entities.UsuarioSistema.list('nome'),
  });

  const caixaAberto = caixas.find(c => c.status === 'aberto');

  // Mapa de numeração sequencial: ordena por data de criação e atribui 1, 2, 3...
  // Isso corrige caixas antigos que tinham numero_caixa errado (ex: 16, 161)
  const numeroCaixaMap = useMemo(() => {
    const sorted = [...caixas].sort(
      (a, b) => new Date(a.created_date || a.data_abertura) - new Date(b.created_date || b.data_abertura)
    );
    const map = {};
    sorted.forEach((c, idx) => {
      map[c.id] = idx + 1;
    });
    return map;
  }, [caixas]);

  // Helper para obter número sequencial de qualquer caixa
  const getNumCaixa = (caixa) => {
    if (!caixa?.id) return '-';
    return numeroCaixaMap[caixa.id] || caixa.numero_caixa || '-';
  };

  // CORREÇÃO: Calcular horas desde abertura do caixa
  const horasAberto = useMemo(() => {
    if (!caixaAberto?.data_abertura) return 0;
    return differenceInHours(new Date(), new Date(caixaAberto.data_abertura));
  }, [caixaAberto]);

  // CORREÇÃO: Calcular movimentações do caixa atual (sangrias e suprimentos)
  const movimentacoesDoCaixa = useMemo(() => {
    if (!caixaAberto?.id) return { sangrias: 0, suprimentos: 0 };
    const movs = movimentacoesCaixa.filter(m => m.caixa_id === caixaAberto.id);
    return {
      sangrias: movs.filter(m => m.tipo === 'sangria').reduce((sum, m) => sum + (m.valor || 0), 0),
      suprimentos: movs.filter(m => m.tipo === 'suprimento').reduce((sum, m) => sum + (m.valor || 0), 0)
    };
  }, [caixaAberto?.id, movimentacoesCaixa]);

  const abrirCaixaMutation = useMutation({
    mutationFn: async (valorInicial) => {
      // CORREÇÃO: Buscar caixas FRESCOS do banco para evitar race condition
      const caixasAtuais = await base44.entities.Caixa.list('-created_date');
      const caixaAbertoExistente = caixasAtuais.find(c => c.status === 'aberto');

      if (caixaAbertoExistente) {
        throw new Error(`Já existe um caixa aberto por ${caixaAbertoExistente.usuario_abertura}. Feche-o antes de abrir outro.`);
      }

      // CORREÇÃO: Usar contagem de caixas ordenados por data de criação 
      // para gerar número sequencial. Isso evita o bug de concatenação de string
      // que gerava números como 13 → 131 → 1311 → 13111
      const caixasOrdenados = [...caixasAtuais].sort(
        (a, b) => new Date(a.created_date || a.data_abertura) - new Date(b.created_date || b.data_abertura)
      );
      // O próximo número é simplesmente o total de caixas + 1
      // Math.trunc garante inteiro puro — evita qualquer risco de concatenação de string
      const numeroCaixa = Math.trunc(caixasOrdenados.length) + 1;

      // Gerar um resumo em texto para as observações (já que a coluna contagem_abertura pode não existir no DB)
      const resumoNotas = Object.entries(contagemAbertura.notas || {}).filter(([_, q]) => q > 0).map(([v, q]) => `R$ ${v}: ${q}x`).join(', ');
      const resumoMoedas = Object.entries(contagemAbertura.moedas || {}).filter(([_, q]) => q > 0).map(([v, q]) => `R$ ${parseFloat(v).toFixed(2)}: ${q}x`).join(', ');
      const obsAbertura = `Contagem Abertura: [Notas: ${resumoNotas || 'Nenhuma'}] [Moedas: ${resumoMoedas || 'Nenhuma'}]`;

      // Não enviar usuario_abertura_id pois sistema usa auth customizada
      return base44.entities.Caixa.create({
        numero_caixa: numeroCaixa,
        usuario_abertura: user?.nome || "Usuário",
        data_abertura: new Date().toISOString(),
        valor_inicial: valorInicial,
        observacoes: obsAbertura, 
        status: 'aberto'
      });
    },
    onSuccess: (caixa) => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      toast.success("Caixa aberto com sucesso!");
      setDialogAbertura(false);
      setValorInicial(0);
      setContagemAbertura({
        notas: { "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0 },
        moedas: { "1": 0, "0.5": 0, "0.25": 0, "0.10": 0, "0.05": 0 },
        total: 0
      });

      // Imprimir comprovante de abertura
      imprimirAberturaCaixa(caixa);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao abrir caixa");
    },
  });

  const sangriaMutation = useMutation({
    mutationFn: async ({ aprovado = false } = {}) => {
      // Verificar permissão
      if (!podeGerenciarCaixa) {
        throw new Error("Você não tem permissão para realizar sangrias. Necessário: Gerenciar Caixa");
      }

      // CORREÇÃO: Validar se caixa ainda está aberto
      if (!caixaAberto) {
        throw new Error("Nenhum caixa aberto para realizar sangria");
      }

      // CORREÇÃO: Validar valor
      if (valorMovimentacao <= 0) {
        throw new Error("Valor da sangria deve ser maior que zero");
      }

      // CORREÇÃO: Validar se não excede valor em caixa
      const valorDisponivel = (parseFloat(caixaAberto.valor_inicial) || 0) + (resumoCaixa?.dinheiro || 0) + movimentacoesDoCaixa.suprimentos - movimentacoesDoCaixa.sangrias;
      if (valorMovimentacao > valorDisponivel) {
        throw new Error(`Valor da sangria (R$ ${parseFloat(valorMovimentacao).toFixed(2)}) excede o valor disponível em caixa (R$ ${parseFloat(valorDisponivel).toFixed(2)})`);
      }

      // CORREÇÃO: Exigir aprovação para valores altos
      if (valorMovimentacao > LIMITE_SANGRIA_SEM_APROVACAO && !aprovado) {
        throw new Error("REQUER_APROVACAO");
      }

      const dataHora = new Date().toISOString();
      const movimentacaoData = {
        caixa_id: caixaAberto.id,
        tipo: 'sangria',
        valor: valorMovimentacao,
        descricao: descricaoMovimentacao + (aprovado ? ` | Aprovado por: ${user?.nome || 'Gerente'}` : ''),
        usuario_id: user?.id || null,
        usuario_nome: user?.nome || "Usuário" // Campo extra para exibição
      };

      const movimentacao = await base44.entities.MovimentacaoCaixa.create(movimentacaoData);

      // Retornar dados para impressão do recibo (com campos adicionais para o recibo)
      return {
        ...movimentacao,
        usuario: user?.nome || "Usuário",
        data_hora: movimentacao?.created_date || dataHora,
        aprovado_por: aprovado ? user?.nome : null
      };
    },
    onSuccess: (movimentacao) => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-caixa'] });
      toast.success("Sangria registrada com sucesso!");

      // Imprimir recibo
      imprimirReciboMovimentacao(movimentacao);

      setDialogSangria(false);
      setDialogAprovacaoSangria(false);
      setValorMovimentacao(0);
      setDescricaoMovimentacao("");
      setSenhaAprovacao("");
    },
    onError: (error) => {
      if (error.message === "REQUER_APROVACAO") {
        setDialogSangria(false);
        setDialogAprovacaoSangria(true);
      } else {
        toast.error(error.message || "Erro ao registrar sangria");
      }
    },
  });

  const suprimentoMutation = useMutation({
    mutationFn: async () => {
      // Verificar permissão
      if (!podeGerenciarCaixa) {
        throw new Error("Você não tem permissão para realizar suprimentos. Necessário: Gerenciar Caixa");
      }

      // CORREÇÃO: Validar se caixa ainda está aberto
      if (!caixaAberto) {
        throw new Error("Nenhum caixa aberto para realizar suprimento");
      }

      // CORREÇÃO: Validar valor
      if (valorMovimentacao <= 0) {
        throw new Error("Valor do suprimento deve ser maior que zero");
      }

      const dataHora = new Date().toISOString();
      const movimentacaoData = {
        caixa_id: caixaAberto.id,
        tipo: 'suprimento',
        valor: valorMovimentacao,
        descricao: descricaoMovimentacao,
        usuario_id: user?.id || null,
        usuario_nome: user?.nome || "Usuário" // Campo extra para exibição
      };

      const movimentacao = await base44.entities.MovimentacaoCaixa.create(movimentacaoData);

      // Retornar dados para impressão do recibo (com campos adicionais para o recibo)
      return {
        ...movimentacao,
        usuario: user?.nome || "Usuário",
        data_hora: movimentacao?.created_date || dataHora
      };
    },
    onSuccess: (movimentacao) => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-caixa'] });
      toast.success("Suprimento registrado com sucesso!");

      // Imprimir recibo
      imprimirReciboMovimentacao(movimentacao);

      setDialogSuprimento(false);
      setValorMovimentacao(0);
      setDescricaoMovimentacao("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar suprimento");
    },
  });

  const fecharCaixaMutation = useMutation({
    mutationFn: async ({ aprovado = false, justificativa = "" } = {}) => {
      if (!caixaAberto) {
        throw new Error("Nenhum caixa aberto para fechar");
      }

      // CORREÇÃO: Buscar vendas frescas do banco
      const vendasAtuais = await base44.entities.Venda.list('-created_date');
      const vendasDoCaixa = vendasAtuais.filter(v =>
        v.caixa_id === caixaAberto.id && v.status === 'finalizada'
      );

      // CORREÇÃO: Buscar movimentações frescas do banco
      let movimentacoesAtuais = [];
      try {
        movimentacoesAtuais = await base44.entities.MovimentacaoCaixa.list('-created_date');
      } catch (e) {
        console.error("Erro ao buscar movimentações:", e);
      }
      const movsDoCaixa = movimentacoesAtuais.filter(m => m.caixa_id === caixaAberto.id);
      const totalSangrias = movsDoCaixa.filter(m => m.tipo === 'sangria').reduce((sum, m) => sum + (m.valor || 0), 0);
      const totalSuprimentos = movsDoCaixa.filter(m => m.tipo === 'suprimento').reduce((sum, m) => sum + (m.valor || 0), 0);

      const totalVendas = vendasDoCaixa.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const totalContado = calcularTotalContado();

      // CORREÇÃO: Calcular valor esperado considerando movimentações
      const valorEsperadoReal = (caixaAberto.valor_inicial || 0) + totalVendas + totalSuprimentos - totalSangrias;

      // CORREÇÃO: Usar matemática de centavos para evitar erros de precisão
      const diferencaCentavos = Math.round(totalContado * 100) - Math.round(valorEsperadoReal * 100);
      const diferenca = diferencaCentavos / 100;

      // CORREÇÃO: Exigir aprovação para diferenças significativas
      const diferencaAbsoluta = Math.abs(diferenca);
      if (diferencaAbsoluta > LIMITE_DIFERENCA_SEM_APROVACAO && !aprovado) {
        throw new Error("REQUER_APROVACAO");
      }

      // CORREÇÃO: Registrar justificativa se houver diferença
      let observacoes = 'Caixa fechado corretamente';
      if (diferenca !== 0) {
        observacoes = `Diferença de R$ ${diferenca.toFixed(2)}`;
        if (justificativa) {
          observacoes += ` - Justificativa: ${justificativa}`;
        }
        if (aprovado) {
          observacoes += ` - Aprovado por: ${user?.nome || 'Gerente'}`;
        }
      }

      // Calcular resumo de pagamentos para persistir no caixa
      const resumoPag = {
        dinheiro: 0, cartao_credito: 0, cartao_debito: 0,
        pix: 0, cheque: 0, outros: 0, total: 0
      };
      vendasDoCaixa.forEach(v => {
        (v.pagamentos || []).forEach(p => {
          const forma = p.forma_pagamento || 'outros';
          if (Object.prototype.hasOwnProperty.call(resumoPag, forma)) {
            resumoPag[forma] += (p.valor || 0);
          } else {
            resumoPag.outros += (p.valor || 0);
          }
          resumoPag.total += (p.valor || 0);
        });
      });

      const caixaAtualizado = await base44.entities.Caixa.update(caixaAberto.id, {
        status: 'fechado',
        data_fechamento: new Date().toISOString(),
        usuario_fechamento: user?.nome || "Usuário",
        total_vendas: totalVendas,
        valor_contado: totalContado,
        valor_fechamento: valorEsperadoReal,
        diferenca: diferenca,
        total_sangrias: totalSangrias,
        total_suprimentos: totalSuprimentos,
        observacoes_fechamento: observacoes,
        aprovacao_diferenca: diferencaAbsoluta > LIMITE_DIFERENCA_SEM_APROVACAO ? user?.nome : null,
        contagem_notas: contagemNotas,
        resumo_pagamentos: resumoPag
      });

      return { caixa: caixaAtualizado, vendas: vendasDoCaixa, movimentacoes: movsDoCaixa };
    },
    onSuccess: ({ caixa: caixaFechado, vendas: vendasFechamento, movimentacoes: movsFechamento }) => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      toast.success("Caixa fechado com sucesso!");
      setDialogFechamento(false);
      setDialogAprovacaoDiferenca(false);
      setJustificativaDiferenca("");
      setSenhaAprovacao("");
      setValorContado({
        dinheiro: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        pix: 0,
        cheque: 0,
        outros: 0
      });
      setContagemNotas({
        notas: { "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0 },
        moedas: { "1": 0, "0.5": 0, "0.25": 0, "0.10": 0, "0.05": 0 },
        total: 0
      });

      // Imprimir recibo 80mm automaticamente
      try {
        const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
        const numSeq = numeroCaixaMap[caixaFechado.id] || caixaFechado.numero_caixa;
        imprimirFechamento80mm(caixaFechado, vendasFechamento, movsFechamento, config.empresa || {}, numSeq);
      } catch (e) {
        console.error("Erro ao imprimir fechamento:", e);
      }
    },
    onError: (error) => {
      if (error.message === "REQUER_APROVACAO") {
        setDialogFechamento(false);
        setDialogAprovacaoDiferenca(true);
      } else {
        toast.error(error.message || "Erro ao fechar caixa");
      }
    },
  });

  const imprimirAberturaCaixa = (caixa) => {
    const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const empresa = config.empresa || {};
    
    const conteudo = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Abertura de Caixa</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 0; }
          }
          body { 
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .item { display: flex; justify-content: space-between; margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">
          ${empresa.nome || 'Smart Express'}<br>
          COMPROVANTE DE ABERTURA DE CAIXA
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
          <span>Caixa Nº:</span>
          <span class="bold">${getNumCaixa(caixa)}</span>
        </div>
        <div class="item">
          <span>Data/Hora:</span>
          <span>${format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm:ss')}</span>
        </div>
        <div class="item">
          <span>Operador:</span>
          <span>${caixa.usuario_abertura}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
          <span class="bold">Valor Inicial:</span>
          <span class="bold">R$ ${(parseFloat(caixa.valor_inicial) || 0).toFixed(2)}</span>
        </div>

        ${(caixa.contagem_abertura || (caixa.observacoes && caixa.observacoes.includes('Contagem Abertura:'))) ? `
        <div class="divider"></div>
        <div class="bold center" style="font-size: 10px; margin-bottom: 5px;">DETALHAMENTO DA ABERTURA</div>
        <div style="font-size: 10px;">
          ${caixa.contagem_abertura ? `
            ${Object.entries(caixa.contagem_abertura.notas || {}).filter(([_, q]) => q > 0).map(([v, q]) => `
              <div class="item"><span>Notas R$ ${v}:</span> <span>${q}x</span></div>
            `).join('')}
            ${Object.entries(caixa.contagem_abertura.moedas || {}).filter(([_, q]) => q > 0).map(([v, q]) => `
              <div class="item"><span>Moedas R$ ${parseFloat(v).toFixed(2)}:</span> <span>${q}x</span></div>
            `).join('')}
          ` : `
            <div style="white-space: pre-wrap;">${caixa.observacoes}</div>
          `}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="center" style="margin-top: 10px;">
          <p style="font-size: 10px;">Assinatura do Operador</p>
          <p style="margin-top: 20px; border-top: 1px solid #000; width: 150px; margin-left: auto; margin-right: auto;"></p>
        </div>
      </body>
      </html>
    `;
    
    const janela = window.open('', '_blank');
    janela.document.write(conteudo);
    janela.document.close();
    janela.print();
  };

  // Função para imprimir recibo de Sangria ou Suprimento
  const imprimirReciboMovimentacao = (movimentacao) => {
    const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const empresa = config.empresa || {};
    const tipoTexto = movimentacao.tipo === 'sangria' ? 'SANGRIA' : 'SUPRIMENTO';
    const corTipo = movimentacao.tipo === 'sangria' ? '#dc2626' : '#16a34a';

    const conteudo = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de ${tipoTexto}</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .item { display: flex; justify-content: space-between; margin: 4px 0; }
          .tipo {
            color: ${corTipo};
            font-size: 14px;
            font-weight: bold;
            border: 2px solid ${corTipo};
            padding: 5px 10px;
            display: inline-block;
            margin: 5px 0;
          }
          .valor-destaque {
            font-size: 18px;
            font-weight: bold;
            color: ${corTipo};
          }
          .assinatura {
            margin-top: 30px;
            padding-top: 5px;
            border-top: 1px solid #000;
            width: 60%;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="center bold">
          ${empresa.nome || 'Smart Express'}<br>
          ${empresa.cnpj ? 'CNPJ: ' + empresa.cnpj + '<br>' : ''}
        </div>

        <div class="divider"></div>

        <div class="center">
          <span class="tipo">${tipoTexto} DE CAIXA</span>
        </div>

        <div class="divider"></div>

        <div class="item">
          <span>Caixa Nº:</span>
          <span class="bold">${getNumCaixa(caixaAberto) || '-'}</span>
        </div>
        <div class="item">
          <span>Data/Hora:</span>
          <span>${format(new Date(movimentacao.data_hora || movimentacao.created_date || new Date()), 'dd/MM/yyyy HH:mm:ss')}</span>
        </div>
        <div class="item">
          <span>Operador:</span>
          <span>${movimentacao.usuario || movimentacao.usuario_nome || 'Operador'}</span>
        </div>

        <div class="divider"></div>

        <div class="center" style="margin: 10px 0;">
          <div class="valor-destaque">
            ${movimentacao.tipo === 'sangria' ? '(-)' : '(+)'} R$ ${(parseFloat(movimentacao.valor) || 0).toFixed(2)}
          </div>
        </div>

        ${movimentacao.descricao ? `
        <div class="divider"></div>
        <div>
          <span class="bold">Motivo:</span><br>
          <span>${movimentacao.descricao}</span>
        </div>
        ` : ''}

        ${movimentacao.aprovado_por ? `
        <div class="divider"></div>
        <div class="item">
          <span>Aprovado por:</span>
          <span class="bold">${movimentacao.aprovado_por}</span>
        </div>
        ` : ''}

        <div class="divider"></div>

        <div class="center" style="font-size: 10px; color: #666; margin-top: 5px;">
          Este documento não possui valor fiscal<br>
          Documento de controle interno
        </div>

        <div class="assinatura">
          Assinatura do Operador
        </div>

        <div class="assinatura">
          Assinatura do Responsável
        </div>
      </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    janela.document.write(conteudo);
    janela.document.close();
    janela.print();
  };

  const handleAbrirCaixa = async () => {
    if (valorInicial < 0) {
      toast.error("Valor inicial não pode ser negativo");
      return;
    }
    
    // Confirmação para abertura com valor ZERO
    if (valorInicial === 0) {
      const resposta = await confirm({
        title: "Confirmar Abertura",
        description: "Deseja abrir o caixa com valor ZERO (sem fundo de troco)?",
        confirmText: "Sim, abrir",
        cancelText: "Cancelar"
      });
      if (!resposta) return;
    }

    abrirCaixaMutation.mutate(valorInicial);
  };

  const handleFecharCaixa = () => {
    fecharCaixaMutation.mutate();
  };

  const calcularTotalContado = () => {
    return Object.values(valorContado).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  // Memoizar vendas do caixa aberto para evitar recálculos desnecessários
  const vendasDoCaixaAberto = useMemo(() => {
    if (!caixaAberto?.id) return [];
    return vendas.filter(v => v.caixa_id === caixaAberto.id && v.status === 'finalizada');
  }, [caixaAberto?.id, vendas]);

  const totalVendasCaixa = useMemo(() => {
    return vendasDoCaixaAberto.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  }, [vendasDoCaixaAberto]);

  // Memoizar resumo do caixa por forma de pagamento
  const resumoCaixa = useMemo(() => {
    if (!caixaAberto?.id) return null;

    const resumo = {
      dinheiro: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      pix: 0,
      cheque: 0,
      outros: 0,
      total: 0
    };

    // Usar vendasDoCaixaAberto que já está filtrado e memoizado
    vendasDoCaixaAberto.forEach(venda => {
      venda.pagamentos?.forEach(pag => {
        const forma = pag.forma_pagamento;
        if (forma && Object.prototype.hasOwnProperty.call(resumo, forma)) {
          resumo[forma] = (resumo[forma] || 0) + (pag.valor || 0);
        } else {
          resumo.outros = (resumo.outros || 0) + (pag.valor || 0);
        }
        resumo.total += (pag.valor || 0);
      });
    });

    return resumo;
  }, [caixaAberto?.id, vendasDoCaixaAberto]);

  // CORREÇÃO: Calcular valor esperado considerando movimentações (sangrias e suprimentos)
  const valorEsperado = useMemo(() => {
    if (!caixaAberto) return 0;
    return (parseFloat(caixaAberto.valor_inicial) || 0) + totalVendasCaixa + movimentacoesDoCaixa.suprimentos - movimentacoesDoCaixa.sangrias;
  }, [caixaAberto, totalVendasCaixa, movimentacoesDoCaixa]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Caixa</h1>
          <p className="text-slate-500">Gerencie abertura e fechamento do caixa</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setDialogHistorico(true)}
            variant="outline"
          >
            <Clock className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          
          {!caixaAberto ? (
            <Button 
              onClick={() => setDialogAbertura(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Caixa
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setDialogSangria(true)}
                variant="outline"
                className="text-red-600 border-red-300"
                disabled={!podeSangriaSuprimento}
                title={!podeSangriaSuprimento ? "Sem permissão: Sangria/Suprimento" : "Realizar sangria"}
              >
                <ArrowDown className="w-4 h-4 mr-2" />
                Sangria
              </Button>
              <Button
                onClick={() => setDialogSuprimento(true)}
                variant="outline"
                className="text-green-600 border-green-300"
                disabled={!podeSangriaSuprimento}
                title={!podeSangriaSuprimento ? "Sem permissão: Sangria/Suprimento" : "Realizar suprimento"}
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Suprimento
              </Button>
              <Button 
                onClick={() => setDialogFechamento(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Fechar Caixa
              </Button>
            </>
          )}
        </div>
      </div>

      {caixaAberto ? (
        <>
          {/* CORREÇÃO: Alerta para caixa aberto há mais de 24 horas */}
          {horasAberto >= HORAS_ALERTA_CAIXA_ABERTO && (
            <Alert variant="destructive" className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Caixa aberto há muito tempo!</AlertTitle>
              <AlertDescription>
                Este caixa está aberto há <strong>{horasAberto} horas</strong>. Considere fechá-lo para manter o controle financeiro adequado.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Unlock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900">Caixa Aberto</h3>
                  <p className="text-green-700">Caixa #{getNumCaixa(caixaAberto)} • {caixaAberto.usuario_abertura}</p>
                </div>
                {/* CORREÇÃO: Badge de tempo aberto */}
                {horasAberto > 0 && (
                  <Badge variant={horasAberto >= HORAS_ALERTA_CAIXA_ABERTO ? "destructive" : "secondary"} className="ml-auto">
                    <Clock className="w-3 h-3 mr-1" />
                    {horasAberto}h aberto
                  </Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-green-700">Data de Abertura</p>
                  <p className="text-lg font-semibold text-green-900">
                    {format(new Date(caixaAberto.data_abertura), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Valor Inicial</p>
                  <p className="text-lg font-semibold text-green-900">
                    R$ {(parseFloat(caixaAberto.valor_inicial) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Total em Vendas</p>
                  <p className="text-lg font-semibold text-green-900">
                    R$ {(parseFloat(totalVendasCaixa) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Valor Esperado</p>
                  <p className="text-lg font-semibold text-green-900">
                    R$ {(parseFloat(valorEsperado) || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* CORREÇÃO: Mostrar movimentações se houver */}
              {(movimentacoesDoCaixa.sangrias > 0 || movimentacoesDoCaixa.suprimentos > 0) && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-2">Movimentações do Dia:</p>
                  <div className="flex gap-4 text-sm">
                    {movimentacoesDoCaixa.suprimentos > 0 && (
                      <span className="text-green-700">
                        <ArrowUp className="w-3 h-3 inline mr-1" />
                        Suprimentos: R$ {(parseFloat(movimentacoesDoCaixa.suprimentos) || 0).toFixed(2)}
                      </span>
                    )}
                    {movimentacoesDoCaixa.sangrias > 0 && (
                      <span className="text-red-600">
                        <ArrowDown className="w-3 h-3 inline mr-1" />
                        Sangrias: R$ {(parseFloat(movimentacoesDoCaixa.sangrias) || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Caixa - Por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Dinheiro</p>
                  <p className="text-2xl font-bold text-green-900">
                    R$ {(resumoCaixa?.dinheiro || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Cartão Crédito</p>
                  <p className="text-2xl font-bold text-blue-900">
                    R$ {(resumoCaixa?.cartao_credito || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">Cartão Débito</p>
                  <p className="text-2xl font-bold text-purple-900">
                    R$ {(resumoCaixa?.cartao_debito || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-700">PIX</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    R$ {(resumoCaixa?.pix || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">Cheque</p>
                  <p className="text-2xl font-bold text-orange-900">
                    R$ {(resumoCaixa?.cheque || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700">Outros</p>
                  <p className="text-2xl font-bold text-slate-900">
                    R$ {(resumoCaixa?.outros || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {/* Total de Vendas por todas formas de pagamento */}
              <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total em Vendas:</span>
                  <span className="text-xl font-bold text-slate-800">
                    R$ {(resumoCaixa?.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Dinheiro Físico no Caixa = Valor Inicial + Dinheiro das Vendas + Suprimentos - Sangrias */}
              <div className="mt-3 p-4 bg-gradient-to-r from-green-100 to-green-50 rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-green-900">Dinheiro no Caixa:</span>
                  <span className="text-3xl font-bold text-green-700">
                    R$ {( (parseFloat(caixaAberto?.valor_inicial) || 0) + (parseFloat(resumoCaixa?.dinheiro) || 0) + (parseFloat(movimentacoesDoCaixa.suprimentos) || 0) - (parseFloat(movimentacoesDoCaixa.sangrias) || 0) ).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-green-700 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Fundo inicial:</span>
                    <span>R$ {(parseFloat(caixaAberto?.valor_inicial) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Vendas em dinheiro:</span>
                    <span>R$ {(parseFloat(resumoCaixa?.dinheiro) || 0).toFixed(2)}</span>
                  </div>
                  {movimentacoesDoCaixa.suprimentos > 0 && (
                    <div className="flex justify-between text-green-800">
                      <span>+ Suprimentos:</span>
                      <span>R$ {(parseFloat(movimentacoesDoCaixa.suprimentos) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {movimentacoesDoCaixa.sangrias > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>- Sangrias:</span>
                      <span>R$ {(parseFloat(movimentacoesDoCaixa.sangrias) || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Caixa Fechado</h3>
            <p className="text-slate-500 mb-6">Abra um caixa para começar a registrar vendas</p>
            <Button 
              onClick={() => setDialogAbertura(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Histórico */}
      <Dialog open={dialogHistorico} onOpenChange={setDialogHistorico}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Caixas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {caixas.map((caixa) => (
              <Card key={caixa.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Caixa #{getNumCaixa(caixa)}</p>
                        <p className="text-sm text-slate-500">{caixa.usuario_abertura}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {caixa.status === 'fechado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCaixaSelecionado(caixa);
                            setDialogDetalhe(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      )}
                      <Badge variant={caixa.status === 'aberto' ? 'default' : 'secondary'}>
                        {caixa.status === 'aberto' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Abertura:</span>
                      <p className="font-medium">{format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Valor Inicial:</span>
                      <p className="font-medium text-green-600">R$ {(parseFloat(caixa.valor_inicial) || 0).toFixed(2)}</p>
                    </div>
                    {caixa.status === 'fechado' && (
                      <>
                        <div>
                          <span className="text-slate-500">Fechamento:</span>
                          <p className="font-medium">{format(new Date(caixa.data_fechamento), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Valor Final:</span>
                          <p className="font-medium text-blue-600">R$ {(parseFloat(caixa.valor_fechamento) || 0).toFixed(2)}</p>
                        </div>
                        {caixa.diferenca !== 0 && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Diferença:</span>
                            <p className={`font-bold ${parseFloat(caixa.diferenca) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              R$ {(parseFloat(caixa.diferenca) || 0).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Movimentações do caixa */}
                  {caixa.id && movimentacoesCaixa.filter(m => m.caixa_id === caixa.id).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold mb-2">Movimentações:</p>
                      {movimentacoesCaixa.filter(m => m.caixa_id === caixa.id).map((mov) => (
                        <div key={mov.id} className="p-2 mb-2 bg-slate-50 rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`font-medium ${mov.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                                {mov.tipo === 'sangria' ? '↓ Sangria' : '↑ Suprimento'}
                              </span>
                              {mov.descricao && (
                                <p className="text-xs text-slate-600 mt-0.5">{mov.descricao}</p>
                              )}
                              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                                {(mov.data_hora || mov.created_date) && (
                                  <span>
                                    {format(new Date(mov.data_hora || mov.created_date), 'dd/MM/yyyy HH:mm')}
                                  </span>
                                )}
                                {(mov.usuario_nome || mov.usuario) && (
                                  <span>por {mov.usuario_nome || mov.usuario}</span>
                                )}
                              </div>
                            </div>
                            <span className={`font-bold text-sm ${mov.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                              {mov.tipo === 'sangria' ? '-' : '+'} R$ {(parseFloat(mov.valor) || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhe do Caixa */}
      <CaixaDetalhe
        open={dialogDetalhe}
        onOpenChange={setDialogDetalhe}
        caixa={caixaSelecionado}
        numeroCaixa={caixaSelecionado ? getNumCaixa(caixaSelecionado) : null}
        onPrint80mm={(caixa, vendas, movs) => {
          const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
          imprimirFechamento80mm(caixa, vendas, movs, config.empresa || {}, getNumCaixa(caixa));
        }}
        onPrintA4={(caixa, vendas, movs) => {
          const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
          imprimirFechamentoA4(caixa, vendas, movs, config.empresa || {}, getNumCaixa(caixa));
        }}
      />

      {/* Dialog Abertura */}
      <Dialog open={dialogAbertura} onOpenChange={setDialogAbertura}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              A contagem de cédulas e moedas é obrigatória para iniciar o caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Informe a quantidade de cada nota e moeda presente na gaveta para o fundo de troco.
              </p>
            </div>
            
            <ContagemNotas
              value={contagemAbertura}
              onChange={(newValue) => {
                setContagemAbertura(newValue);
                setValorInicial(newValue.total);
              }}
            />

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-bold">Valor Inicial Total:</Label>
                <div className="text-2xl font-bold text-green-700">
                  R$ {valorInicial.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbertura(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAbrirCaixa} 
              className="bg-green-600 hover:bg-green-700"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Confirmar e Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sangria */}
      <Dialog open={dialogSangria} onOpenChange={setDialogSangria}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sangria de Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                Sangria = Retirada de dinheiro do caixa (ex: depósito bancário)
              </p>
            </div>
            <div>
              <Label>Valor da Sangria</Label>
              <InputMoeda
                value={valorMovimentacao}
                onChange={(valor) => setValorMovimentacao(valor)}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={descricaoMovimentacao}
                onChange={(e) => setDescricaoMovimentacao(e.target.value)}
                placeholder="Ex: Depósito bancário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSangria(false)} disabled={sangriaMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => sangriaMutation.mutate()}
              className="bg-red-600"
              disabled={sangriaMutation.isPending || valorMovimentacao <= 0}
            >
              {sangriaMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4 mr-2" />
                  Confirmar Sangria
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suprimento */}
      <Dialog open={dialogSuprimento} onOpenChange={setDialogSuprimento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suprimento de Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                Suprimento = Adicionar dinheiro ao caixa (ex: troco)
              </p>
            </div>
            <div>
              <Label>Valor do Suprimento</Label>
              <InputMoeda
                value={valorMovimentacao}
                onChange={(valor) => setValorMovimentacao(valor)}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={descricaoMovimentacao}
                onChange={(e) => setDescricaoMovimentacao(e.target.value)}
                placeholder="Ex: Troco adicional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSuprimento(false)} disabled={suprimentoMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => suprimentoMutation.mutate()}
              className="bg-green-600"
              disabled={suprimentoMutation.isPending || valorMovimentacao <= 0}
            >
              {suprimentoMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Confirmar Suprimento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fechamento */}
      <Dialog open={dialogFechamento} onOpenChange={setDialogFechamento}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fechar Caixa #{getNumCaixa(caixaAberto)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Valor Esperado no Caixa</h4>
              <p className="text-2xl font-bold text-orange-700">
                R$ {valorEsperado.toFixed(2)}
              </p>
              <div className="text-sm text-orange-600 mt-1 space-y-1">
                <p>Valor inicial: R$ {(parseFloat(caixaAberto?.valor_inicial) || 0).toFixed(2)}</p>
                <p>+ Vendas: R$ {(parseFloat(totalVendasCaixa) || 0).toFixed(2)}</p>
                {movimentacoesDoCaixa.suprimentos > 0 && (
                  <p>+ Suprimentos: R$ {(parseFloat(movimentacoesDoCaixa.suprimentos) || 0).toFixed(2)}</p>
                )}
                {movimentacoesDoCaixa.sangrias > 0 && (
                  <p>- Sangrias: R$ {(parseFloat(movimentacoesDoCaixa.sangrias) || 0).toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Resumo por forma de pagamento (sistema) */}
            {resumoCaixa && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Vendas por Forma de Pagamento (Sistema)</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {resumoCaixa.dinheiro > 0 && <div className="flex justify-between"><span>Dinheiro:</span><span className="font-medium">R$ {resumoCaixa.dinheiro.toFixed(2)}</span></div>}
                  {resumoCaixa.cartao_credito > 0 && <div className="flex justify-between"><span>C. Crédito:</span><span className="font-medium">R$ {resumoCaixa.cartao_credito.toFixed(2)}</span></div>}
                  {resumoCaixa.cartao_debito > 0 && <div className="flex justify-between"><span>C. Débito:</span><span className="font-medium">R$ {resumoCaixa.cartao_debito.toFixed(2)}</span></div>}
                  {resumoCaixa.pix > 0 && <div className="flex justify-between"><span>PIX:</span><span className="font-medium">R$ {resumoCaixa.pix.toFixed(2)}</span></div>}
                  {resumoCaixa.cheque > 0 && <div className="flex justify-between"><span>Cheque:</span><span className="font-medium">R$ {resumoCaixa.cheque.toFixed(2)}</span></div>}
                  {resumoCaixa.outros > 0 && <div className="flex justify-between"><span>Outros:</span><span className="font-medium">R$ {resumoCaixa.outros.toFixed(2)}</span></div>}
                </div>
              </div>
            )}

            <Alert className="border-blue-200 bg-blue-50">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Diferenças acima de <strong>R$ {LIMITE_DIFERENCA_SEM_APROVACAO.toFixed(2)}</strong> requerem justificativa e aprovação de gerente.
              </AlertDescription>
            </Alert>

            <Separator />

            {/* Contagem de Dinheiro por denominação */}
            <div>
              <h4 className="font-semibold mb-3">Contagem de Dinheiro (Cédulas e Moedas)</h4>
              <ContagemNotas
                value={contagemNotas}
                onChange={(newValue) => {
                  setContagemNotas(newValue);
                  setValorContado(prev => ({ ...prev, dinheiro: newValue.total }));
                }}
              />
            </div>

            <Separator />

            {/* Demais formas de pagamento */}
            <div>
              <h4 className="font-semibold mb-3">Contagem - Outras Formas</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label>Cartão Crédito</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContado.cartao_credito}
                    onChange={(e) => setValorContado({...valorContado, cartao_credito: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Cartão Débito</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContado.cartao_debito}
                    onChange={(e) => setValorContado({...valorContado, cartao_debito: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>PIX</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContado.pix}
                    onChange={(e) => setValorContado({...valorContado, pix: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Cheque</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContado.cheque}
                    onChange={(e) => setValorContado({...valorContado, cheque: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Outros</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContado.outros}
                    onChange={(e) => setValorContado({...valorContado, outros: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Total Contado:</span>
                <span className="text-2xl font-bold">R$ {calcularTotalContado().toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Diferença:</span>
                <span className={`font-bold ${(calcularTotalContado() - valorEsperado) === 0 ? 'text-green-600' : (calcularTotalContado() - valorEsperado) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {(calcularTotalContado() - valorEsperado).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFechamento(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleFecharCaixa}
              className="bg-red-600 hover:bg-red-700"
              disabled={fecharCaixaMutation.isPending}
            >
              {fecharCaixaMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Fechar Caixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CORREÇÃO: Dialog de Aprovação de Sangria */}
      <Dialog open={dialogAprovacaoSangria} onOpenChange={setDialogAprovacaoSangria}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <ShieldAlert className="w-5 h-5" />
              Aprovação Necessária - Sangria
            </DialogTitle>
            <DialogDescription>
              Sangrias acima de R$ {LIMITE_SANGRIA_SEM_APROVACAO.toFixed(2)} requerem aprovação de gerente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Valor da sangria: <strong>R$ {valorMovimentacao.toFixed(2)}</strong>
                <br />
                Motivo: {descricaoMovimentacao || "Não informado"}
              </AlertDescription>
            </Alert>

            <div>
              <Label>Senha do Gerente (ou confirme para aprovar)</Label>
              <Input
                type="password"
                value={senhaAprovacao}
                onChange={(e) => setSenhaAprovacao(e.target.value)}
                placeholder="Digite a senha de aprovação"
              />
              <p className="text-xs text-slate-500 mt-1">
                Esta operação será registrada no histórico do caixa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAprovacaoSangria(false);
                setDialogSangria(true);
                setSenhaAprovacao("");
              }}
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (!senhaAprovacao.trim()) {
                  toast.error("Digite a senha do gerente para aprovar!");
                  return;
                }
                const gerente = usuariosSistema.find(
                  u => u.senha_autorizacao === senhaAprovacao && u.ativo !== false
                );
                if (!gerente) {
                  toast.error("Senha inválida! Gerente não encontrado.");
                  setSenhaAprovacao("");
                  return;
                }
                toast.success(`Aprovado por: ${gerente.nome}`);
                setSenhaAprovacao("");
                sangriaMutation.mutate({ aprovado: true });
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={sangriaMutation.isPending || !senhaAprovacao.trim()}
            >
              {sangriaMutation.isPending ? "Processando..." : "Aprovar Sangria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CORREÇÃO: Dialog de Aprovação de Diferença no Fechamento */}
      <Dialog open={dialogAprovacaoDiferenca} onOpenChange={setDialogAprovacaoDiferenca}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              Atenção: Diferença Significativa
            </DialogTitle>
            <DialogDescription>
              A diferença de caixa está acima do limite permitido de R$ {LIMITE_DIFERENCA_SEM_APROVACAO.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diferença detectada</AlertTitle>
              <AlertDescription>
                Valor esperado: <strong>R$ {valorEsperado.toFixed(2)}</strong>
                <br />
                Valor contado: <strong>R$ {calcularTotalContado().toFixed(2)}</strong>
                <br />
                Diferença: <strong className={calcularTotalContado() - valorEsperado >= 0 ? "text-blue-600" : "text-red-600"}>
                  R$ {(calcularTotalContado() - valorEsperado).toFixed(2)}
                </strong>
              </AlertDescription>
            </Alert>

            <div>
              <Label>Justificativa da Diferença *</Label>
              <Input
                value={justificativaDiferenca}
                onChange={(e) => setJustificativaDiferenca(e.target.value)}
                placeholder="Explique o motivo da diferença..."
              />
            </div>

            <div>
              <Label>Senha do Gerente (ou confirme para aprovar)</Label>
              <Input
                type="password"
                value={senhaAprovacao}
                onChange={(e) => setSenhaAprovacao(e.target.value)}
                placeholder="Digite a senha de aprovação"
              />
              <p className="text-xs text-slate-500 mt-1">
                Esta operação ficará registrada com sua identificação.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAprovacaoDiferenca(false);
                setDialogFechamento(true);
                setSenhaAprovacao("");
                setJustificativaDiferenca("");
              }}
            >
              Voltar e Recontar
            </Button>
            <Button
              onClick={() => {
                if (!senhaAprovacao.trim()) {
                  toast.error("Digite a senha do gerente para aprovar!");
                  return;
                }
                const gerente = usuariosSistema.find(
                  u => u.senha_autorizacao === senhaAprovacao && u.ativo !== false
                );
                if (!gerente) {
                  toast.error("Senha inválida! Gerente não encontrado.");
                  setSenhaAprovacao("");
                  return;
                }
                toast.success(`Aprovado por: ${gerente.nome}`);
                setSenhaAprovacao("");
                fecharCaixaMutation.mutate({ aprovado: true, justificativa: justificativaDiferenca });
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={!justificativaDiferenca.trim() || !senhaAprovacao.trim() || fecharCaixaMutation.isPending}
            >
              {fecharCaixaMutation.isPending ? "Processando..." : "Aprovar e Fechar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}