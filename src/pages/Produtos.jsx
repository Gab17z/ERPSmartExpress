import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, AlertTriangle, Package, Camera, Loader2, Trash2, Video, Printer, AlertCircle, Upload, FileUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

// CORREÇÃO DE SEGURANÇA: Função para sanitizar strings antes de inserir em HTML
// Previne ataques XSS escapando caracteres especiais HTML
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
}

// CORREÇÃO DE SEGURANÇA: Sanitizar código de barras para uso em URLs
function sanitizeBarcode(barcode) {
  if (!barcode) return '';
  // Apenas números são válidos para código de barras EAN
  return String(barcode).replace(/[^0-9]/g, '');
}

export default function Produtos() {
  const { user } = useAuth();
  const podVerCustos = user?.permissoes?.visualizar_custos === true || user?.permissoes?.administrador_sistema === true;
  const podeDeletar = user?.permissoes?.administrador_sistema === true;

  const [dialogProduto, setDialogProduto] = useState(false);
  const [dialogEtiqueta, setDialogEtiqueta] = useState(false);
  const [dialogImportacao, setDialogImportacao] = useState(false);
  const [dialogConfirmDelete, setDialogConfirmDelete] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [importando, setImportando] = useState(false);
  const [produtoEtiqueta, setProdutoEtiqueta] = useState(null);
  const [editingProduto, setEditingProduto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: null, direcao: 'asc' });
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [configuracoes, setConfiguracoes] = useState(null);
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [streamAtivo, setStreamAtivo] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [camposInvalidos, setCamposInvalidos] = useState([]);

  const [etiquetaConfig, setEtiquetaConfig] = useState({
    tamanho: "40x25_2col",
    incluir_logo: true,
    incluir_preco: true,
    incluir_sku: true,
    incluir_codigo_barras: true,
    quantidade: 1
  });

  const [formData, setFormData] = useState({
    sku: "",
    nome: "",
    descricao: "",
    categoria: "celular",
    marca_nome: "",
    preco_custo: "",
    preco_venda: "",
    margem_lucro: 0,
    estoque_atual: 0,
    estoque_minimo: 5,
    fornecedor_nome: "",
    imagem_url: "",
    codigo_barras: "",
    ativo: true,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        setConfiguracoes(JSON.parse(configSalva));
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  }, []);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('-created_date'),
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => base44.entities.Categoria.list('nome'),
  });

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas'],
    queryFn: () => base44.entities.Marca.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const resultado = await base44.entities.Produto.create(data);

      // Registrar log de auditoria
      try {
        await base44.entities.LogAuditoria.create({
          usuario_id: user?.id || 'sistema',
          usuario_nome: user?.nome || 'Sistema',
          acao: 'criar',
          recurso: 'Produto',
          recurso_id: resultado.id,
          descricao: `Produto criado: ${data.nome}`,
          dados_depois: data,
          data_hora: new Date().toISOString()
        });
      } catch (logError) {
        console.error("Erro ao registrar log:", logError);
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success("Produto cadastrado com sucesso!");
      setDialogProduto(false);
      setEditingProduto(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao cadastrar produto:", error);
      toast.error("Erro ao cadastrar produto.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const produtoAnterior = produtos.find(p => p.id === id);
      const resultado = await base44.entities.Produto.update(id, data);

      // Registrar log de auditoria
      try {
        await base44.entities.LogAuditoria.create({
          usuario_id: user?.id || 'sistema',
          usuario_nome: user?.nome || 'Sistema',
          acao: 'editar',
          recurso: 'Produto',
          recurso_id: id,
          descricao: `Produto alterado: ${data.nome}`,
          dados_antes: produtoAnterior,
          dados_depois: { ...produtoAnterior, ...data },
          data_hora: new Date().toISOString()
        });
      } catch (logError) {
        console.error("Erro ao registrar log:", logError);
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success("Produto atualizado!");
      setDialogProduto(false);
      setEditingProduto(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao atualizar produto:", error);
      toast.error("Erro ao atualizar produto.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        // Tenta excluir permanentemente primeiro
        await base44.entities.Produto.delete(id);
        return { tipo: 'permanente' };
      } catch (error) {
        // Se der erro de FK (produto tem vínculos), faz exclusão lógica
        if (error?.code === '23503') {
          await base44.entities.Produto.update(id, { ativo: false });
          return { tipo: 'logica' };
        }
        throw error;
      }
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      if (resultado.tipo === 'permanente') {
        toast.success("Produto excluído permanentemente!");
      } else {
        toast.success("Produto removido do catálogo! (histórico mantido)");
      }
    },
    onError: (error) => {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto.");
    }
  });

  const handleDelete = (produto) => {
    const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

    if (!podeExcluir) {
      toast.error("Exclusão desabilitada! Habilite em Configurações → Sistema");
      return;
    }

    setProdutoParaExcluir(produto);
    setDialogConfirmDelete(true);
  };

  const confirmarExclusao = () => {
    if (produtoParaExcluir) {
      deleteMutation.mutate(produtoParaExcluir.id);
    }
    setDialogConfirmDelete(false);
    setProdutoParaExcluir(null);
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      nome: "",
      descricao: "",
      categoria: "celular",
      marca_nome: "",
      preco_custo: "",
      preco_venda: "",
      margem_lucro: 0,
      estoque_atual: 0,
      estoque_minimo: 5,
      fornecedor_nome: "",
      imagem_url: "",
      codigo_barras: "",
      ativo: true,
    });
    setEditingProduto(null);
    setCamposInvalidos([]);
  };

  const handleOpenDialog = (produto = null) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        ...produto,
        preco_custo: produto.preco_custo || "",
        preco_venda: produto.preco_venda || ""
      });
    } else {
      // Gerar próximo SKU numérico automaticamente
      const skusNumericos = produtos
        .map(p => parseInt(p.sku))
        .filter(sku => !isNaN(sku))
        .sort((a, b) => b - a);

      const proximoSku = skusNumericos.length > 0 ? (skusNumericos[0] + 1).toString() : "1";

      resetForm();
      setFormData(prev => ({
        ...prev,
        sku: proximoSku
      }));
    }
    setDialogProduto(true);
    setCamposInvalidos([]);
  };

  const validarCampos = () => {
    const invalidos = [];

    if (!formData.nome?.trim()) invalidos.push('nome');
    if (!formData.sku?.trim()) invalidos.push('sku');
    if (!formData.categoria) invalidos.push('categoria');
    if (!formData.preco_venda || parseValorBRL(formData.preco_venda) <= 0) invalidos.push('preco_venda');

    return invalidos;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const invalidos = validarCampos();

    if (invalidos.length > 0) {
      setCamposInvalidos(invalidos);
      toast.error("Preencha todos os campos obrigatórios marcados em vermelho!", { duration: 4000 });
      return;
    }

    setCamposInvalidos([]);

    const dadosProduto = {
      ...formData,
      preco_custo: parseFloat(formData.preco_custo) || 0,
      preco_venda: parseFloat(formData.preco_venda) || 0,
      margem_lucro: formData.margem_lucro || 0
    };

    if (editingProduto) {
      updateMutation.mutate({ id: editingProduto.id, data: dadosProduto });
    } else {
      createMutation.mutate(dadosProduto);
    }
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };

    if (field === 'preco_custo' || field === 'preco_venda') {
      const custo = parseFloat(field === 'preco_custo' ? value : newData.preco_custo) || 0;
      const venda = parseFloat(field === 'preco_venda' ? value : newData.preco_venda) || 0;

      if (custo > 0 && venda > 0) {
        const margem = ((venda - custo) / custo) * 100;
        newData.margem_lucro = margem;
      }
    }

    setFormData(newData);

    // Remover campo da lista de inválidos ao preencher
    if (camposInvalidos.includes(field)) {
      setCamposInvalidos(camposInvalidos.filter(c => c !== field));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        imagem_url: file_url
      }));
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const iniciarCamera = async () => {
    try {

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Câmera não suportada neste navegador. Use Chrome, Firefox ou Safari.");
        return;
      }

      toast.info("Abrindo câmera...", { duration: 2000 });

      setCapturandoFoto(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });


      setStreamAtivo(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        toast.success("Câmera ativada com sucesso!");
      }
    } catch (error) {
      console.error("Erro câmera:", error);
      setCapturandoFoto(false);

      if (error.name === 'NotAllowedError') {
        toast.error("Permissão negada! Permita o acesso à câmera.");
      } else if (error.name === 'NotFoundError') {
        toast.error("Nenhuma câmera encontrada.");
      } else if (error.name === 'NotReadableError') {
        toast.error("Câmera em uso por outro app.");
      } else {
        toast.error("Erro: " + error.message);
      }
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
        const file = new File([blob], `produto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setFormData(prev => ({
          ...prev,
          imagem_url: file_url
        }));
        toast.success("Foto capturada!");
        pararCamera();
      } catch (error) {
        console.error("Erro ao salvar foto:", error);
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
    return () => {
      pararCamera();
    };
  }, []);

  const imprimirEtiqueta = () => {
    if (!produtoEtiqueta) return;


    const configuracoes = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const logoUrl = configuracoes.empresa?.logo_url;

    const tamanhos = {
      "30x20": { width: "30mm", height: "20mm", fontSize: "7px" },
      "40x25": { width: "40mm", height: "25mm", fontSize: "8px" },
      "40x25_2col": { width: "85mm", height: "25mm", fontSize: "8px", colunas: 2 },
      "50x30": { width: "50mm", height: "30mm", fontSize: "10px" },
      "60x40": { width: "60mm", height: "40mm", fontSize: "12px" },
      "70x50": { width: "70mm", height: "50mm", fontSize: "14px" },
      "80x60": { width: "80mm", height: "60mm", fontSize: "16px" },
      "90x70": { width: "90mm", height: "70mm", fontSize: "18px" },
      "100x70": { width: "100mm", height: "70mm", fontSize: "20px" }
    };

    const tam = tamanhos[etiquetaConfig.tamanho] || tamanhos["50x30"];

    // Layout especial para 2 colunas
    if (tam.colunas === 2) {
      const totalEtiquetas = etiquetaConfig.quantidade;
      const totalLinhas = Math.ceil(totalEtiquetas / 2);

      let etiquetasHTML = '';
      for (let i = 0; i < totalLinhas; i++) {
        const etiqueta1 = i * 2 < totalEtiquetas;
        const etiqueta2 = i * 2 + 1 < totalEtiquetas;

        // CORREÇÃO XSS: Sanitizar todos os dados do produto antes de inserir em HTML
        const nomeSeguro = escapeHtml(produtoEtiqueta.nome);
        const skuSeguro = escapeHtml(produtoEtiqueta.sku || 'N/A');
        const barcodeSeguro = sanitizeBarcode(produtoEtiqueta.codigo_barras);

        etiquetasHTML += `
          <div class="linha">
            <div class="etiqueta">
              ${etiqueta1 ? `
                ${etiquetaConfig.incluir_logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                <div class="texto">${nomeSeguro}</div>
                ${etiquetaConfig.incluir_preco ? `<div class="preco">R$ ${(produtoEtiqueta.preco_venda || 0).toFixed(2)}</div>` : ''}
                ${etiquetaConfig.incluir_sku ? `<div class="codigo">SKU: ${skuSeguro}</div>` : ''}
                ${etiquetaConfig.incluir_codigo_barras && barcodeSeguro ? `<div class="barcode-container"><img src="https://bwipjs-api.metafloor.com/?bcid=ean13&text=${encodeURIComponent(barcodeSeguro)}&scale=2&height=5&includetext" class="barcode-image" alt="Barcode" onerror="console.error('Erro barcode 1')" onload="console.log('Barcode 1 OK')" /></div>` : ''}
              ` : ''}
            </div>
            <div class="etiqueta">
              ${etiqueta2 ? `
                ${etiquetaConfig.incluir_logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                <div class="texto">${nomeSeguro}</div>
                ${etiquetaConfig.incluir_preco ? `<div class="preco">R$ ${(produtoEtiqueta.preco_venda || 0).toFixed(2)}</div>` : ''}
                ${etiquetaConfig.incluir_sku ? `<div class="codigo">SKU: ${skuSeguro}</div>` : ''}
                ${etiquetaConfig.incluir_codigo_barras && barcodeSeguro ? `<div class="barcode-container"><img src="https://bwipjs-api.metafloor.com/?bcid=ean13&text=${encodeURIComponent(barcodeSeguro)}&scale=2&height=5&includetext" class="barcode-image" alt="Barcode" onerror="console.error('Erro barcode 2')" onload="console.log('Barcode 2 OK')" /></div>` : ''}
              ` : ''}
            </div>
          </div>
        `;
      }

      const cfg = configuracoes?.impressao || {};
      const medidas = cfg.medidas_etiquetas?.["40x25_2col"] || {
        logo_largura_max: "15mm", logo_altura_max: "8mm", logo_margem_top: "0.8mm", logo_margem_bottom: "0.8mm",
        texto_fonte: "7.5px", texto_line_height: "1.00", texto_margem_top: "0.1mm", texto_margem_bottom: "0.1mm",
        preco_fonte: "15px", preco_line_height: "0.95", preco_margem: "0.2mm",
        sku_fonte: "6.5px", sku_line_height: "0.90", sku_margem_top: "0.2mm",
        barcode_largura_max: "35mm", barcode_altura: "5mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "4px"
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @media print {
              @page { size: 84mm 25mm; margin: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 84mm; }
            .linha { 
              width: 84mm; height: 25mm; display: flex; flex-direction: row;
              align-items: stretch; padding: 0 1mm; gap: 2mm; page-break-after: always;
            }
            .linha:last-child { page-break-after: auto; }
            .etiqueta { 
              width: 40mm; height: 25mm; display: flex; flex-direction: column;
              justify-content: flex-start; align-items: center; text-align: center; padding: 0.5mm 0.8mm 0.8mm 0.8mm; overflow: hidden;
            }
            .logo { max-width: ${medidas.logo_largura_max}; max-height: ${medidas.logo_altura_max}; margin-top: ${medidas.logo_margem_top}; margin-bottom: ${medidas.logo_margem_bottom}; object-fit: contain; display: block; margin-left: auto; margin-right: auto; }
            .texto { font-weight: 600; font-size: ${medidas.texto_fonte}; line-height: ${medidas.texto_line_height}; margin: ${medidas.texto_margem_top} 0 ${medidas.texto_margem_bottom} 0; max-width: 38mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .preco { font-size: ${medidas.preco_fonte}; font-weight: bold; color: #059669; line-height: ${medidas.preco_line_height}; margin: ${medidas.preco_margem} 0; }
            .codigo { font-family: monospace; font-size: ${medidas.sku_fonte}; margin-top: ${medidas.sku_margem_top}; line-height: ${medidas.sku_line_height}; }
            .barcode-container { margin-top: ${medidas.barcode_margem_top}; text-align: center; display: block; width: 100%; }
            .barcode-image { 
              max-width: ${medidas.barcode_largura_max} !important; 
              height: ${medidas.barcode_altura} !important; 
              object-fit: contain !important; 
              margin: 0 auto !important; 
              display: block !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .barcode-number { font-family: monospace; font-size: ${medidas.barcode_numero_fonte}; margin-top: 0.3mm; letter-spacing: 0.5px; display: block; text-align: center; }
            @media print {
              .barcode-container, .barcode-image { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>${etiquetasHTML}</body>
        </html>
      `;

      const janela = window.open('', '_blank');
      janela.document.write(html);
      janela.document.close();
      setTimeout(() => janela.print(), 300);
      toast.success("Imprimindo etiquetas!");
      return;
    }

    // Layout padrão (1 coluna) - usar configurações salvas
    const tamanhoKey = etiquetaConfig.tamanho;
    const medidas = configuracoes?.impressao?.medidas_etiquetas?.[tamanhoKey] || {
      logo_largura_max: "20mm", logo_altura_max: "10mm", logo_margem_top: "1mm", logo_margem_bottom: "1mm",
      texto_fonte: "9px", texto_line_height: "1.05", texto_margem_top: "0.2mm", texto_margem_bottom: "0.2mm",
      preco_fonte: "18px", preco_line_height: "1.00", preco_margem: "0.3mm",
      sku_fonte: "7px", sku_line_height: "0.95", sku_margem_top: "0.3mm",
      barcode_largura_max: "45mm", barcode_altura: "6mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "5px"
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print {
            @page { size: ${tam.width} ${tam.height}; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 1.5mm; }
          .etiqueta { 
            text-align: center; display: flex; flex-direction: column; justify-content: flex-start;
            align-items: center; height: 100%; page-break-after: always; padding-top: 0.5mm; overflow: hidden;
          }
          .etiqueta:last-child { page-break-after: auto; }
          .logo { 
            max-width: ${medidas.logo_largura_max}; 
            max-height: ${medidas.logo_altura_max}; 
            margin-top: ${medidas.logo_margem_top};
            margin-bottom: ${medidas.logo_margem_bottom}; 
            display: block;
            object-fit: contain;
            margin-left: auto;
            margin-right: auto;
          }
          .texto { 
            font-weight: 600; 
            font-size: ${medidas.texto_fonte}; 
            line-height: ${medidas.texto_line_height}; 
            margin: ${medidas.texto_margem_top} 0 ${medidas.texto_margem_bottom} 0;
          }
          .preco { 
            font-size: ${medidas.preco_fonte}; 
            font-weight: bold; 
            color: #059669; 
            line-height: ${medidas.preco_line_height}; 
            margin: ${medidas.preco_margem} 0; 
          }
          .codigo { 
            font-family: monospace; 
            font-size: ${medidas.sku_fonte}; 
            margin-top: ${medidas.sku_margem_top}; 
            line-height: ${medidas.sku_line_height}; 
          }
          .barcode-container { 
            margin-top: ${medidas.barcode_margem_top}; 
            text-align: center; 
            display: block; 
            width: 100%; 
          }
          .barcode-image { 
            max-width: ${medidas.barcode_largura_max} !important; 
            height: ${medidas.barcode_altura} !important; 
            object-fit: contain !important; 
            margin: 0 auto !important; 
            display: block !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @media print {
            .barcode-container, .barcode-image { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        ${(() => {
        // CORREÇÃO XSS: Sanitizar dados do produto para layout 1 coluna
        const nomeSeguro = escapeHtml(produtoEtiqueta.nome);
        const skuSeguro = escapeHtml(produtoEtiqueta.sku || 'N/A');
        const barcodeSeguro = sanitizeBarcode(produtoEtiqueta.codigo_barras);

        return Array(etiquetaConfig.quantidade).fill(0).map(() => `
            <div class="etiqueta">
              ${etiquetaConfig.incluir_logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <div class="texto">${nomeSeguro}</div>
              ${etiquetaConfig.incluir_preco ? `<div class="preco">R$ ${(produtoEtiqueta.preco_venda || 0).toFixed(2)}</div>` : ''}
              ${etiquetaConfig.incluir_sku ? `<div class="codigo">SKU: ${skuSeguro}</div>` : ''}
              ${etiquetaConfig.incluir_codigo_barras && barcodeSeguro ? `<div class="barcode-container"><img src="https://bwipjs-api.metafloor.com/?bcid=ean13&text=${encodeURIComponent(barcodeSeguro)}&scale=2&height=5&includetext" class="barcode-image" alt="Barcode" /></div>` : ''}
            </div>
          `).join('');
      })()}
      </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(html);
      janela.document.close();
      setTimeout(() => janela.print(), 300);
      toast.success("Imprimindo etiqueta!");
    }
  };

  const handleExportarProdutos = () => {
    const headers = ['Codigo barras', 'Codigo', 'Descricao', 'Estoque atual', 'Valor venda 1', 'Fabricante', 'Controla estoque', 'Familia'];
    const csvContent = [
      headers.join(';'),
      ...produtos.map(p => [
        p.codigo_barras || '',
        p.sku || '',
        p.nome || '',
        p.estoque_atual || 0,
        (parseFloat(p.preco_venda) || 0).toFixed(2).replace('.', ','),
        p.marca_nome || '',
        'Sim',
        p.categoria || ''
      ].join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Produtos exportados!");
  };

  // Funcao para fazer parse de CSV diretamente (sem IA)
  const parseCSV = (text) => {
    // Detectar separador (virgula ou ponto e virgula)
    const firstLine = text.split('\n')[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Primeira linha sao os headers
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());

    // Mapear headers para campos do sistema
    const headerMap = {};
    headers.forEach((h, i) => {
      const hNorm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (hNorm.includes('codigo barras') || hNorm.includes('codigo_barras') || hNorm.includes('ean')) {
        headerMap['codigo_barras'] = i;
      } else if (hNorm.includes('codigo') || hNorm.includes('sku')) {
        headerMap['sku'] = i;
      } else if (hNorm.includes('descricao') || hNorm.includes('nome') || hNorm.includes('produto')) {
        headerMap['nome'] = i;
      } else if (hNorm.includes('estoque') || hNorm.includes('quantidade') || hNorm.includes('qtd')) {
        headerMap['estoque_atual'] = i;
      } else if (hNorm.includes('venda') || hNorm.includes('preco') || hNorm.includes('valor')) {
        headerMap['preco_venda'] = i;
      } else if (hNorm.includes('fabricante') || hNorm.includes('marca')) {
        headerMap['marca_nome'] = i;
      } else if (hNorm.includes('familia') || hNorm.includes('categoria') || hNorm.includes('grupo')) {
        headerMap['categoria'] = i;
      }
    });

    // Processar linhas de dados
    const dados = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
      if (values.length < 2) continue;

      const parseNumero = (val) => {
        if (!val) return 0;
        // Tratar formato brasileiro (1.234,56) e americano (1,234.56)
        const cleaned = val.replace(/[^\d,.-]/g, '');
        if (cleaned.includes(',') && cleaned.includes('.')) {
          // Se tem ambos, verificar qual e decimal
          if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
          }
          return parseFloat(cleaned.replace(/,/g, '')) || 0;
        }
        if (cleaned.includes(',')) {
          return parseFloat(cleaned.replace(',', '.')) || 0;
        }
        return parseFloat(cleaned) || 0;
      };

      dados.push({
        codigo_barras: headerMap['codigo_barras'] !== undefined ? values[headerMap['codigo_barras']] || '' : '',
        sku: headerMap['sku'] !== undefined ? values[headerMap['sku']] || '' : '',
        nome: headerMap['nome'] !== undefined ? values[headerMap['nome']] || '' : '',
        estoque_atual: headerMap['estoque_atual'] !== undefined ? parseNumero(values[headerMap['estoque_atual']]) : 0,
        preco_venda: headerMap['preco_venda'] !== undefined ? parseNumero(values[headerMap['preco_venda']]) : 0,
        marca_nome: headerMap['marca_nome'] !== undefined ? values[headerMap['marca_nome']] || '' : '',
        categoria: headerMap['categoria'] !== undefined ? values[headerMap['categoria']] || 'outro' : 'outro'
      });
    }
    return dados;
  };

  const handleImportarArquivo = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    setImportando(true);
    toast.info("Processando arquivo...", { duration: 2000 });

    try {

      // Ler arquivo CSV diretamente
      const text = await file.text();

      toast.info("Extraindo dados do CSV...", { duration: 2000 });

      // Fazer parse do CSV
      const produtosNormalizados = parseCSV(text);

      if (produtosNormalizados.length === 0) {
        toast.error("Nenhum dado encontrado! Verifique se o arquivo tem dados nas celulas e se os headers estao corretos.", { duration: 7000 });
        setImportando(false);
        e.target.value = '';
        return;
      }


      const produtosValidos = produtosNormalizados.filter(p => {
        const valido = p.nome && p.nome.trim() !== '' && p.sku && p.sku.trim() !== '' && p.preco_venda > 0;
        if (!valido) {
        }
        return valido;
      });


      if (produtosValidos.length === 0) {
        toast.error("❌ Nenhum produto válido! Certifique-se que as colunas Nome, Código e Valor venda estão preenchidas.", { duration: 7000 });
        return;
      }

      toast.info(`💾 Salvando ${produtosValidos.length} produto(s)...`, { duration: 4000 });

      let importados = 0;
      let erros = 0;

      for (const produto of produtosValidos) {
        try {
          const custo = produto.preco_custo || 0;
          const venda = produto.preco_venda || 0;
          const margem = custo > 0 && venda > 0 ? ((venda - custo) / custo) * 100 : 0;

          await base44.entities.Produto.create({
            ...produto,
            margem_lucro: margem,
            ativo: true
          });

          importados++;
        } catch (erro) {
          erros++;
          console.error(`❌ Erro ao importar "${produto.nome}":`, erro);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['produtos'] });

      if (importados === produtosValidos.length) {
        toast.success(`🎉 Sucesso! ${importados} produto(s) importado(s)!`, { duration: 6000 });
      } else if (importados > 0) {
        toast.warning(`⚠️ ${importados} produto(s) importado(s). ${erros} falharam.`, { duration: 6000 });
      } else {
        toast.error(`❌ Falha ao importar produtos. Verifique os logs do console.`, { duration: 6000 });
      }

      setDialogImportacao(false);

    } catch (error) {
      console.error("❌ ERRO GERAL:", error);
      toast.error(`Erro: ${error.message || "Falha ao processar arquivo"}`, { duration: 7000 });
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredProdutos = produtos
    .filter((p) => p.ativo !== false) // Ocultar produtos inativos (excluídos logicamente)
    .filter((p) => {
      // Filtro por tipo (Todos/Produtos/Peças)
      if (tipoFiltro === "pecas") {
        return p.categoria === 'peças_de_reposição';
      } else if (tipoFiltro === "produtos") {
        return p.categoria !== 'peças_de_reposição';
      }
      return true; // "todos"
    })
    .filter((p) =>
      p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!ordenacao.campo) return 0;

      let valorA = a[ordenacao.campo];
      let valorB = b[ordenacao.campo];

      // Tratamento especial para campos numéricos
      if (['preco_venda', 'estoque_atual', 'margem_lucro'].includes(ordenacao.campo)) {
        valorA = parseFloat(valorA) || 0;
        valorB = parseFloat(valorB) || 0;
      } else if (ordenacao.campo === 'sku') {
        // SKU: tentar converter para número, se não conseguir usar como string
        const numA = parseInt(valorA);
        const numB = parseInt(valorB);
        if (!isNaN(numA) && !isNaN(numB)) {
          valorA = numA;
          valorB = numB;
        } else {
          valorA = (valorA || '').toString().toLowerCase();
          valorB = (valorB || '').toString().toLowerCase();
        }
      } else {
        // Campos de texto
        valorA = (valorA || '').toString().toLowerCase();
        valorB = (valorB || '').toString().toLowerCase();
      }

      if (valorA < valorB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });

  const produtosBaixoEstoque = produtos.filter(p =>
    p.estoque_atual <= p.estoque_minimo && p.ativo
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
          <p className="text-slate-500">Gerencie o catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportarProdutos} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <Upload className="w-4 h-4 mr-2 rotate-180" />
            Exportar
          </Button>
          <Button onClick={() => setDialogImportacao(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {produtosBaixoEstoque.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Alerta de Estoque Baixo</h3>
                <p className="text-sm text-orange-700 mt-1">
                  {produtosBaixoEstoque.length} produto(s) estão com estoque abaixo do mínimo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, SKU ou marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <Button
                variant={tipoFiltro === "todos" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTipoFiltro("todos")}
                className={tipoFiltro === "todos" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Todos
              </Button>
              <Button
                variant={tipoFiltro === "produtos" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTipoFiltro("produtos")}
                className={tipoFiltro === "produtos" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Produtos
              </Button>
              <Button
                variant={tipoFiltro === "pecas" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTipoFiltro("pecas")}
                className={tipoFiltro === "pecas" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Pecas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('sku')}
                  >
                    <div className="flex items-center gap-1">
                      SKU
                      {ordenacao.campo === 'sku' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Nome
                      {ordenacao.campo === 'nome' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('categoria')}
                  >
                    <div className="flex items-center gap-1">
                      Categoria
                      {ordenacao.campo === 'categoria' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('marca_nome')}
                  >
                    <div className="flex items-center gap-1">
                      Marca
                      {ordenacao.campo === 'marca_nome' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('preco_venda')}
                  >
                    <div className="flex items-center gap-1">
                      Preço Venda
                      {ordenacao.campo === 'preco_venda' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleOrdenar('estoque_atual')}
                  >
                    <div className="flex items-center gap-1">
                      Estoque
                      {ordenacao.campo === 'estoque_atual' && (
                        <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  {podVerCustos && (
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleOrdenar('margem_lucro')}
                    >
                      <div className="flex items-center gap-1">
                        Margem
                        {ordenacao.campo === 'margem_lucro' && (
                          <span className="text-xs">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-slate-50">
                    <TableCell className="p-2">
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome}
                          className="w-12 h-12 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{produto.sku}</TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{produto.categoria?.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>{produto.marca_nome}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      R$ {(parseFloat(produto.preco_venda) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 ${produto.estoque_atual <= produto.estoque_minimo ? 'text-orange-500' : 'text-slate-400'}`} />
                        <span className={produto.estoque_atual <= produto.estoque_minimo ? 'text-orange-600 font-semibold' : ''}>
                          {produto.estoque_atual}
                        </span>
                      </div>
                    </TableCell>
                    {podVerCustos && (
                      <TableCell>
                        <Badge variant="secondary">{(parseFloat(produto.margem_lucro) || 0).toFixed(1)}%</Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(produto)} className="text-blue-600 hover:bg-blue-50">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setProdutoEtiqueta(produto); setDialogEtiqueta(true); }} className="text-slate-600 hover:bg-slate-50">
                          <Printer className="w-4 h-4" />
                        </Button>
                        {podeDeletar && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(produto)} className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Novo/Editar Produto */}
      <Dialog open={dialogProduto} onOpenChange={(open) => {
        setDialogProduto(open);
        if (!open) { pararCamera(); setCamposInvalidos([]); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {camposInvalidos.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção!</strong> Preencha todos os campos obrigatórios marcados em vermelho.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={camposInvalidos.includes('sku') ? 'text-red-600' : ''}>
                  SKU * {camposInvalidos.includes('sku') && <span className="text-red-600 text-xs">(obrigatório)</span>}
                </Label>
                <Input
                  value={formData.sku}
                  readOnly
                  disabled
                  className={`bg-slate-100 cursor-not-allowed ${camposInvalidos.includes('sku') ? 'border-red-500 border-2' : ''}`}
                  placeholder="Gerado automaticamente"
                />
                <p className="text-xs text-slate-500 mt-1">SKU gerado automaticamente</p>
              </div>
              <div>
                <Label className={camposInvalidos.includes('nome') ? 'text-red-600' : ''}>
                  Nome do Produto * {camposInvalidos.includes('nome') && <span className="text-red-600 text-xs">(obrigatório)</span>}
                </Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: iPhone 13"
                  className={camposInvalidos.includes('nome') ? 'border-red-500 border-2' : ''}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => handleChange('descricao', e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={camposInvalidos.includes('categoria') ? 'text-red-600' : ''}>
                  Categoria * {camposInvalidos.includes('categoria') && <span className="text-red-600 text-xs">(obrigatório)</span>}
                </Label>
                <Select value={formData.categoria} onValueChange={(value) => handleChange('categoria', value)}>
                  <SelectTrigger className={camposInvalidos.includes('categoria') ? 'border-red-500 border-2' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.ativo)
                      .filter((cat, idx, self) => self.findIndex(c => c.nome.toLowerCase() === cat.nome.toLowerCase()) === idx)
                      .map(cat => (
                      <SelectItem key={cat.id} value={cat.nome.toLowerCase().replace(/\s+/g, '_')}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                    {categorias.length === 0 && (
                      <SelectItem value="outro" disabled>Nenhuma categoria cadastrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Select value={formData.marca_nome} onValueChange={(value) => handleChange('marca_nome', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.filter(m => m.ativo !== false).map(marca => (
                      <SelectItem key={marca.id} value={marca.nome}>
                        {marca.nome}
                      </SelectItem>
                    ))}
                    {marcas.length === 0 && (
                      <SelectItem value={null} disabled>Nenhuma marca cadastrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`grid ${podVerCustos ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
              {podVerCustos && (
                <div>
                  <Label>Preço de Custo</Label>
                  <InputMoeda
                    value={formData.preco_custo}
                    onChange={(valor) => handleChange('preco_custo', valor)}
                  />
                </div>
              )}
              <div>
                <Label className={camposInvalidos.includes('preco_venda') ? 'text-red-600' : ''}>
                  Preço de Venda * {camposInvalidos.includes('preco_venda') && <span className="text-red-600 text-xs">(obrigatório)</span>}
                </Label>
                <InputMoeda
                  value={formData.preco_venda}
                  onChange={(valor) => handleChange('preco_venda', valor)}
                  className={camposInvalidos.includes('preco_venda') ? 'border-red-500 border-2' : ''}
                />
              </div>
              {podVerCustos && (
                <div>
                  <Label>Margem</Label>
                  <Input value={formData.margem_lucro?.toFixed(2) || 0} disabled className="bg-slate-100" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estoque Atual</Label>
                <Input
                  type="number"
                  value={formData.estoque_atual}
                  onChange={(e) => handleChange('estoque_atual', parseInt(e.target.value) || 0)}
                  onFocus={(e) => { if (e.target.value === "0") e.target.select(); }}
                />
              </div>
              <div>
                <Label>Estoque Mínimo</Label>
                <Input
                  type="number"
                  value={formData.estoque_minimo}
                  onChange={(e) => handleChange('estoque_minimo', parseInt(e.target.value) || 0)}
                  onFocus={(e) => { if (e.target.value === "0") e.target.select(); }}
                />
              </div>
            </div>

            <div>
              <Label>Código de Barras (EAN13)</Label>
              <Input
                value={formData.codigo_barras}
                onChange={(e) => handleChange('codigo_barras', e.target.value)}
                placeholder="Ex: 7891234567890"
                maxLength={13}
              />
            </div>

            <div>
              <Label>Imagem do Produto</Label>
              {!capturandoFoto ? (
                <div className="space-y-3 mt-2">
                  {/* Imagem atual */}
                  {formData.imagem_url && (
                    <div className="relative group w-32">
                      <img src={formData.imagem_url} alt="Produto" className="w-full h-24 object-cover rounded-lg border-2 border-slate-200" />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => setFormData(prev => ({ ...prev, imagem_url: "" }))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {/* Botões para adicionar imagem */}
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer">
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-sm">{uploading ? "Enviando..." : "Escolher Arquivo"}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                    </label>
                    <Button type="button" onClick={iniciarCamera} variant="outline">
                      <Video className="w-5 h-5 mr-2" />Câmera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full h-80 object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={capturarFoto} className="flex-1 bg-blue-600" disabled={uploading}>
                      <Camera className="w-4 h-4 mr-2" />{uploading ? "Salvando..." : "Capturar"}
                    </Button>
                    <Button type="button" onClick={pararCamera} variant="outline">Fechar</Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogProduto(false); pararCamera(); }}>
                Cancelar
              </Button>
              <Button type="submit">{editingProduto ? "Atualizar" : "Cadastrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Importação */}
      <Dialog open={dialogImportacao} onOpenChange={setDialogImportacao}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Importar Produtos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Formato do Arquivo</h4>
              <p className="text-sm text-blue-800 mb-3">
                <strong>⚠️ IMPORTANTE:</strong> Use arquivo <strong>CSV UTF-8</strong> (separado por ponto e vírgula).
              </p>
              <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
                <p className="text-xs font-semibold text-yellow-900 mb-2">📝 Como salvar corretamente do Excel:</p>
                <ol className="text-xs text-yellow-900 space-y-1 ml-4 list-decimal">
                  <li>Abra seu arquivo no Excel</li>
                  <li>Clique em <strong>Arquivo → Salvar Como</strong></li>
                  <li>Escolha <strong>CSV (delimitado por ponto e vírgula) (*.csv)</strong></li>
                  <li>Clique em <strong>Ferramentas → Opções da Web</strong></li>
                  <li>Na aba <strong>Codificação</strong>, selecione <strong>UTF-8</strong></li>
                  <li>Clique em <strong>OK</strong> e depois <strong>Salvar</strong></li>
                </ol>
              </div>
              <p className="text-sm text-blue-800 mb-2"><strong>Colunas necessárias:</strong></p>
              <ul className="text-xs text-blue-800 space-y-1 ml-4">
                <li>• <strong>Codigo barras</strong> - Código de barras (opcional)</li>
                <li>• <strong>Codigo</strong> - SKU/Código interno (obrigatório)</li>
                <li>• <strong>Descricao</strong> - Nome do produto (obrigatório)</li>
                <li>• <strong>Estoque atual</strong> - Quantidade em estoque (número)</li>
                <li>• <strong>Valor venda 1</strong> - Preço de venda (obrigatório)</li>
                <li>• <strong>Fabricante</strong> - Nome da marca</li>
                <li>• <strong>Familia</strong> - Categoria do produto</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <FileUp className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportarArquivo}
                  disabled={importando}
                  className="hidden"
                />
                <Button type="button" disabled={importando} asChild>
                  <span>
                    {importando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Escolher Arquivo
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-slate-500 mt-3">
                <strong>Apenas CSV UTF-8</strong> (separado por ponto e vírgula)
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Dica:</strong> Use nomes de colunas similares aos mostrados acima para melhor reconhecimento.
                O sistema identifica automaticamente colunas como: Codigo, SKU, Descricao, Nome, Estoque, Valor, Preco, Fabricante, Marca, Familia, Categoria.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogImportacao(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação de Exclusão */}
      <Dialog open={dialogConfirmDelete} onOpenChange={(open) => {
        setDialogConfirmDelete(open);
        if (!open) setProdutoParaExcluir(null);
      }}>
        <DialogContent className="max-w-md" aria-describedby="delete-dialog-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Excluir Produto</h3>
            <p id="delete-dialog-description" className="text-slate-600 mb-2">
              Tem certeza que deseja excluir este produto?
            </p>
            {produtoParaExcluir && (
              <div className="bg-slate-100 rounded-lg p-3 w-full mb-4">
                <p className="font-semibold text-slate-900">{produtoParaExcluir.nome}</p>
                <p className="text-sm text-slate-500">SKU: {produtoParaExcluir.sku}</p>
              </div>
            )}
            <p className="text-sm text-slate-500 mb-6">
              Se houver vendas ou movimentações, o produto será apenas ocultado para manter o histórico.
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDialogConfirmDelete(false);
                  setProdutoParaExcluir(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmarExclusao}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Etiqueta */}
      <Dialog open={dialogEtiqueta} onOpenChange={setDialogEtiqueta}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Imprimir Etiqueta</DialogTitle></DialogHeader>
          {produtoEtiqueta && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Produto: {produtoEtiqueta.nome}</h4>
                <p className="text-sm">SKU: {produtoEtiqueta.sku} • R$ {produtoEtiqueta.preco_venda?.toFixed(2)}</p>
              </div>

              <div>
                <Label>Tamanho da Etiqueta</Label>
                <Select value={etiquetaConfig.tamanho} onValueChange={(value) => setEtiquetaConfig(prev => ({ ...prev, tamanho: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30x20">30mm x 20mm (Mini)</SelectItem>
                    <SelectItem value="40x25">40mm x 25mm (Pequeno)</SelectItem>
                    <SelectItem value="40x25_2col">⭐ 40mm x 25mm - 2 Colunas (Knup IM600)</SelectItem>
                    <SelectItem value="50x30">50mm x 30mm (Padrão)</SelectItem>
                    <SelectItem value="60x40">60mm x 40mm (Médio)</SelectItem>
                    <SelectItem value="70x50">70mm x 50mm (Grande)</SelectItem>
                    <SelectItem value="80x60">80mm x 60mm (Extra Grande)</SelectItem>
                    <SelectItem value="90x70">90mm x 70mm (Jumbo)</SelectItem>
                    <SelectItem value="100x70">100mm x 70mm (Super)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={etiquetaConfig.quantidade}
                  onChange={(e) => setEtiquetaConfig(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Incluir Logo da Empresa</Label>
                  <Switch checked={etiquetaConfig.incluir_logo} onCheckedChange={(c) => setEtiquetaConfig(prev => ({ ...prev, incluir_logo: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Incluir SKU</Label>
                  <Switch checked={etiquetaConfig.incluir_sku} onCheckedChange={(c) => setEtiquetaConfig(prev => ({ ...prev, incluir_sku: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Incluir Preço</Label>
                  <Switch checked={etiquetaConfig.incluir_preco} onCheckedChange={(c) => setEtiquetaConfig(prev => ({ ...prev, incluir_preco: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Incluir Código de Barras</Label>
                  <Switch checked={etiquetaConfig.incluir_codigo_barras} onCheckedChange={(c) => setEtiquetaConfig(prev => ({ ...prev, incluir_codigo_barras: c }))} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEtiqueta(false)}>Cancelar</Button>
            <Button onClick={imprimirEtiqueta}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}