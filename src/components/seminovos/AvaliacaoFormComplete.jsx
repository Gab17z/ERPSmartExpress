import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Smartphone, Battery, Monitor, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const MARCAS_DISPONIVEIS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei",
  "Asus", "Realme", "OnePlus", "Nokia", "Sony", "Oppo", "Vivo"
];

const CAPACIDADES_DISPONIVEIS = [
  "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"
];

export default function AvaliacaoFormComplete({ onSuccess }) {
  const queryClient = useQueryClient();
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [activeTab, setActiveTab] = useState("dados-aparelho");
  const [user, setUser] = useState(null);
  const [configAcessorios, setConfigAcessorios] = useState([]);

  const [formData, setFormData] = useState({
    cliente_id: "",
    aparelho: {
      marca: "",
      modelo: "",
      capacidade_gb: 64,
      cor: "",
      imei: ""
    },
    condicao_bateria: {
      porcentagem_saude: 100,
      ciclos_carga: 0,
      estado: "excelente"
    },
    condicao_tela: "perfeita",
    condicao_carcaca: "perfeita",
    testes_funcionais: {
      wifi: true,
      bluetooth: true,
      gps: true,
      camera_frontal: true,
      camera_traseira: true,
      flash: true,
      alto_falante: true,
      microfone: true,
      botoes: true,
      touch: true,
      sensor_digital: true,
      face_id: true,
      conector_carga: true
    },
    acessorios_inclusos: [],
    acessorios_originais: {
      caixa_original: false,
      fonte_original: false,
      cabo_original: false,
      manual_original: false
    },
    fotos: [],
    observacoes: ""
  });

  const [novoClienteData, setNovoClienteData] = useState({
    nome_completo: "",
    telefone1: "",
    telefone2: "",
    email: "",
    cpf_cnpj: "",
    tipo_pessoa: "fisica",
    data_nascimento: "",
    endereco: {
      cep: "",
      logradouro: "",
      tipo_logradouro: "rua",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: ""
    },
    fonte: "avaliacao_seminovo",
  });

  React.useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        if (config.seminovos?.acessorios_customizados) {
          setConfigAcessorios(config.seminovos.acessorios_customizados);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }

    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const criarClienteMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create({
      ...data,
      ativo: true
    }),
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
      setDialogNovoCliente(false);
      toast.success("Cliente cadastrado!");
    },
  });

  const criarAvaliacaoMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      
      let proximoNumero = 1;
      try {
        const configs = await base44.entities.Configuracao.list();
        const configAV = configs.find(c => c.chave === 'ultimo_numero_avaliacao');
        
        if (configAV) {
          proximoNumero = parseInt(configAV.valor) + 1;
          await base44.entities.Configuracao.update(configAV.id, { valor: proximoNumero.toString() });
        } else {
          await base44.entities.Configuracao.create({ 
            chave: 'ultimo_numero_avaliacao', 
            valor: '1', 
            tipo: 'numero',
            descricao: 'Último número de avaliação gerado'
          });
        }
      } catch (error) {
        console.error("Erro ao gerar número avaliação:", error);
      }

      const codigo = `AVS-${proximoNumero.toString().padStart(5, '0')}`;
      const score = calcularScore();
      const valorMercado = estimarValorMercado(data.aparelho);
      const valorOferecido = valorMercado * (score / 100) * 0.7;
      const justificativa = gerarJustificativa(data, score);

      return base44.entities.AvaliacaoSeminovo.create({
        ...data,
        codigo_avaliacao: codigo,
        cliente_nome: cliente?.nome_completo,
        score_final: score,
        valor_mercado: valorMercado,
        valor_oferecido: Math.round(valorOferecido * 100) / 100,
        justificativa: justificativa,
        avaliador: user?.full_name,
        avaliador_id: user?.id,
        data_avaliacao: new Date().toISOString(),
        status: "concluida"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      toast.success("Avaliação concluída!");
      if (onSuccess) onSuccess();
    },
  });

  const calcularScore = () => {
    const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const pesos = config.seminovos?.pesos_avaliacao || {
      peso_bateria: 25,
      peso_tela: 30,
      peso_funcionalidade: 30,
      peso_estetica: 15,
      bonus_acessorios: 5
    };

    let score = 0;

    const saudeBateria = formData.condicao_bateria.porcentagem_saude;
    score += (saudeBateria / 100) * pesos.peso_bateria;

    const scoresTela = {
      perfeita: 100,
      arranhoes_leves: 85,
      arranhoes_visiveis: 70,
      trinca_pequena: 50,
      trinca_grande: 30,
      quebrada: 0
    };
    score += (scoresTela[formData.condicao_tela] / 100) * pesos.peso_tela;

    const scoresCarcaca = {
      perfeita: 100,
      pequenos_riscos: 85,
      riscos_visiveis: 70,
      amassados: 50,
      muito_danificada: 20
    };
    score += (scoresCarcaca[formData.condicao_carcaca] / 100) * pesos.peso_estetica;

    const testesTotal = Object.keys(formData.testes_funcionais).length;
    const testesPassaram = Object.values(formData.testes_funcionais).filter(v => v).length;
    score += (testesPassaram / testesTotal) * pesos.peso_funcionalidade;

    const acessoriosOriginaisContados = Object.values(formData.acessorios_originais || {}).filter(Boolean).length;
    const totalAcessoriosConsiderados = 4 + configAcessorios.length;
    if (acessoriosOriginaisContados > 0 && totalAcessoriosConsiderados > 0) {
      const bonusPorAcessorio = (pesos.bonus_acessorios / totalAcessoriosConsiderados);
      score += acessoriosOriginaisContados * bonusPorAcessorio;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const estimarValorMercado = (aparelho) => {
    const valoresBase = {
      Apple: 3000,
      Samsung: 2000,
      Motorola: 1200,
      Xiaomi: 1000
    };

    const valorBase = valoresBase[aparelho.marca] || 800;
    const ajusteCapacidade = (aparelho.capacidade_gb / 128) * 0.2;

    return Math.round(valorBase * (1 + ajusteCapacidade));
  };

  const gerarJustificativa = (data, score) => {
    let justificativa = `Avaliação baseada em análise técnica detalhada.\n\n`;
    justificativa += `**Pontuação Final: ${score}/100**\n\n`;
    justificativa += `**Bateria:** ${data.condicao_bateria.porcentagem_saude}% de saúde - ${data.condicao_bateria.estado}\n`;
    justificativa += `**Tela:** ${data.condicao_tela.replace(/_/g, ' ')}\n`;
    justificativa += `**Carcaça:** ${data.condicao_carcaca.replace(/_/g, ' ')}\n\n`;

    const testesFalharam = Object.entries(data.testes_funcionais)
      .filter(([_, passou]) => !passou)
      .map(([teste, _]) => teste.replace(/_/g, ' '));

    if (testesFalharam.length > 0) {
      justificativa += `**Problemas detectados:** ${testesFalharam.join(', ')}\n`;
    } else {
      justificativa += `**Todas as funcionalidades testadas estão operacionais.**\n`;
    }

    return justificativa;
  };

  const tabOrder = ["dados-aparelho", "condicoes-fisicas", "testes-funcionais", "acessorios-originais", "finalizacao"];

  const finalizarAvaliacao = () => {
    if (!formData.aparelho?.marca || !formData.aparelho?.modelo || !formData.aparelho?.capacidade_gb || !formData.aparelho?.cor) {
      toast.error("Preencha os campos obrigatórios do aparelho!");
      return;
    }
    criarAvaliacaoMutation.mutate(formData);
  };

  const proximaEtapa = () => {
    if (activeTab === "dados-aparelho") {
      if (!formData.aparelho.marca) {
        toast.error("Selecione a marca do aparelho!");
        return;
      }
      if (!formData.aparelho.modelo) {
        toast.error("Informe o modelo do aparelho!");
        return;
      }
      if (!formData.aparelho.capacidade_gb) {
        toast.error("Selecione a capacidade!");
        return;
      }
      if (!formData.aparelho.cor) {
        toast.error("Informe a cor do aparelho!");
        return;
      }
    }

    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      finalizarAvaliacao();
    }
  };

  const etapaAnterior = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const handleCriarCliente = (e) => {
    e.preventDefault();
    // Limpar dados - converter strings vazias em null para campos de data
    const dadosLimpos = {
      ...novoClienteData,
      data_nascimento: novoClienteData.data_nascimento || null,
      cpf_cnpj: novoClienteData.cpf_cnpj || null,
      telefone2: novoClienteData.telefone2 || null,
      email: novoClienteData.email || null,
    };
    criarClienteMutation.mutate(dadosLimpos);
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dados-aparelho">Dados</TabsTrigger>
          <TabsTrigger value="condicoes-fisicas">Físicas</TabsTrigger>
          <TabsTrigger value="testes-funcionais">Testes</TabsTrigger>
          <TabsTrigger value="acessorios-originais">Acessórios</TabsTrigger>
          <TabsTrigger value="finalizacao">Final</TabsTrigger>
        </TabsList>

        <TabsContent value="dados-aparelho">
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Cliente <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogNovoCliente(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Cliente
                </Button>
              </div>
              <div className="flex gap-2">
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_completo} - {cliente.telefone1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.cliente_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, cliente_id: "" }))}
                    title="Limpar cliente"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marca *</Label>
                <Select
                  value={formData.aparelho.marca}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    aparelho: { ...prev.aparelho, marca: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARCAS_DISPONIVEIS.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input
                  value={formData.aparelho.modelo}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aparelho: { ...prev.aparelho, modelo: e.target.value }
                  }))}
                  placeholder="Ex: iPhone 13"
                />
              </div>
              <div>
                <Label>Capacidade *</Label>
                <Select
                  value={formData.aparelho.capacidade_gb.toString()}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    aparelho: { ...prev.aparelho, capacidade_gb: parseInt(value) }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACIDADES_DISPONIVEIS.map((cap) => (
                      <SelectItem key={cap} value={parseInt(cap.replace('GB', '').replace('TB', '000')).toString()}>
                        {cap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor *</Label>
                <Input
                  value={formData.aparelho.cor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aparelho: { ...prev.aparelho, cor: e.target.value }
                  }))}
                  placeholder="Ex: Preto, Branco..."
                />
              </div>
              <div className="col-span-2">
                <Label>IMEI</Label>
                <Input
                  value={formData.aparelho.imei}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aparelho: { ...prev.aparelho, imei: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="condicoes-fisicas">
          <div className="space-y-6 py-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Battery className="w-4 h-4" />
                Condição da Bateria
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Saúde (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.condicao_bateria.porcentagem_saude}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      condicao_bateria: {
                        ...prev.condicao_bateria,
                        porcentagem_saude: parseInt(e.target.value) || 0
                      }
                    }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">Estado</Label>
                  <Select
                    value={formData.condicao_bateria.estado}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      condicao_bateria: { ...prev.condicao_bateria, estado: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="boa">Boa</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Monitor className="w-4 h-4" />
                Condição da Tela
              </Label>
              <Select
                value={formData.condicao_tela}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condicao_tela: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perfeita">Perfeita</SelectItem>
                  <SelectItem value="arranhoes_leves">Arranhões Leves</SelectItem>
                  <SelectItem value="arranhoes_visiveis">Arranhões Visíveis</SelectItem>
                  <SelectItem value="trinca_pequena">Trinca Pequena</SelectItem>
                  <SelectItem value="trinca_grande">Trinca Grande</SelectItem>
                  <SelectItem value="quebrada">Quebrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4" />
                Condição da Carcaça
              </Label>
              <Select
                value={formData.condicao_carcaca}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condicao_carcaca: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perfeita">Perfeita</SelectItem>
                  <SelectItem value="pequenos_riscos">Pequenos Riscos</SelectItem>
                  <SelectItem value="riscos_visiveis">Riscos Visíveis</SelectItem>
                  <SelectItem value="amassados">Amassados</SelectItem>
                  <SelectItem value="muito_danificada">Muito Danificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="testes-funcionais">
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">Marque os itens que estão funcionando corretamente</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(formData.testes_funcionais).map((teste) => (
                <div key={teste} className="flex items-center space-x-2">
                  <Checkbox
                    id={teste}
                    checked={formData.testes_funcionais[teste]}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      testes_funcionais: {
                        ...prev.testes_funcionais,
                        [teste]: checked
                      }
                    }))}
                  />
                  <label htmlFor={teste} className="text-sm capitalize">
                    {teste.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="acessorios-originais">
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Marque os acessórios originais que acompanham o aparelho
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="caixa_original"
                  checked={formData.acessorios_originais?.caixa_original || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    acessorios_originais: {
                      ...formData.acessorios_originais,
                      caixa_original: e.target.checked
                    }
                  })}
                  className="w-5 h-5"
                />
                <Label htmlFor="caixa_original" className="cursor-pointer">
                  Caixa Original
                </Label>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="fonte_original"
                  checked={formData.acessorios_originais?.fonte_original || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    acessorios_originais: {
                      ...formData.acessorios_originais,
                      fonte_original: e.target.checked
                    }
                  })}
                  className="w-5 h-5"
                />
                <Label htmlFor="fonte_original" className="cursor-pointer">
                  Fonte Original
                </Label>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="cabo_original"
                  checked={formData.acessorios_originais?.cabo_original || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    acessorios_originais: {
                      ...formData.acessorios_originais,
                      cabo_original: e.target.checked
                    }
                  })}
                  className="w-5 h-5"
                />
                <Label htmlFor="cabo_original" className="cursor-pointer">
                  Cabo Original
                </Label>
              </div>

              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="manual_original"
                  checked={formData.acessorios_originais?.manual_original || false}
                  onChange={(e) => setFormData({
                    ...formData,
                    acessorios_originais: {
                      ...formData.acessorios_originais,
                      manual_original: e.target.checked
                    }
                  })}
                  className="w-5 h-5"
                />
                <Label htmlFor="manual_original" className="cursor-pointer">
                  Manual Original
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="finalizacao">
          <div className="space-y-4 py-4">
            <div>
              <Label>Acessórios Inclusos (Outros)</Label>
              <Textarea
                placeholder="Ex: Carregador paralelo, fone, capa..."
                value={formData.acessorios_inclusos.join(', ')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  acessorios_inclusos: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                rows={2}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={etapaAnterior}
          disabled={tabOrder.indexOf(activeTab) === 0}
        >
          Anterior
        </Button>
        <Button
          onClick={proximaEtapa}
          className="bg-purple-600 hover:bg-purple-700"
          disabled={criarAvaliacaoMutation.isPending}
        >
          {tabOrder.indexOf(activeTab) === tabOrder.length - 1 ? (
            criarAvaliacaoMutation.isPending ? "Salvando..." : "Finalizar Avaliação"
          ) : "Próximo"}
        </Button>
      </div>

      <Dialog open={dialogNovoCliente} onOpenChange={setDialogNovoCliente}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarCliente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={novoClienteData.nome_completo}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, nome_completo: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Telefone Principal *</Label>
                <Input
                  value={novoClienteData.telefone1}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, telefone1: e.target.value }))}
                  required
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={novoClienteData.cpf_cnpj}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNovoCliente(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criarClienteMutation.isPending}>
                {criarClienteMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}