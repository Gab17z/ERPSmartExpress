import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Smartphone,
  Battery,
  Monitor,
  CheckCircle,
  Eye,
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const MARCAS_DISPONIVEIS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei",
  "Asus", "Realme", "OnePlus", "Nokia", "Sony", "Oppo", "Vivo"
];

const CAPACIDADES_DISPONIVEIS = [
  "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"
];

export default function AvaliacaoSeminovo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogAvaliacao, setDialogAvaliacao] = useState(false);
  const [dialogResultado, setDialogResultado] = useState(false);
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [activeTab, setActiveTab] = useState("dados-aparelho"); // Replaced etapaAtual with activeTab
  const [avaliacaoAtual, setAvaliacaoAtual] = useState(null);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);

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

  const [formData, setFormData] = useState({
    cliente_id: "",
    aparelho: {
      marca: "",
      modelo: "",
      capacidade_gb: 64, // Changed default from 0 to 64
      cor: "",
      imei: ""
    },
    condicao_bateria: {
      porcentagem_saude: 100,
      ciclos_carga: 0, // Added ciclos_carga
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
    // Added acessorios_originais
    acessorios_originais: {
      caixa_original: false,
      fonte_original: false,
      cabo_original: false,
      manual_original: false
    },
    fotos: [] // Added fotos
  });

  const [configAcessorios, setConfigAcessorios] = useState([]); // New state for custom accessories

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
  }, []);

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes'],
    queryFn: () => base44.entities.AvaliacaoSeminovo.list('-created_date'),
  });

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
      setNovoClienteData({
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
    },
  });

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

  const criarAvaliacaoMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      
      // Buscar e incrementar número sequencial
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

      // Calcular score (0-100)
      const score = calcularScore(); // No longer passes data as it uses formData directly

      // Calcular valor estimado
      const valorMercado = estimarValorMercado(data.aparelho);
      const valorOferecido = valorMercado * (score / 100) * 0.7; // 70% do valor estimado

      // Gerar justificativa
      const justificativa = gerarJustificativa(data, score);

      return base44.entities.AvaliacaoSeminovo.create({
        ...data,
        cliente_id: data.cliente_id || null, // Converte string vazia para null
        codigo_avaliacao: codigo,
        cliente_nome: cliente?.nome_completo || null,
        score_final: score,
        valor_mercado: valorMercado,
        valor_oferecido: Math.round(valorOferecido * 100) / 100,
        justificativa: justificativa,
        avaliador_nome: user?.nome || null,
        // avaliador_id removido - FK referencia tabela usuario que pode estar vazia
        data_avaliacao: new Date().toISOString(),
        status: "concluida"
      });
    },
    onSuccess: (avaliacao) => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      setAvaliacaoAtual(avaliacao);
      setDialogAvaliacao(false);
      setDialogResultado(true);
      toast.success("Avaliação concluída!");
      resetForm();
    },
  });

  // CORREÇÃO: Recebe dados como parâmetro em vez de usar variável global
  const calcularScore = (dados = formData) => {
    const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const pesos = config.seminovos?.pesos_avaliacao || {
      peso_bateria: 25,
      peso_tela: 30,
      peso_funcionalidade: 30,
      peso_estetica: 15,
      bonus_acessorios: 5
    };

    let score = 0;

    // Bateria (peso: pesos.peso_bateria)
    const saudeBateria = dados.condicao_bateria?.porcentagem_saude || 0;
    score += (saudeBateria / 100) * pesos.peso_bateria;

    // Tela (peso: pesos.peso_tela)
    const scoresTela = {
      perfeita: 100,
      arranhoes_leves: 85,
      arranhoes_visiveis: 70,
      trinca_pequena: 50,
      trinca_grande: 30,
      quebrada: 0
    };
    score += ((scoresTela[dados.condicao_tela] || 0) / 100) * pesos.peso_tela;

    // Carcaça (peso: pesos.peso_estetica)
    const scoresCarcaca = {
      perfeita: 100,
      pequenos_riscos: 85,
      riscos_visiveis: 70,
      amassados: 50,
      muito_danificada: 20
    };
    score += ((scoresCarcaca[dados.condicao_carcaca] || 0) / 100) * pesos.peso_estetica;

    // Funcionalidades (peso: pesos.peso_funcionalidade)
    const testesFuncionais = dados.testes_funcionais || {};
    const testesTotal = Math.max(1, Object.keys(testesFuncionais).length); // Evitar divisão por zero
    const testesPassaram = Object.values(testesFuncionais).filter(v => v).length;
    score += (testesPassaram / testesTotal) * pesos.peso_funcionalidade;

    // Bônus por acessórios originais (peso: pesos.bonus_acessorios)
    const acessoriosOriginaisContados = Object.values(dados.acessorios_originais || {}).filter(Boolean).length;
    const totalAcessoriosConsiderados = Math.max(1, 4 + configAcessorios.length); // Evitar divisão por zero
    if (acessoriosOriginaisContados > 0) {
      const bonusPorAcessorio = (pesos.bonus_acessorios / totalAcessoriosConsiderados);
      score += acessoriosOriginaisContados * bonusPorAcessorio;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const estimarValorMercado = (aparelho) => {
    // Valores base por marca (simulação)
    const valoresBase = {
      Apple: 3000,
      Samsung: 2000,
      Motorola: 1200,
      Xiaomi: 1000
    };

    const valorBase = valoresBase[aparelho.marca] || 800;

    // CORREÇÃO: Ajustar por capacidade com valores inteiros para evitar floating point
    // Capacidade padrão de referência: 128GB
    const capacidadeGB = aparelho.capacidade_gb || 128;
    // Multiplicador: cada dobro de capacidade adiciona ~20% ao valor
    const fatorCapacidade = Math.log2(capacidadeGB / 128);
    const ajusteCapacidade = Math.max(0, fatorCapacidade * 0.2);

    // CORREÇÃO: Arredondar para centavos (2 casas decimais)
    return Math.round(valorBase * (1 + ajusteCapacidade) * 100) / 100;
  };

  const gerarJustificativa = (data, score) => {
    let justificativa = `Avaliação baseada em análise técnica detalhada.\n\n`;

    justificativa += `**Pontuação Final: ${score}/100**\n\n`;

    justificativa += `**Bateria:** ${data.condicao_bateria.porcentagem_saude}% de saúde, ${data.condicao_bateria.ciclos_carga} ciclos - ${data.condicao_bateria.estado}\n`;
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

    if (data.acessorios_inclusos && data.acessorios_inclusos.length > 0) {
      justificativa += `\n**Outros acessórios inclusos:** ${data.acessorios_inclusos.join(', ')}`;
    }

    const acessoriosOriginaisPresentes = Object.entries(data.acessorios_originais || {})
      .filter(([_, presente]) => presente)
      .map(([acessorio, _]) => {
        // Map internal keys to more readable names
        if (acessorio === 'caixa_original') return 'Caixa Original';
        if (acessorio === 'fonte_original') return 'Fonte Original';
        if (acessorio === 'cabo_original') return 'Cabo Original';
        if (acessorio === 'manual_original') return 'Manual Original';
        // For custom accessories, find their label in configAcessorios
        const customAcc = configAcessorios.find(cfg => cfg.id === acessorio);
        return customAcc ? customAcc.label : acessorio.replace(/_/g, ' ');
      });

    if (acessoriosOriginaisPresentes.length > 0) {
      justificativa += `\n**Acessórios originais presentes:** ${acessoriosOriginaisPresentes.join(', ')}`;
    }

    if (data.observacoes) {
      justificativa += `\n**Observações:** ${data.observacoes}`;
    }

    return justificativa;
  };

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      aparelho: {
        marca: "",
        modelo: "",
        capacidade_gb: 64, // Updated default
        cor: "",
        imei: ""
      },
      condicao_bateria: {
        porcentagem_saude: 100,
        ciclos_carga: 0, // Updated default
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
      // Reset original accessories
      acessorios_originais: {
        caixa_original: false,
        fonte_original: false,
        cabo_original: false,
        manual_original: false
      },
      fotos: [], // Reset photos
      observacoes: ""
    });
    // Reset active tab to the first one
    setActiveTab("dados-aparelho");
  };



  const tabOrder = ["dados-aparelho", "condicoes-fisicas", "testes-funcionais", "acessorios-originais", "finalizacao"];

  const finalizarAvaliacao = async () => {
    // Validação de campos obrigatórios (cliente é opcional)
    if (!formData.aparelho?.marca || !formData.aparelho?.modelo || !formData.aparelho?.capacidade_gb || !formData.aparelho?.cor) {
      toast.error("⚠️ Preencha os campos obrigatórios: Marca, Modelo, Capacidade e Cor!");
      return;
    }

    criarAvaliacaoMutation.mutate(formData);
  };

  const proximaEtapa = () => {
    // Validação na primeira aba (cliente é opcional)
    if (activeTab === "dados-aparelho") {
      if (!formData.aparelho.marca || !formData.aparelho.modelo || !formData.aparelho.capacidade_gb || !formData.aparelho.cor) {
        toast.error("⚠️ Preencha os campos obrigatórios: Marca, Modelo, Capacidade e Cor!");
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Avaliador de Seminovos</h1>
          <p className="text-slate-500">Avalie aparelhos usados para compra</p>
        </div>
        <Button onClick={() => {
          setDialogAvaliacao(true);
          resetForm(); // Ensure form is reset on new evaluation
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Avaliação
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Histórico de Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Aparelho</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Valor Oferecido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avaliacoes.map((avaliacao) => (
                  <TableRow key={avaliacao.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono">{avaliacao.codigo_avaliacao}</TableCell>
                    <TableCell>{avaliacao.cliente_nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        {avaliacao.aparelho?.marca} {avaliacao.aparelho?.modelo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={avaliacao.score_final} className="w-20" />
                        <span className="font-semibold">{avaliacao.score_final}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      R$ {(parseFloat(avaliacao.valor_oferecido) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={avaliacao.status === 'aceita' ? 'default' : 'secondary'}>
                        {avaliacao.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(avaliacao.data_avaliacao), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAvaliacaoAtual(avaliacao);
                          setDialogResultado(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {avaliacoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Nenhuma avaliação realizada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Avaliação - Refactored to use Tabs */}
      <Dialog open={dialogAvaliacao} onOpenChange={setDialogAvaliacao}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto"> {/* Changed max-w-3xl to max-w-6xl, max-h-[90vh] to max-h-[95vh] */}
          <DialogHeader>
            <DialogTitle>Avaliar Aparelho Seminovo</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto"> {/* Adjusted grid-cols for 5 tabs */}
              <TabsTrigger value="dados-aparelho">Dados</TabsTrigger>
              <TabsTrigger value="condicoes-fisicas">Físicas</TabsTrigger>
              <TabsTrigger value="testes-funcionais">Testes</TabsTrigger>
              <TabsTrigger value="acessorios-originais">Acessórios Originais</TabsTrigger> {/* New tab */}
              <TabsTrigger value="finalizacao">Finalização</TabsTrigger>
            </TabsList>

            {/* Tab 1: Dados do Aparelho (formerly Etapa 1) */}
            <TabsContent value="dados-aparelho">
              <div className="space-y-4 py-4">
                <h3 className="font-semibold text-lg">Dados do Aparelho</h3>

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
                    <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={clientePopoverOpen}
                          className="w-full justify-between font-normal"
                        >
                          {formData.cliente_id
                            ? clientes.find((cliente) => cliente.id === formData.cliente_id)?.nome_completo
                            : "Selecione o cliente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nome ou telefone..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clientes.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={`${cliente.nome_completo} ${cliente.telefone1 || ''}`}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
                                  setClientePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.cliente_id === cliente.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{cliente.nome_completo}</span>
                                  <span className="text-xs text-muted-foreground">{cliente.telefone1}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                    </Popover>
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
                        {CAPACIDADES_DISPONIVEIS.map((cap) => {
                          // CORREÇÃO: 1TB = 1024GB, não 1000GB
                          let valorGB;
                          if (cap.includes('TB')) {
                            valorGB = parseInt(cap.replace('TB', '')) * 1024;
                          } else {
                            valorGB = parseInt(cap.replace('GB', ''));
                          }
                          return (
                            <SelectItem key={cap} value={valorGB.toString()}>
                              {cap}
                            </SelectItem>
                          );
                        })}
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

            {/* Tab 2: Condições Físicas (formerly Etapa 2) */}
            <TabsContent value="condicoes-fisicas">
              <div className="space-y-6 py-4">
                <h3 className="font-semibold text-lg">Condições Físicas</h3>

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
                      <Label className="text-sm">Ciclos de Carga</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.condicao_bateria.ciclos_carga}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          condicao_bateria: {
                            ...prev.condicao_bateria,
                            ciclos_carga: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                    <div className="col-span-2">
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

            {/* Tab 3: Testes Funcionais (formerly Etapa 3) */}
            <TabsContent value="testes-funcionais">
              <div className="space-y-4 py-4">
                <h3 className="font-semibold text-lg">Testes Funcionais</h3>
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
                      <label
                        htmlFor={teste}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                      >
                        {teste.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Acessórios Originais (NEW Tab) */}
            <TabsContent value="acessorios-originais">
              <div className="space-y-6 py-4">
                <h3 className="font-semibold text-lg">Acessórios Originais</h3>
                <p className="text-sm text-slate-600">
                  Marque os acessórios originais que acompanham o aparelho. Cada item aumenta o valor da oferta.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                  {/* Acessórios customizados das configurações */}
                  {configAcessorios.map((acessorio) => (
                    <div key={acessorio.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={acessorio.id} // Use acessorio.id as the ID
                        checked={formData.acessorios_originais?.[acessorio.id] || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          acessorios_originais: {
                            ...formData.acessorios_originais,
                            [acessorio.id]: e.target.checked
                          }
                        })}
                        className="w-5 h-5"
                      />
                      <Label htmlFor={acessorio.id} className="cursor-pointer">
                        {acessorio.label}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    💡 <strong>Acessórios Marcados:</strong> {Object.values(formData.acessorios_originais || {}).filter(Boolean).length}
                    {configAcessorios.length > 0 ? `/${4 + configAcessorios.length} total` : `/4 padrão`}
                    <br />Cada acessório original aumenta a oferta!
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Finalização (formerly Etapa 4) */}
            <TabsContent value="finalizacao">
              <div className="space-y-4 py-4">
                <h3 className="font-semibold text-lg">Finalização</h3>

                <div>
                  <Label>Acessórios Inclusos (Outros)</Label>
                  <Textarea
                    placeholder="Ex: Carregador paralelo, fone de ouvido comum, capa de uso..."
                    value={formData.acessorios_inclusos.join(', ')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      acessorios_inclusos: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    rows={2}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Liste outros acessórios que não são originais ou não aumentam o valor da oferta.
                  </p>
                </div>

                <div>
                  <Label>Observações Adicionais</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

          </Tabs>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={etapaAnterior}
              disabled={tabOrder.indexOf(activeTab) === 0}
            >
              Anterior
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogAvaliacao(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={proximaEtapa}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {tabOrder.indexOf(activeTab) === tabOrder.length - 1 ? "Finalizar Avaliação" : "Próximo"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Cliente - COMPLETO */}
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
                <Label>CPF/CNPJ</Label>
                <Input
                  value={novoClienteData.cpf_cnpj}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                />
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={novoClienteData.data_nascimento}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, data_nascimento: e.target.value }))}
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
                <Label>Telefone Secundário</Label>
                <Input
                  value={novoClienteData.telefone2}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, telefone2: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="col-span-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={novoClienteData.email}
                  onChange={(e) => setNovoClienteData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="col-span-2 border-t pt-4">
                <h3 className="font-semibold mb-3">Endereço</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={novoClienteData.endereco.cep}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, cep: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Tipo Logradouro</Label>
                    <Select
                      value={novoClienteData.endereco.tipo_logradouro}
                      onValueChange={(value) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, tipo_logradouro: value }
                      }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rua">Rua</SelectItem>
                        <SelectItem value="avenida">Avenida</SelectItem>
                        <SelectItem value="travessa">Travessa</SelectItem>
                        <SelectItem value="alameda">Alameda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={novoClienteData.endereco.logradouro}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, logradouro: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Número</Label>
                    <Input
                      value={novoClienteData.endereco.numero}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, numero: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Complemento</Label>
                    <Input
                      value={novoClienteData.endereco.complemento}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, complemento: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={novoClienteData.endereco.bairro}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, bairro: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={novoClienteData.endereco.cidade}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, cidade: e.target.value }
                      }))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Estado</Label>
                    <Input
                      value={novoClienteData.endereco.estado}
                      onChange={(e) => setNovoClienteData(prev => ({
                        ...prev,
                        endereco: { ...prev.endereco, estado: e.target.value }
                      }))}
                      placeholder="Ex: SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNovoCliente(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={criarClienteMutation.isPending}>
                {criarClienteMutation.isPending ? "Cadastrando..." : "Cadastrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Resultado */}
      <Dialog open={dialogResultado} onOpenChange={setDialogResultado}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado da Avaliação</DialogTitle>
          </DialogHeader>
          {avaliacaoAtual && (
            <div className="space-y-6">
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Pontuação Final</p>
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {avaliacaoAtual.score_final}
                </div>
                <Progress value={avaliacaoAtual.score_final} className="h-3 mb-4" />
                <p className="text-sm text-slate-600">de 100 pontos</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-slate-600">Valor de Mercado</p>
                    <p className="text-2xl font-bold text-slate-900">
                      R$ {(parseFloat(avaliacaoAtual.valor_mercado) || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-slate-600">Valor Oferecido</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {(parseFloat(avaliacaoAtual.valor_oferecido) || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Justificativa</Label>
                <div className="bg-slate-50 p-4 rounded-lg text-sm whitespace-pre-line">
                  {avaliacaoAtual.justificativa}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Atualizar status para recusada
                    base44.entities.AvaliacaoSeminovo.update(avaliacaoAtual.id, {
                      status: "recusada"
                    });
                    setDialogResultado(false);
                    queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
                  }}
                >
                  Cliente Recusou
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Atualizar status para aceita
                    base44.entities.AvaliacaoSeminovo.update(avaliacaoAtual.id, {
                      status: "aceita"
                    });
                    setDialogResultado(false);
                    queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
                    toast.success("Oferta aceita!");
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cliente Aceitou
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}