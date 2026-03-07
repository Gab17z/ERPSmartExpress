import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, UserPlus, Camera, Video, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PatternLock from "@/components/PatternLock";
import ClienteFormDialog from "@/components/clientes/ClienteFormDialog";

const MARCAS_DISPONIVEIS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei",
  "Asus", "Realme", "OnePlus", "Nokia", "Sony", "Oppo", "Vivo"
];

const CAPACIDADES_DISPONIVEIS = [
  "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"
];

const OPERADORAS = ["Claro", "Vivo", "Tim", "Oi", "Nextel", "Outra", "Nenhuma"];

export default function OSFormComplete({ onSuccess }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [streamAtivo, setStreamAtivo] = useState(null);
  const [user, setUser] = useState(null);
  const [dialogNovoCliente, setDialogNovoCliente] = useState(false);
  const [configuracoes, setConfiguracoes] = useState(null);
  const [checklistEntrada, setChecklistEntrada] = useState({});
  const [valorPreAprovado, setValorPreAprovado] = useState(0);
  const [tipoOrcamento, setTipoOrcamento] = useState('nenhum');
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const [configChecklist, setConfigChecklist] = useState({ 
    entrada: [
      { id: "contato_liquido", label: "O CLIENTE INFORMOU QUE O APARELHO TEVE CONTATO COM LÍQUIDO?", ativo: true },
      { id: "aparelho_acende", label: "O APARELHO ESTÁ ACENDENDO A TELA?", ativo: true },
      { id: "tela_danificada", label: "TELA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "aparelho_ligando", label: "O APARELHO ESTÁ LIGANDO OU SINAL DE FUNCIONAMENTO?", ativo: true },
      { id: "estrutura_comprometida", label: "ESTRUTURA ESTÁ VISIVELMENTE TORTA OU DANIFICADA?", ativo: true },
      { id: "riscos_visiveis", label: "HÁ RISCOS APARENTES NO APARELHO?", ativo: true },
      { id: "possui_chip", label: "O APARELHO ESTÁ COM CHIP OU CARTÃO SD?", ativo: true },
      { id: "gaveta_chip_danificada", label: "GAVETA DO CHIP ESTÁ AUSENTE OU DANIFICADA?", ativo: true },
      { id: "botoes_danificados", label: "HÁ ALGUM BOTÃO VISIVELMENTE DANIFICADO?", ativo: true },
      { id: "conector_danificado", label: "CONECTOR DE CARGA OU FONE ESTÁ VISIVELMENTE DANIFICADO?", ativo: true },
      { id: "lente_camera_danificada", label: "LENTE DA CAMERA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "camera_danificada", label: "ALGUMA CAMERA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "tampa_traseira_danificada", label: "TAMPA TRASEIRA ESTÁ VISIVELMENTE DANIFICADA?", ativo: true },
      { id: "possui_senha", label: "POSSUI SENHA?", ativo: true }
    ]
  });

  const [formData, setFormData] = useState({
    cliente_id: "",
    aparelho: {
      marca: "",
      modelo: "",
      capacidade: "",
      imei: "",
      serial: "",
      cor: "",
      senha: "",
      tipo_senha: "texto",
      acessorios_entregues: "",
      operadora: ""
    },
    defeito_reclamado: "",
    observacoes_cliente: "",
    prioridade: "normal",
    fotos: [],
  });

  React.useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        setConfiguracoes(config);
        const entradaItems = config.os?.checklist_entrada?.filter(item => item.ativo) || configChecklist.entrada;
        setConfigChecklist({ entrada: entradaItems });
        const initialEntrada = {};
        entradaItems.forEach(item => {
          initialEntrada[item.id] = false;
        });
        setChecklistEntrada(initialEntrada);
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      
      let proximoNumero = 1;
      try {
        const configs = await base44.entities.Configuracao.list();
        const configOS = configs.find(c => c.chave === 'ultimo_numero_os');
        
        if (configOS) {
          proximoNumero = parseInt(configOS.valor) + 1;
          await base44.entities.Configuracao.update(configOS.id, { valor: proximoNumero.toString() });
        } else {
          await base44.entities.Configuracao.create({ 
            chave: 'ultimo_numero_os', 
            valor: '1', 
            tipo: 'numero',
            descricao: 'Último número de OS gerado'
          });
        }
      } catch (error) {
        console.error("Erro ao gerar número OS:", error);
      }

      const codigo = `OS-${proximoNumero.toString().padStart(5, '0')}`;

      const fullChecklistEntrada = { ...checklistEntrada };
      if (tipoOrcamento === 'pre_aprovado') {
        fullChecklistEntrada.pre_aprovado = true;
        fullChecklistEntrada.orcamento = false;
        fullChecklistEntrada.valor_pre_aprovado = valorPreAprovado;
      } else if (tipoOrcamento === 'orcamento') {
        fullChecklistEntrada.pre_aprovado = false;
        fullChecklistEntrada.orcamento = true;
        fullChecklistEntrada.valor_pre_aprovado = 0;
      } else {
        fullChecklistEntrada.pre_aprovado = false;
        fullChecklistEntrada.orcamento = false;
        fullChecklistEntrada.valor_pre_aprovado = 0;
      }

      return base44.entities.OrdemServico.create({
        ...data,
        codigo_os: codigo,
        cliente_nome: cliente?.nome_completo,
        cliente_telefone: cliente?.telefone1,
        cliente_cpf: cliente?.cpf_cnpj,
        cliente_endereco: cliente?.endereco,
        status: "recebido",
        data_entrada: new Date().toISOString(),
        atendente_abertura: user?.full_name,
        checklist_entrada: fullChecklistEntrada,
        historico: [{
          data: new Date().toISOString(),
          usuario: user?.full_name,
          status_anterior: null,
          status_novo: "recebido",
          observacao: "OS criada - Aparelho recebido"
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success("OS criada com sucesso!");
      if (onSuccess) onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.aparelho.marca || !formData.aparelho.modelo || !formData.defeito_reclamado) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), file_url]
      }));
      toast.success("Foto adicionada!");
    } catch (error) {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamAtivo(stream);
        setCapturandoFoto(true);
        await videoRef.current.play();
        toast.success("Câmera ativada!");
      }
    } catch (error) {
      toast.error("Erro ao acessar câmera");
    }
  };

  const capturarFoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      setUploading(true);
      try {
        const file = new File([blob], `os-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        setFormData(prev => ({
          ...prev,
          fotos: [...(prev.fotos || []), file_url]
        }));
        
        toast.success("Foto capturada!");
        pararCamera();
      } catch (error) {
        toast.error("Erro ao salvar foto");
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.92);
  };

  const pararCamera = () => {
    if (streamAtivo) {
      streamAtivo.getTracks().forEach(track => track.stop());
      setStreamAtivo(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCapturandoFoto(false);
  };

  React.useEffect(() => {
    return () => pararCamera();
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Cliente *</Label>
          <div className="flex gap-2">
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              required
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome_completo} - {cliente.telefone1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => setDialogNovoCliente(true)}
              variant="outline"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Dados do Aparelho</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marca *</Label>
              <Select
                value={formData.aparelho.marca}
                onValueChange={(value) => setFormData({ ...formData, aparelho: { ...formData.aparelho, marca: value } })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MARCAS_DISPONIVEIS.map((marca) => (
                    <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modelo *</Label>
              <Input
                value={formData.aparelho.modelo}
                onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, modelo: e.target.value } })}
                required
                placeholder="Ex: iPhone 13"
              />
            </div>

            <div>
              <Label>Cor</Label>
              <Input
                value={formData.aparelho.cor}
                onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, cor: e.target.value } })}
                placeholder="Ex: Preto"
              />
            </div>

            <div>
              <Label>Capacidade</Label>
              <Select
                value={formData.aparelho.capacidade}
                onValueChange={(value) => setFormData({ ...formData, aparelho: { ...formData.aparelho, capacidade: value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CAPACIDADES_DISPONIVEIS.map((cap) => (
                    <SelectItem key={cap} value={cap}>{cap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>IMEI</Label>
              <Input
                value={formData.aparelho.imei}
                onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, imei: e.target.value } })}
                placeholder="000000000000000"
              />
            </div>

            <div>
              <Label>Serial</Label>
              <Input
                value={formData.aparelho.serial}
                onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, serial: e.target.value } })}
              />
            </div>

            <div className="col-span-2">
              <Label>Operadora</Label>
              <Select
                value={formData.aparelho.operadora}
                onValueChange={(value) => setFormData({ ...formData, aparelho: { ...formData.aparelho, operadora: value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {OPERADORAS.map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Senha do Aparelho</Label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.aparelho.tipo_senha === 'texto'}
                    onChange={() => setFormData({ ...formData, aparelho: { ...formData.aparelho, tipo_senha: 'texto' } })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Digitável (PIN/Número/Letra)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.aparelho.tipo_senha === 'padrao'}
                    onChange={() => setFormData({ ...formData, aparelho: { ...formData.aparelho, tipo_senha: 'padrao' } })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Padrão</span>
                </label>
              </div>

              {formData.aparelho.tipo_senha === 'texto' ? (
                <Input
                  value={formData.aparelho.senha}
                  onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, senha: e.target.value } })}
                  placeholder="Digite a senha (PIN, número ou letra)"
                />
              ) : (
                <PatternLock
                  value={formData.aparelho.senha}
                  onChange={(pattern) => setFormData({ ...formData, aparelho: { ...formData.aparelho, senha: pattern } })}
                />
              )}
            </div>

            <div className="col-span-2">
              <Label>Acessórios Entregues</Label>
              <Textarea
                value={formData.aparelho.acessorios_entregues}
                onChange={(e) => setFormData({ ...formData, aparelho: { ...formData.aparelho, acessorios_entregues: e.target.value } })}
                placeholder="Ex: Carregador, capa, fone..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Checklist de Entrada</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {configChecklist.entrada.map((item) => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistEntrada[item.id] || false}
                  onChange={(e) => setChecklistEntrada(prev => ({
                    ...prev,
                    [item.id]: e.target.checked
                  }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={tipoOrcamento === 'pre_aprovado'}
                onChange={() => setTipoOrcamento('pre_aprovado')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Pré-aprovado</span>
            </label>

            {tipoOrcamento === 'pre_aprovado' && (
              <div className="ml-7">
                <Label className="text-sm">Valor Pré-aprovado (R$)</Label>
                <InputMoeda
                  value={valorPreAprovado}
                  onChange={(valor) => setValorPreAprovado(valor)}
                  placeholder="R$ 0,00"
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={tipoOrcamento === 'orcamento'}
                onChange={() => setTipoOrcamento('orcamento')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Orçamento</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={tipoOrcamento === 'nenhum'}
                onChange={() => setTipoOrcamento('nenhum')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Nenhum</span>
            </label>
          </div>
        </div>

        <div>
          <Label>Defeito Reclamado *</Label>
          <Textarea
            value={formData.defeito_reclamado}
            onChange={(e) => setFormData({ ...formData, defeito_reclamado: e.target.value })}
            required
            placeholder="Descreva o defeito..."
            rows={3}
          />
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            value={formData.observacoes_cliente}
            onChange={(e) => setFormData({ ...formData, observacoes_cliente: e.target.value })}
            placeholder="Observações adicionais..."
            rows={2}
          />
        </div>

        <div>
          <Label>Fotos do Aparelho</Label>

          {!capturandoFoto ? (
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer">
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="text-sm">{uploading ? "Enviando..." : "Escolher arquivo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    multiple
                  />
                </label>

                <Button
                  type="button"
                  onClick={iniciarCamera}
                  variant="outline"
                  disabled={uploading}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Câmera
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-60 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={capturarFoto}
                  className="flex-1 bg-blue-600"
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploading ? "Salvando..." : "Capturar"}
                </Button>
                <Button
                  type="button"
                  onClick={pararCamera}
                  variant="outline"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}

          {formData.fotos && formData.fotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {formData.fotos.map((foto, index) => (
                <div key={index} className="relative group">
                  <img
                    src={foto}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        fotos: prev.fotos.filter((_, i) => i !== index)
                      }));
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12" disabled={createMutation.isPending}>
          <Wrench className="w-5 h-5 mr-2" />
          {createMutation.isPending ? "Criando..." : "Criar Ordem de Serviço"}
        </Button>
      </form>

      <ClienteFormDialog
        open={dialogNovoCliente}
        onOpenChange={(open) => {
          setDialogNovoCliente(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['clientes'] });
        }}
      />
    </>
  );
}