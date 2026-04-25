import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table2, Plus, Trash2, Save, Pencil, X, RefreshCw,
  Copy, Maximize2, Minimize2, History, TrendingUp, TrendingDown,
  Sparkles, ArrowUpDown, ArrowUp, ArrowDown, Minus, FileText, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useConfirm } from '@/contexts/ConfirmContext';
import { ptBR } from "date-fns/locale";

const CHAVE = "tabela_precos";
const CHAVE_ANTERIOR = "tabela_precos_anterior";
const HOJE = format(new Date(), "yyyy-MM-dd");

// ─────────────────────────────────────────────────────────────
//  PARSERS DE TEXTO DO FORNECEDOR
// ─────────────────────────────────────────────────────────────

function detectCategoria(modelo) {
  const u = modelo.toUpperCase();
  if (/APPLE WATCH|WATCH\s*S\d+/i.test(u)) return "Apple Watch";
  if (/IPHONE/i.test(u)) return "iPhone";
  if (/IPAD/i.test(u)) return "iPad";
  if (/MACBOOK|MACBOOK\s*AIR|MACBOOK\s*PRO|MACBOOK\s*NEO/i.test(u)) return "MacBook";
  if (/IMAC|MAC\s*MINI|MAC\s*STUDIO|MAC\s*PRO/i.test(u)) return "Mac";
  if (/AIRPODS/i.test(u)) return "AirPods";
  if (/SAMSUNG|GALAXY/i.test(u)) return "Samsung";
  if (/MOTOROLA|MOTO\s/i.test(u)) return "Motorola";
  if (/XIAOMI|REDMI/i.test(u)) return "Xiaomi";
  return "Outros";
}

function makeItem(modelo, preco, categoria, observacao) {
  return {
    id: crypto.randomUUID(),
    categoria,
    modelo,
    preco: String(preco),
    observacao: observacao || "",
    disponivel: true,
    data_adicao: HOJE,
  };
}

// ── Formato A: 🌐MODELO / 📲COR 💰PRECO (fornecedor com emojis) ─
function extractPriceEmoji(str) {
  // 💰 é surrogate pair (2 chars em JS)
  const idx = str.indexOf("💰");
  if (idx === -1) return { preco: null, note: "" };
  const after = str.slice(idx + 2);
  const m = after.match(/^\s*([\d,]+)\s*([A-Z][A-Z/]*)?\s*(\(\d+\))?/);
  if (!m) return { preco: null, note: "" };
  const preco = parseFloat(m[1].replace(",", "")) || null;
  const note = [m[2], m[3]].filter(Boolean).join(" ").trim();
  return { preco, note };
}

function parseFormatoEmoji(lines) {
  const itens = [];
  let modeloAtual = "";
  let categoriaAtual = "iPhone";
  let precoBase = null;

  for (const line of lines) {
    // Cabeçalho de seção Apple Watch
    if (/APPLE WATCH/i.test(line) && !/^📲|^👉/.test(line)) {
      categoriaAtual = "Apple Watch"; continue;
    }
    // Linha decorativa (só emojis e espaços)
    if (/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F\s]+$/u.test(line)) continue;

    // Modelo de relógio: ⌚️S11 42MM
    if (/^⌚️S\d+/i.test(line)) {
      modeloAtual = "Apple Watch " + line.replace(/⌚️/g, "").trim();
      categoriaAtual = "Apple Watch"; precoBase = null; continue;
    }
    // Linha só com preço: 💰5,000💰
    if (line.startsWith("💰")) {
      const { preco } = extractPriceEmoji(line);
      if (preco) precoBase = preco; continue;
    }
    // Linha de modelo: 🌐MODELO ou IPHONE (sem emoji de cor)
    if (line.startsWith("🌐") || (/^IPHONE\s/i.test(line) && !/^📲|^👉/.test(line))) {
      const clean = line.replace(/🌐/g, "").trim();
      const { preco } = extractPriceEmoji(clean);
      precoBase = preco || null;
      modeloAtual = clean.replace(/💰[\d,]+💰?/g, "").trim();
      categoriaAtual = detectCategoria(modeloAtual);
      continue;
    }
    // Linha de cor: 📲COR 💰PRECO  ou  👉COR 💰PRECO
    if (line.startsWith("📲") || line.startsWith("👉")) {
      const sem = line.replace(/^📲|^👉/, "").trim();
      const { preco: precoLinha, note } = extractPriceEmoji(sem);
      const cor = sem.split("💰")[0].replace(/\./g, "").trim().toUpperCase();
      const preco = precoLinha ?? precoBase;
      if (!modeloAtual || !preco) continue;
      itens.push(makeItem(cor ? `${modeloAtual} ${cor}` : modeloAtual, preco, categoriaAtual, note));
    }
  }
  return itens;
}

