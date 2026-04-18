import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Save, RefreshCw, Type, Image, AlignLeft, Palette, Ruler, FileText } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function EditorTemplateOS({ template, onSave }) {
  const confirm = useConfirm();
  const [config, setConfig] = useState(template || {
    // Cabeçalho
    mostrar_logo: true,
    logo_tamanho: "medio",
    mostrar_nome_empresa: true,
    mostrar_endereco: true,
    mostrar_telefone: true,
    mostrar_email: false,
    cor_cabecalho: "#1e40af",

    // Título
    titulo_texto: "ORDEM DE SERVIÇO",
    titulo_tamanho: "grande",
    titulo_cor: "#000000",
    titulo_negrito: true,

    // Dados da OS
    mostrar_codigo_os: true,
    mostrar_data_entrada: true,
    mostrar_data_prevista: true,
    mostrar_garantia: true,
    formato_data: "dd/MM/yyyy",

    // Dados do Cliente
    mostrar_cliente_nome: true,
    mostrar_cliente_cpf: true,
    mostrar_cliente_telefone: true,
    mostrar_cliente_email: false,
    mostrar_cliente_endereco: false,

    // Dados do Aparelho
    mostrar_marca: true,
    mostrar_modelo: true,
    mostrar_imei: true,
    mostrar_serial: false,
    mostrar_cor: true,
    mostrar_capacidade: true,
    mostrar_senha: true,
    mostrar_acessorios: true,

    // Defeito
    mostrar_defeito_reclamado: true,
    mostrar_observacoes_cliente: true,
    defeito_tamanho_fonte: "normal",

    // Checklist Entrada
    mostrar_checklist_entrada: true,
    checklist_colunas: 2,
    checklist_mostrar_apenas_marcados: false,

    // Laudo Técnico
    mostrar_diagnostico: true,
    mostrar_laudo_tecnico: true,
    laudo_tamanho_fonte: "normal",

    // Orçamento
    mostrar_orcamento: true,
    mostrar_servicos: true,
    mostrar_pecas: true,
    mostrar_prazo: true,
    orcamento_mostrar_detalhes: true,

    // Checklist Finalização
    mostrar_checklist_finalizacao: true,
    checklist_final_colunas: 2,

    // Termos e Condições
    mostrar_termos: true,
    termos_texto: "TERMOS E CONDIÇÕES:\n\n1. A empresa não se responsabiliza por dados e configurações do aparelho.\n2. O prazo de garantia é de 90 dias a partir da data de entrega.\n3. O cliente tem 30 dias para retirar o aparelho após o término do serviço.\n4. Após 30 dias, será cobrada taxa de armazenamento.\n5. A empresa não se responsabiliza por aparelhos deixados por mais de 90 dias.",
    termos_tamanho_fonte: "pequeno",

    // Assinaturas
    mostrar_assinatura_cliente: true,
    mostrar_assinatura_tecnico: false,
    assinatura_dupla: false,

    // Rodapé
    mostrar_rodape: true,
    rodape_texto: "Obrigado pela confiança!",
    rodape_cor: "#64748b",

    // Layout Geral
    margem_pagina: "normal",
    espacamento_secoes: "medio",
    fonte_principal: "Arial",
    tamanho_fonte_base: "12px",
    cor_borda: "#e2e8f0",
    espessura_borda: "1px",

    // Cores e Estilo
    cor_titulos_secao: "#1e293b",
    cor_texto_principal: "#334155",
    cor_destaque: "#2563eb",
    estilo_bordas: "solida",
    arredondar_bordas: true,

    // Impressão
    modo_impressao: "portrait",
    tamanho_papel: "A4",
    mostrar_numero_paginas: true
  });

  const [previewVisible, setPreviewVisible] = useState(false);

  const handleSalvar = () => {
    onSave(config);
    toast.success("Template salvo!");
  };

  const resetarPadrao = async () => {
    const resposta = await confirm({
      title: "Resetar Configurações",
      description: "Resetar para configurações padrão?",
      confirmText: "Sim, Resetar",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      setConfig({
        mostrar_logo: true,
        logo_tamanho: "medio",
        titulo_texto: "ORDEM DE SERVIÇO",
        // ... todas as configs padrão
      });
      toast.success("Template resetado!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Editor Avançado de Template de OS
          </h3>
          <p className="text-sm text-slate-500">Configure cada detalhe da impressão</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewVisible(!previewVisible)}>
            <Eye className="w-4 h-4 mr-2" />
            {previewVisible ? "Ocultar" : "Visualizar"} Preview
          </Button>
          <Button variant="outline" onClick={resetarPadrao}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
          <Button onClick={handleSalvar} className="bg-blue-600">
            <Save className="w-4 h-4 mr-2" />
            Salvar Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cabecalho" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="checklist">Checklists</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          <TabsTrigger value="termos">Termos</TabsTrigger>
          <TabsTrigger value="estilo">Estilo</TabsTrigger>
        </TabsList>

        {/* Cabeçalho */}
        <TabsContent value="cabecalho">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo e Identidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Logo</Label>
                  <Switch checked={config.mostrar_logo} onCheckedChange={(v) => setConfig({ ...config, mostrar_logo: v })} />
                </div>

                {config.mostrar_logo && (
                  <div>
                    <Label>Tamanho da Logo</Label>
                    <Select value={config.logo_tamanho} onValueChange={(v) => setConfig({ ...config, logo_tamanho: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pequeno">Pequeno (30mm)</SelectItem>
                        <SelectItem value="medio">Médio (50mm)</SelectItem>
                        <SelectItem value="grande">Grande (70mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Nome da Empresa</Label>
                  <Switch checked={config.mostrar_nome_empresa} onCheckedChange={(v) => setConfig({ ...config, mostrar_nome_empresa: v })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Endereço</Label>
                  <Switch checked={config.mostrar_endereco} onCheckedChange={(v) => setConfig({ ...config, mostrar_endereco: v })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Telefone</Label>
                  <Switch checked={config.mostrar_telefone} onCheckedChange={(v) => setConfig({ ...config, mostrar_telefone: v })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Email</Label>
                  <Switch checked={config.mostrar_email} onCheckedChange={(v) => setConfig({ ...config, mostrar_email: v })} />
                </div>

                <div>
                  <Label>Cor do Cabeçalho</Label>
                  <Input type="color" value={config.cor_cabecalho} onChange={(e) => setConfig({ ...config, cor_cabecalho: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Título da OS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Texto do Título</Label>
                  <Input value={config.titulo_texto} onChange={(e) => setConfig({ ...config, titulo_texto: e.target.value })} />
                </div>

                <div>
                  <Label>Tamanho do Título</Label>
                  <Select value={config.titulo_tamanho} onValueChange={(v) => setConfig({ ...config, titulo_tamanho: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno (14px)</SelectItem>
                      <SelectItem value="medio">Médio (18px)</SelectItem>
                      <SelectItem value="grande">Grande (24px)</SelectItem>
                      <SelectItem value="extragrande">Extra Grande (32px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cor do Título</Label>
                  <Input type="color" value={config.titulo_cor} onChange={(e) => setConfig({ ...config, titulo_cor: e.target.value })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Negrito</Label>
                  <Switch checked={config.titulo_negrito} onCheckedChange={(v) => setConfig({ ...config, titulo_negrito: v })} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dados */}
        <TabsContent value="dados">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dados da OS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dados da OS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Código OS</Label>
                  <Switch checked={config.mostrar_codigo_os} onCheckedChange={(v) => setConfig({ ...config, mostrar_codigo_os: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Data Entrada</Label>
                  <Switch checked={config.mostrar_data_entrada} onCheckedChange={(v) => setConfig({ ...config, mostrar_data_entrada: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Data Prevista</Label>
                  <Switch checked={config.mostrar_data_prevista} onCheckedChange={(v) => setConfig({ ...config, mostrar_data_prevista: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Garantia</Label>
                  <Switch checked={config.mostrar_garantia} onCheckedChange={(v) => setConfig({ ...config, mostrar_garantia: v })} />
                </div>
                <div>
                  <Label className="text-xs">Formato Data</Label>
                  <Select value={config.formato_data} onValueChange={(v) => setConfig({ ...config, formato_data: v })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                      <SelectItem value="dd/MM/yyyy HH:mm">DD/MM/AAAA HH:MM</SelectItem>
                      <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Nome</Label>
                  <Switch checked={config.mostrar_cliente_nome} onCheckedChange={(v) => setConfig({ ...config, mostrar_cliente_nome: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">CPF/CNPJ</Label>
                  <Switch checked={config.mostrar_cliente_cpf} onCheckedChange={(v) => setConfig({ ...config, mostrar_cliente_cpf: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Telefone</Label>
                  <Switch checked={config.mostrar_cliente_telefone} onCheckedChange={(v) => setConfig({ ...config, mostrar_cliente_telefone: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Email</Label>
                  <Switch checked={config.mostrar_cliente_email} onCheckedChange={(v) => setConfig({ ...config, mostrar_cliente_email: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Endereço Completo</Label>
                  <Switch checked={config.mostrar_cliente_endereco} onCheckedChange={(v) => setConfig({ ...config, mostrar_cliente_endereco: v })} />
                </div>
              </CardContent>
            </Card>

            {/* Dados do Aparelho */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dados do Aparelho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Marca</Label>
                  <Switch checked={config.mostrar_marca} onCheckedChange={(v) => setConfig({ ...config, mostrar_marca: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Modelo</Label>
                  <Switch checked={config.mostrar_modelo} onCheckedChange={(v) => setConfig({ ...config, mostrar_modelo: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">IMEI</Label>
                  <Switch checked={config.mostrar_imei} onCheckedChange={(v) => setConfig({ ...config, mostrar_imei: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Serial</Label>
                  <Switch checked={config.mostrar_serial} onCheckedChange={(v) => setConfig({ ...config, mostrar_serial: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Cor</Label>
                  <Switch checked={config.mostrar_cor} onCheckedChange={(v) => setConfig({ ...config, mostrar_cor: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Capacidade</Label>
                  <Switch checked={config.mostrar_capacidade} onCheckedChange={(v) => setConfig({ ...config, mostrar_capacidade: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Senha</Label>
                  <Switch checked={config.mostrar_senha} onCheckedChange={(v) => setConfig({ ...config, mostrar_senha: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <Label className="text-xs">Acessórios</Label>
                  <Switch checked={config.mostrar_acessorios} onCheckedChange={(v) => setConfig({ ...config, mostrar_acessorios: v })} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Defeito e Laudo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Defeito Reclamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Defeito</Label>
                  <Switch checked={config.mostrar_defeito_reclamado} onCheckedChange={(v) => setConfig({ ...config, mostrar_defeito_reclamado: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Observações do Cliente</Label>
                  <Switch checked={config.mostrar_observacoes_cliente} onCheckedChange={(v) => setConfig({ ...config, mostrar_observacoes_cliente: v })} />
                </div>
                <div>
                  <Label className="text-xs">Tamanho da Fonte</Label>
                  <Select value={config.defeito_tamanho_fonte} onValueChange={(v) => setConfig({ ...config, defeito_tamanho_fonte: v })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Laudo Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Diagnóstico</Label>
                  <Switch checked={config.mostrar_diagnostico} onCheckedChange={(v) => setConfig({ ...config, mostrar_diagnostico: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Laudo Completo</Label>
                  <Switch checked={config.mostrar_laudo_tecnico} onCheckedChange={(v) => setConfig({ ...config, mostrar_laudo_tecnico: v })} />
                </div>
                <div>
                  <Label className="text-xs">Tamanho da Fonte</Label>
                  <Select value={config.laudo_tamanho_fonte} onValueChange={(v) => setConfig({ ...config, laudo_tamanho_fonte: v })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Checklists */}
        <TabsContent value="checklist">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Checklist de Entrada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Checklist</Label>
                  <Switch checked={config.mostrar_checklist_entrada} onCheckedChange={(v) => setConfig({ ...config, mostrar_checklist_entrada: v })} />
                </div>

                {config.mostrar_checklist_entrada && (
                  <>
                    <div>
                      <Label className="text-xs">Número de Colunas</Label>
                      <Select value={String(config.checklist_colunas)} onValueChange={(v) => setConfig({ ...config, checklist_colunas: parseInt(v) })}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Coluna</SelectItem>
                          <SelectItem value="2">2 Colunas</SelectItem>
                          <SelectItem value="3">3 Colunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <Label className="text-xs">Mostrar Apenas Marcados</Label>
                      <Switch checked={config.checklist_mostrar_apenas_marcados} onCheckedChange={(v) => setConfig({ ...config, checklist_mostrar_apenas_marcados: v })} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Checklist de Finalização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Checklist</Label>
                  <Switch checked={config.mostrar_checklist_finalizacao} onCheckedChange={(v) => setConfig({ ...config, mostrar_checklist_finalizacao: v })} />
                </div>

                {config.mostrar_checklist_finalizacao && (
                  <div>
                    <Label className="text-xs">Número de Colunas</Label>
                    <Select value={String(config.checklist_final_colunas)} onValueChange={(v) => setConfig({ ...config, checklist_final_colunas: parseInt(v) })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Coluna</SelectItem>
                        <SelectItem value="2">2 Colunas</SelectItem>
                        <SelectItem value="3">3 Colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orçamento */}
        <TabsContent value="orcamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurações do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label className="text-xs">Mostrar Orçamento</Label>
                  <Switch checked={config.mostrar_orcamento} onCheckedChange={(v) => setConfig({ ...config, mostrar_orcamento: v })} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label className="text-xs">Serviços</Label>
                  <Switch checked={config.mostrar_servicos} onCheckedChange={(v) => setConfig({ ...config, mostrar_servicos: v })} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label className="text-xs">Peças</Label>
                  <Switch checked={config.mostrar_pecas} onCheckedChange={(v) => setConfig({ ...config, mostrar_pecas: v })} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label className="text-xs">Prazo</Label>
                  <Switch checked={config.mostrar_prazo} onCheckedChange={(v) => setConfig({ ...config, mostrar_prazo: v })} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                <div>
                  <Label className="text-sm">Mostrar Detalhes Completos</Label>
                  <p className="text-xs text-slate-500">Inclui quantidade, valor unitário e subtotal de cada item</p>
                </div>
                <Switch checked={config.orcamento_mostrar_detalhes} onCheckedChange={(v) => setConfig({ ...config, orcamento_mostrar_detalhes: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Termos */}
        <TabsContent value="termos">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Termos e Condições + Assinaturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <Label>Mostrar Termos e Condições</Label>
                <Switch checked={config.mostrar_termos} onCheckedChange={(v) => setConfig({ ...config, mostrar_termos: v })} />
              </div>

              {config.mostrar_termos && (
                <>
                  <div>
                    <Label>Texto dos Termos</Label>
                    <Textarea
                      value={config.termos_texto}
                      onChange={(e) => setConfig({ ...config, termos_texto: e.target.value })}
                      rows={8}
                      placeholder="Digite os termos e condições..."
                    />
                  </div>

                  <div>
                    <Label>Tamanho da Fonte dos Termos</Label>
                    <Select value={config.termos_tamanho_fonte} onValueChange={(v) => setConfig({ ...config, termos_tamanho_fonte: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pequeno">Pequeno (8px)</SelectItem>
                        <SelectItem value="medio">Médio (10px)</SelectItem>
                        <SelectItem value="grande">Grande (12px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm">Assinaturas</h4>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Assinatura do Cliente</Label>
                  <Switch checked={config.mostrar_assinatura_cliente} onCheckedChange={(v) => setConfig({ ...config, mostrar_assinatura_cliente: v })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Assinatura do Técnico</Label>
                  <Switch checked={config.mostrar_assinatura_tecnico} onCheckedChange={(v) => setConfig({ ...config, mostrar_assinatura_tecnico: v })} />
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <Label>Assinatura Dupla (Entrada e Saída)</Label>
                    <p className="text-xs text-slate-500">Mostra duas seções de assinatura</p>
                  </div>
                  <Switch checked={config.assinatura_dupla} onCheckedChange={(v) => setConfig({ ...config, assinatura_dupla: v })} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm">Rodapé</h4>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Mostrar Rodapé</Label>
                  <Switch checked={config.mostrar_rodape} onCheckedChange={(v) => setConfig({ ...config, mostrar_rodape: v })} />
                </div>

                {config.mostrar_rodape && (
                  <>
                    <div>
                      <Label>Texto do Rodapé</Label>
                      <Input
                        value={config.rodape_texto}
                        onChange={(e) => setConfig({ ...config, rodape_texto: e.target.value })}
                        placeholder="Obrigado pela confiança!"
                      />
                    </div>
                    <div>
                      <Label>Cor do Rodapé</Label>
                      <Input type="color" value={config.rodape_cor} onChange={(e) => setConfig({ ...config, rodape_cor: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estilo */}
        <TabsContent value="estilo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Cores e Tipografia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Fonte Principal</Label>
                  <Select value={config.fonte_principal} onValueChange={(v) => setConfig({ ...config, fonte_principal: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier">Courier</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Tamanho Base da Fonte</Label>
                  <Select value={config.tamanho_fonte_base} onValueChange={(v) => setConfig({ ...config, tamanho_fonte_base: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10px">10px (Pequeno)</SelectItem>
                      <SelectItem value="12px">12px (Normal)</SelectItem>
                      <SelectItem value="14px">14px (Grande)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Cor dos Títulos de Seção</Label>
                  <Input type="color" value={config.cor_titulos_secao} onChange={(e) => setConfig({ ...config, cor_titulos_secao: e.target.value })} />
                </div>

                <div>
                  <Label className="text-xs">Cor do Texto Principal</Label>
                  <Input type="color" value={config.cor_texto_principal} onChange={(e) => setConfig({ ...config, cor_texto_principal: e.target.value })} />
                </div>

                <div>
                  <Label className="text-xs">Cor de Destaque</Label>
                  <Input type="color" value={config.cor_destaque} onChange={(e) => setConfig({ ...config, cor_destaque: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Layout e Espaçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Margem da Página</Label>
                  <Select value={config.margem_pagina} onValueChange={(v) => setConfig({ ...config, margem_pagina: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequena">Pequena (10mm)</SelectItem>
                      <SelectItem value="normal">Normal (15mm)</SelectItem>
                      <SelectItem value="grande">Grande (20mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Espaçamento entre Seções</Label>
                  <Select value={config.espacamento_secoes} onValueChange={(v) => setConfig({ ...config, espacamento_secoes: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeno (5mm)</SelectItem>
                      <SelectItem value="medio">Médio (10mm)</SelectItem>
                      <SelectItem value="grande">Grande (15mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Cor da Borda</Label>
                  <Input type="color" value={config.cor_borda} onChange={(e) => setConfig({ ...config, cor_borda: e.target.value })} />
                </div>

                <div>
                  <Label className="text-xs">Espessura da Borda</Label>
                  <Select value={config.espessura_borda} onValueChange={(v) => setConfig({ ...config, espessura_borda: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1px">Fina (1px)</SelectItem>
                      <SelectItem value="2px">Média (2px)</SelectItem>
                      <SelectItem value="3px">Grossa (3px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Estilo das Bordas</Label>
                  <Select value={config.estilo_bordas} onValueChange={(v) => setConfig({ ...config, estilo_bordas: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solida">Sólida</SelectItem>
                      <SelectItem value="tracejada">Tracejada</SelectItem>
                      <SelectItem value="pontilhada">Pontilhada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Arredondar Bordas</Label>
                  <Switch checked={config.arredondar_bordas} onCheckedChange={(v) => setConfig({ ...config, arredondar_bordas: v })} />
                </div>

                <div>
                  <Label className="text-xs">Tamanho do Papel</Label>
                  <Select value={config.tamanho_papel} onValueChange={(v) => setConfig({ ...config, tamanho_papel: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 × 297mm)</SelectItem>
                      <SelectItem value="Letter">Letter (216 × 279mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <Label className="text-xs">Número de Páginas</Label>
                  <Switch checked={config.mostrar_numero_paginas} onCheckedChange={(v) => setConfig({ ...config, mostrar_numero_paginas: v })} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {previewVisible && (
        <Card className="border-blue-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Preview do Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white border-2 p-8 rounded-lg" style={{ fontFamily: config.fonte_principal, fontSize: config.tamanho_fonte_base }}>
              {/* Cabeçalho Preview */}
              <div className="border-b-2 pb-4 mb-4" style={{ borderColor: config.cor_cabecalho }}>
                {config.mostrar_logo && (
                  <div className="text-center mb-2">
                    <div className="w-20 h-20 bg-slate-200 rounded mx-auto flex items-center justify-center">
                      <Image className="w-10 h-10 text-slate-400" />
                    </div>
                  </div>
                )}
                {config.mostrar_nome_empresa && <p className="text-center font-bold text-lg">NOME DA EMPRESA</p>}
                {config.mostrar_endereco && <p className="text-center text-sm">Endereço da Empresa</p>}
                {config.mostrar_telefone && <p className="text-center text-sm">Tel: (XX) XXXXX-XXXX</p>}
              </div>

              {/* Título */}
              <h1
                className="text-center mb-4"
                style={{
                  color: config.titulo_cor,
                  fontSize: config.titulo_tamanho === 'pequeno' ? '14px' : config.titulo_tamanho === 'medio' ? '18px' : config.titulo_tamanho === 'grande' ? '24px' : '32px',
                  fontWeight: config.titulo_negrito ? 'bold' : 'normal'
                }}
              >
                {config.titulo_texto}
              </h1>

              {/* Preview de Seções */}
              <div className="space-y-3 text-sm" style={{ color: config.cor_texto_principal }}>
                {config.mostrar_codigo_os && <p><strong>OS Nº:</strong> 000123</p>}
                {config.mostrar_cliente_nome && <p><strong>Cliente:</strong> João da Silva</p>}
                {config.mostrar_marca && config.mostrar_modelo && <p><strong>Aparelho:</strong> Apple iPhone 14</p>}
                {config.mostrar_defeito_reclamado && (
                  <div className="border p-3 rounded" style={{ borderColor: config.cor_borda }}>
                    <strong>Defeito Reclamado:</strong>
                    <p className="mt-1">Tela não liga após queda</p>
                  </div>
                )}
                {config.mostrar_termos && config.termos_texto && (
                  <div className="border p-3 rounded mt-4 text-xs" style={{ borderColor: config.cor_borda }}>
                    <strong>Termos e Condições:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{config.termos_texto.substring(0, 200)}...</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}