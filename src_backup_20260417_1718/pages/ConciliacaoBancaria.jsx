import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function ConciliacaoBancaria() {
  const [extratoImportado, setExtratoImportado] = useState([]);

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      
      // CRÍTICO: Parse seguro do CSV
      const dados = lines.slice(1).map((line, idx) => {
        const [data, descricao, valor] = line.split(',');
        const valorNum = parseFloat(valor);
        
        if (!data || !data.trim() || isNaN(valorNum)) {
          return null;
        }
        
        return {
          id: idx,
          data: data.trim(),
          descricao: descricao?.trim() || "Sem descrição",
          valor: valorNum,
          conciliado: false
        };
      }).filter(d => d !== null);

      setExtratoImportado(dados);
      toast.success(`${dados.length} lançamentos importados!`);
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conciliação Bancária</h1>
        <p className="text-slate-500">Importar extrato e conciliar valores</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar Extrato Bancário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <label className="cursor-pointer">
              <Button asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo CSV
                </span>
              </Button>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
            <p className="text-sm text-slate-500 mt-2">
              Formato: Data, Descrição, Valor
            </p>
          </div>

          {extratoImportado.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Lançamentos Importados ({extratoImportado.length})</h3>
              <div className="space-y-2">
                {extratoImportado.map((lancamento) => (
                  <div key={lancamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{lancamento.descricao}</p>
                      <p className="text-sm text-slate-500">{lancamento.data}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">R$ {lancamento.valor.toFixed(2)}</span>
                      {lancamento.conciliado ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4 bg-green-600">
                Conciliar Automaticamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}