// ── Formato B: 📲MODELO-R$PRECO / ✅COR (fornecedor com R$) ────
function extractPrecoRS(str) {
  // R$3.250 ou R$3.250,50  (ponto = milhar, vírgula = decimal)
  const m = str.match(/R\$\s*([\d.]+(?:,\d+)?)/i);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, "").replace(",", ".")) || null;
}

function parseFormatoRS(lines) {
  const itens = [];
  let modeloAtual = "";
  let categoriaAtual = "iPhone";
  let precoBase = null;
  let obsModelo = "";

  for (const line of lines) {
    // Linha de modelo: 📲IPHONE 14 128GB-R$3.350
    if (line.startsWith("📲")) {
      const content = line.replace(/^📲/, "").trim();
      precoBase = extractPrecoRS(content);
      modeloAtual = content.replace(/-?\s*R\$[\d.,]+/gi, "").trim();
      categoriaAtual = detectCategoria(modeloAtual);
      obsModelo = "";
      continue;
    }
    // Observação entre parênteses: (Só sem lacre)
    if (/^\(.*\)$/.test(line)) {
      obsModelo = line.slice(1, -1).trim(); continue;
    }
    // Linha de cor: ✅PRETO  ou  ✅branco-R$3.450
    if (line.startsWith("✅")) {
      const content = line.replace(/^✅\uFE0F?/, "").trim();
      const precoOverride = extractPrecoRS(content);
      const cor = content.replace(/-?\s*R\$[\d.,]+/gi, "").replace(/\./g, "").trim().toUpperCase();
      const preco = precoOverride ?? precoBase;
      if (!modeloAtual || !preco) continue;
      itens.push(makeItem(cor ? `${modeloAtual} ${cor}` : modeloAtual, preco, categoriaAtual, obsModelo));
    }
  }
  return itens;
}

// ── Formato C: PRODUTO - COR - PREÇO - OBS (uma linha por item) ─
function extractPrecoLivre(str) {
  // Tenta R$3.350 primeiro, depois número puro 3350 ou 3.350
  const rs = extractPrecoRS(str);
  if (rs) return rs;
  const m = str.replace(/R\$\s*/gi, "").match(/^[\s]*([\d.]+(?:,\d+)?)[\s]*$/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, "").replace(",", ".")) || null;
}

function parseFormatoLinha(lines) {
  const itens = [];
  for (const line of lines) {
    // Separa por " - " ou " – " ou " | "
    const parts = line.split(/\s*[-–—|]\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Localiza o campo de preço (campo com 3+ dígitos consecutivos)
    let precoIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      const digits = parts[i].replace(/[^0-9]/g, "");
      if (digits.length >= 3) { precoIdx = i; break; }
    }
    if (precoIdx === -1) continue;

    const preco = extractPrecoLivre(parts[precoIdx]);
    if (!preco) continue;

    const antes = parts.slice(0, precoIdx);
    const depois = parts.slice(precoIdx + 1);

    const produto = (antes[0] || "").toUpperCase();
    const cor = (antes[1] || "").toUpperCase();
    const obs = depois.join(" / ");

    const modeloFinal = cor ? `${produto} ${cor}` : produto;
    if (!produto) continue;

    itens.push(makeItem(modeloFinal, preco, detectCategoria(produto), obs));
  }
  return itens;
}

