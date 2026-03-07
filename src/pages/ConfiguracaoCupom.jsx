import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import PreviewImpressao from "@/components/PreviewImpressao";

export default function ConfiguracaoCupom() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    // Cabeçalho
    nome_loja: "Smart Express",
    cnpj: "",
    endereco: "",
    telefone: "",
    logo_url: "",
    mostrar_logo: false,
    
    // Aparência
    largura_cupom: "280",
    tamanho_fonte: "12",
    fonte_familia: "monospace",
    
    // Elementos
    mostrar_data: true,
    mostrar_codigo_venda: true,
    mostrar_vendedor: true,
    mostrar_cliente: false,
    
    // Código de barras
    codigo_barras_cupom: false,
    tipo_codigo_barras: "codigo128",
    
    // Rodapé
    rodape_cupom: "Obrigado pela preferência!",
    mostrar_rodape: true,
    
    // Mensagens personalizadas
    mensagem_topo: "",
    mensagem_meio: "",
    
    // Formatação
    separador_estilo: "dashed",
    negrito_total: true,
    mostrar_observacoes: true
  });

  const { data: configSalva } = useQuery({
    queryKey: ['configuracao-cupom'],
    queryFn: async () => {
      try {
        const configs = await base44.entities.Configuracao.filter({ chave: 'cupom_fiscal' });
        if (configs.length > 0) {
          return configs[0].valor;
        }
        return null;
      } catch {
        return null;
      }
    }
  });

  useEffect(() => {
    if (configSalva) {
      setConfig({ ...config, ...configSalva });
    }
  }, [configSalva]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const configs = await base44.entities.Configuracao.filter({ chave: 'cupom_fiscal' });
      if (configs.length > 0) {
        return await base44.entities.Configuracao.update(configs[0].id, {
          chave: 'cupom_fiscal',
          valor: config
        });
      } else {
        return await base44.entities.Configuracao.create({
          chave: 'cupom_fiscal',
          valor: config
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-cupom'] });
      toast.success("Configurações salvas!");
    }
  });

  const handleSalvar = () => {
    salvarMutation.mutate();
  };

  const produtoExemplo = {
    codigo: "VENDA-00123",
    nome: "iPhone 13 Pro Max 256GB",
    preco: 4500,
    quantidade: 1,
    codigo_barras: "7891234567890"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuração do Cupom Fiscal</h1>
          <p className="text-slate-500">Personalize completamente o layout do cupom</p>
        </div>
        <Button onClick={handleSalvar} className="bg-green-600">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <div className="space-y-6">
          <Tabs defaultValue="cabecalho">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
              <TabsTrigger value="elementos">Elementos</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="rodape">Rodapé</TabsTrigger>
            </TabsList>

            <TabsContent value="cabecalho">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Cabeçalho</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome da Loja</Label>
                    <Input
                      value={config.nome_loja}
                      onChange={(e) => setConfig({...config, nome_loja: e.target.value})}
                      placeholder="Nome da sua loja"
                    />
                  </div>
                  
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      value={config.cnpj}
                      onChange={(e) => setConfig({...config, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={config.endereco}
                      onChange={(e) => setConfig({...config, endereco: e.target.value})}
                      placeholder="Rua, número - Bairro"
                    />
                  </div>

                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={config.telefone}
                      onChange={(e) => setConfig({...config, telefone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <Label>URL da Logo</Label>
                    <Input
                      value={config.logo_url}
                      onChange={(e) => setConfig({...config, logo_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Logo no Cupom</Label>
                    <Switch
                      checked={config.mostrar_logo}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_logo: checked})}
                    />
                  </div>

                  <div>
                    <Label>Mensagem no Topo (Opcional)</Label>
                    <Input
                      value={config.mensagem_topo}
                      onChange={(e) => setConfig({...config, mensagem_topo: e.target.value})}
                      placeholder="Ex: Promoção de verão!"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="elementos">
              <Card>
                <CardHeader>
                  <CardTitle>Elementos do Cupom</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Mostrar Data</Label>
                    <Switch
                      checked={config.mostrar_data}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_data: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Código da Venda</Label>
                    <Switch
                      checked={config.mostrar_codigo_venda}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_codigo_venda: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Vendedor</Label>
                    <Switch
                      checked={config.mostrar_vendedor}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_vendedor: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Cliente</Label>
                    <Switch
                      checked={config.mostrar_cliente}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_cliente: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mostrar Observações</Label>
                    <Switch
                      checked={config.mostrar_observacoes}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_observacoes: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Código de Barras</Label>
                    <Switch
                      checked={config.codigo_barras_cupom}
                      onCheckedChange={(checked) => setConfig({...config, codigo_barras_cupom: checked})}
                    />
                  </div>

                  {config.codigo_barras_cupom && (
                    <div>
                      <Label>Tipo de Código de Barras</Label>
                      <Select 
                        value={config.tipo_codigo_barras}
                        onValueChange={(v) => setConfig({...config, tipo_codigo_barras: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="codigo128">Code 128</SelectItem>
                          <SelectItem value="ean13">EAN-13</SelectItem>
                          <SelectItem value="qrcode">QR Code</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Mensagem no Meio (Opcional)</Label>
                    <Input
                      value={config.mensagem_meio}
                      onChange={(e) => setConfig({...config, mensagem_meio: e.target.value})}
                      placeholder="Ex: Aproveite nossos descontos"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aparencia">
              <Card>
                <CardHeader>
                  <CardTitle>Aparência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Largura do Cupom (pixels)</Label>
                    <Input
                      type="number"
                      value={config.largura_cupom}
                      onChange={(e) => setConfig({...config, largura_cupom: e.target.value})}
                      placeholder="280"
                    />
                  </div>

                  <div>
                    <Label>Tamanho da Fonte (px)</Label>
                    <Input
                      type="number"
                      value={config.tamanho_fonte}
                      onChange={(e) => setConfig({...config, tamanho_fonte: e.target.value})}
                      placeholder="12"
                    />
                  </div>

                  <div>
                    <Label>Família da Fonte</Label>
                    <Select 
                      value={config.fonte_familia}
                      onValueChange={(v) => setConfig({...config, fonte_familia: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monospace">Monospace</SelectItem>
                        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                        <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                        <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estilo do Separador</Label>
                    <Select 
                      value={config.separador_estilo}
                      onValueChange={(v) => setConfig({...config, separador_estilo: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashed">Tracejado</SelectItem>
                        <SelectItem value="solid">Sólido</SelectItem>
                        <SelectItem value="dotted">Pontilhado</SelectItem>
                        <SelectItem value="double">Duplo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Total em Negrito</Label>
                    <Switch
                      checked={config.negrito_total}
                      onCheckedChange={(checked) => setConfig({...config, negrito_total: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rodape">
              <Card>
                <CardHeader>
                  <CardTitle>Rodapé do Cupom</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Mostrar Rodapé</Label>
                    <Switch
                      checked={config.mostrar_rodape}
                      onCheckedChange={(checked) => setConfig({...config, mostrar_rodape: checked})}
                    />
                  </div>

                  {config.mostrar_rodape && (
                    <div>
                      <Label>Mensagem do Rodapé</Label>
                      <Textarea
                        value={config.rodape_cupom}
                        onChange={(e) => setConfig({...config, rodape_cupom: e.target.value})}
                        placeholder="Mensagem de agradecimento ou informações adicionais"
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview do Cupom
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <CupomPreview config={config} produto={produtoExemplo} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Componente de Preview do Cupom
function CupomPreview({ config, produto }) {
  return (
    <div
      className="bg-white text-black border-2 border-slate-200"
      style={{
        width: `${config.largura_cupom}px`,
        fontFamily: config.fonte_familia,
        fontSize: `${config.tamanho_fonte}px`,
        lineHeight: "1.4",
        padding: "12px"
      }}
    >
      {/* Logo */}
      {config.mostrar_logo && config.logo_url && (
        <div className="text-center mb-3">
          <img src={config.logo_url} alt="Logo" className="mx-auto h-12 object-contain" />
        </div>
      )}

      {/* Cabeçalho */}
      <div className="text-center mb-2">
        <div className="font-bold">{config.nome_loja}</div>
        {config.cnpj && <div className="text-xs">CNPJ: {config.cnpj}</div>}
        {config.endereco && <div className="text-xs">{config.endereco}</div>}
        {config.telefone && <div className="text-xs">Tel: {config.telefone}</div>}
      </div>

      {/* Mensagem Topo */}
      {config.mensagem_topo && (
        <>
          <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />
          <div className="text-center text-xs font-bold mb-2">{config.mensagem_topo}</div>
        </>
      )}

      <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />

      {/* Informações da Venda */}
      <div className="text-xs space-y-1 mb-2">
        {config.mostrar_data && (
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{new Date().toLocaleString("pt-BR")}</span>
          </div>
        )}
        {config.mostrar_codigo_venda && (
          <div className="flex justify-between">
            <span>Cupom:</span>
            <span>{produto.codigo}</span>
          </div>
        )}
        {config.mostrar_vendedor && (
          <div className="flex justify-between">
            <span>Vendedor:</span>
            <span>João Silva</span>
          </div>
        )}
        {config.mostrar_cliente && (
          <div className="flex justify-between">
            <span>Cliente:</span>
            <span>Maria Santos</span>
          </div>
        )}
      </div>

      <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />

      {/* Itens */}
      <div className="text-xs mb-2">
        <div className="flex justify-between">
          <span>{produto.quantidade}x {produto.nome}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Valor Unit.:</span>
          <span>R$ {produto.preco.toFixed(2)}</span>
        </div>
      </div>

      {/* Mensagem Meio */}
      {config.mensagem_meio && (
        <>
          <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />
          <div className="text-center text-xs mb-2">{config.mensagem_meio}</div>
        </>
      )}

      <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />

      {/* Total */}
      <div 
        className="flex justify-between text-sm mb-2"
        style={{ fontWeight: config.negrito_total ? 'bold' : 'normal' }}
      >
        <span>TOTAL</span>
        <span>R$ {produto.preco.toFixed(2)}</span>
      </div>

      {/* Código de Barras */}
      {config.codigo_barras_cupom && (
        <>
          <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />
          <div className="text-center text-xs">
            <div className="tracking-widest">|||| |||| |||| ||||</div>
            <div className="mt-1">{produto.codigo_barras}</div>
          </div>
        </>
      )}

      {/* Rodapé */}
      {config.mostrar_rodape && config.rodape_cupom && (
        <>
          <hr style={{ borderStyle: config.separador_estilo }} className="my-2" />
          <div className="text-center text-xs whitespace-pre-line">
            {config.rodape_cupom}
          </div>
        </>
      )}
    </div>
  );
}