import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Calendar, DollarSign, CreditCard } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClienteHistorico({ cliente, vendas, open, onClose }) {
  if (!cliente) return null;

  const comprasCliente = vendas
    .filter(v => v.cliente_id === cliente.id && v.status === 'finalizada')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalGasto = comprasCliente.reduce((sum, v) => sum + (v.valor_total || 0), 0);

  const FORMAS_PAGAMENTO = {
    dinheiro: "💵 Dinheiro",
    cartao_credito: "💳 Crédito",
    cartao_debito: "💳 Débito",
    pix: "📱 PIX",
    cheque: "📝 Cheque",
    outros: "💰 Outros"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Histórico de Compras</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabeçalho Cliente */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{cliente.nome_completo}</h3>
                  <p className="text-sm text-slate-600 mt-1">{cliente.telefone1}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total Gasto</p>
                  <p className="text-2xl font-bold text-green-600">R$ {totalGasto.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{comprasCliente.length} compra(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Compras */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Histórico de Vendas
            </h4>

            {comprasCliente.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma compra realizada</p>
              </div>
            ) : (
              comprasCliente.map((venda) => (
                <Card key={venda.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">
                            {venda.codigo_venda}
                          </Badge>
                          <Badge className="bg-green-600 text-white">
                            R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(parseISO(venda.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Itens da Venda */}
                    <div className="space-y-1.5 mb-3 bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Produtos:</p>
                      {venda.itens?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            {item.quantidade}x {item.produto_nome}
                          </span>
                          <span className="font-semibold">
                            R$ {(parseFloat(item.subtotal) || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Formas de Pagamento */}
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        Formas de Pagamento:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {venda.pagamentos?.map((pag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {FORMAS_PAGAMENTO[pag.forma_pagamento] || pag.forma_pagamento} - R$ {(parseFloat(pag.valor) || 0).toFixed(2)}
                            {pag.parcelas > 1 && ` (${pag.parcelas}x)`}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {venda.vendedor_nome && (
                      <p className="text-xs text-slate-500 mt-2">
                        Vendedor: {venda.vendedor_nome}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}