// ── Parser com IA (Claude API direto do browser) ─────────────
async function parseWithAI(text, apiKey) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Você extrai listas de preços de celulares. Retorne APENAS um JSON array sem markdown.

Formato de cada item:
{"categoria":"iPhone|Samsung|Apple Watch|Motorola|Xiaomi|Outros","modelo":"MODELO COMPLETO COR","preco":1234.56,"observacao":"CPO|JP|LLA etc ou vazio string"}

Regras:
- modelo inclui nome + cor (ex: "IPHONE 14 128GB PRETO")
- preco é número puro sem R$ nem pontos de milhar
- se um modelo tem múltiplas cores, crie um item por cor
- observacao: CPO, JP, LLA, HN, "Só sem lacre" etc, ou ""

TEXTO:
${text}`,
      }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const raw = data.content?.[0]?.text || "";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("IA não retornou JSON válido.");

  return JSON.parse(match[0]).map((item) =>
    makeItem(item.modelo, item.preco, item.categoria, item.observacao)
  );
}

// ── Formato D: 📞/🖥️/💻 MODELO / ⏸️COR / 💸R$PREÇO ──────────
// Preço se aplica a TODAS as cores acumuladas desde o último preço.
// Cores sem preço no final do modelo herdam o último preço visto.
function parseFormatoD(lines) {
  const itens = [];
  let modeloAtual = "";
  let categoriaAtual = "iPhone";
  let coresPendentes = [];
  let ultimoPreco = null;

  // Remove prefixos de emoji de modelo: 📞 🖥️ 💻 e similares
  const limparPrefixoModelo = (s) =>
    s.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F\s]+/gu, "").trim();

  const isLinhaModelo = (l) =>
    /IPHONE|IPAD|MACBOOK|IMAC|MAC\s|AIRPODS|SAMSUNG|GALAXY|WATCH|MOTOROLA|XIAOMI/i.test(l) ||
    /^📞|^🖥|^💻/.test(l);

  const flush = (preco) => {
    if (!coresPendentes.length) return;
    coresPendentes.forEach((cor) => {
      itens.push(makeItem(cor ? `${modeloAtual} ${cor}` : modeloAtual, preco, categoriaAtual, ""));
    });
    coresPendentes = [];
  };

  for (const line of lines) {
    // Preço: 💸R$9.750
    if (line.startsWith("💸")) {
      const preco = extractPrecoRS(line.replace(/^💸\s*/, "").trim());
      if (preco) { ultimoPreco = preco; flush(preco); }
      continue;
    }
    // Cor: ⏸️LARANJA
    if (/^⏸\uFE0F?/.test(line)) {
      const cor = line.replace(/^⏸\uFE0F?\s*/, "").trim().toUpperCase();
      if (cor) coresPendentes.push(cor);
      continue;
    }
    // Novo modelo — flush cores pendentes com último preço conhecido
    if (isLinhaModelo(line)) {
      if (coresPendentes.length > 0 && ultimoPreco) flush(ultimoPreco);
      else coresPendentes = [];
      modeloAtual = limparPrefixoModelo(line);
      categoriaAtual = detectCategoria(modeloAtual);
      ultimoPreco = null;
    }
  }
  // Final do texto — flush cores pendentes restantes
  if (coresPendentes.length > 0 && ultimoPreco) flush(ultimoPreco);

  return itens;
}

// ── Despachante: detecta formato automaticamente ─────────────
function parseSupplierText(text) {
  if (!text.trim()) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Formato D: ⏸️ para cores + 💸 para preços
  if (lines.some((l) => /^⏸/.test(l)) && text.includes("💸")) {
    return parseFormatoD(lines);
  }
  // Formato B: ✅ para cores + R$ nos preços
  if (lines.some((l) => l.startsWith("✅")) && /R\$/i.test(text)) {
    return parseFormatoRS(lines);
  }
  // Formato A: usa 💰 para preços
  if (text.includes("💰") || text.includes("🌐")) {
    return parseFormatoEmoji(lines);
  }
  // Formato C: linhas com separadores " - "
  return parseFormatoLinha(lines);
}

// ─────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function novoItem() {
  return { id: crypto.randomUUID(), categoria: "", modelo: "", preco: "", observacao: "", disponivel: true, data_adicao: HOJE };
}

function parseItens(raw) {
  if (!raw) return [];
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.itens)) return raw.itens;
  return [];
}

function formatarPreco(v) {
  const n = parseFloat(String(v).replace(",", ".")) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────

export default function Tabela() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();

  // Nível 1 = Admin/Diretor, Nível 2 = Gerente → podem editar
  // Nível 3, 4, 5 = operacional → só visualizam
  const podeEditar = useMemo(() => {
    const nivel = parseInt(user?.cargo?.nivel_hierarquia ?? user?.usuarioSistema?.cargo?.nivel_hierarquia) || 99;
    return nivel <= 2;
  }, [user]);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itensEditando, setItensEditando] = useState([]);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("nome");
  const [telaCheia, setTelaCheia] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [textoFornecedor, setTextoFornecedor] = useState("");
  const [itensParsed, setItensParsed] = useState(null);
  const [modoIA, setModoIA] = useState(false);
  // S03 FIX: A chave NÃO é mais salva no localStorage (risco de segurança)
  // Usar apenas variável de ambiente VITE_ANTHROPIC_KEY no arquivo .env
  const [chaveIA] = useState(() => import.meta.env.VITE_ANTHROPIC_KEY || "");
  const temChaveIA = Boolean(chaveIA);
  const [iaCarregando, setIaCarregando] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configuracao"],
    queryFn: () => base44.entities.Configuracao.list(),
    refetchInterval: 30000,
  });

  const configTabela = useMemo(() => configs.find((c) => c.chave === CHAVE), [configs]);
  const configAnterior = useMemo(() => configs.find((c) => c.chave === CHAVE_ANTERIOR), [configs]);
  const itens = useMemo(() => parseItens(configTabela?.valor), [configTabela]);
  const itensAnteriores = useMemo(() => parseItens(configAnterior?.valor), [configAnterior]);

  const precoAnteriorMap = useMemo(() => {
    const map = {};
    itensAnteriores.forEach((i) => { map[i.modelo?.toLowerCase()] = parseFloat(String(i.preco).replace(",", ".")) || 0; });
    return map;
  }, [itensAnteriores]);

  const modelosAnteriores = useMemo(() => {
    const s = new Set();
    itensAnteriores.forEach((i) => s.add(i.modelo?.toLowerCase()));
    return s;
  }, [itensAnteriores]);

  const atualizadoEm = useMemo(() => {
    const d = configTabela?.updated_date;
    if (!d) return null;
    try { return format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return null; }
  }, [configTabela]);

  const salvarMutation = useMutation({
    mutationFn: async (novosItens) => {
      if (itens.length > 0) {
        if (configAnterior?.id) {
          await base44.entities.Configuracao.update(configAnterior.id, { valor: itens });
        } else {
          await base44.entities.Configuracao.create({ chave: CHAVE_ANTERIOR, valor: itens, descricao: "Tabela de preços anterior" });
        }
      }
      if (configTabela?.id) {
        return base44.entities.Configuracao.update(configTabela.id, { valor: novosItens });
      }
      return base44.entities.Configuracao.create({ chave: CHAVE, valor: novosItens, descricao: "Tabela de preços diária" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracao"] });
      toast.success("Tabela salva!");
      setModoEdicao(false);
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const entrarEdicao = (base) => {
    setItensEditando(base || (itens.length > 0 ? itens.map((i) => ({ ...i })) : [novoItem()]));
    setModoEdicao(true);
  };

  const usarAnterior = () => {
    if (!itensAnteriores.length) return;
    setItensEditando(itensAnteriores.map((i) => ({ ...i, id: crypto.randomUUID(), data_adicao: HOJE })));
    toast.info("Tabela anterior carregada. Ajuste e salve.");
  };

  const cancelarEdicao = () => { setItensEditando([]); setModoEdicao(false); };
  const adicionarLinha = () => setItensEditando((p) => [...p, novoItem()]);
  const removerLinha = (id) => setItensEditando((p) => p.filter((i) => i.id !== id));
  const atualizarCampo = (id, campo, valor) =>
    setItensEditando((p) => p.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  const salvar = () => salvarMutation.mutate(itensEditando.filter((i) => i.modelo.trim() && i.preco !== ""));

  const processarTexto = () => setItensParsed(parseSupplierText(textoFornecedor));

  const processarComIA = async () => {
    if (!chaveIA.trim()) { toast.error("Configure VITE_ANTHROPIC_KEY no arquivo .env do projeto."); return; }
    // S03 FIX: Não salvar a chave no localStorage
    setIaCarregando(true);
    try {
      const resultado = await parseWithAI(textoFornecedor, chaveIA.trim());
      setItensParsed(resultado);
    } catch (e) {
      toast.error(`Erro na IA: ${e.message}`);
    } finally {
      setIaCarregando(false);
    }
  };

  const usarItensImportados = () => {
    if (!itensParsed?.length) return;
    entrarEdicao(itensParsed);
    setDialogAberto(false);
    setTextoFornecedor("");
    setItensParsed(null);
    toast.success(`${itensParsed.length} modelos importados. Revise e salve.`);
  };

  const fecharDialog = () => { setDialogAberto(false); setTextoFornecedor(""); setItensParsed(null); setModoIA(false); };

  const copiarWhatsApp = () => {
    const grupos = {};
    itens.filter((i) => i.disponivel !== false).forEach((i) => {
      const cat = i.categoria?.trim() || "Outros";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(i);
    });
    const hoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    let txt = `📋 *TABELA SMART - ${hoje}*\n\n`;
    Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, linhas]) => {
      txt += `📱 *${cat}*\n`;
      linhas.forEach((i) => { txt += `• ${i.modelo} — ${formatarPreco(i.preco)}${i.observacao ? ` (${i.observacao})` : ""}\n`; });
      txt += "\n";
    });
    txt += "_Preços sujeitos a alteração sem aviso prévio._";
    navigator.clipboard.writeText(txt)
      .then(() => toast.success("Copiado! Cole no WhatsApp."))
      .catch(() => toast.error("Erro ao copiar."));
  };

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens;
    const t = busca.toLowerCase();
    return itens.filter((i) =>
      (i.modelo || "").toLowerCase().includes(t) ||
      (i.categoria || "").toLowerCase().includes(t) ||
      (i.observacao || "").toLowerCase().includes(t)
    );
  }, [itens, busca]);

  const grupos = useMemo(() => {
    const map = {};
    itensFiltrados.forEach((item) => {
      const cat = item.categoria?.trim() || "Outros";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([cat, linhas]) => {
      const sorted = [...linhas].sort((a, b) => {
        if (ordenacao === "preco_asc") return (parseFloat(a.preco) || 0) - (parseFloat(b.preco) || 0);
        if (ordenacao === "preco_desc") return (parseFloat(b.preco) || 0) - (parseFloat(a.preco) || 0);
        return (a.modelo || "").localeCompare(b.modelo || "");
      });
      return [cat, sorted];
    });
  }, [itensFiltrados, ordenacao]);

  const VariacaoPreco = ({ modelo, preco }) => {
    const key = modelo?.toLowerCase();
    if (!precoAnteriorMap[key]) return null;
    const anterior = precoAnteriorMap[key];
    const atual = parseFloat(String(preco).replace(",", ".")) || 0;
    const diff = atual - anterior;
    if (Math.abs(diff) < 0.01) return <Minus className="w-3 h-3 text-slate-400 inline" title="Mesmo preço de ontem" />;
    if (diff > 0) return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-500 font-medium" title={`Era ${formatarPreco(anterior)}`}>
        <TrendingUp className="w-3 h-3" /> +{formatarPreco(diff)}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium" title={`Era ${formatarPreco(anterior)}`}>
        <TrendingDown className="w-3 h-3" /> {formatarPreco(diff)}
      </span>
    );
  };

  const isNovidade = (item) => item.data_adicao === HOJE && !modelosAnteriores.has(item.modelo?.toLowerCase());

  // ── TELA CHEIA ───────────────────────────────────────────────
  if (telaCheia) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Table2 className="w-8 h-8 text-blue-600" /> Tabela Smart
            </h1>
            {atualizadoEm && <p className="text-sm text-slate-400 mt-1">Atualizado em {atualizadoEm}</p>}
          </div>
          <Button variant="outline" onClick={() => setTelaCheia(false)}>
            <Minimize2 className="w-4 h-4 mr-2" /> Sair da tela cheia
          </Button>
        </div>
        <div className="space-y-6">
          {grupos.map(([cat, linhas]) => (
            <div key={cat}>
              <h2 className="text-xl font-bold text-slate-700 border-b pb-1 mb-3">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {linhas.filter((i) => i.disponivel !== false).map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border">
                    <span className="font-medium text-slate-800">
                      {item.modelo}
                      {item.observacao && <span className="text-xs text-slate-400 ml-1">({item.observacao})</span>}
                    </span>
                    <span className="text-xl font-bold text-green-700 ml-4 whitespace-nowrap">{formatarPreco(item.preco)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ── TELA NORMAL ──────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table2 className="w-7 h-7 text-blue-600" /> Tabela Smart
          </h1>
          {atualizadoEm ? (
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
              <RefreshCw className="w-3 h-3" /> Atualizado em {atualizadoEm}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-0.5">Nenhuma tabela cadastrada ainda</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {podeEditar && (
            <Button variant="outline" size="sm" onClick={() => setDialogAberto(true)}>
              <FileText className="w-4 h-4 mr-1" /> Importar do Fornecedor
            </Button>
          )}
          {!modoEdicao && itens.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={copiarWhatsApp}>
                <Copy className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTelaCheia(true)}>
                <Maximize2 className="w-4 h-4 mr-1" /> Tela cheia
              </Button>
            </>
          )}
          {podeEditar && (
            modoEdicao ? (
              <>
                {itensAnteriores.length > 0 && (
                  <Button variant="outline" size="sm" onClick={usarAnterior}>
                    <History className="w-4 h-4 mr-1" /> Usar de ontem
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={cancelarEdicao}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={salvar} disabled={salvarMutation.isPending}>
                  <Save className="w-4 h-4 mr-1" />
                  {salvarMutation.isPending ? "Salvando..." : "Salvar Tabela"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => entrarEdicao()}>
                <Pencil className="w-4 h-4 mr-1" /> Editar Preços
              </Button>
            )
          )}
        </div>
      </div>

      {/* ── DIALOG IMPORTAR ── (só admin/gerente) */}
      <Dialog open={dialogAberto && podeEditar} onOpenChange={(v) => { if (!v) fecharDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Importar lista do fornecedor
            </DialogTitle>
          </DialogHeader>

          {!itensParsed ? (
            <>
              {/* Seletor de modo */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${!modoIA ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setModoIA(false)}
                >
                  Detecção automática
                </button>
                <button
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${modoIA ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setModoIA(true)}
                >
                  🤖 Processar com IA
                </button>
              </div>

              {!modoIA ? (
                /* ── MODO AUTOMÁTICO ── */
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border">
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Formato A — 🌐 + 💰</p>
                      <p className="font-mono">🌐IPHONE 16 256G</p>
                      <p className="font-mono">📲AZUL 💰4,500</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Formato B — 📲 + ✅ + R$</p>
                      <p className="font-mono">📲IPHONE 16-R$4.850</p>
                      <p className="font-mono">✅AZUL  ✅PRETO</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Formato C — linhas</p>
                      <p className="font-mono">IPHONE 16 - AZUL - 4850</p>
                      <p className="font-mono">IPHONE 16 - PRETO - 4850 - HN</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Formato D — ⏸️ + 💸</p>
                      <p className="font-mono">📞IPHONE 17 256GB</p>
                      <p className="font-mono">⏸️AZUL  ⏸️PRETO</p>
                      <p className="font-mono">💸R$4.750</p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Cole aqui a lista do fornecedor..."
                    value={textoFornecedor}
                    onChange={(e) => setTextoFornecedor(e.target.value)}
                    className="min-h-[240px] font-mono text-sm"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
                    <Button onClick={processarTexto} disabled={!textoFornecedor.trim()}>
                      Processar lista
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                /* ── MODO IA ── */
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-1">🤖 Interpretação inteligente</p>
                    <p className="text-xs text-blue-600">
                      A IA entende qualquer formato — pode colar o texto exatamente como o fornecedor manda, misturando formatos, com emojis diferentes ou sem padrão fixo.
                    </p>
                  </div>

                  {!temChaveIA && (
                    <div className="space-y-1">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700">⚠️ Chave de IA não configurada</p>
                        <p className="text-xs text-amber-600 mt-1">
                          Adicione <code className="bg-amber-100 px-1 rounded">VITE_ANTHROPIC_KEY=sk-ant-...</code> no arquivo <code className="bg-amber-100 px-1 rounded">.env</code> do projeto e reinicie o servidor.
                        </p>
                        <p className="text-xs text-amber-500 mt-1">
                          Obtenha em <strong>console.anthropic.com</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  <Textarea
                    placeholder="Cole aqui a lista do fornecedor (qualquer formato)..."
                    value={textoFornecedor}
                    onChange={(e) => setTextoFornecedor(e.target.value)}
                    className="min-h-[240px] font-mono text-sm"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
                    <Button
                      onClick={processarComIA}
                      disabled={!textoFornecedor.trim() || iaCarregando}
                    >
                      {iaCarregando ? (
                        <><span className="animate-spin mr-2">⏳</span> Interpretando...</>
                      ) : (
                        <>🤖 Processar com IA</>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-sm text-green-800 font-medium">
                  {itensParsed.length} modelos identificados
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto border rounded-lg divide-y text-sm">
                {itensParsed.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                    <div>
                      <span className="font-medium">{item.modelo}</span>
                      {item.observacao && (
                        <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0">{item.observacao}</Badge>
                      )}
                    </div>
                    <span className="font-bold text-green-700 whitespace-nowrap ml-4">
                      {formatarPreco(item.preco)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">Você pode corrigir qualquer item no modo de edição antes de salvar.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setItensParsed(null)}>Voltar</Button>
                <Button onClick={usarItensImportados} disabled={!itensParsed.length}>
                  Usar estes {itensParsed.length} preços
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODO EDIÇÃO ── (só admin/gerente) */}
      {modoEdicao && podeEditar && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Editar tabela de hoje</CardTitle>
            <p className="text-xs text-slate-500">Categoria, Modelo, Preço. Toggle = disponível no balcão.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[110px_1fr_110px_1fr_60px_36px] gap-2 px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Categoria</span>
              <span className="text-xs font-semibold text-slate-500 uppercase">Modelo</span>
              <span className="text-xs font-semibold text-slate-500 uppercase">Preço (R$)</span>
              <span className="text-xs font-semibold text-slate-500 uppercase">Obs.</span>
              <span className="text-xs font-semibold text-slate-500 uppercase text-center">Disp.</span>
              <span />
            </div>
            {itensEditando.map((item) => (
              <div key={item.id} className="grid grid-cols-[110px_1fr_110px_1fr_60px_36px] gap-2 items-center">
                <Input placeholder="iPhone" value={item.categoria} onChange={(e) => atualizarCampo(item.id, "categoria", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="iPhone 14 Pro Max 256GB Preto" value={item.modelo} onChange={(e) => atualizarCampo(item.id, "modelo", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="0,00" value={item.preco} onChange={(e) => atualizarCampo(item.id, "preco", e.target.value)} className="h-8 text-sm text-right" inputMode="decimal" />
                <Input placeholder="JP, CPO..." value={item.observacao} onChange={(e) => atualizarCampo(item.id, "observacao", e.target.value)} className="h-8 text-sm" />
                <div className="flex justify-center">
                  <Switch checked={item.disponivel !== false} onCheckedChange={(v) => atualizarCampo(item.id, "disponivel", v)} />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removerLinha(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={adicionarLinha}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar linha
              </Button>
              {itensEditando.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={async () => {
                    const resposta = await confirm({
                      title: "Limpar Lista",
                      description: `Tem certeza que deseja remover todos os ${itensEditando.length} itens da lista?\n\nEsta ação não pode ser desfeita!`,
                      confirmText: "Sim, Limpar Tudo",
                      cancelText: "Cancelar",
                      type: "confirm"
                    });
                    if (resposta) {
                      setItensEditando([novoItem()]);
                      toast.success("Lista limpa! Adicionado uma linha em branco.");
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Limpar Lista
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MODO VISUALIZAÇÃO ── */}
      {!modoEdicao && (
        <>
          {itens.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                <Table2 className="w-12 h-12 opacity-30" />
                <p className="text-center">
                  A tabela ainda não foi preenchida hoje.
                  <span className="block text-sm mt-1">Use <strong>Importar do Fornecedor</strong> ou <strong>Editar Preços</strong>.</span>
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input placeholder="Buscar modelo ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
                <div className="flex gap-1">
                  <Button variant={ordenacao === "nome" ? "secondary" : "outline"} size="sm" onClick={() => setOrdenacao("nome")}>
                    <ArrowUpDown className="w-3 h-3 mr-1" /> A-Z
                  </Button>
                  <Button variant={ordenacao === "preco_asc" ? "secondary" : "outline"} size="sm" onClick={() => setOrdenacao("preco_asc")}>
                    <ArrowUp className="w-3 h-3 mr-1" /> Menor
                  </Button>
                  <Button variant={ordenacao === "preco_desc" ? "secondary" : "outline"} size="sm" onClick={() => setOrdenacao("preco_desc")}>
                    <ArrowDown className="w-3 h-3 mr-1" /> Maior
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {grupos.map(([cat, linhas]) => (
                  <Card key={cat}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline" className="text-sm px-3 py-0.5">{cat}</Badge>
                        <span className="text-xs text-slate-400 font-normal">
                          {linhas.filter((i) => i.disponivel !== false).length} disponível(is)
                          {linhas.some((i) => i.disponivel === false) && (
                            <span className="ml-1 text-slate-300">
                              · {linhas.filter((i) => i.disponivel === false).length} indisponível(is)
                            </span>
                          )}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pb-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Modelo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Variação</TableHead>
                            <TableHead>Obs.</TableHead>
                            <TableHead className="text-center">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linhas.map((item) => {
                            const indisponivel = item.disponivel === false;
                            return (
                              <TableRow key={item.id} className={indisponivel ? "opacity-40" : ""}>
                                <TableCell className="font-medium">
                                  <span className="flex items-center gap-2">
                                    {item.modelo}
                                    {isNovidade(item) && (
                                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-1.5 py-0 gap-0.5">
                                        <Sparkles className="w-2.5 h-2.5" /> Novo
                                      </Badge>
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-base font-bold text-green-700 whitespace-nowrap">
                                  {formatarPreco(item.preco)}
                                </TableCell>
                                <TableCell>
                                  <VariacaoPreco modelo={item.modelo} preco={item.preco} />
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">{item.observacao || "—"}</TableCell>
                                <TableCell className="text-center">
                                  {indisponivel
                                    ? <Badge variant="destructive" className="text-xs">Indisponível</Badge>
                                    : <Badge variant="outline" className="text-xs text-green-700 border-green-300">Disponível</Badge>
                                  }
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
