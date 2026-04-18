import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Percent } from "lucide-react";

const TAXAS_PADRAO = {
  debito: 1.99,
  credito_1x: 4.99,
  credito_2x: 5.99,
  credito_3x: 6.99,
  credito_4x: 7.99,
  credito_5x: 8.99,
  credito_6x: 9.99,
  credito_7x: 10.49,
  credito_8x: 10.99,
  credito_9x: 11.49,
  credito_10x: 11.99,
  credito_11x: 12.49,
  credito_12x: 12.99
};

export default function CalculadoraQuick() {
  const [valorVenda, setValorVenda] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("credito_1x");
  const [taxaManual, setTaxaManual] = useState("");
  const [usarTaxaManual, setUsarTaxaManual] = useState(false);
  const [repassarJuros, setRepassarJuros] = useState(true);
  const [taxasConfig, setTaxasConfig] = useState(TAXAS_PADRAO);

  useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        // Ler taxas de config.calculadora (mesmo local que Configurações)
        if (config.calculadora) {
          setTaxasConfig({ ...TAXAS_PADRAO, ...config.calculadora });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  }, []);

  const getValorNumerico = () => parseFloat(valorVenda) || 0;
  
  const getTaxaAtual = () => {
    if (usarTaxaManual && taxaManual) {
      return parseFloat(taxaManual) || 0;
    }
    return taxasConfig[formaPagamento] || 0;
  };

  const getNumParcelas = () => {
    if (formaPagamento === "debito") return 1;
    const match = formaPagamento.match(/credito_(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  // Fórmula: Bruto = Líquido ÷ (1 - taxa)
  const calcularValorBruto = () => {
    const taxa = getTaxaAtual();
    if (taxa === 0) return getValorNumerico();
    const taxaDecimal = taxa / 100;
    return getValorNumerico() / (1 - taxaDecimal);
  };

  const calcularJuros = () => {
    return calcularValorBruto() - getValorNumerico();
  };

  const valorFinal = () => {
    return repassarJuros ? calcularValorBruto() : getValorNumerico();
  };

  const valorParcela = () => {
    const parcelas = getNumParcelas();
    return valorFinal() / parcelas;
  };

  const opcoesPagamento = [
    { value: "debito", label: "Débito", icon: "💳" },
    { value: "credito_1x", label: "1x", icon: "💳" },
    { value: "credito_2x", label: "2x", icon: "💳" },
    { value: "credito_3x", label: "3x", icon: "💳" },
    { value: "credito_4x", label: "4x", icon: "💳" },
    { value: "credito_5x", label: "5x", icon: "💳" },
    { value: "credito_6x", label: "6x", icon: "💳" },
    { value: "credito_7x", label: "7x", icon: "💳" },
    { value: "credito_8x", label: "8x", icon: "💳" },
    { value: "credito_9x", label: "9x", icon: "💳" },
    { value: "credito_10x", label: "10x", icon: "💳" },
    { value: "credito_11x", label: "11x", icon: "💳" },
    { value: "credito_12x", label: "12x", icon: "💳" },
  ];

  return (
    <div className="space-y-4">
      {/* Valor da Venda */}
      <div>
            <Label>Valor da Venda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Digite o valor"
              className="text-2xl font-bold h-14 text-green-600"
            />
          </div>

          {/* Forma de Pagamento */}
          <div>
            <Label className="mb-2 block">Forma de Pagamento</Label>
            <div className="grid grid-cols-7 gap-1">
              {opcoesPagamento.map((opcao) => (
                <Button
                  key={opcao.value}
                  variant={formaPagamento === opcao.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFormaPagamento(opcao.value);
                    setUsarTaxaManual(false);
                  }}
                  className={`h-10 text-xs px-1 ${formaPagamento === opcao.value ? 'bg-blue-600' : ''}`}
                >
                  <div className="text-center">
                    <div>{opcao.label}</div>
                    <div className="text-[10px] opacity-70">{taxasConfig[opcao.value]}%</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Taxa Manual */}
          <div className="p-3 bg-slate-50 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Taxa Manual (outra taxa)</Label>
              <Switch
                checked={usarTaxaManual}
                onCheckedChange={setUsarTaxaManual}
              />
            </div>
            {usarTaxaManual && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={taxaManual}
                  onChange={(e) => setTaxaManual(e.target.value)}
                  placeholder="Ex: 5.5"
                  className="h-10"
                />
                <Percent className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>

          {/* Repassar Juros */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-blue-900">
                  Repassar Taxa ao Cliente?
                </Label>
                <p className="text-xs text-blue-700">
                  Cliente paga o valor + taxa da maquininha
                </p>
              </div>
              <Switch
                checked={repassarJuros}
                onCheckedChange={setRepassarJuros}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          {/* Resultado Principal */}
          {getValorNumerico() > 0 && (
            <>
              <div className={`p-6 rounded-lg border-4 ${repassarJuros ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700' : 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'}`}>
                <div className="text-white text-center">
                  <p className="text-sm opacity-90 mb-1">
                    {formaPagamento === "debito" ? "Débito" : `Crédito ${getNumParcelas()}x de`}
                  </p>
                  <p className="text-4xl font-bold">
                    R$ {valorParcela().toFixed(2)}
                  </p>
                  {getNumParcelas() > 1 && (
                    <p className="text-sm opacity-90 mt-1">
                      Total: R$ {valorFinal().toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Resumo Detalhado */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-slate-700 border-b pb-2">Resumo do Cálculo</h4>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Valor Original:</span>
                    <span className="font-semibold">R$ {getValorNumerico().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Taxa Aplicada:</span>
                    <span className="font-semibold text-orange-600">{getTaxaAtual().toFixed(2)}%</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Valor da Taxa (Juros):</span>
                    <span className="font-semibold text-orange-600">R$ {calcularJuros().toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal (Valor + Taxa):</span>
                      <span className="font-bold">R$ {calcularValorBruto().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {!repassarJuros && (
                    <div className="flex justify-between text-sm bg-red-50 p-2 rounded">
                      <span className="text-red-700">Loja Absorve a Taxa:</span>
                      <span className="font-bold text-red-600">- R$ {calcularJuros().toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-slate-300 pt-3">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">CLIENTE PAGA:</span>
                      <span className={`font-bold ${repassarJuros ? 'text-blue-600' : 'text-green-600'}`}>
                        R$ {valorFinal().toFixed(2)}
                      </span>
                    </div>
                    {getNumParcelas() > 1 && (
                      <div className="flex justify-between text-sm text-slate-500 mt-1">
                        <span>({getNumParcelas()}x de R$ {valorParcela().toFixed(2)})</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                    <span className="text-green-700">Você Recebe (Líquido):</span>
                    <span className="font-bold text-green-600">
                      R$ {repassarJuros
                        ? getValorNumerico().toFixed(2)
                        : (getValorNumerico() - (getValorNumerico() * getTaxaAtual() / 100)).toFixed(2)
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
    </div>
  );
}