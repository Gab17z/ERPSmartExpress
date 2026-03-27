import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";

const NOTAS = [
  { valor: 200, label: "R$ 200" },
  { valor: 100, label: "R$ 100" },
  { valor: 50, label: "R$ 50" },
  { valor: 20, label: "R$ 20" },
  { valor: 10, label: "R$ 10" },
  { valor: 5, label: "R$ 5" },
  { valor: 2, label: "R$ 2" },
];

const MOEDAS = [
  { valor: 1, label: "R$ 1,00" },
  { valor: 0.5, label: "R$ 0,50" },
  { valor: 0.25, label: "R$ 0,25" },
  { valor: 0.10, label: "R$ 0,10" },
  { valor: 0.05, label: "R$ 0,05" },
];

function calcTotal(notas, moedas) {
  let totalCentavos = 0;
  for (const n of NOTAS) {
    totalCentavos += (notas[String(n.valor)] || 0) * Math.round(n.valor * 100);
  }
  for (const m of MOEDAS) {
    totalCentavos += (moedas[String(m.valor)] || 0) * Math.round(m.valor * 100);
  }
  return totalCentavos / 100;
}

export default function ContagemNotas({ value, onChange, readOnly = false }) {
  const notas = value?.notas || {};
  const moedas = value?.moedas || {};

  const total = useMemo(() => calcTotal(notas, moedas), [notas, moedas]);

  const handleChange = (tipo, chave, qtd) => {
    const quantidade = Math.max(0, parseInt(qtd) || 0);
    const newValue = {
      notas: { ...notas },
      moedas: { ...moedas },
    };
    if (tipo === "notas") {
      newValue.notas[chave] = quantidade;
    } else {
      newValue.moedas[chave] = quantidade;
    }
    newValue.total = calcTotal(newValue.notas, newValue.moedas);
    onChange?.(newValue);
  };

  const renderLinha = (item, tipo) => {
    const chave = String(item.valor);
    const qtd = (tipo === "notas" ? notas[chave] : moedas[chave]) || 0;
    const subtotal = Math.round(qtd * item.valor * 100) / 100;

    return (
      <div key={chave} className="grid grid-cols-[100px_80px_1fr] items-center gap-2 py-1">
        <span className="text-sm font-medium text-slate-700">{item.label}</span>
        {readOnly ? (
          <span className="text-sm text-center font-semibold">{qtd}</span>
        ) : (
          <Input
            type="number"
            min="0"
            value={qtd || ""}
            placeholder="0"
            className="h-8 text-center text-sm"
            onChange={(e) => handleChange(tipo, chave, e.target.value)}
          />
        )}
        <span className="text-sm text-right text-slate-600">
          R$ {subtotal.toFixed(2)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Cédulas</p>
        <div className="bg-slate-50 rounded-lg p-2 border">
          {NOTAS.map((n) => renderLinha(n, "notas"))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Moedas</p>
        <div className="bg-slate-50 rounded-lg p-2 border">
          {MOEDAS.map((m) => renderLinha(m, "moedas"))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
        <span className="font-semibold text-green-900">Total em Espécie:</span>
        <span className="text-xl font-bold text-green-700">R$ {total.toFixed(2)}</span>
      </div>
    </div>
  );
}
