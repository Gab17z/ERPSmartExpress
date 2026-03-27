import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import ContagemNotas from "./ContagemNotas";

const FORMAS_LABEL = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  pix: "PIX",
  cheque: "Cheque",
  a_prazo: "A Prazo",
  credito_parcelado: "Créd. Parcelado",
  outros: "Outros",
};

function fmt(v) {
  return (parseFloat(v) || 0).toFixed(2);
}

function fmtData(iso) {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm");
  } catch {
    return "-";
  }
}

export default function CaixaDetalhe({ open, onOpenChange, caixa, onPrint80mm, onPrintA4 }) {
  const { data: vendasDoCaixa = [], isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas-caixa-detalhe", caixa?.id],
    queryFn: () => base44.entities.Venda.list("-created_date"),
    select: (data) =>
      data
        .filter((v) => v.caixa_id === caixa?.id && v.status === "finalizada")
        .sort((a, b) => new Date(a.data_venda || a.created_date) - new Date(b.data_venda || b.created_date)),
    enabled: !!caixa?.id && open,
  });

  const { data: movsDoCaixa = [], isLoading: loadingMovs } = useQuery({
    queryKey: ["movs-caixa-detalhe", caixa?.id],
    queryFn: () => base44.entities.MovimentacaoCaixa.list("-created_date"),
    select: (data) =>
      data
        .filter((m) => m.caixa_id === caixa?.id)
        .sort((a, b) => new Date(a.data_hora || a.created_date) - new Date(b.data_hora || b.created_date)),
    enabled: !!caixa?.id && open,
  });

  const sangrias = useMemo(() => movsDoCaixa.filter((m) => m.tipo === "sangria"), [movsDoCaixa]);
  const suprimentos = useMemo(() => movsDoCaixa.filter((m) => m.tipo === "suprimento"), [movsDoCaixa]);

  const resumoPagamentos = useMemo(() => {
    if (caixa?.resumo_pagamentos) return caixa.resumo_pagamentos;
    // Fallback: recalcular das vendas para caixas antigos
    const resumo = {};
    vendasDoCaixa.forEach((v) => {
      (v.pagamentos || []).forEach((p) => {
        const forma = p.forma_pagamento || "outros";
        resumo[forma] = (resumo[forma] || 0) + (p.valor || 0);
      });
    });
    return resumo;
  }, [caixa?.resumo_pagamentos, vendasDoCaixa]);

  if (!caixa) return null;

  const isLoading = loadingVendas || loadingMovs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Caixa #{caixa.numero_caixa}</span>
            <Badge variant={caixa.status === "aberto" ? "default" : "secondary"}>
              {caixa.status === "aberto" ? "Aberto" : "Fechado"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Abertura:</span>
                <p className="font-medium">{fmtData(caixa.data_abertura)}</p>
              </div>
              <div>
                <span className="text-slate-500">Fechamento:</span>
                <p className="font-medium">{fmtData(caixa.data_fechamento)}</p>
              </div>
              <div>
                <span className="text-slate-500">Operador (Abertura):</span>
                <p className="font-medium">{caixa.usuario_abertura || "-"}</p>
              </div>
              <div>
                <span className="text-slate-500">Operador (Fechamento):</span>
                <p className="font-medium">{caixa.usuario_fechamento || "-"}</p>
              </div>
            </div>

            <Separator />

            {/* Resumo Financeiro */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Resumo Financeiro</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase">Valor Inicial</p>
                  <p className="text-lg font-bold">R$ {fmt(caixa.valor_inicial)}</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase">Total Vendas</p>
                  <p className="text-lg font-bold text-blue-600">R$ {fmt(caixa.total_vendas)}</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase">Suprimentos</p>
                  <p className="text-lg font-bold text-green-600">R$ {fmt(caixa.total_suprimentos)}</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase">Sangrias</p>
                  <p className="text-lg font-bold text-red-600">R$ {fmt(caixa.total_sangrias)}</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 uppercase">Valor Esperado</p>
                  <p className="text-lg font-bold">R$ {fmt(caixa.valor_fechamento)}</p>
                </div>
                <div className={`border rounded-lg p-3 text-center ${parseFloat(caixa.diferenca) === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="text-xs text-slate-500 uppercase">Diferença</p>
                  <p className={`text-lg font-bold ${parseFloat(caixa.diferenca) === 0 ? "text-green-600" : parseFloat(caixa.diferenca) > 0 ? "text-blue-600" : "text-red-600"}`}>
                    R$ {fmt(caixa.diferenca)}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pagamentos por Forma */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Pagamentos por Forma</h4>
              <div className="bg-slate-50 rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-700">Forma</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-700">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumoPagamentos)
                      .filter(([k]) => k !== "total")
                      .map(([forma, valor]) => (
                        <tr key={forma} className="border-t border-slate-200">
                          <td className="px-3 py-2">{FORMAS_LABEL[forma] || forma}</td>
                          <td className="px-3 py-2 text-right font-medium">R$ {fmt(valor)}</td>
                        </tr>
                      ))}
                    {Object.keys(resumoPagamentos).filter((k) => k !== "total").length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-slate-400">
                          Sem dados de pagamentos
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100">
                      <td className="px-3 py-2 font-bold">Total</td>
                      <td className="px-3 py-2 text-right font-bold">
                        R$ {fmt(
                          Object.entries(resumoPagamentos)
                            .filter(([k]) => k !== "total")
                            .reduce((s, [, v]) => s + (parseFloat(v) || 0), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Contagem de Notas */}
            {caixa.contagem_notas && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Contagem de Cédulas e Moedas</h4>
                  <ContagemNotas value={caixa.contagem_notas} readOnly />
                </div>
              </>
            )}

            <Separator />

            {/* Lista de Vendas */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Vendas Realizadas
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({vendasDoCaixa.length} vendas — Total: R$ {fmt(caixa.total_vendas)})
                </span>
              </h4>
              <div className="bg-slate-50 rounded-lg border overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-700">Hora</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-700">Código</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-700">Cliente</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-700">Itens</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-700">Total</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-700">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasDoCaixa.map((v) => {
                      const pagamentos = (v.pagamentos || []);
                      const qtdItens = (v.itens || []).reduce((s, i) => s + (i.quantidade || 1), 0);
                      return (
                        <tr key={v.id} className="border-t border-slate-200 hover:bg-slate-100">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {fmtData(v.data_venda || v.created_date)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{v.codigo_venda || v.numero || "-"}</td>
                          <td className="px-3 py-2">{v.cliente_nome || "-"}</td>
                          <td className="px-3 py-2 text-center">{qtdItens}</td>
                          <td className="px-3 py-2 text-right font-medium">R$ {fmt(v.valor_total)}</td>
                          <td className="px-3 py-2 text-xs">
                            {pagamentos.map((p, i) => (
                              <div key={i}>
                                {FORMAS_LABEL[p.forma_pagamento] || p.forma_pagamento}: R$ {fmt(p.valor)}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                    {vendasDoCaixa.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                          Nenhuma venda registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Movimentações */}
            {(sangrias.length > 0 || suprimentos.length > 0) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Movimentações (Sangrias/Suprimentos)</h4>
                  <div className="space-y-2">
                    {[...sangrias, ...suprimentos]
                      .sort((a, b) => new Date(a.data_hora || a.created_date) - new Date(b.data_hora || b.created_date))
                      .map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${m.tipo === "sangria" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={m.tipo === "sangria" ? "destructive" : "default"} className="text-xs">
                                {m.tipo === "sangria" ? "Sangria" : "Suprimento"}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {fmtData(m.data_hora || m.created_date)}
                              </span>
                            </div>
                            {m.descricao && <p className="text-sm text-slate-600 mt-1">{m.descricao}</p>}
                            {(m.usuario_nome || m.usuario) && (
                              <p className="text-xs text-slate-400 mt-0.5">por {m.usuario_nome || m.usuario}</p>
                            )}
                          </div>
                          <span className={`font-bold text-lg ${m.tipo === "sangria" ? "text-red-600" : "text-green-600"}`}>
                            {m.tipo === "sangria" ? "-" : "+"} R$ {fmt(m.valor)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Observações e Aprovação */}
            {(caixa.observacoes_fechamento || caixa.aprovacao_diferenca) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Observações do Fechamento</h4>
                  {caixa.observacoes_fechamento && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                      {caixa.observacoes_fechamento}
                    </div>
                  )}
                  {caixa.aprovacao_diferenca && (
                    <p className="text-sm text-slate-600 mt-2">
                      <strong>Aprovado por:</strong> {caixa.aprovacao_diferenca}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint80mm?.(caixa, vendasDoCaixa, movsDoCaixa)}
          >
            <Printer className="w-4 h-4 mr-1" />
            80mm
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrintA4?.(caixa, vendasDoCaixa, movsDoCaixa)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Relatório A4
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
