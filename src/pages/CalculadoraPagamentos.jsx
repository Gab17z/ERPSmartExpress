import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, Percent, Settings, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";

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

export default function CalculadoraPagamentos() {
  const { user } = useAuth();
  const [valorVenda, setValorVenda] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("credito_1x");
  const [taxaManual, setTaxaManual] = useState("");
  const [usarTaxaManual, setUsarTaxaManual] = useState(false);
  const [repassarJuros, setRepassarJuros] = useState(true);
  const [taxasConfig, setTaxasConfig] = useState(TAXAS_PADRAO);
  const isAdmin = user?.permissoes?.administrador_sistema || false;
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregarTaxas = () => {
      // Carrega do localStorage (mesmo local usado por Configuracoes.jsx)
      const configSalva = localStorage.getItem('configuracoes_erp');
      if (configSalva) {
        try {
          const config = JSON.parse(configSalva);
          // Ler de config.calculadora (mesmo local que Configurações salva)
          if (config.calculadora) {
            setTaxasConfig({ ...TAXAS_PADRAO, ...config.calculadora });
          }
        } catch (error) {
          console.error("Erro ao carregar configurações:", error);
        }
      }
    };

    carregarTaxas();

    // Listener para atualizar quando configurações mudam
    window.addEventListener('configuracoes_atualizadas', carregarTaxas);
    window.addEventListener('storage', carregarTaxas);
    return () => {
      window.removeEventListener('configuracoes_atualizadas', carregarTaxas);
      window.removeEventListener('storage', carregarTaxas);
    };
  }, []);

  const salvarTaxas = async () => {
    setSalvando(true);
    try {
      const taxasParaSalvar = {
        debito: taxasConfig.debito,
        credito_1x: taxasConfig.credito_1x,
        credito_2x: taxasConfig.credito_2x,
        credito_3x: taxasConfig.credito_3x,
        credito_4x: taxasConfig.credito_4x,
        credito_5x: taxasConfig.credito_5x,
        credito_6x: taxasConfig.credito_6x,
        credito_7x: taxasConfig.credito_7x,
        credito_8x: taxasConfig.credito_8x,
        credito_9x: taxasConfig.credito_9x,
        credito_10x: taxasConfig.credito_10x,
        credito_11x: taxasConfig.credito_11x,
        credito_12x: taxasConfig.credito_12x
      };

      // Salva no localStorage em config.calculadora (mesmo local que Configuracoes.jsx)
      const configSalva = localStorage.getItem('configuracoes_erp');
      const config = configSalva ? JSON.parse(configSalva) : {};
      config.calculadora = { ...config.calculadora, ...taxasParaSalvar };
      localStorage.setItem('configuracoes_erp', JSON.stringify(config));

      window.dispatchEvent(new Event('configuracoes_atualizadas'));

      toast.success("Taxas salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar taxas:", error);
      toast.error("Erro ao salvar taxas: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  // CRÍTICO: Validação de valor
  const getValorNumerico = () => {
    const val = parseFloat(valorVenda);
    return (isNaN(val) || val < 0) ? 0 : val;
  };
  
  // CRÍTICO: Validação de taxa
  const getTaxaAtual = () => {
    if (usarTaxaManual && taxaManual) {
      const taxa = parseFloat(taxaManual);
      return (isNaN(taxa) || taxa < 0) ? 0 : taxa;
    }
    const taxa = parseFloat(taxasConfig[formaPagamento]);
    return (isNaN(taxa) || taxa < 0) ? 0 : taxa;
  };

  const getNumParcelas = () => {
    if (formaPagamento === "debito") return 1;
    const match = formaPagamento.match(/credito_(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  // Quando repassa juros: Bruto = Líquido ÷ (1 - taxa) - para receber o valor líquido desejado
  // Quando arca com taxa: Desconto simples = Valor × taxa
  // CRÍTICO: Cálculo com validação de divisão por zero
  const calcularValorBruto = () => {
    const taxa = getTaxaAtual();
    const valor = getValorNumerico();
    
    if (taxa === 0 || valor === 0) return valor;
    
    const taxaDecimal = taxa / 100;
    
    if (taxaDecimal >= 1) {
      toast.error("Taxa não pode ser >= 100%!");
      return valor;
    }
    
    return valor / (1 - taxaDecimal);
  };

  // Taxa que a maquininha cobra (sobre o valor que o cliente paga)
  const calcularTaxaMaquininha = () => {
    const taxa = getTaxaAtual();
    if (repassarJuros) {
      // Quando repassa, a taxa é a diferença entre bruto e líquido
      return calcularValorBruto() - getValorNumerico();
    } else {
      // Quando arca, a taxa é simplesmente % sobre o valor original
      return getValorNumerico() * (taxa / 100);
    }
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

  // O que você realmente recebe após desconto da maquininha
  const valorLiquido = () => {
    if (repassarJuros) {
      // Repassa: cliente paga bruto, você recebe o valor original
      return getValorNumerico();
    } else {
      // Arca: cliente paga original, maquininha desconta taxa sobre esse valor
      const taxa = getTaxaAtual();
      return getValorNumerico() * (1 - taxa / 100);
    }
  };

  const opcoesPagamento = [
    { value: "debito", label: "Débito" },
    { value: "credito_1x", label: "1x" },
    { value: "credito_2x", label: "2x" },
    { value: "credito_3x", label: "3x" },
    { value: "credito_4x", label: "4x" },
    { value: "credito_5x", label: "5x" },
    { value: "credito_6x", label: "6x" },
    { value: "credito_7x", label: "7x" },
    { value: "credito_8x", label: "8x" },
    { value: "credito_9x", label: "9x" },
    { value: "credito_10x", label: "10x" },
    { value: "credito_11x", label: "11x" },
    { value: "credito_12x", label: "12x" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-slate-900">Calculadora de Pagamentos</h2>
      </div>

      <Tabs defaultValue="calculadora" className="w-full">
        <TabsList className={`w-full grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="calculadora">
            <Calculator className="w-4 h-4 mr-2" />
            Calculadora
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="taxas">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Taxas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calculadora" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entrada de Dados */}
            <Card className="border shadow">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Dados da Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div>
                  <Label className="mb-2 block">Forma de Pagamento</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {opcoesPagamento.map((opcao) => (
                      <Button
                        key={opcao.value}
                        variant={formaPagamento === opcao.value && !usarTaxaManual ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setFormaPagamento(opcao.value);
                          setUsarTaxaManual(false);
                        }}
                        className={`h-12 text-xs px-1 flex flex-col ${formaPagamento === opcao.value && !usarTaxaManual ? 'bg-blue-600' : ''}`}
                      >
                        <span className="font-bold">{opcao.label}</span>
                        <span className="text-[10px] opacity-70">{taxasConfig[opcao.value]}%</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Usar Taxa Manual</Label>
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
                        className="h-9"
                      />
                      <Percent className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-blue-900">
                        Repassar Taxa ao Cliente?
                      </Label>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Cliente paga o valor + taxa
                      </p>
                    </div>
                    <Switch
                      checked={repassarJuros}
                      onCheckedChange={setRepassarJuros}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            <div className="space-y-3">
              {getValorNumerico() > 0 && (
                <>
                  <div className={`p-5 rounded-lg border ${repassarJuros ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700' : 'bg-gradient-to-br from-green-500 to-green-600 border-green-700'}`}>
                    <div className="text-white text-center">
                      <p className="text-sm opacity-90">
                        {formaPagamento === "debito" ? "Débito" : `Crédito ${getNumParcelas()}x de`}
                      </p>
                      <p className="text-4xl font-bold">
                        R$ {valorParcela().toFixed(2)}
                      </p>
                      {getNumParcelas() > 1 && (
                        <p className="text-sm opacity-90">
                          Total: R$ {valorFinal().toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  <Card className="border shadow">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm">Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor Original:</span>
                        <span className="font-semibold">R$ {getValorNumerico().toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Taxa:</span>
                        <span className="font-semibold text-orange-600">{getTaxaAtual().toFixed(2)}%</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Valor Taxa:</span>
                        <span className="font-semibold text-orange-600">R$ {calcularJuros().toFixed(2)}</span>
                      </div>

                      <div className="border-t pt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Total + Taxa:</span>
                          <span className="font-bold">R$ {calcularValorBruto().toFixed(2)}</span>
                        </div>
                      </div>

                      {!repassarJuros && (
                        <div className="flex justify-between text-sm bg-red-50 p-2 rounded">
                          <span className="text-red-700">Loja Arca:</span>
                          <span className="font-bold text-red-600">- R$ {calcularTaxaMaquininha().toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-300 pt-3">
                        <div className="flex justify-between text-base">
                          <span className="font-bold">CLIENTE PAGA:</span>
                          <span className={`font-bold text-lg ${repassarJuros ? 'text-blue-600' : 'text-green-600'}`}>
                            R$ {valorFinal().toFixed(2)}
                          </span>
                        </div>
                        {getNumParcelas() > 1 && (
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>({getNumParcelas()}x de R$ {valorParcela().toFixed(2)})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="text-green-700">Você Recebe:</span>
                        <span className="font-bold text-green-600">
                          R$ {valorLiquido().toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {getValorNumerico() === 0 && (
                <Card className="border shadow bg-slate-50">
                  <CardContent className="p-6 text-center text-slate-500">
                    <Calculator className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Digite um valor para calcular</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border shadow bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm">Fórmula</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-700">
                  <div className="p-3 bg-white rounded border border-blue-200">
                    <p className="font-mono text-center text-sm mb-1">
                      Bruto = Líquido ÷ (1 - taxa)
                    </p>
                    <p className="text-xs text-center text-slate-500">
                      Ex: R$100 com 11% = <strong>R$112,36</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
        <TabsContent value="taxas" className="mt-2">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Configurar Taxas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ Configure as taxas da maquininha
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Débito</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={taxasConfig.debito}
                      onChange={(e) => setTaxasConfig({...taxasConfig, debito: parseFloat(e.target.value) || 0})}
                      className="h-9 text-sm"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Crédito 1x</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={taxasConfig.credito_1x}
                      onChange={(e) => setTaxasConfig({...taxasConfig, credito_1x: parseFloat(e.target.value) || 0})}
                      className="h-9 text-sm"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[2,3,4,5,6,7,8,9,10,11,12].map((parcela) => (
                  <div key={parcela}>
                    <Label className="text-xs">Crédito {parcela}x</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={taxasConfig[`credito_${parcela}x`]}
                        onChange={(e) => setTaxasConfig({
                          ...taxasConfig, 
                          [`credito_${parcela}x`]: parseFloat(e.target.value) || 0
                        })}
                        className="h-9 text-sm"
                      />
                      <span className="text-[10px] text-slate-500">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={salvarTaxas} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "💾 Salvar Taxas"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}