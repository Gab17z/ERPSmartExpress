import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { format, subDays, startOfMonth, startOfYear, subWeeks, startOfWeek, endOfWeek } from "date-fns";

export default function DateRangeFilter({ onFilterChange }) {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(hoje, 'yyyy-MM-dd'));

  const aplicarFiltro = () => {
    onFilterChange({ dataInicio, dataFim });
  };

  useEffect(() => {
    // Auto-aplicar filtro quando componente é montado
    onFilterChange({ dataInicio, dataFim });
  }, []);

  const atalhos = [
    { label: "Hoje", inicio: hoje, fim: hoje },
    { label: "Ontem", inicio: subDays(hoje, 1), fim: subDays(hoje, 1) },
    { label: "Esta Semana", inicio: startOfWeek(hoje, { weekStartsOn: 1 }), fim: endOfWeek(hoje, { weekStartsOn: 1 }) },
    { label: "Semana Passada", inicio: startOfWeek(subWeeks(hoje, 1), { weekStartsOn: 1 }), fim: endOfWeek(subWeeks(hoje, 1), { weekStartsOn: 1 }) },
    { label: "Este Mês", inicio: startOfMonth(hoje), fim: hoje },
    { label: "Últimos 30 dias", inicio: subDays(hoje, 29), fim: hoje },
  ];

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Filtro de Período</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Data Início</Label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Data Fim</Label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {atalhos.map((atalho) => (
          <Button
            key={atalho.label}
            variant="outline"
            size="sm"
            onClick={() => {
              const novaDataInicio = format(atalho.inicio, 'yyyy-MM-dd');
              const novaDataFim = format(atalho.fim, 'yyyy-MM-dd');
              setDataInicio(novaDataInicio);
              setDataFim(novaDataFim);
              onFilterChange({ dataInicio: novaDataInicio, dataFim: novaDataFim });
            }}
            className="text-xs"
          >
            {atalho.label}
          </Button>
        ))}
      </div>

      <Button onClick={aplicarFiltro} className="w-full bg-blue-600">
        Aplicar Filtro
      </Button>
    </div>
  );
}