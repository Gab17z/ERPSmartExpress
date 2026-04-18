import React, { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Settings,
  Bell,
  Printer,
  Monitor,
  Users,
  Save,
  Camera,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Download,
  Upload,
  Database,
  HardDrive,
  Eye,
  EyeOff,
  Zap,
  QrCode,
  CloudOff,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

import PreviewImpressao from "@/components/PreviewImpressao";
import EditorTemplateOS from "@/components/configuracoes/EditorTemplateOS";
import { useConfirm } from '@/contexts/ConfirmContext';

// Default configuration object, extracted for reusability and merging logic
const configuracoesDefault = {
  empresa: {
    nome: "Smart Express", // Changed from "Smart Express"
    cnpj: "12.345.678/0001-90",
    telefone: "(11) 3456-7890",
    email: "contato@celltech.com.br",
    endereco: "Rua Exemplo, 123 - São Paulo, SP",
    logo_url: "",
    // mensagem_cupom removed as per outline
  },
  pdv: {
    tela_cheia_automatica: true,
    exigir_senha_desconto: true,
    solicitar_senha_desconto_acima: 10,
    permitir_venda_estoque_negativo: false,
    exibir_sugestoes_produtos: true,
    limitar_desconto_maximo: true,
    desconto_maximo_percentual: 30,
    permitir_alterar_preco: false,
    som_ao_adicionar: true,
    atalhos_teclado: true,
    exibir_ultimas_vendas: true,
    confirmar_antes_finalizar: true,
    bloquear_venda_sem_cliente: false,
    mostrar_lucro_estimado: false,
    impressao_automatica_cupom: false,
    alertar_estoque_baixo: true,
    pix_chave: "",
    pix_beneficiario: "",
    pix_qrcode_imagem: "",
    pix_usar_integracao: false,
    pix_monitor_secundario: false
  },
  calculadora: {
    // Taxas da maquininha de cartão
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
  },
  os: {
    prazo_padrao_dias: 7,
    garantia_padrao_dias: 90,
    enviar_sms_status: true,
    enviar_email_orcamento: true,
    exigir_laudo_tecnico: true,
    permitir_orcamento_parcial: true, // Kept from current code
    taxa_urgencia_percentual: 50, // Kept from current code
    exibir_fotos_impressao: false,
    senha_obrigatoria: false,
    imei_obrigatorio: false,
    checklist_entrada: [ // Kept detailed lists, not empty as in outline
      { id: "contato_liquido", label: "Contato com Líquido", ativo: true },
      { id: "aparelho_acende", label: "Aparelho Acende", ativo: true },
      { id: "tela_danificada", label: "Tela Danificada", ativo: true },
      { id: "aparelho_ligando", label: "Aparelho Ligando", ativo: true },
      { id: "estrutura_comprometida", label: "Estrutura Comprometida", ativo: true },
      { id: "riscos_visiveis", label: "Riscos Visíveis", ativo: true },
      { id: "possui_chip", label: "Possui Chip", ativo: true },
      { id: "gaveta_chip_danificada", label: "Gaveta do Chip Danificada", ativo: true },
      { id: "botoes_danificados", label: "Botões Danificados", ativo: true },
      { id: "conector_danificado", label: "Conector Danificado", ativo: true },
      { id: "lente_camera_danificada", label: "Lente da Câmera Danificada", ativo: true },
      { id: "camera_danificada", label: "Câmera Danificada", ativo: true },
      { id: "tampa_traseira_danificada", label: "Tampa Traseira Danificada", ativo: true },
      { id: "possui_senha", label: "Possui Senha", ativo: true },
      { id: "pre_aprovado", label: "Pré-aprovado", ativo: true },
      { id: "orcamento", label: "Orçamento", ativo: true }
    ],
    checklist_finalizacao: [ // Kept detailed lists
      { id: "impossivel_testar", label: "Impossível Testar", ativo: true },
      { id: "aparelho_nao_liga", label: "Aparelho Não Liga", ativo: true },
      { id: "teste_touch", label: "Teste de Touch", ativo: true },
      { id: "teste_tela", label: "Teste de Tela", ativo: true },
      { id: "teste_conector_carga", label: "Teste Conector de Carga", ativo: true },
      { id: "teste_botoes", label: "Teste de Botões", ativo: true },
      { id: "teste_alto_falante_primario", label: "Teste Alto-falante Primário", ativo: true },
      { id: "teste_alto_falante_secundario", label: "Teste Alto-falante Secundário", ativo: true },
      { id: "teste_wifi_bluetooth", label: "Teste WiFi/Bluetooth", ativo: true },
      { id: "teste_rede_gsm", label: "Teste Rede GSM", ativo: true }
    ]
  },
  seminovos: {
    percentual_oferta: 70,
    peso_bateria: 25,
    peso_tela: 30,
    peso_funcionalidade: 30,
    peso_estetica: 15,
    // desconto_minimo_avaria removed as per outline
    bonus_acessorios: 50,
    permitir_parcelamento_compra: true, // Kept from current code
    acessorios_customizados: []
  },
  impressao: {
    // Cupom
    impressora_cupom: "Padrão do Sistema",
    tamanho_papel_cupom: "80mm",
    logo_no_cupom: true,
    rodape_cupom: "Obrigado pela preferência!",
    codigo_barras_cupom: true,

    // OS
    impressora_os: "Padrão do Sistema",
    vias_os: 2,
    incluir_termos_os: true,
    termos_os: "1. O prazo de entrega pode variar conforme disponibilidade de peças.\n2. Não nos responsabilizamos por dados armazenados no aparelho.\n3. Aparelhos não retirados em 90 dias serão descartados.\n4. A garantia cobre apenas o serviço realizado.\n5. Os termos aqui configurados serão utilizados no modelo de impressão da OS.",
    margem_superior_os: 10,
    margem_inferior_os: 10, // Kept from current code
    margem_esquerda_os: 10, // Kept from current code
    margem_direita_os: 10, // Kept from current code

    // Etiquetas
    tamanho_etiqueta_padrao: "40x25_2col",
    incluir_logo_etiqueta: true,
    incluir_sku_etiqueta: true,
    incluir_preco_etiqueta: true,
    incluir_codigo_barras_etiqueta: true,
    // Medidas detalhadas por tamanho
    medidas_etiquetas: {
      "30x20": {
        logo_largura_max: "12mm", logo_altura_max: "6mm", logo_margem_top: "0.5mm", logo_margem_bottom: "0.5mm",
        texto_fonte: "6px", texto_line_height: "1.00", texto_margem_top: "0.1mm", texto_margem_bottom: "0.1mm",
        preco_fonte: "12px", preco_line_height: "0.95", preco_margem: "0.2mm",
        sku_fonte: "5px", sku_line_height: "0.90", sku_margem_top: "0.2mm",
        barcode_largura_max: "28mm", barcode_altura: "4mm", barcode_margem_top: "0.3mm", barcode_numero_fonte: "3px"
      },
      "40x25": {
        logo_largura_max: "15mm", logo_altura_max: "8mm", logo_margem_top: "0.8mm", logo_margem_bottom: "0.8mm",
        texto_fonte: "7.5px", texto_line_height: "1.00", texto_margem_top: "0.1mm", texto_margem_bottom: "0.1mm",
        preco_fonte: "15px", preco_line_height: "0.95", preco_margem: "0.2mm",
        sku_fonte: "6.5px", sku_line_height: "0.90", sku_margem_top: "0.2mm",
        barcode_largura_max: "35mm", barcode_altura: "5mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "4px"
      },
      "40x25_2col": {
        logo_largura_max: "15mm", logo_altura_max: "8mm", logo_margem_top: "0.8mm", logo_margem_bottom: "0.8mm",
        texto_fonte: "7.5px", texto_line_height: "1.00", texto_margem_top: "0.1mm", texto_margem_bottom: "0.1mm",
        preco_fonte: "15px", preco_line_height: "0.95", preco_margem: "0.2mm",
        sku_fonte: "6.5px", sku_line_height: "0.90", sku_margem_top: "0.2mm",
        barcode_largura_max: "35mm", barcode_altura: "5mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "4px"
      },
      "50x30": {
        logo_largura_max: "20mm", logo_altura_max: "10mm", logo_margem_top: "1mm", logo_margem_bottom: "1mm",
        texto_fonte: "9px", texto_line_height: "1.05", texto_margem_top: "0.2mm", texto_margem_bottom: "0.2mm",
        preco_fonte: "18px", preco_line_height: "1.00", preco_margem: "0.3mm",
        sku_fonte: "7px", sku_line_height: "0.95", sku_margem_top: "0.3mm",
        barcode_largura_max: "45mm", barcode_altura: "6mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "5px"
      },
      "60x40": {
        logo_largura_max: "25mm", logo_altura_max: "12mm", logo_margem_top: "1.2mm", logo_margem_bottom: "1.2mm",
        texto_fonte: "10px", texto_line_height: "1.10", texto_margem_top: "0.3mm", texto_margem_bottom: "0.3mm",
        preco_fonte: "20px", preco_line_height: "1.00", preco_margem: "0.4mm",
        sku_fonte: "8px", sku_line_height: "1.00", sku_margem_top: "0.4mm",
        barcode_largura_max: "55mm", barcode_altura: "8mm", barcode_margem_top: "0.8mm", barcode_numero_fonte: "6px"
      },
      "70x50": {
        logo_largura_max: "30mm", logo_altura_max: "15mm", logo_margem_top: "1.5mm", logo_margem_bottom: "1.5mm",
        texto_fonte: "12px", texto_line_height: "1.15", texto_margem_top: "0.4mm", texto_margem_bottom: "0.4mm",
        preco_fonte: "24px", preco_line_height: "1.05", preco_margem: "0.5mm",
        sku_fonte: "9px", sku_line_height: "1.00", sku_margem_top: "0.5mm",
        barcode_largura_max: "65mm", barcode_altura: "10mm", barcode_margem_top: "1mm", barcode_numero_fonte: "7px"
      },
      "80x60": {
        logo_largura_max: "35mm", logo_altura_max: "18mm", logo_margem_top: "2mm", logo_margem_bottom: "2mm",
        texto_fonte: "14px", texto_line_height: "1.20", texto_margem_top: "0.5mm", texto_margem_bottom: "0.5mm",
        preco_fonte: "28px", preco_line_height: "1.10", preco_margem: "0.6mm",
        sku_fonte: "10px", sku_line_height: "1.05", sku_margem_top: "0.6mm",
        barcode_largura_max: "75mm", barcode_altura: "12mm", barcode_margem_top: "1.2mm", barcode_numero_fonte: "8px"
      },
      "90x70": {
        logo_largura_max: "40mm", logo_altura_max: "20mm", logo_margem_top: "2.5mm", logo_margem_bottom: "2.5mm",
        texto_fonte: "16px", texto_line_height: "1.25", texto_margem_top: "0.6mm", texto_margem_bottom: "0.6mm",
        preco_fonte: "32px", preco_line_height: "1.15", preco_margem: "0.8mm",
        sku_fonte: "11px", sku_line_height: "1.10", sku_margem_top: "0.8mm",
        barcode_largura_max: "85mm", barcode_altura: "14mm", barcode_margem_top: "1.5mm", barcode_numero_fonte: "9px"
      },
      "100x70": {
        logo_largura_max: "45mm", logo_altura_max: "22mm", logo_margem_top: "3mm", logo_margem_bottom: "3mm",
        texto_fonte: "18px", texto_line_height: "1.30", texto_margem_top: "0.8mm", texto_margem_bottom: "0.8mm",
        preco_fonte: "36px", preco_line_height: "1.20", preco_margem: "1mm",
        sku_fonte: "12px", sku_line_height: "1.15", sku_margem_top: "1mm",
        barcode_largura_max: "95mm", barcode_altura: "16mm", barcode_margem_top: "2mm", barcode_numero_fonte: "10px"
      }
    }
  },
  monitor_cliente: { // Preserved from current code as it's not in outline's default but used in content
    habilitado: false,
    mostrar_propaganda: true,
    mostrar_qrcode_venda: true,
    url_propaganda: "",
    tempo_rotacao_segundos: 10,
    mensagem_boas_vindas: "Bem-vindo à Smart Express!",
    tamanho_fonte: "grande",
    cor_tema: "#3b82f6"
  },
  notificacoes: { // Preserved from current code
    email_nova_venda: true,
    email_estoque_baixo: true,
    email_os_pronta: true,
    sms_os_pronta: false,
    lembrar_aniversario_cliente: true,
    dias_antecedencia_aniversario: 3
  },
  sistema: {
    // permitir_exclusao_vendas removed as per outline
    permitir_exclusao_os: false,
    permitir_exclusao_clientes: false,
    permitir_exclusao_produtos: false,
    backup_automatico: true,
    // dias_retencao_logs removed as per outline
    // horario_backup removed as per outline
    // local_backup removed as per outline
    // exigir_senha_cancelamento removed as per outline
    logs_auditoria: true, // Renamed from log_auditoria
    intervalo_backup_horas: 24, // New
    maximo_backups_salvos: 7, // New
    modo_escuro: false, // New
    idioma: "pt-BR", // New
    fuso_horario: "America/Sao_Paulo", // New
    nivel_log: "info", // New
    modo_fiscal_ativo: false, // New
    tipo_certificado: "nenhum", // New
    ambiente_fiscal: "homologacao", // New
    serie_nfe: 1, // New
    serie_nfce: 1 // New
  }
};

// Helper para merge profundo de configurações com defaults
function mergeWithDefaults(parsed) {
  return {
    ...configuracoesDefault,
    ...parsed,
    empresa: { ...configuracoesDefault.empresa, ...(parsed.empresa || {}) },
    pdv: { ...configuracoesDefault.pdv, ...(parsed.pdv || {}) },
    calculadora: { ...configuracoesDefault.calculadora, ...(parsed.calculadora || {}) },
    os: {
      ...configuracoesDefault.os,
      ...(parsed.os || {}),
      checklist_entrada: Array.isArray(parsed.os?.checklist_entrada) ? parsed.os.checklist_entrada : configuracoesDefault.os.checklist_entrada,
      checklist_finalizacao: Array.isArray(parsed.os?.checklist_finalizacao) ? parsed.os.checklist_finalizacao : configuracoesDefault.os.checklist_finalizacao,
    },
    seminovos: {
      ...configuracoesDefault.seminovos,
      ...(parsed.seminovos || {}),
      acessorios_customizados: Array.isArray(parsed.seminovos?.acessorios_customizados) ? parsed.seminovos.acessorios_customizados : configuracoesDefault.seminovos.acessorios_customizados,
    },
    impressao: {
      ...configuracoesDefault.impressao,
      ...(parsed.impressao || {})
    },
    monitor_cliente: { ...configuracoesDefault.monitor_cliente, ...(parsed.monitor_cliente || {}) },
    notificacoes: { ...configuracoesDefault.notificacoes, ...(parsed.notificacoes || {}) },
    sistema: { ...configuracoesDefault.sistema, ...(parsed.sistema || {}) }
  };
}

export default function Configuracoes() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Controle de visibilidade dos campos de senha
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarSenhaAuth, setMostrarSenhaAuth] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false); // Used for main save button
  // Initialize state with the default configuration object
  const [configuracoes, setConfiguracoes] = useState(configuracoesDefault);

  // Estados para gerenciamento de usuários e cargos
  const [dialogCargo, setDialogCargo] = useState(false);
  const [editingCargo, setEditingCargo] = useState(null);
  const [dialogUsuario, setDialogUsuario] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [dialogDeleteUsuario, setDialogDeleteUsuario] = useState(false);
  const [usuarioParaDeletar, setUsuarioParaDeletar] = useState(null);
  const [usuarioData, setUsuarioData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo_id: "",
    senha: "",
    codigo_barras_autorizacao: "",
    senha_autorizacao: "",
    ativo: true
  });
  const [cargoData, setCargoData] = useState({
    nome: "",
    nivel_hierarquia: 5,
    descricao: "",
    permissoes: {
      gerenciar_usuarios: false,
      gerenciar_produtos: false,
      gerenciar_clientes: false,
      realizar_vendas: false,
      gerenciar_caixa: false,
      gerenciar_os: false,
      avaliar_seminovos: false,
      cancelar_vendas: false,
      aplicar_descontos: false,
      visualizar_relatorios: false,
      gerenciar_fornecedores: false,
      acessar_relatorios: false,
      acessar_dashboard: false,
      acessar_metas: false,
      acessar_agenda: false,
      acessar_integracoes: false,
      acessar_etiquetas: false,
      acessar_logs: false,
      acessar_configuracoes: false,
      abrir_fechar_caixa: false,
      fazer_sangria_suprimento: false,
      editar_produtos: false,
      editar_clientes: false,
      criar_os: false,
      editar_os: false,
      aprovar_orcamento_os: false,
      finalizar_os: false,
      cancelar_os: false,
      acesso_multilojas: false,
      visualizar_custos: false
    }
  });

  // Permissões padrão para reutilização
  const permissoesPadrao = {
    gerenciar_usuarios: false,
    gerenciar_produtos: false,
    gerenciar_clientes: false,
    realizar_vendas: false,
    gerenciar_caixa: false,
    gerenciar_os: false,
    avaliar_seminovos: false,
    cancelar_vendas: false,
    aplicar_descontos: false,
    visualizar_relatorios: false,
    gerenciar_fornecedores: false,
    acessar_relatorios: false,
    acessar_dashboard: false,
    acessar_metas: false,
    acessar_agenda: false,
    acessar_integracoes: false,
    acessar_etiquetas: false,
    acessar_logs: false,
    acessar_configuracoes: false,
    abrir_fechar_caixa: false,
    fazer_sangria_suprimento: false,
    editar_produtos: false,
    editar_clientes: false,
    criar_os: false,
    editar_os: false,
    aprovar_orcamento_os: false,
    finalizar_os: false,
    cancelar_os: false,
    acesso_multilojas: false,
    visualizar_custos: false
  };

  // Presets de permissões por nível hierárquico
  const presetsPermissoes = {
    // Nível 1 - Administrador/Diretor: TUDO liberado
    1: {
      gerenciar_usuarios: true,
      gerenciar_produtos: true,
      gerenciar_clientes: true,
      realizar_vendas: true,
      gerenciar_caixa: true,
      gerenciar_os: true,
      avaliar_seminovos: true,
      cancelar_vendas: true,
      aplicar_descontos: true,
      visualizar_relatorios: true,
      gerenciar_fornecedores: true,
      acessar_relatorios: true,
      acessar_dashboard: true,
      acessar_metas: true,
      acessar_agenda: true,
      acessar_integracoes: true,
      acessar_etiquetas: true,
      acessar_logs: true,
      acessar_configuracoes: true,
      abrir_fechar_caixa: true,
      fazer_sangria_suprimento: true,
      editar_produtos: true,
      editar_clientes: true,
      criar_os: true,
      editar_os: true,
      aprovar_orcamento_os: true,
      finalizar_os: true,
      cancelar_os: true,
      acesso_multilojas: true,
      visualizar_custos: true
    },
    // Nível 2 - Gerente: Quase tudo, sem gerenciar usuários e integrações
    2: {
      gerenciar_usuarios: false,
      gerenciar_produtos: true,
      gerenciar_clientes: true,
      realizar_vendas: true,
      gerenciar_caixa: true,
      gerenciar_os: true,
      avaliar_seminovos: true,
      cancelar_vendas: true,
      aplicar_descontos: true,
      visualizar_relatorios: true,
      gerenciar_fornecedores: true,
      acessar_relatorios: true,
      acessar_dashboard: true,
      acessar_metas: true,
      acessar_agenda: true,
      acessar_integracoes: false,
      acessar_etiquetas: true,
      acessar_logs: true,
      acessar_configuracoes: false,
      abrir_fechar_caixa: true,
      fazer_sangria_suprimento: true,
      editar_produtos: true,
      editar_clientes: true,
      criar_os: true,
      editar_os: true,
      aprovar_orcamento_os: true,
      finalizar_os: true,
      cancelar_os: true,
      acesso_multilojas: false,
      visualizar_custos: true
    },
    // Nível 3 - Supervisor: Operacional com supervisão, sem cancelamentos críticos
    3: {
      gerenciar_usuarios: false,
      gerenciar_produtos: true,
      gerenciar_clientes: true,
      realizar_vendas: true,
      gerenciar_caixa: true,
      gerenciar_os: true,
      avaliar_seminovos: true,
      cancelar_vendas: false,
      aplicar_descontos: true,
      visualizar_relatorios: true,
      gerenciar_fornecedores: false,
      acessar_relatorios: true,
      acessar_dashboard: true,
      acessar_metas: true,
      acessar_agenda: true,
      acessar_integracoes: false,
      acessar_etiquetas: true,
      acessar_logs: false,
      acessar_configuracoes: false,
      abrir_fechar_caixa: true,
      fazer_sangria_suprimento: false,
      editar_produtos: true,
      editar_clientes: true,
      criar_os: true,
      editar_os: true,
      aprovar_orcamento_os: true,
      finalizar_os: true,
      cancelar_os: false,
      acesso_multilojas: false,
      visualizar_custos: true
    },
    // Nível 4 - Operacional (Vendedor/Técnico): Vendas, Clientes, Produtos (sem custo), OS, Etiquetas
    4: {
      gerenciar_usuarios: false,
      gerenciar_produtos: true,
      gerenciar_clientes: true,
      realizar_vendas: true,
      gerenciar_caixa: false,
      gerenciar_os: true,
      avaliar_seminovos: true,
      cancelar_vendas: false,
      aplicar_descontos: false,
      visualizar_relatorios: false,
      gerenciar_fornecedores: false,
      acessar_relatorios: false,
      acessar_dashboard: false,
      acessar_metas: false,
      acessar_agenda: false,
      acessar_integracoes: false,
      acessar_etiquetas: true,
      acessar_logs: false,
      acessar_configuracoes: false,
      abrir_fechar_caixa: true,
      fazer_sangria_suprimento: false,
      editar_produtos: true,
      editar_clientes: true,
      criar_os: true,
      editar_os: true,
      aprovar_orcamento_os: true,
      finalizar_os: true,
      cancelar_os: false,
      acesso_multilojas: false,
      visualizar_custos: false
    },
    // Nível 5 - Estagiário/Aprendiz: Apenas visualização e tarefas básicas
    5: {
      gerenciar_usuarios: false,
      gerenciar_produtos: false,
      gerenciar_clientes: false,
      realizar_vendas: true,
      gerenciar_caixa: false,
      gerenciar_os: false,
      avaliar_seminovos: false,
      cancelar_vendas: false,
      aplicar_descontos: false,
      visualizar_relatorios: false,
      gerenciar_fornecedores: false,
      acessar_relatorios: false,
      acessar_dashboard: true,
      acessar_metas: false,
      acessar_agenda: true,
      acessar_integracoes: false,
      acessar_etiquetas: false,
      acessar_logs: false,
      acessar_configuracoes: false,
      abrir_fechar_caixa: false,
      fazer_sangria_suprimento: false,
      editar_produtos: false,
      editar_clientes: false,
      criar_os: false,
      editar_os: false,
      aprovar_orcamento_os: false,
      finalizar_os: false,
      cancelar_os: false,
      acesso_multilojas: false,
      visualizar_custos: false
    }
  };

  const [novoItemChecklist, setNovoItemChecklist] = useState({ label: "", tipo: "entrada" });
  const [novoAcessorio, setNovoAcessorio] = useState("");

  const [dialogPreview, setDialogPreview] = useState(false); // New state for preview dialog
  const [tipoPreview, setTipoPreview] = useState("cupom"); // New state for preview type
  const [exportando, setExportando] = useState(false); // New state for export loading (for backup)
  const [importando, setImportando] = useState(false); // State for import loading
  const [progressoBackup, setProgressoBackup] = useState({ atual: 0, total: 0, tabela: "" });
  const [dialogBackup, setDialogBackup] = useState(false); // Dialog for backup progress
  const [tipoBackup, setTipoBackup] = useState("completo"); // "completo" ou "configuracoes"

  const [campoSelecionado, setCampoSelecionado] = useState(null);
  const [templateOS, setTemplateOS] = useState({
    secoes: [
      {
        id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1, largura: '100%', cor_fundo: '#ffffff',
        campos: [
          { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: true, tamanho: 'medio', alinhamento: 'esquerda' },
          { id: 'empresa_nome', tipo: 'texto', label: 'Nome da Empresa', visivel: true, tamanho: 'grande', negrito: true },
          { id: 'empresa_cnpj', tipo: 'texto', label: 'CNPJ', visivel: true, tamanho: 'pequeno' },
          { id: 'codigo_os', tipo: 'texto', label: 'Código OS', visivel: true, tamanho: 'grande', negrito: true, alinhamento: 'direita' }
        ]
      },
      {
        id: 'cliente', nome: 'Dados do Cliente', ativo: true, ordem: 2, largura: '100%', borda: true,
        campos: [
          { id: 'cliente_nome', tipo: 'texto', label: 'Nome', visivel: true, tamanho: 'medio', negrito: true },
          { id: 'cliente_endereco_completo', tipo: 'texto', label: 'Endereço', visivel: true, tamanho: 'pequeno' }
        ]
      },
      {
        id: 'aparelho', nome: 'Dados do Aparelho', ativo: true, ordem: 3, largura: '100%', borda: true,
        campos: [
          { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'medio' },
          { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'medio' },
          { id: 'aparelho_imei', tipo: 'texto', label: 'IMEI', visivel: true, tamanho: 'pequeno' }
        ]
      },
      {
        id: 'checklist_entrada', nome: 'Checklist', ativo: true, ordem: 5, largura: '60%', borda: true,
        campos: [{ id: 'checklist_visual', tipo: 'checklist', label: 'Itens', visivel: true, colunas: 2 }]
      },
      {
        id: 'footer', nome: 'Rodapé', ativo: true, ordem: 10, largura: '100%',
        campos: [
          { id: 'termos', tipo: 'texto_longo', label: 'Termos', visivel: true, tamanho: 'pequeno' },
          { id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura', visivel: true }
        ]
      }
    ],
    estilo_global: { fonte: 'Arial', tamanho_fonte_base: '10px', cor_texto: '#000000', borda_secoes: true, espacamento: 'normal' },
    opcoes_layout: [
      { id: 'compacto', nome: 'Compacto', descricao: 'Máxima compressão em 1 página' },
      { id: 'padrao', nome: 'Padrão', descricao: 'Balanceado' },
      { id: 'amplo', nome: 'Amplo', descricao: 'Mais espaçado' },
      { id: 'minimalista', nome: 'Minimalista', descricao: 'Só essencial' },
      { id: 'detalhado', nome: 'Detalhado', descricao: 'Tudo visível' },
      { id: 'elegante', nome: 'Elegante', descricao: 'Design sofisticado' }
    ],
    layout_ativo: 'padrao'
  });


  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-base'],
    queryFn: () => base44.entities.Usuario.list(),
  });

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos'],
    queryFn: () => base44.entities.Cargo.list('nivel_hierarquia'),
  });

  const { data: usuariosSistema = [] } = useQuery({ // Added for system-specific user data
    queryKey: ['usuarios-sistema'],
    queryFn: () => base44.entities.UsuarioSistema.list(),
  });

  const createUsuarioMutation = useMutation({
    mutationFn: async (data) => {
      // Separar dados do Usuario e do UsuarioSistema
      const { codigo_barras_autorizacao, senha_autorizacao, cargo_id, ...usuarioData } = data;

      // Criar o Usuario
      const novoUsuario = await base44.entities.Usuario.create({
        ...usuarioData,
        cargo_id: cargo_id || null
      });

      // Se tiver cargo ou dados de autorização, criar UsuarioSistema
      if (cargo_id || codigo_barras_autorizacao || senha_autorizacao) {
        const cargo = cargo_id ? cargos.find(c => c.id === cargo_id) : null;
        await base44.entities.UsuarioSistema.create({
          user_id: novoUsuario.id,
          email: novoUsuario.email,
          nome: novoUsuario.nome,
          cargo_id: cargo_id || null,
          cargo_nome: cargo?.nome || null,
          codigo_barras_autorizacao: codigo_barras_autorizacao || null,
          senha_autorizacao: senha_autorizacao || null,
          ativo: true
        });
      }

      return novoUsuario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-base'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      toast.success("Usuário criado com sucesso!");
      setDialogUsuario(false);
      setEditingUsuario(null);
      setUsuarioData({ nome: "", email: "", telefone: "", cargo_id: "", senha: "", codigo_barras_autorizacao: "", senha_autorizacao: "", ativo: true });
    },
    onError: (error) => {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário", {
        description: error.message || "Verifique os dados e tente novamente."
      });
    }
  });

  const updateUsuarioBaseMutation = useMutation({
    mutationFn: async ({ id, data, usuarioSistemaId }) => {
      // Separar dados do Usuario e do UsuarioSistema
      const { codigo_barras_autorizacao, senha_autorizacao, cargo_id, ...usuarioData } = data;

      // Atualizar o Usuario
      const usuarioAtualizado = await base44.entities.Usuario.update(id, {
        ...usuarioData,
        cargo_id: cargo_id || null
      });

      // Atualizar ou criar UsuarioSistema
      if (usuarioSistemaId) {
        // Atualizar existente
        await base44.entities.UsuarioSistema.update(usuarioSistemaId, {
          nome: usuarioAtualizado.nome,
          email: usuarioAtualizado.email,
          codigo_barras_autorizacao: codigo_barras_autorizacao || null,
          senha_autorizacao: senha_autorizacao || null,
          cargo_id: cargo_id || null,
          cargo_nome: cargo_id ? cargos.find(c => c.id === cargo_id)?.nome : null
        });
      } else {
        // Criar novo UsuarioSistema se não existe
        const cargo = cargo_id ? cargos.find(c => c.id === cargo_id) : null;
        await base44.entities.UsuarioSistema.create({
          user_id: id,
          email: usuarioAtualizado.email,
          nome: usuarioAtualizado.nome,
          cargo_id: cargo_id || null,
          cargo_nome: cargo?.nome || null,
          codigo_barras_autorizacao: codigo_barras_autorizacao || null,
          senha_autorizacao: senha_autorizacao || null,
          ativo: true
        });
      }

      return usuarioAtualizado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-base'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      toast.success("Usuário atualizado com sucesso!");
      setDialogUsuario(false);
      setEditingUsuario(null);
      setUsuarioData({ nome: "", email: "", telefone: "", cargo_id: "", senha: "", codigo_barras_autorizacao: "", senha_autorizacao: "", ativo: true });
    },
    onError: (error) => {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário", {
        description: error.message || "Verifique os dados e tente novamente."
      });
    }
  });

  const deleteUsuarioMutation = useMutation({
    mutationFn: async ({ usuarioId, usuarioSistemaId }) => {
      // Primeiro deletar o UsuarioSistema se existir
      if (usuarioSistemaId) {
        await base44.entities.UsuarioSistema.delete(usuarioSistemaId);
      }
      // Depois deletar o Usuario
      await base44.entities.Usuario.delete(usuarioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-base'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Erro ao excluir usuário", {
        description: error.message || "Verifique se não há dependências."
      });
    }
  });

  const createCargoMutation = useMutation({
    mutationFn: async (data) => {
      const novoCargo = await base44.entities.Cargo.create(data);

      // CRÍTICO: Registrar log de criação de cargo
      try {
        await base44.entities.LogAuditoria.create({
          usuario_id: user?.id || 'sistema',
          usuario_nome: user?.nome || 'Sistema',
          acao: 'criar',
          recurso: 'Cargo',
          recurso_id: novoCargo.id,
          descricao: `Cargo criado: ${data.nome}`,
          dados_depois: data,
          data_hora: new Date().toISOString()
        });
      } catch (logError) {
        console.error('❌ Erro ao registrar log de cargo:', logError);
      }

      return novoCargo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success("Cargo criado!");
      setDialogCargo(false);
      setCargoData({ nome: "", nivel_hierarquia: 5, descricao: "", permissoes: { ...permissoesPadrao } });
    },
  });

  const updateCargoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const resultado = await base44.entities.Cargo.update(id, data);

      // CRÍTICO: Registrar log de alteração de cargo
      try {
        const cargoAnterior = cargos.find(c => c.id === id);
        await base44.entities.LogAuditoria.create({
          usuario_id: user?.id || 'sistema',
          usuario_nome: user?.nome || 'Sistema',
          acao: 'editar',
          recurso: 'Cargo',
          recurso_id: id,
          descricao: `Cargo alterado: ${data.nome}`,
          dados_antes: cargoAnterior,
          dados_depois: data,
          data_hora: new Date().toISOString()
        });
      } catch (logError) {
        console.error('❌ Erro ao registrar log de cargo:', logError);
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] }); // Invalidate users to update cargo_nome/nivel_hierarquia
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success("Cargo atualizado!");
      setDialogCargo(false);
      setEditingCargo(null);
      setCargoData({ nome: "", nivel_hierarquia: 5, descricao: "", permissoes: { ...permissoesPadrao } });
    },
  });

  const deleteCargoMutation = useMutation({
    mutationFn: (id) => base44.entities.Cargo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-sistema'] }); // Invalidate users to update cargo_nome/nivel_hierarquia
      toast.success("Cargo excluído!");
    },
  });

  const handleOpenCargo = (cargo = null) => {
    if (cargo) {
      setEditingCargo(cargo);
      // Merge cargo permissões com permissões padrão para garantir que todas existam
      setCargoData({
        ...cargo,
        permissoes: { ...permissoesPadrao, ...(cargo.permissoes || {}) }
      });
    } else {
      setCargoData({
        nome: "",
        nivel_hierarquia: 5,
        descricao: "",
        permissoes: { ...permissoesPadrao }
      });
      setEditingCargo(null);
    }
    setDialogCargo(true);
  };

  const handleSubmitCargo = () => {
    // CRÍTICO: Validações completas de cargo
    if (!cargoData.nome || cargoData.nome.trim() === "") {
      toast.error("Digite o nome do cargo!");
      return;
    }

    const nivelHier = parseInt(cargoData.nivel_hierarquia);
    if (isNaN(nivelHier) || nivelHier < 1 || nivelHier > 5) {
      toast.error("Nível hierárquico deve estar entre 1 e 5!");
      return;
    }

    if (editingCargo) {
      updateCargoMutation.mutate({ id: editingCargo.id, data: cargoData }); // Used cargoData
    } else {
      createCargoMutation.mutate(cargoData); // Used cargoData
    }
  };

  const handleDeleteCargo = async (cargo) => {
    // Check if any user is assigned to this cargo before deleting
    const usersWithCargo = usuariosSistema.filter(user => user.cargo_id === cargo.id);
    if (usersWithCargo.length > 0) {
      toast.error(`Não é possível excluir o cargo "${cargo.nome}". Existem ${usersWithCargo.length} usuários atribuídos a ele.`);
      return;
    }

    const resposta = await confirm({
      title: "Excluir Cargo",
      description: `Tem certeza que deseja excluir o cargo "${cargo.nome}"? Esta ação é irreversível.`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      deleteCargoMutation.mutate(cargo.id);
    }
  };

  const handleSave = async () => {
    setSalvando(true);
    try {
      localStorage.setItem('configuracoes_erp', JSON.stringify(configuracoes));

      // CRÍTICO: Registrar log de auditoria das configurações
      try {
        await base44.entities.LogAuditoria.create({
          usuario_id: user?.id || 'sistema',
          usuario_nome: user?.nome || 'Sistema',
          acao: 'editar',
          recurso: 'Configuracao',
          recurso_id: 'sistema_geral',
          descricao: 'Configurações do sistema atualizadas',
          dados_depois: configuracoes,
          data_hora: new Date().toISOString()
        });
      } catch (logError) {
        console.error('❌ Erro ao registrar log de configurações:', logError);
      }

      // Salvar no banco de dados
      try {
        const configExistente = await base44.entities.Configuracao.filter({ chave: 'sistema_geral' });
        if (configExistente && configExistente.length > 0) {
          await base44.entities.Configuracao.update(configExistente[0].id, {
            chave: 'sistema_geral',
            valor: configuracoes
          });
        } else {
          await base44.entities.Configuracao.create({
            chave: 'sistema_geral',
            valor: configuracoes
          });
        }
      } catch (error) {
        console.error('Erro ao salvar no banco:', error);
      }

      // Disparar evento para atualizar outras páginas
      window.dispatchEvent(new Event('configuracoes_atualizadas'));
      // Invalidar queries para atualizar dados em todas as páginas sem reload
      queryClient.invalidateQueries();
      toast.success("Configurações salvas com sucesso!", {
        description: "Todas as alterações foram aplicadas ao sistema.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações", {
        description: "Tente novamente mais tarde."
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const url = uploadResult.url || uploadResult.file_url;

      if (!url) {
        toast.error("Servidor não retornou link válido da Imagem.");
        return setUploading(false);
      }

      // Atualizar o estado - NÃO RESETAR OUTRAS CONFIGURAÇÕES
      setConfiguracoes(prev => ({
        ...prev,
        empresa: { ...prev.empresa, logo_url: url }
      }));

      // CRÍTICO: Salvar no banco de dados para persistência permanente
      const configAtual = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
      const novasConfigs = {
        ...configAtual,
        empresa: { ...configAtual.empresa, logo_url: url }
      };
      localStorage.setItem('configuracoes_erp', JSON.stringify(novasConfigs));
      window.dispatchEvent(new Event('configuracoes_atualizadas'));

      // Salvar no banco de dados
      try {
        const configExistente = await base44.entities.Configuracao.filter({ chave: 'sistema_geral' });
        if (configExistente && configExistente.length > 0) {
          await base44.entities.Configuracao.update(configExistente[0].id, {
            chave: 'sistema_geral',
            valor: novasConfigs
          });
        } else {
          await base44.entities.Configuracao.create({
            chave: 'sistema_geral',
            valor: novasConfigs
          });
        }
      } catch (dbError) {
        console.error('❌ Erro ao salvar logo no banco:', dbError);
      }

      toast.success("Logo atualizada e salva no banco!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da logo");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (secao, campo, valor) => {
    setConfiguracoes(prev => ({
      ...prev,
      [secao]: { ...(prev[secao] || {}), [campo]: valor }
    }));
  };

  const handleAddItemChecklist = () => {
    if (!novoItemChecklist.label.trim()) {
      toast.error("Digite o nome do item");
      return;
    }

    const tipoChecklist = novoItemChecklist.tipo === "entrada" ? "checklist_entrada" : "checklist_finalizacao";
    const novoId = novoItemChecklist.label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const novoItem = {
      id: novoId,
      label: novoItemChecklist.label.trim(),
      ativo: true,
      tipo: "boolean" // Default to boolean for new user-added items
    };

    const checklistAtual = configuracoes.os?.[tipoChecklist] || [];

    // Verificar se já existe
    if (checklistAtual.some(item => item.id === novoId)) {
      toast.error("Já existe um item com este nome");
      return;
    }

    handleChange('os', tipoChecklist, [...checklistAtual, novoItem]);
    setNovoItemChecklist({ label: "", tipo: novoItemChecklist.tipo }); // Keep the current type selection
    toast.success("Item adicionado!");
  };

  const handleRemoveItemChecklist = async (tipo, itemId) => {
    const tipoChecklist = tipo === "entrada" ? "checklist_entrada" : "checklist_finalizacao";
    const checklistAtual = configuracoes.os?.[tipoChecklist] || [];

    const resposta = await confirm({
      title: "Remover Item",
      description: "Tem certeza que deseja remover este item?",
      confirmText: "Sim, Remover",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      handleChange('os', tipoChecklist, checklistAtual.filter(item => item.id !== itemId));
      toast.success("Item removido!");
    }
  };

  const handleToggleItemChecklist = (tipo, itemId) => {
    const tipoChecklist = tipo === "entrada" ? "checklist_entrada" : "checklist_finalizacao";
    const checklistAtual = configuracoes.os?.[tipoChecklist] || [];

    handleChange('os', tipoChecklist, checklistAtual.map(item =>
      item.id === itemId ? { ...item, ativo: !item.ativo } : item
    ));
  };

  const handleAddAcessorio = () => {
    if (!novoAcessorio.trim()) {
      toast.error("Digite o nome do acessório");
      return;
    }

    const acessorios = configuracoes.seminovos?.acessorios_customizados || [];
    const novoId = novoAcessorio.toLowerCase().trim().replace(/\s+/g, '_');

    if (acessorios.some(a => a.id === novoId)) {
      toast.error("Já existe um acessório com este nome");
      return;
    }

    handleChange('seminovos', 'acessorios_customizados', [
      ...acessorios,
      { id: novoId, label: novoAcessorio.trim() }
    ]);

    setNovoAcessorio("");
    toast.success("Acessório adicionado!");
  };

  const handleRemoveAcessorio = async (acessorioId) => {
    const acessorios = configuracoes.seminovos?.acessorios_customizados || [];

    const resposta = await confirm({
      title: "Remover Acessório",
      description: "Tem certeza que deseja remover este acessório?",
      confirmText: "Sim, Remover",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      handleChange('seminovos', 'acessorios_customizados',
        acessorios.filter(a => a.id !== acessorioId)
      );
      toast.success("Acessório removido!");
    }
  };

  // Lista de tabelas para backup completo (ordenadas por dependência)
  const tabelasBackup = [
    // Tabelas sem dependências (cadastros básicos)
    { nome: "Cargo", entidade: "Cargo", label: "Cargos" },
    { nome: "Categoria", entidade: "Categoria", label: "Categorias" },
    { nome: "CategoriaDespesa", entidade: "CategoriaDespesa", label: "Categorias de Despesa" },
    { nome: "Marca", entidade: "Marca", label: "Marcas" },
    { nome: "TipoEvento", entidade: "TipoEvento", label: "Tipos de Evento" },
    { nome: "Loja", entidade: "Loja", label: "Lojas" },
    { nome: "PastaWhatsApp", entidade: "PastaWhatsApp", label: "Pastas WhatsApp" },
    { nome: "EtiquetaWhatsApp", entidade: "EtiquetaWhatsApp", label: "Etiquetas WhatsApp" },
    { nome: "CupomDesconto", entidade: "CupomDesconto", label: "Cupons de Desconto" },
    { nome: "ContaBancaria", entidade: "ContaBancaria", label: "Contas Bancárias" },
    { nome: "ConfigWhatsApp", entidade: "ConfigWhatsApp", label: "Config WhatsApp" },
    { nome: "ChatbotConfig", entidade: "ChatbotConfig", label: "Config Chatbot" },

    // Tabelas com dependências de nível 1
    { nome: "Fornecedor", entidade: "Fornecedor", label: "Fornecedores" },
    { nome: "Cliente", entidade: "Cliente", label: "Clientes" },
    { nome: "Usuario", entidade: "Usuario", label: "Usuários" },
    { nome: "UsuarioSistema", entidade: "UsuarioSistema", label: "Usuários do Sistema" },
    { nome: "Familia", entidade: "Familia", label: "Famílias" },

    // Tabelas com dependências de nível 2
    { nome: "Produto", entidade: "Produto", label: "Produtos" },
    { nome: "Caixa", entidade: "Caixa", label: "Caixas" },
    { nome: "Evento", entidade: "Evento", label: "Eventos/Agenda" },
    { nome: "ContaRecorrente", entidade: "ContaRecorrente", label: "Contas Recorrentes" },
    { nome: "LeadCRM", entidade: "LeadCRM", label: "Leads CRM" },
    { nome: "ConversaWhatsApp", entidade: "ConversaWhatsApp", label: "Conversas WhatsApp" },

    // Tabelas transacionais
    { nome: "Venda", entidade: "Venda", label: "Vendas" },
    { nome: "OrdemServico", entidade: "OrdemServico", label: "Ordens de Serviço" },
    { nome: "AvaliacaoSeminovo", entidade: "AvaliacaoSeminovo", label: "Avaliações Seminovo" },
    { nome: "Compra", entidade: "Compra", label: "Compras" },
    { nome: "DisplaySeminovo", entidade: "DisplaySeminovo", label: "Displays Seminovo" },

    // Tabelas financeiras
    { nome: "ContaReceber", entidade: "ContaReceber", label: "Contas a Receber" },
    { nome: "ContaPagar", entidade: "ContaPagar", label: "Contas a Pagar" },
    { nome: "Comissao", entidade: "Comissao", label: "Comissões" },
    { nome: "Transferencia", entidade: "Transferencia", label: "Transferências" },
    { nome: "MovimentacaoCaixa", entidade: "MovimentacaoCaixa", label: "Movimentações de Caixa" },

    // Tabelas de movimentação
    { nome: "MovimentacaoEstoque", entidade: "MovimentacaoEstoque", label: "Movimentações de Estoque" },
    { nome: "TransferenciaEstoque", entidade: "TransferenciaEstoque", label: "Transferências de Estoque" },
    { nome: "Devolucao", entidade: "Devolucao", label: "Devoluções" },

    // Tabelas de log/auditoria
    { nome: "LogDesconto", entidade: "LogDesconto", label: "Logs de Desconto" },
    { nome: "Notificacao", entidade: "Notificacao", label: "Notificações" },

    // Configurações do banco
    { nome: "Configuracao", entidade: "Configuracao", label: "Configurações do Sistema" },
  ];

  // Backup functions for the top-level backup tab
  const exportarBackup = async () => {
    setExportando(true);
    setDialogBackup(true);

    try {
      const backup = {
        configuracoes,
        data_backup: new Date().toISOString(),
        versao: "2.0",
        tipo: tipoBackup,
        dados: {}
      };

      if (tipoBackup === "completo") {
        const totalTabelas = tabelasBackup.length;

        for (let i = 0; i < totalTabelas; i++) {
          const tabela = tabelasBackup[i];
          setProgressoBackup({ atual: i + 1, total: totalTabelas, tabela: tabela.label });

          try {
            const dados = await base44.entities[tabela.entidade].list();
            backup.dados[tabela.nome] = dados || [];
          } catch (error) {
            backup.dados[tabela.nome] = [];
          }
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      const dataAtual = new Date();
      const ano = dataAtual.getFullYear();
      const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
      const dia = String(dataAtual.getDate()).padStart(2, '0');
      const hora = String(dataAtual.getHours()).padStart(2, '0');
      const minuto = String(dataAtual.getMinutes()).padStart(2, '0');

      const prefixo = tipoBackup === "completo" ? "backup_completo" : "backup_config";
      link.download = `${prefixo}_${ano}-${mes}-${dia}_${hora}${minuto}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Backup ${tipoBackup === "completo" ? "completo" : "de configurações"} exportado com sucesso!`);
    } catch (error) {
      toast.error("Erro ao exportar backup");
      console.error("Erro ao exportar backup:", error);
    } finally {
      setExportando(false);
      setDialogBackup(false);
      setProgressoBackup({ atual: 0, total: 0, tabela: "" });
    }
  };

  const importarBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setImportando(true);
      setDialogBackup(true);

      try {
        const backup = JSON.parse(event.target.result);

        // Restaurar configurações locais
        if (backup.configuracoes) {
          const mergedConfigs = mergeWithDefaults(backup.configuracoes);
          setConfiguracoes(mergedConfigs);
          localStorage.setItem('configuracoes_erp', JSON.stringify(mergedConfigs));
        }

        // Restaurar dados do banco (se backup completo)
        if (backup.dados && Object.keys(backup.dados).length > 0) {
          const tabelas = Object.keys(backup.dados);
          const totalTabelas = tabelas.length;
          let restaurados = 0;
          let erros = 0;

          for (let i = 0; i < tabelasBackup.length; i++) {
            const tabela = tabelasBackup[i];
            const dados = backup.dados[tabela.nome];

            if (!dados || dados.length === 0) continue;

            setProgressoBackup({ atual: i + 1, total: tabelasBackup.length, tabela: `Restaurando ${tabela.label}` });

            try {
              // Para cada registro, tentar criar (pode falhar se já existir)
              for (const registro of dados) {
                try {
                  // Remover campos de auditoria que podem causar conflito
                  const { id, created_date, updated_date, ...dadosLimpos } = registro;

                  // Tentar verificar se já existe pelo ID
                  try {
                    const existente = await base44.entities[tabela.entidade].get(id);
                    if (existente) {
                      // Atualizar registro existente
                      await base44.entities[tabela.entidade].update(id, dadosLimpos);
                    }
                  } catch {
                    // Não existe, criar novo
                    await base44.entities[tabela.entidade].create(dadosLimpos);
                  }
                  restaurados++;
                } catch (err) {
                  erros++;
                }
              }
            } catch (error) {
              erros++;
            }
          }

          if (erros > 0) {
            toast.warning(`Backup restaurado com ${erros} erros. Alguns registros podem já existir.`);
          } else {
            toast.success("Backup completo restaurado com sucesso!");
          }
        } else {
          toast.success("Configurações restauradas com sucesso!");
        }

        // Recarregar página após 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error) {
        toast.error("Erro ao importar backup: arquivo corrompido ou formato inválido.");
        console.error("Erro ao importar backup:", error);
      } finally {
        setImportando(false);
        setDialogBackup(false);
        setProgressoBackup({ atual: 0, total: 0, tabela: "" });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };


  React.useEffect(() => {
    // CRÍTICO: Carregar configurações do banco de dados primeiro (prioridade)
    const loadConfiguracoes = async () => {
      try {
        const configDB = await base44.entities.Configuracao.filter({ chave: 'sistema_geral' });
        if (configDB && configDB.length > 0 && configDB[0].valor) {
          const parsed = configDB[0].valor;
          const mergedConfigs = mergeWithDefaults(parsed);
          setConfiguracoes(mergedConfigs);
          localStorage.setItem('configuracoes_erp', JSON.stringify(mergedConfigs));

          if (parsed.template_os) {
            setTemplateOS(parsed.template_os);
          }
          return;
        }
      } catch (error) {
        console.error("Erro ao carregar do banco:", error);
      }

      // Fallback: carregar do localStorage se não houver no banco
      const configSalva = localStorage.getItem('configuracoes_erp');
      if (configSalva) {
        try {
          const parsed = JSON.parse(configSalva);
          const mergedConfigs = mergeWithDefaults(parsed);
          setConfiguracoes(mergedConfigs);

          if (parsed.template_os) {
            setTemplateOS(parsed.template_os);
          }
        } catch (error) {
          console.error("Erro ao carregar configurações:", error);
          setConfiguracoes(configuracoesDefault);
        }
      }
    };

    loadConfiguracoes();
  }, []);

  const aplicarLayoutPredefinido = (layoutId) => {
    const templates = {
      compacto: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1, largura: '100%',
            campos: [
              { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: false },
              { id: 'empresa_nome', tipo: 'texto', label: 'Empresa', visivel: true, tamanho: 'medio', negrito: true },
              { id: 'codigo_os', tipo: 'texto', label: 'OS', visivel: true, tamanho: 'grande', negrito: true }
            ]
          },
          {
            id: 'cliente', nome: 'Cliente', ativo: true, ordem: 2,
            campos: [
              { id: 'cliente_nome', tipo: 'texto', label: 'Nome', visivel: true, tamanho: 'medio' }
            ]
          },
          {
            id: 'aparelho', nome: 'Aparelho', ativo: true, ordem: 3,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'pequeno' },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'footer', nome: 'Rodapé', ativo: true, ordem: 4,
            campos: [{ id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura', visivel: true }]
          }
        ],
        estilo_global: { fonte: 'Arial', tamanho_fonte_base: '8px', cor_texto: '#000000', espacamento: 'compacto' }
      },
      padrao: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1,
            campos: [
              { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: true, tamanho: 'medio' },
              { id: 'empresa_nome', tipo: 'texto', label: 'Empresa', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'codigo_os', tipo: 'texto', label: 'OS', visivel: true, tamanho: 'grande', negrito: true }
            ]
          },
          {
            id: 'cliente', nome: 'Cliente', ativo: true, ordem: 2, borda: true,
            campos: [
              { id: 'cliente_nome', tipo: 'texto', label: 'Nome', visivel: true, tamanho: 'medio', negrito: true },
              { id: 'cliente_telefone', tipo: 'texto', label: 'Telefone', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'aparelho', nome: 'Aparelho', ativo: true, ordem: 3, borda: true,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'medio' },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'medio' },
              { id: 'aparelho_imei', tipo: 'texto', label: 'IMEI', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'checklist_entrada', nome: 'Checklist', ativo: true, ordem: 4, borda: true,
            campos: [{ id: 'checklist_visual', tipo: 'checklist', label: 'Verificação', visivel: true, colunas: 2 }]
          },
          {
            id: 'footer', nome: 'Rodapé', ativo: true, ordem: 5,
            campos: [
              { id: 'termos', tipo: 'texto_longo', label: 'Termos', visivel: true, tamanho: 'pequeno' },
              { id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura Cliente', visivel: true }
            ]
          }
        ],
        estilo_global: { fonte: 'Arial', tamanho_fonte_base: '10px', cor_texto: '#000000', espacamento: 'normal', borda_secoes: true }
      },
      minimalista: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1,
            campos: [
              { id: 'codigo_os', tipo: 'texto', label: 'OS', visivel: true, tamanho: 'grande', negrito: true }
            ]
          },
          {
            id: 'cliente', nome: 'Cliente', ativo: true, ordem: 2,
            campos: [{ id: 'cliente_nome', tipo: 'texto', label: 'Cliente', visivel: true, tamanho: 'medio' }]
          },
          {
            id: 'aparelho', nome: 'Aparelho', ativo: true, ordem: 3,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'pequeno' },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'footer', nome: 'Rodapé', ativo: true, ordem: 4,
            campos: [{ id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura', visivel: true }]
          }
        ],
        estilo_global: { fonte: 'Helvetica', tamanho_fonte_base: '9px', cor_texto: '#333333', espacamento: 'compacto', borda_secoes: false }
      },
      detalhado: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1, borda: true,
            campos: [
              { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: true, tamanho: 'grande' },
              { id: 'empresa_nome', tipo: 'texto', label: 'Empresa', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'empresa_cnpj', tipo: 'texto', label: 'CNPJ', visivel: true, tamanho: 'pequeno' },
              { id: 'codigo_os', tipo: 'texto', label: 'Código OS', visivel: true, tamanho: 'grande', negrito: true }
            ]
          },
          {
            id: 'cliente', nome: 'Cliente', ativo: true, ordem: 2, borda: true,
            campos: [
              { id: 'cliente_nome', tipo: 'texto', label: 'Nome Completo', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'cliente_telefone', tipo: 'texto', label: 'Telefone', visivel: true, tamanho: 'medio' },
              { id: 'cliente_email', tipo: 'texto', label: 'Email', visivel: true, tamanho: 'pequeno' },
              { id: 'cliente_endereco_completo', tipo: 'texto', label: 'Endereço', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'aparelho', nome: 'Aparelho', ativo: true, ordem: 3, borda: true,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'medio' },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'medio' },
              { id: 'aparelho_imei', tipo: 'texto', label: 'IMEI', visivel: true, tamanho: 'medio' },
              { id: 'aparelho_serial', tipo: 'texto', label: 'Serial', visivel: true, tamanho: 'pequeno' },
              { id: 'aparelho_cor', tipo: 'texto', label: 'Cor', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'defeito', nome: 'Defeito', ativo: true, ordem: 4, borda: true,
            campos: [{ id: 'defeito_reclamado', tipo: 'texto_longo', label: 'Defeito Relatado', visivel: true }]
          },
          {
            id: 'checklist_entrada', nome: 'Checklist', ativo: true, ordem: 5, borda: true,
            campos: [{ id: 'checklist_visual', tipo: 'checklist', label: 'Verificações', visivel: true, colunas: 2 }]
          },
          {
            id: 'footer', nome: 'Rodapé', ativo: true, ordem: 6,
            campos: [
              { id: 'termos', tipo: 'texto_longo', label: 'Termos e Condições', visivel: true, tamanho: 'pequeno' },
              { id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura do Cliente', visivel: true }
            ]
          }
        ],
        estilo_global: { fonte: 'Arial', tamanho_fonte_base: '11px', cor_texto: '#000000', espacamento: 'amplo', borda_secoes: true }
      },
      amplo: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1,
            campos: [
              { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: true, tamanho: 'grande' },
              { id: 'empresa_nome', tipo: 'texto', label: 'Empresa', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'codigo_os', tipo: 'texto', label: 'OS', visivel: true, tamanho: 'grande', negrito: true }
            ]
          },
          {
            id: 'cliente', nome: 'Dados do Cliente', ativo: true, ordem: 2, borda: true,
            campos: [
              { id: 'cliente_nome', tipo: 'texto', label: 'Nome', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'cliente_telefone', tipo: 'texto', label: 'Telefone', visivel: true, tamanho: 'medio' }
            ]
          },
          {
            id: 'aparelho', nome: 'Dados do Aparelho', ativo: true, ordem: 3, borda: true,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'grande' },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'grande' },
              { id: 'aparelho_imei', tipo: 'texto', label: 'IMEI', visivel: true, tamanho: 'medio' }
            ]
          },
          {
            id: 'checklist_entrada', nome: 'Checklist de Entrada', ativo: true, ordem: 4, borda: true,
            campos: [{ id: 'checklist_visual', tipo: 'checklist', label: 'Itens', visivel: true, colunas: 2 }]
          },
          {
            id: 'footer', nome: 'Rodapé', ativo: true, ordem: 5,
            campos: [
              { id: 'termos', tipo: 'texto_longo', label: 'Termos', visivel: true, tamanho: 'medio' },
              { id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura', visivel: true }
            ]
          }
        ],
        estilo_global: { fonte: 'Arial', tamanho_fonte_base: '12px', cor_texto: '#000000', espacamento: 'amplo', borda_secoes: true }
      },
      elegante: {
        secoes: [
          {
            id: 'header', nome: 'Cabeçalho', ativo: true, ordem: 1, cor_fundo: '#f8f9fa',
            campos: [
              { id: 'logo', tipo: 'imagem', label: 'Logo', visivel: true, tamanho: 'grande', alinhamento: 'centro' },
              { id: 'empresa_nome', tipo: 'texto', label: 'Empresa', visivel: true, tamanho: 'grande', negrito: true, alinhamento: 'centro' },
              { id: 'codigo_os', tipo: 'texto', label: 'Ordem de Serviço', visivel: true, tamanho: 'grande', negrito: true, alinhamento: 'centro' }
            ]
          },
          {
            id: 'cliente', nome: 'Informações do Cliente', ativo: true, ordem: 2, borda: true,
            campos: [
              { id: 'cliente_nome', tipo: 'texto', label: 'Cliente', visivel: true, tamanho: 'grande', negrito: true },
              { id: 'cliente_telefone', tipo: 'texto', label: 'Contato', visivel: true, tamanho: 'medio' }
            ]
          },
          {
            id: 'aparelho', nome: 'Dados Técnicos', ativo: true, ordem: 3, borda: true,
            campos: [
              { id: 'aparelho_marca', tipo: 'texto', label: 'Marca', visivel: true, tamanho: 'medio', negrito: true },
              { id: 'aparelho_modelo', tipo: 'texto', label: 'Modelo', visivel: true, tamanho: 'medio', negrito: true },
              { id: 'aparelho_imei', tipo: 'texto', label: 'IMEI', visivel: true, tamanho: 'pequeno' }
            ]
          },
          {
            id: 'checklist_entrada', nome: 'Verificação de Entrada', ativo: true, ordem: 4, borda: true,
            campos: [{ id: 'checklist_visual', tipo: 'checklist', label: 'Status', visivel: true, colunas: 2 }]
          },
          {
            id: 'footer', nome: 'Termos e Assinatura', ativo: true, ordem: 5, cor_fundo: '#f8f9fa',
            campos: [
              { id: 'termos', tipo: 'texto_longo', label: 'Condições', visivel: true, tamanho: 'pequeno' },
              { id: 'assinatura_cliente', tipo: 'linha_assinatura', label: 'Assinatura do Cliente', visivel: true }
            ]
          }
        ],
        estilo_global: { fonte: 'Helvetica', tamanho_fonte_base: '10px', cor_texto: '#1a1a1a', espacamento: 'normal', borda_secoes: true }
      }
    };

    const templateSelecionado = templates[layoutId];
    if (templateSelecionado) {
      setTemplateOS(prev => ({
        ...prev,
        secoes: templateSelecionado.secoes,
        estilo_global: templateSelecionado.estilo_global,
        layout_ativo: layoutId
      }));
      toast.success(`✅ Template "${layoutId}" aplicado com sucesso!`);
    } else {
      setTemplateOS(prev => ({ ...prev, layout_ativo: layoutId }));
      toast.info(`Template "${layoutId}" selecionado (aplicação pendente)`);
    }
  };

  const handleSalvarTemplate = async () => {
    // Merge templateOS into the main configuracoes object for storage
    const novasConfigs = {
      ...configuracoes,
      template_os: templateOS
    };
    setConfiguracoes(novasConfigs); // Update local state
    localStorage.setItem('configuracoes_erp', JSON.stringify(novasConfigs)); // Persist to local storage

    // Salvar também no banco de dados para persistência
    try {
      const configExistente = await base44.entities.Configuracao.filter({ chave: 'sistema_geral' });
      if (configExistente && configExistente.length > 0) {
        await base44.entities.Configuracao.update(configExistente[0].id, {
          chave: 'sistema_geral',
          valor: novasConfigs
        });
      } else {
        await base44.entities.Configuracao.create({
          chave: 'sistema_geral',
          valor: novasConfigs
        });
      }
      toast.success("Template de OS salvo com sucesso!");
    } catch (error) {
      console.error('❌ Erro ao salvar template no banco:', error);
      toast.success("Template salvo localmente!"); // Still works locally
    }
  };

  const toggleSecao = (secaoId) => {
    setTemplateOS(prev => ({
      ...prev,
      secoes: prev.secoes.map(s =>
        s.id === secaoId ? { ...s, ativo: !s.ativo } : s
      )
    }));
  };

  const toggleCampo = (secaoId, campoId) => {
    setTemplateOS(prev => ({
      ...prev,
      secoes: prev.secoes.map(s =>
        s.id === secaoId ? {
          ...s,
          campos: s.campos.map(c =>
            c.id === campoId ? { ...c, visivel: !c.visivel } : c
          )
        } : s
      )
    }));
  };

  const editarCampo = (secaoId, campoId, propriedade, valor) => {
    setTemplateOS(prev => ({
      ...prev,
      secoes: prev.secoes.map(s =>
        s.id === secaoId ? {
          ...s,
          campos: s.campos.map(c =>
            c.id === campoId ? { ...c, [propriedade]: valor } : c
          )
        } : s
      )
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500">Gerencie as configurações do sistema</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={salvando}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {salvando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-11 w-full"> {/* Updated grid-cols */}
          <TabsTrigger value="empresa">
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="pdv">
            <Settings className="w-4 h-4 mr-2" />
            PDV
          </TabsTrigger>
          <TabsTrigger value="calculadora">
            <Settings className="w-4 h-4 mr-2" />
            Calc.
          </TabsTrigger>
          <TabsTrigger value="os">
            <Settings className="w-4 h-4 mr-2" />
            OS
          </TabsTrigger>
          <TabsTrigger value="seminovos">
            <Settings className="w-4 h-4 mr-2" />
            Semi.
          </TabsTrigger>
          <TabsTrigger value="impressao">
            <Printer className="w-4 h-4 mr-2" />
            Imp.
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Monitor className="w-4 h-4 mr-2" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="notificacoes">
            <Bell className="w-4 h-4 mr-2" />
            Notific.
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="sistema">
            <Settings className="w-4 h-4 mr-2" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="backup"> {/* New tab trigger */}
            <Database className="w-4 h-4 mr-2" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* Empresa */}
        <TabsContent value="empresa">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo da Empresa</Label>
                <div className="mt-2">
                  {configuracoes.empresa?.logo_url ? (
                    <img
                      src={typeof configuracoes.empresa.logo_url === 'string' ? configuracoes.empresa.logo_url : (configuracoes.empresa.logo_url.url || configuracoes.empresa.logo_url.file_url)}
                      alt="Logo"
                      className="w-32 h-32 object-contain border rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                      <Building2 className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 w-full md:w-64 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
                    <Camera className="w-5 h-5 mr-2 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {uploading ? "Enviando..." : "Alterar Logo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={configuracoes.empresa?.nome ?? configuracoesDefault.empresa.nome}
                    onChange={(e) => handleChange('empresa', 'nome', e.target.value)}
                  />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input
                    value={configuracoes.empresa?.cnpj ?? configuracoesDefault.empresa.cnpj}
                    onChange={(e) => handleChange('empresa', 'cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={configuracoes.empresa?.telefone ?? configuracoesDefault.empresa.telefone}
                    onChange={(e) => handleChange('empresa', 'telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={configuracoes.empresa?.email ?? configuracoesDefault.empresa.email}
                    onChange={(e) => handleChange('empresa', 'email', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    value={configuracoes.empresa?.endereco ?? configuracoesDefault.empresa.endereco}
                    onChange={(e) => handleChange('empresa', 'endereco', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDV - REFORMULADO COM SUB-ABAS */}
        <TabsContent value="pdv">
          <Tabs defaultValue="geral" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="descontos">Descontos</TabsTrigger>
              <TabsTrigger value="pix">PIX</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="interface">Interface</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Configurações Gerais do PDV</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Modo Tela Cheia Automático</Label>
                      <p className="text-sm text-slate-500">PDV abre automaticamente em tela cheia</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.tela_cheia_automatica ?? configuracoesDefault.pdv.tela_cheia_automatica}
                      onCheckedChange={(c) => handleChange('pdv', 'tela_cheia_automatica', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Confirmar Antes de Finalizar</Label>
                      <p className="text-sm text-slate-500">Pedir confirmação ao finalizar venda</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.confirmar_antes_finalizar ?? configuracoesDefault.pdv.confirmar_antes_finalizar}
                      onCheckedChange={(c) => handleChange('pdv', 'confirmar_antes_finalizar', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Bloquear Venda sem Cliente</Label>
                      <p className="text-sm text-slate-500">Exigir seleção de cliente</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.bloquear_venda_sem_cliente ?? configuracoesDefault.pdv.bloquear_venda_sem_cliente}
                      onCheckedChange={(c) => handleChange('pdv', 'bloquear_venda_sem_cliente', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Impressão Automática do Cupom</Label>
                      <p className="text-sm text-slate-500">Imprimir automaticamente após venda</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.impressao_automatica_cupom ?? configuracoesDefault.pdv.impressao_automatica_cupom}
                      onCheckedChange={(c) => handleChange('pdv', 'impressao_automatica_cupom', c)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="descontos">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Controle de Descontos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exigir Senha para Desconto</Label>
                      <p className="text-sm text-slate-500">Solicitar autorização para descontos</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.exigir_senha_desconto ?? configuracoesDefault.pdv.exigir_senha_desconto}
                      onCheckedChange={(c) => handleChange('pdv', 'exigir_senha_desconto', c)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Solicitar Senha Acima de (%):</Label>
                    <Input
                      type="number"
                      value={configuracoes.pdv?.solicitar_senha_desconto_acima ?? configuracoesDefault.pdv.solicitar_senha_desconto_acima}
                      onChange={(e) => handleChange('pdv', 'solicitar_senha_desconto_acima', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Limitar Desconto Máximo</Label>
                      <p className="text-sm text-slate-500">Impedir descontos acima do limite</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.limitar_desconto_maximo ?? configuracoesDefault.pdv.limitar_desconto_maximo}
                      onCheckedChange={(c) => handleChange('pdv', 'limitar_desconto_maximo', c)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Desconto Máximo Permitido (%):</Label>
                    <Input
                      type="number"
                      value={configuracoes.pdv?.desconto_maximo_percentual ?? configuracoesDefault.pdv.desconto_maximo_percentual}
                      onChange={(e) => handleChange('pdv', 'desconto_maximo_percentual', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pix">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Configurações PIX</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>💳 Configure o PIX da sua loja:</strong> Use PIX fixo (manual) ou integração automática com gateways de pagamento.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div>
                      <Label className="font-semibold">Usar Integração Automática</Label>
                      <p className="text-sm text-slate-600">Gerar PIX via Mercado Pago ou Infinite Pay</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.pix_usar_integracao || false}
                      onCheckedChange={(c) => handleChange('pdv', 'pix_usar_integracao', c)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">PIX Fixo/Manual</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Chave PIX da Loja</Label>
                        <Input
                          value={configuracoes.pdv?.pix_chave || ""}
                          onChange={(e) => handleChange('pdv', 'pix_chave', e.target.value)}
                          placeholder="email@loja.com, telefone, CPF ou CNPJ"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Cliente fará PIX para esta chave
                        </p>
                      </div>

                      <div>
                        <Label>Nome do Beneficiário</Label>
                        <Input
                          value={configuracoes.pdv?.pix_beneficiario || ""}
                          onChange={(e) => handleChange('pdv', 'pix_beneficiario', e.target.value)}
                          placeholder="Nome da empresa ou titular"
                        />
                      </div>

                      <div>
                        <Label>QR Code PIX Fixo (Imagem)</Label>
                        <div className="mt-2">
                          {configuracoes.pdv?.pix_qrcode_imagem && (
                            <img
                              src={configuracoes.pdv.pix_qrcode_imagem}
                              alt="QR Code PIX"
                              className="w-48 h-48 object-contain border rounded-lg mb-3 mx-auto"
                            />
                          )}
                          <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
                            <QrCode className="w-5 h-5 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {uploading ? "Enviando..." : "Upload QR Code PIX"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setUploading(true);
                                try {
                                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                  handleChange('pdv', 'pix_qrcode_imagem', file_url);
                                  toast.success("QR Code carregado!");
                                } catch (error) {
                                  toast.error("Erro ao fazer upload");
                                } finally {
                                  setUploading(false);
                                }
                              }}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                          <p className="text-xs text-slate-500 mt-2 text-center">
                            💡 Carregue uma imagem do QR Code estático da sua conta PIX
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="estoque">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Controle de Estoque</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Venda com Estoque Negativo</Label>
                      <p className="text-sm text-slate-500">Vender mesmo sem estoque disponível</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.permitir_venda_estoque_negativo ?? configuracoesDefault.pdv.permitir_venda_estoque_negativo}
                      onCheckedChange={(c) => handleChange('pdv', 'permitir_venda_estoque_negativo', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alertar Estoque Baixo</Label>
                      <p className="text-sm text-slate-500">Mostrar aviso ao vender produto com estoque baixo</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.alertar_estoque_baixo ?? configuracoesDefault.pdv.alertar_estoque_baixo}
                      onCheckedChange={(c) => handleChange('pdv', 'alertar_estoque_baixo', c)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interface">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Interface e Experiência</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Som ao Adicionar Produto</Label>
                      <p className="text-sm text-slate-500">Feedback sonoro ao adicionar ao carrinho (Atalho: F2 = Pagamento, F3 = Cliente)</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.som_ao_adicionar ?? configuracoesDefault.pdv.som_ao_adicionar}
                      onCheckedChange={(c) => handleChange('pdv', 'som_ao_adicionar', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Atalhos de Teclado</Label>
                      <p className="text-sm text-slate-500">F1-F12 para ações rápidas</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.atalhos_teclado ?? configuracoesDefault.pdv.atalhos_teclado}
                      onCheckedChange={(c) => handleChange('pdv', 'atalhos_teclado', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exibir Sugestões de Produtos</Label>
                      <p className="text-sm text-slate-500">Sugestões baseadas em vendas anteriores</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.exibir_sugestoes_produtos ?? configuracoesDefault.pdv.exibir_sugestoes_produtos}
                      onCheckedChange={(c) => handleChange('pdv', 'exibir_sugestoes_produtos', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Lucro Estimado</Label>
                      <p className="text-sm text-slate-500">Exibir margem de lucro no carrinho</p>
                    </div>
                    <Switch
                      checked={configuracoes.pdv?.mostrar_lucro_estimado ?? configuracoesDefault.pdv.mostrar_lucro_estimado}
                      onCheckedChange={(c) => handleChange('pdv', 'mostrar_lucro_estimado', c)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Nova Tab Calculadora */}
        <TabsContent value="calculadora">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Taxas da Maquininha de Cartão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Configure as taxas da sua maquininha de cartão.</strong> Essas taxas serão usadas nos cálculos da Calculadora de Pagamentos.
                </p>
              </div>

              {/* Débito e Crédito 1x */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Débito (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={configuracoes.calculadora?.debito ?? configuracoesDefault.calculadora.debito}
                    onChange={(e) => handleChange('calculadora', 'debito', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Crédito 1x (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={configuracoes.calculadora?.credito_1x ?? configuracoesDefault.calculadora.credito_1x}
                    onChange={(e) => handleChange('calculadora', 'credito_1x', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Crédito Parcelado 2x-12x */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Crédito Parcelado</Label>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((parcela) => (
                    <div key={parcela}>
                      <Label className="text-xs">{parcela}x</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={configuracoes.calculadora?.[`credito_${parcela}x`] ?? configuracoesDefault.calculadora[`credito_${parcela}x`]}
                          onChange={(e) => handleChange('calculadora', `credito_${parcela}x`, parseFloat(e.target.value) || 0)}
                          className="h-9"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview das taxas */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Resumo das Taxas Configuradas:</h4>
                <div className="grid grid-cols-7 gap-2 text-center">
                  <div className="p-2 bg-blue-100 rounded">
                    <div className="text-xs text-slate-600">Débito</div>
                    <div className="font-bold text-blue-700">{configuracoes.calculadora?.debito ?? configuracoesDefault.calculadora.debito}%</div>
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((parcela) => (
                    <div key={parcela} className="p-2 bg-green-100 rounded">
                      <div className="text-xs text-slate-600">{parcela}x</div>
                      <div className="font-bold text-green-700">
                        {configuracoes.calculadora?.[`credito_${parcela}x`] ?? configuracoesDefault.calculadora[`credito_${parcela}x`]}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  💡 <strong>Dica:</strong> Consulte a tabela de taxas da sua maquininha (Stone, PagSeguro, Cielo, etc.) para configurar os valores corretos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ordens de Serviço (Updated with nested tabs) */}
        <TabsContent value="os">
          <Tabs defaultValue="geral" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="layout">Layout/Campos</TabsTrigger>
              <TabsTrigger value="automacao">Automação</TabsTrigger>
              <TabsTrigger value="editor">
                <Edit className="w-4 h-4 mr-2" />
                Editor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Configurações Gerais de OS</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Prazo Padrão (dias)</Label>
                      <Input
                        type="number"
                        value={configuracoes.os?.prazo_padrao_dias ?? configuracoesDefault.os.prazo_padrao_dias}
                        onChange={(e) => handleChange('os', 'prazo_padrao_dias', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Garantia Padrão (dias)</Label>
                      <Input
                        type="number"
                        value={configuracoes.os?.garantia_padrao_dias ?? configuracoesDefault.os.garantia_padrao_dias}
                        onChange={(e) => handleChange('os', 'garantia_padrao_dias', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Taxa Urgência (%)</Label>
                      <Input
                        type="number"
                        value={configuracoes.os?.taxa_urgencia_percentual ?? configuracoesDefault.os.taxa_urgencia_percentual}
                        onChange={(e) => handleChange('os', 'taxa_urgencia_percentual', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exigir Laudo Técnico</Label>
                      <p className="text-sm text-slate-500">Obrigatório preencher laudo antes de finalizar</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.exigir_laudo_tecnico ?? configuracoesDefault.os.exigir_laudo_tecnico}
                      onCheckedChange={(checked) => handleChange('os', 'exigir_laudo_tecnico', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Orçamento Parcial</Label>
                      <p className="text-sm text-slate-500">Cliente pode aprovar apenas parte do orçamento</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.permitir_orcamento_parcial ?? configuracoesDefault.os.permitir_orcamento_parcial}
                      onCheckedChange={(checked) => handleChange('os', 'permitir_orcamento_parcial', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checklist">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Gerenciar Itens do Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Personalize os itens de verificação</strong> que aparecem ao criar e finalizar ordens de serviço.
                    </p>
                  </div>

                  {/* Checklist de Entrada */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Checklist de Entrada</h3>
                    <div className="space-y-2">
                      {(configuracoes.os?.checklist_entrada || configuracoesDefault.os.checklist_entrada).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={item.ativo}
                              onCheckedChange={() => handleToggleItemChecklist('entrada', item.id)}
                            />
                            <span className={item.ativo ? "text-slate-900" : "text-slate-400"}>{item.label}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItemChecklist('entrada', item.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Novo item de entrada..."
                        value={novoItemChecklist.tipo === "entrada" ? novoItemChecklist.label : ""}
                        onChange={(e) => setNovoItemChecklist({ label: e.target.value, tipo: "entrada" })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddItemChecklist();
                          }
                        }}
                      />
                      <Button onClick={handleAddItemChecklist} disabled={novoItemChecklist.tipo !== "entrada"}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Checklist de Finalização */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Checklist de Finalização</h3>
                    <div className="space-y-2">
                      {(configuracoes.os?.checklist_finalizacao || configuracoesDefault.os.checklist_finalizacao).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={item.ativo}
                              onCheckedChange={() => handleToggleItemChecklist('finalizacao', item.id)}
                            />
                            <span className={item.ativo ? "text-slate-900" : "text-slate-400"}>{item.label}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItemChecklist('finalizacao', item.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Novo item de finalização..."
                        value={novoItemChecklist.tipo === "finalizacao" ? novoItemChecklist.label : ""}
                        onChange={(e) => setNovoItemChecklist({ label: e.target.value, tipo: "finalizacao" })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddItemChecklist();
                          }
                        }}
                      />
                      <Button onClick={handleAddItemChecklist} disabled={novoItemChecklist.tipo !== "finalizacao"}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Personalização de Layout e Campos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exibir Fotos na Impressão</Label>
                      <p className="text-sm text-slate-500">Incluir fotos do aparelho na OS impressa</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.exibir_fotos_impressao ?? configuracoesDefault.os.exibir_fotos_impressao}
                      onCheckedChange={(checked) => handleChange('os', 'exibir_fotos_impressao', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Campo Senha Obrigatório</Label>
                      <p className="text-sm text-slate-500">Tornar o campo de senha do aparelho obrigatório na abertura da OS.</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.senha_obrigatoria ?? configuracoesDefault.os.senha_obrigatoria}
                      onCheckedChange={(checked) => handleChange('os', 'senha_obrigatoria', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Campo IMEI Obrigatório</Label>
                      <p className="text-sm text-slate-500">Tornar o campo de IMEI do aparelho obrigatório na abertura da OS.</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.imei_obrigatorio ?? configuracoesDefault.os.imei_obrigatorio}
                      onCheckedChange={(checked) => handleChange('os', 'imei_obrigatorio', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automacao">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Automação e Notificações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-900">
                      <strong>⚠️ Requer Integração:</strong> O envio automático de SMS e E-mail exige a contratação e configuração de um gateway de mensagens (ex: Twilio, TotalVoice ou SMTP próprio).
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enviar SMS ao Mudar Status</Label>
                      <p className="text-sm text-slate-500">Cliente recebe SMS automaticamente</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.enviar_sms_status ?? configuracoesDefault.os.enviar_sms_status}
                      onCheckedChange={(checked) => handleChange('os', 'enviar_sms_status', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enviar E-mail com Orçamento</Label>
                      <p className="text-sm text-slate-500">Enviar orçamento por e-mail</p>
                    </div>
                    <Switch
                      checked={configuracoes.os?.enviar_email_orcamento ?? configuracoesDefault.os.enviar_email_orcamento}
                      onCheckedChange={(checked) => handleChange('os', 'enviar_email_orcamento', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOVA Sub-aba: Editor Visual */}
            <TabsContent value="editor">
              <EditorTemplateOS
                template={templateOS}
                onSave={(novoTemplate) => {
                  setTemplateOS(novoTemplate);
                  const novasConfigs = { ...configuracoes, template_os: novoTemplate };
                  setConfiguracoes(novasConfigs);
                  localStorage.setItem('configuracoes_erp', JSON.stringify(novasConfigs));
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Seminovos */}
        <TabsContent value="seminovos">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Avaliador de Seminovos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Como funciona:</strong> O sistema calcula o valor do aparelho com base em 4 critérios principais.
                  Configure os pesos de cada critério para ajustar a avaliação ao seu modelo de negócio.
                </p>
              </div>

              <div>
                <Label>Percentual da Oferta (% do valor de mercado)</Label>
                <p className="text-sm text-slate-500 mb-2">
                  Define quanto você oferece do valor de mercado. Ex: 70% significa que se o aparelho vale R$ 1.000, você oferece R$ 700.
                </p>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={configuracoes.seminovos?.percentual_oferta ?? configuracoesDefault.seminovos.percentual_oferta}
                  onChange={(e) => handleChange('seminovos', 'percentual_oferta', parseFloat(e.target.value) || 0)}
                />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Pesos dos Critérios de Avaliação (Total = 100%)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Estes pesos determinam a importância de cada aspecto na avaliação final do aparelho.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Bateria (%)</Label>
                    <p className="text-xs text-slate-500 mb-1">Saúde e ciclos da bateria</p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={configuracoes.seminovos?.peso_bateria ?? configuracoesDefault.seminovos.peso_bateria}
                      onChange={(e) => handleChange('seminovos', 'peso_bateria', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Tela (%)</Label>
                    <p className="text-xs text-slate-500 mb-1">Estado físico da tela</p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={configuracoes.seminovos?.peso_tela ?? configuracoesDefault.seminovos.peso_tela}
                      onChange={(e) => handleChange('seminovos', 'peso_tela', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Funcionalidade (%)</Label>
                    <p className="text-xs text-slate-500 mb-1">Testes funcionais (WiFi, câmera, etc)</p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={configuracoes.seminovos?.peso_funcionalidade ?? configuracoesDefault.seminovos.peso_funcionalidade}
                      onChange={(e) => handleChange('seminovos', 'peso_funcionalidade', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Estética (%)</Label>
                    <p className="text-xs text-slate-500 mb-1">Aparência geral e carcaça</p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={configuracoes.seminovos?.peso_estetica ?? configuracoesDefault.seminovos.peso_estetica}
                      onChange={(e) => handleChange('seminovos', 'peso_estetica', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 bg-slate-100 rounded text-xs text-center">
                  Total: {(
                    (configuracoes.seminovos?.peso_bateria ?? configuracoesDefault.seminovos.peso_bateria) +
                    (configuracoes.seminovos?.peso_tela ?? configuracoesDefault.seminovos.peso_tela) +
                    (configuracoes.seminovos?.peso_funcionalidade ?? configuracoesDefault.seminovos.peso_funcionalidade) +
                    (configuracoes.seminovos?.peso_estetica ?? configuracoesDefault.seminovos.peso_estetica)
                  )}% {((
                    (configuracoes.seminovos?.peso_bateria ?? configuracoesDefault.seminovos.peso_bateria) +
                    (configuracoes.seminovos?.peso_tela ?? configuracoesDefault.seminovos.peso_tela) +
                    (configuracoes.seminovos?.peso_funcionalidade ?? configuracoesDefault.seminovos.peso_funcionalidade) +
                    (configuracoes.seminovos?.peso_estetica ?? configuracoesDefault.seminovos.peso_estetica)
                  ) !== 100) && <span className="text-red-600 font-bold ml-2">⚠️ Deve somar 100%</span>}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bônus por Acessórios (R$)</Label>
                  <p className="text-xs text-slate-500 mb-1">
                    Valor extra oferecido se o cliente trouxer caixa, carregador, etc
                  </p>
                  <Input
                    type="number"
                    min="0"
                    value={configuracoes.seminovos?.bonus_acessorios ?? configuracoesDefault.seminovos.bonus_acessorios}
                    onChange={(e) => handleChange('seminovos', 'bonus_acessorios', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Separator />

              {/* NOVO: Gerenciar Acessórios */}
              <div>
                <h3 className="font-semibold mb-3">Acessórios Considerados na Avaliação</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Configure quais acessórios originais são verificados. Cada acessório presente aumenta a oferta.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-2" />
                      <span className="text-sm">Caixa Original</span>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-2" />
                      <span className="text-sm">Fonte Original</span>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-2" />
                      <span className="text-sm">Cabo Original</span>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-2" />
                      <span className="text-sm">Manual Original</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">✅ Acessórios padrão (sempre ativos)</p>
                </div>

                <div>
                  <Label className="mb-2 block">Acessórios Personalizados</Label>
                  <div className="space-y-2 mb-3">
                    {(configuracoes.seminovos?.acessorios_customizados || []).map((acessorio) => (
                      <div key={acessorio.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">{acessorio.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAcessorio(acessorio.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Fone de Ouvido Original"
                      value={novoAcessorio}
                      onChange={(e) => setNovoAcessorio(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddAcessorio();
                      }}
                    />
                    <Button onClick={handleAddAcessorio}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir Parcelamento na Compra de Seminovo</Label>
                  <p className="text-sm text-slate-500">Cliente pode parcelar o valor que você paga por aparelhos</p>
                </div>
                <Switch
                  checked={configuracoes.seminovos?.permitir_parcelamento_compra ?? configuracoesDefault.seminovos.permitir_parcelamento_compra}
                  onCheckedChange={(checked) => handleChange('seminovos', 'permitir_parcelamento_compra', checked)}
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-green-900">
                  💡 <strong>Exemplo de Cálculo:</strong>
                  <br />• Aparelho com valor de mercado: R$ 1.000
                  <br />• Bateria 100% (peso 25%) = 25 pontos
                  <br />• Tela perfeita (peso 30%) = 30 pontos
                  <br />• Todos testes OK (peso 30%) = 30 pontos
                  <br />• Estética ótima (peso 15%) = 15 pontos
                  <br />• <strong>Score final: 100 pontos → Oferta: R$ 700</strong> (70% de R$ 1.000)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impressão - REFORMULADA COM SUB-ABAS E PREVIEW */}
        <TabsContent value="impressao">
          <Tabs defaultValue="cupom" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="cupom">Cupom Fiscal</TabsTrigger>
              <TabsTrigger value="os">Ordem de Serviço</TabsTrigger>
              <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
            </TabsList>

            {/* Sub-aba: Cupom */}
            <TabsContent value="cupom">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Configurações de Impressão - Cupom</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Impressora de Cupom</Label>
                      <Input
                        value={configuracoes.impressao?.impressora_cupom ?? configuracoesDefault.impressao.impressora_cupom}
                        onChange={(e) => handleChange('impressao', 'impressora_cupom', e.target.value)}
                        placeholder="Nome da impressora"
                      />
                    </div>
                    <div>
                      <Label>Tamanho do Papel</Label>
                      <Select
                        value={configuracoes.impressao?.tamanho_papel_cupom ?? configuracoesDefault.impressao.tamanho_papel_cupom}
                        onValueChange={(value) => handleChange('impressao', 'tamanho_papel_cupom', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58mm">58mm</SelectItem>
                          <SelectItem value="80mm">80mm</SelectItem>
                          <SelectItem value="A4">A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Incluir Logo no Cupom</Label>
                      <p className="text-sm text-slate-500">Imprimir logo da empresa no topo</p>
                    </div>
                    <Switch
                      checked={configuracoes.impressao?.logo_no_cupom ?? configuracoesDefault.impressao.logo_no_cupom}
                      onCheckedChange={(checked) => handleChange('impressao', 'logo_no_cupom', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Incluir Código de Barras</Label>
                      <p className="text-sm text-slate-500">Código de barras da venda no cupom</p>
                    </div>
                    <Switch
                      checked={configuracoes.impressao?.codigo_barras_cupom ?? configuracoesDefault.impressao.codigo_barras_cupom}
                      onCheckedChange={(checked) => handleChange('impressao', 'codigo_barras_cupom', checked)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Mensagem de Rodapé</Label>
                    <Textarea
                      value={configuracoes.impressao?.rodape_cupom ?? configuracoesDefault.impressao.rodape_cupom}
                      onChange={(e) => handleChange('impressao', 'rodape_cupom', e.target.value)}
                      rows={3}
                      placeholder="Mensagem que aparece no fim do cupom..."
                    />
                  </div>
                </CardContent>
              </Card>
              {/* Adicionar botão de preview */}
              <Card className="mt-4 border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Visualizar Preview do Cupom</p>
                      <p className="text-sm text-blue-700">Veja como ficará a impressão do cupom fiscal</p>
                    </div>
                    <Button onClick={() => { setTipoPreview("cupom"); setDialogPreview(true); }} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-aba: OS */}
            <TabsContent value="os">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Configurações de Impressão - Ordem de Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Impressora de OS</Label>
                    <Input
                      value={configuracoes.impressao?.impressora_os ?? configuracoesDefault.impressao.impressora_os}
                      onChange={(e) => handleChange('impressao', 'impressora_os', e.target.value)}
                      placeholder="Nome da impressora"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Número de Vias</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={configuracoes.impressao?.vias_os ?? configuracoesDefault.impressao.vias_os}
                      onChange={(e) => handleChange('impressao', 'vias_os', parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Normalmente: 1 via para cliente, 1 via para arquivo
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Incluir Termos e Condições</Label>
                      <p className="text-sm text-slate-500">Imprimir termos no rodapé da OS</p>
                    </div>
                    <Switch
                      checked={configuracoes.impressao?.incluir_termos_os ?? configuracoesDefault.impressao.incluir_termos_os}
                      onCheckedChange={(checked) => handleChange('impressao', 'incluir_termos_os', checked)}
                    />
                  </div>

                  <div>
                    <Label>Termos e Condições</Label>
                    <Textarea
                      value={configuracoes.impressao?.termos_os ?? configuracoesDefault.impressao.termos_os}
                      onChange={(e) => handleChange('impressao', 'termos_os', e.target.value)}
                      rows={8}
                      placeholder="Digite os termos..."
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Margens da Página (mm)</Label>
                    <div className="grid grid-cols-4 gap-3 mt-2">
                      <div>
                        <Label className="text-xs">Superior</Label>
                        <Input
                          type="number"
                          value={configuracoes.impressao?.margem_superior_os ?? configuracoesDefault.impressao.margem_superior_os}
                          onChange={(e) => handleChange('impressao', 'margem_superior_os', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Inferior</Label>
                        <Input
                          type="number"
                          value={configuracoes.impressao?.margem_inferior_os ?? configuracoesDefault.impressao.margem_inferior_os}
                          onChange={(e) => handleChange('impressao', 'margem_inferior_os', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Esquerda</Label>
                        <Input
                          type="number"
                          value={configuracoes.impressao?.margem_esquerda_os ?? configuracoesDefault.impressao.margem_esquerda_os}
                          onChange={(e) => handleChange('impressao', 'margem_esquerda_os', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Direita</Label>
                        <Input
                          type="number"
                          value={configuracoes.impressao?.margem_direita_os ?? configuracoesDefault.impressao.margem_direita_os}
                          onChange={(e) => handleChange('impressao', 'margem_direita_os', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Adicionar botão de preview */}
              <Card className="mt-4 border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Visualizar Preview da OS</p>
                      <p className="text-sm text-blue-700">Veja como ficará a impressão da Ordem de Serviço</p>
                    </div>
                    <Button onClick={() => { setTipoPreview("os"); setDialogPreview(true); }} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-aba: Etiquetas */}
            <TabsContent value="etiquetas">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Configurações de Impressão - Etiquetas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Tamanho Padrão de Etiqueta</Label>
                    <Select
                      value={configuracoes.impressao?.tamanho_etiqueta_padrao ?? configuracoesDefault.impressao.tamanho_etiqueta_padrao}
                      onValueChange={(value) => handleChange('impressao', 'tamanho_etiqueta_padrao', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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

                  <Separator />

                  <div>
                    <Label className="mb-3 block">Informações na Etiqueta</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Incluir Logo</Label>
                        <Switch
                          checked={configuracoes.impressao?.incluir_logo_etiqueta ?? configuracoesDefault.impressao.incluir_logo_etiqueta}
                          onCheckedChange={(checked) => handleChange('impressao', 'incluir_logo_etiqueta', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Incluir SKU</Label>
                        <Switch
                          checked={configuracoes.impressao?.incluir_sku_etiqueta ?? configuracoesDefault.impressao.incluir_sku_etiqueta}
                          onCheckedChange={(checked) => handleChange('impressao', 'incluir_sku_etiqueta', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Incluir Preço</Label>
                        <Switch
                          checked={configuracoes.impressao?.incluir_preco_etiqueta ?? configuracoesDefault.impressao.incluir_preco_etiqueta}
                          onCheckedChange={(checked) => handleChange('impressao', 'incluir_preco_etiqueta', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Incluir Código de Barras</Label>
                        <Switch
                          checked={configuracoes.impressao?.incluir_codigo_barras_etiqueta ?? configuracoesDefault.impressao.incluir_codigo_barras_etiqueta}
                          onCheckedChange={(checked) => handleChange('impressao', 'incluir_codigo_barras_etiqueta', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* SEÇÃO DINÂMICA: Configurações Detalhadas baseada no tamanho selecionado */}
                  <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Medidas Detalhadas - {configuracoes.impressao?.tamanho_etiqueta_padrao || "40x25_2col"}
                    </h3>

                    {(() => {
                      const tamanhoSelecionado = configuracoes.impressao?.tamanho_etiqueta_padrao || "40x25_2col";
                      const medidas = configuracoes.impressao?.medidas_etiquetas?.[tamanhoSelecionado] || configuracoesDefault.impressao.medidas_etiquetas[tamanhoSelecionado];

                      if (!medidas) {
                        return <p className="text-sm text-blue-900">Selecione um tamanho de etiqueta para ver as medidas detalhadas.</p>;
                      }

                      return (
                        <>
                          {/* Logo */}
                          <div className="mb-4 p-3 bg-white rounded-lg">
                            <Label className="font-semibold mb-3 block">Logo</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Largura Máx</Label>
                                <Input
                                  value={medidas.logo_largura_max}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], logo_largura_max: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Altura Máx</Label>
                                <Input
                                  value={medidas.logo_altura_max}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], logo_altura_max: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Top</Label>
                                <Input
                                  value={medidas.logo_margem_top}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], logo_margem_top: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Bottom</Label>
                                <Input
                                  value={medidas.logo_margem_bottom}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], logo_margem_bottom: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Texto */}
                          <div className="mb-4 p-3 bg-white rounded-lg">
                            <Label className="font-semibold mb-3 block">Texto (Nome do Produto)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Fonte</Label>
                                <Input
                                  value={medidas.texto_fonte}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], texto_fonte: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Line Height</Label>
                                <Input
                                  value={medidas.texto_line_height}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], texto_line_height: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Top</Label>
                                <Input
                                  value={medidas.texto_margem_top}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], texto_margem_top: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Bottom</Label>
                                <Input
                                  value={medidas.texto_margem_bottom}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], texto_margem_bottom: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Preço */}
                          <div className="mb-4 p-3 bg-white rounded-lg">
                            <Label className="font-semibold mb-3 block">Preço</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Fonte</Label>
                                <Input
                                  value={medidas.preco_fonte}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], preco_fonte: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Line Height</Label>
                                <Input
                                  value={medidas.preco_line_height}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], preco_line_height: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Vertical</Label>
                                <Input
                                  value={medidas.preco_margem}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], preco_margem: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* SKU */}
                          <div className="mb-4 p-3 bg-white rounded-lg">
                            <Label className="font-semibold mb-3 block">SKU</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Fonte</Label>
                                <Input
                                  value={medidas.sku_fonte}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], sku_fonte: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Line Height</Label>
                                <Input
                                  value={medidas.sku_line_height}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], sku_line_height: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Top</Label>
                                <Input
                                  value={medidas.sku_margem_top}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], sku_margem_top: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Código de Barras */}
                          <div className="p-3 bg-white rounded-lg">
                            <Label className="font-semibold mb-3 block">Código de Barras</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Largura Máx</Label>
                                <Input
                                  value={medidas.barcode_largura_max}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], barcode_largura_max: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Altura</Label>
                                <Input
                                  value={medidas.barcode_altura}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], barcode_altura: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Margem Top</Label>
                                <Input
                                  value={medidas.barcode_margem_top}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], barcode_margem_top: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Fonte Número</Label>
                                <Input
                                  value={medidas.barcode_numero_fonte}
                                  onChange={(e) => {
                                    const novasMedidas = { ...(configuracoes.impressao?.medidas_etiquetas || configuracoesDefault.impressao.medidas_etiquetas) };
                                    novasMedidas[tamanhoSelecionado] = { ...novasMedidas[tamanhoSelecionado], barcode_numero_fonte: e.target.value };
                                    handleChange('impressao', 'medidas_etiquetas', novasMedidas);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              {/* Preview Etiqueta */}
              <Card className="mt-4 border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Visualizar Preview da Etiqueta</p>
                      <p className="text-sm text-blue-700">Veja como ficará a impressão com as medidas configuradas</p>
                    </div>
                    <Button onClick={() => { setTipoPreview("etiqueta"); setDialogPreview(true); }} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Monitor Cliente */}
        <TabsContent value="monitor">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Monitor do Cliente (Segundo Monitor)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <Monitor className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Em Desenvolvimento:</strong> O módulo de monitor secundário está em fase de implementação. Algumas configurações podem não ser aplicadas instantaneamente.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Como configurar:</strong> Conecte um segundo monitor ao computador e estenda a área de trabalho.
                  Abra o PDV em tela cheia no monitor do cliente.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar Monitor do Cliente</Label>
                  <p className="text-sm text-slate-500">Ativar segundo monitor para o cliente</p>
                </div>
                <Switch
                  checked={configuracoes.monitor_cliente?.habilitado ?? configuracoesDefault.monitor_cliente.habilitado}
                  onCheckedChange={(checked) => handleChange('monitor_cliente', 'habilitado', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar Propaganda</Label>
                  <p className="text-sm text-slate-500">Exibir propagandas quando não estiver em venda</p>
                </div>
                <Switch
                  checked={configuracoes.monitor_cliente?.mostrar_propaganda ?? configuracoesDefault.monitor_cliente.mostrar_propaganda}
                  onCheckedChange={(checked) => handleChange('monitor_cliente', 'mostrar_propaganda', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Exibir PIX em Monitor Secundário</Label>
                  <p className="text-sm text-slate-500">Mostrar QR Code PIX no monitor do cliente durante pagamento</p>
                </div>
                <Switch
                  checked={configuracoes.pdv?.pix_monitor_secundario || false}
                  onCheckedChange={(checked) => handleChange('pdv', 'pix_monitor_secundario', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>URL da Propaganda (Imagem ou Vídeo)</Label>
                  <Input
                    value={configuracoes.monitor_cliente?.url_propaganda ?? configuracoesDefault.monitor_cliente.url_propaganda}
                    onChange={(e) => handleChange('monitor_cliente', 'url_propaganda', e.target.value)}
                    placeholder="https://exemplo.com/propaganda.jpg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Suporta imagens (JPG, PNG, GIF) e vídeos (MP4, YouTube)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tempo de Rotação (segundos)</Label>
                    <Input
                      type="number"
                      value={configuracoes.monitor_cliente?.tempo_rotacao_segundos ?? configuracoesDefault.monitor_cliente.tempo_rotacao_segundos}
                      onChange={(e) => handleChange('monitor_cliente', 'tempo_rotacao_segundos', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Tamanho da Fonte</Label>
                    <Select
                      value={configuracoes.monitor_cliente?.tamanho_fonte ?? configuracoesDefault.monitor_cliente.tamanho_fonte}
                      onValueChange={(value) => handleChange('monitor_cliente', 'tamanho_fonte', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pequena">Pequena</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="grande">Grande</SelectItem>
                        <SelectItem value="extra_grande">Extra Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Mensagem de Boas-Vindas</Label>
                  <Textarea
                    value={configuracoes.monitor_cliente?.mensagem_boas_vindas ?? configuracoesDefault.monitor_cliente.mensagem_boas_vindas}
                    onChange={(e) => handleChange('monitor_cliente', 'mensagem_boas_vindas', e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Cor do Tema</Label>
                  <div className="flex gap-2">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#000000'].map(cor => (
                      <button
                        key={cor}
                        onClick={() => handleChange('monitor_cliente', 'cor_tema', cor)}
                        className="w-12 h-12 rounded-lg border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: cor,
                          borderColor: configuracoes.monitor_cliente?.cor_tema === cor ? '#000' : '#e2e8f0'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações Tab */}
        <TabsContent value="notificacoes">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Requer Configuração:</strong> As notificações por e-mail e SMS dependem de serviços externos. Os switches abaixo preparam o sistema, mas não enviarão mensagens sem um servidor configurado.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>E-mail: Nova Venda</Label>
                  <p className="text-sm text-slate-500">Receber e-mail a cada nova venda</p>
                </div>
                <Switch
                  checked={configuracoes.notificacoes?.email_nova_venda ?? configuracoesDefault.notificacoes.email_nova_venda}
                  onCheckedChange={(checked) => handleChange('notificacoes', 'email_nova_venda', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>E-mail: Estoque Baixo</Label>
                  <p className="text-sm text-slate-500">Receber e-mail quando o estoque estiver baixo</p>
                </div>
                <Switch
                  checked={configuracoes.notificacoes?.email_estoque_baixo ?? configuracoesDefault.notificacoes.email_estoque_baixo}
                  onCheckedChange={(checked) => handleChange('notificacoes', 'email_estoque_baixo', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>E-mail: OS Pronta</Label>
                  <p className="text-sm text-slate-500">Receber e-mail quando uma OS for finalizada</p>
                </div>
                <Switch
                  checked={configuracoes.notificacoes?.email_os_pronta ?? configuracoesDefault.notificacoes.email_os_pronta}
                  onCheckedChange={(checked) => handleChange('notificacoes', 'email_os_pronta', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS: OS Pronta</Label>
                  <p className="text-sm text-slate-500">Enviar SMS ao cliente quando a OS for finalizada</p>
                </div>
                <Switch
                  checked={configuracoes.notificacoes?.sms_os_pronta ?? configuracoesDefault.notificacoes.sms_os_pronta}
                  onCheckedChange={(checked) => handleChange('notificacoes', 'sms_os_pronta', checked)}
                />
              </div>

              <Separator />

              <div>
                <Label>Email para Notificações de Vendas Online</Label>
                <Input
                  value={configuracoes.sistema?.emails_notificacao_vendas || ""}
                  onChange={(e) => handleChange('sistema', 'emails_notificacao_vendas', e.target.value)}
                  placeholder="vendas@empresa.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Receberá alerta toda vez que um pedido for feito na loja online
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Lembrar Aniversário do Cliente</Label>
                  <p className="text-sm text-slate-500">Gerar lembrete de aniversário de clientes</p>
                </div>
                <Switch
                  checked={configuracoes.notificacoes?.lembrar_aniversario_cliente ?? configuracoesDefault.notificacoes.lembrar_aniversario_cliente}
                  onCheckedChange={(checked) => handleChange('notificacoes', 'lembrar_aniversario_cliente', checked)}
                />
              </div>

              {/* Conditionally render input for days if reminder is enabled */}
              {configuracoes.notificacoes?.lembrar_aniversario_cliente && (
                <div className="mt-4">
                  <Label>Dias de Antecedência do Aniversário</Label>
                  <Input
                    type="number"
                    value={configuracoes.notificacoes?.dias_antecedencia_aniversario ?? configuracoesDefault.notificacoes.dias_antecedencia_aniversario}
                    onChange={(e) => handleChange('notificacoes', 'dias_antecedencia_aniversario', parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários Tab */}
        <TabsContent value="usuarios">
          <div className="space-y-6">
            <Tabs defaultValue="usuarios-lista" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="usuarios-lista">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="cargos">
                  <Shield className="w-4 h-4 mr-2" />
                  Cargos
                </TabsTrigger>
              </TabsList>

              {/* Lista de Usuários */}
              <TabsContent value="usuarios-lista">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Usuários do Sistema</CardTitle>
                      <Button
                        onClick={() => setDialogUsuario(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Adicionar Usuário
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-900">
                        💡 Adicione usuários do sistema aqui. Eles poderão ter cargos e permissões atribuídos.
                      </p>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">E-mail</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Telefone</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cargo</th>
                            <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {usuarios.map((userBase) => {
                            const usuarioSistema = usuariosSistema.find(us => us.user_id === userBase.id);
                            const cargoUsuario = cargos.find(c => c.id === (usuarioSistema?.cargo_id || userBase.cargo_id));

                            return (
                              <tr key={userBase.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <span className="font-medium">{userBase.nome || "-"}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {userBase.email || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {userBase.telefone || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {cargoUsuario ? (
                                    <Badge variant="secondary">{cargoUsuario.nome}</Badge>
                                  ) : (
                                    <span className="text-sm text-slate-400">Sem cargo</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingUsuario(userBase);
                                        setUsuarioData({
                                          nome: userBase.nome || "",
                                          email: userBase.email || "",
                                          telefone: userBase.telefone || "",
                                          cargo_id: usuarioSistema?.cargo_id || userBase.cargo_id || "",
                                          senha: "",
                                          codigo_barras_autorizacao: usuarioSistema?.codigo_barras_autorizacao || "",
                                          senha_autorizacao: usuarioSistema?.senha_autorizacao || "",
                                          ativo: userBase.ativo !== false
                                        });
                                        setDialogUsuario(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setUsuarioParaDeletar({
                                          ...userBase,
                                          usuarioSistemaId: usuarioSistema?.id || null
                                        });
                                        setDialogDeleteUsuario(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {usuarios.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          Nenhum usuário cadastrado
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cargos */}
              <TabsContent value="cargos">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Cargos e Permissões</CardTitle>
                      <Button onClick={() => handleOpenCargo()} className="bg-blue-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Cargo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cargos.map((cargo) => (
                        <Card key={cargo.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-bold text-lg">{cargo.nome}</h3>
                                <Badge variant="outline" className="mt-1">
                                  Nível {cargo.nivel_hierarquia}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenCargo(cargo)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCargo(cargo)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {cargo.descricao && (
                              <p className="text-sm text-slate-600 mb-3">{cargo.descricao}</p>
                            )}

                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-500 mb-2">Permissões:</p>
                              {Object.entries(cargo.permissoes || {}).filter(([, value]) => value).map(([key]) => (
                                <div key={key} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span>{key.replace(/_/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {cargos.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Nenhum cargo cadastrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Sistema - EXPANDIDO COM SUB-ABAS */}
        <TabsContent value="sistema">
          <Tabs defaultValue="seguranca">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
              <TabsTrigger value="backup-auto">Backup Auto</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
            </TabsList>

            <TabsContent value="seguranca">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle><Shield className="w-5 h-5 inline mr-2" />Segurança e Permissões</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Permissões de Exclusão (Apenas Administrador)
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                      Estas opções permitem a exclusão permanente de dados. Use com cuidado!
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Exclusão de Produtos</Label>
                      <p className="text-sm text-slate-500">Habilitar botão de excluir produtos</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.permitir_exclusao_produtos ?? configuracoesDefault.sistema.permitir_exclusao_produtos}
                      onCheckedChange={(c) => handleChange('sistema', 'permitir_exclusao_produtos', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Exclusão de Clientes</Label>
                      <p className="text-sm text-slate-500">Habilitar botão de excluir clientes</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.permitir_exclusao_clientes ?? configuracoesDefault.sistema.permitir_exclusao_clientes}
                      onCheckedChange={(c) => handleChange('sistema', 'permitir_exclusao_clientes', c)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Exclusão de OS</Label>
                      <p className="text-sm text-slate-500">Habilitar exclusão de ordens de serviço</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.permitir_exclusao_os ?? configuracoesDefault.sistema.permitir_exclusao_os}
                      onCheckedChange={(c) => handleChange('sistema', 'permitir_exclusao_os', c)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backup-auto"> {/* Changed value */}
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle><HardDrive className="w-5 h-5 inline mr-2" />Backup Automático</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <HardDrive className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-900">
                      <strong>Módulo em Preparação:</strong> Esta interface está estruturada para receber o futuro módulo de <strong>Backup Local de Segurança</strong>. Seus dados principais já estão salvos e blindados em tempo real na nuvem (Supabase).
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Habilitar Backup Automático</Label>
                      <p className="text-sm text-slate-500">Salvar configurações periodicamente</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.backup_automatico ?? configuracoesDefault.sistema.backup_automatico}
                      onCheckedChange={(c) => handleChange('sistema', 'backup_automatico', c)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Intervalo de Backup (horas)</Label>
                    <Input
                      type="number"
                      value={configuracoes.sistema?.intervalo_backup_horas ?? configuracoesDefault.sistema.intervalo_backup_horas}
                      onChange={(e) => handleChange('sistema', 'intervalo_backup_horas', parseInt(e.target.value) || 24)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Máximo de Backups Salvos</Label>
                    <Input
                      type="number"
                      value={configuracoes.sistema?.maximo_backups_salvos ?? configuracoesDefault.sistema.maximo_backups_salvos}
                      onChange={(e) => handleChange('sistema', 'maximo_backups_salvos', parseInt(e.target.value) || 7)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aparencia">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Aparência do Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Modo Escuro</Label>
                      <p className="text-sm text-slate-500">Interface em modo escuro</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.modo_escuro ?? false}
                      onCheckedChange={(c) => handleChange('sistema', 'modo_escuro', c)}
                    />
                  </div>

                  {configuracoes.sistema?.modo_escuro && (
                    <div className="p-4 bg-slate-900 text-white rounded-lg">
                      <p className="text-sm">🌙 Preview do modo escuro ativo</p>
                      <p className="text-xs opacity-75 mt-1">Salve para aplicar em todo o sistema</p>
                    </div>
                  )}

                  <Separator />

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs text-purple-900">
                      <strong>Dica:</strong> O idioma do sistema é padronizado como Português (Brasil).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle>Configurações Fiscais</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-900">
                      <strong>⚠️ Integração SP:</strong> O módulo fiscal para o estado de SP (SAT/NFC-e) exige certificado digital A1 válido e credenciamento na SEFAZ.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>⚙️ Modo Fiscal:</strong> Ative quando precisar emitir notas fiscais eletrônicas (NFe/NFC-e). Desative para operar sem emissão fiscal.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg">
                    <div>
                      <Label className="font-semibold text-lg">Modo Fiscal Ativo</Label>
                      <p className="text-sm text-slate-600">Habilitar emissão de notas fiscais eletrônicas</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.modo_fiscal_ativo || false}
                      onCheckedChange={(c) => handleChange('sistema', 'modo_fiscal_ativo', c)}
                    />
                  </div>

                  {configuracoes.sistema?.modo_fiscal_ativo ? (
                    <>
                      <Separator />

                      <div>
                        <Label>Tipo de Certificado Digital</Label>
                        <Select
                          value={configuracoes.sistema?.tipo_certificado || "nenhum"}
                          onValueChange={(v) => handleChange('sistema', 'tipo_certificado', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">Nenhum (Homologação)</SelectItem>
                            <SelectItem value="a1">Certificado A1 (arquivo .pfx)</SelectItem>
                            <SelectItem value="a3">Certificado A3 (token/cartão)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {configuracoes.sistema?.tipo_certificado === 'a1' && (
                        <div>
                          <Label>Arquivo do Certificado (.pfx)</Label>
                          <Input type="file" accept=".pfx,.p12" disabled />
                          <p className="text-xs text-slate-500 mt-1">
                            Upload de certificados requer integração com servidor fiscal
                          </p>
                        </div>
                      )}

                      <div>
                        <Label>Ambiente Fiscal</Label>
                        <Select
                          value={configuracoes.sistema?.ambiente_fiscal || "homologacao"}
                          onValueChange={(v) => handleChange('sistema', 'ambiente_fiscal', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                            <SelectItem value="producao">Produção (Real)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Série NFe</Label>
                          <Input
                            type="number"
                            value={configuracoes.sistema?.serie_nfe || 1}
                            onChange={(e) => handleChange('sistema', 'serie_nfe', parseInt(e.target.value) || 1)}
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <Label>Série NFC-e</Label>
                          <Input
                            type="number"
                            value={configuracoes.sistema?.serie_nfce || 1}
                            onChange={(e) => handleChange('sistema', 'serie_nfce', parseInt(e.target.value) || 1)}
                            placeholder="1"
                          />
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-900">
                          ⚠️ <strong>Importante:</strong> Para emissão real de notas fiscais, é necessário contratar um serviço de integração fiscal externo (ex: eNotas, NFe.io, TecnoSpeed).
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                      <p className="text-slate-600">
                        🔒 Modo fiscal desativado. O sistema operará sem emissão de notas fiscais.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle><Bell className="w-5 h-5 inline mr-2" />Logs e Auditoria</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Habilitar Logs de Auditoria</Label>
                      <p className="text-sm text-slate-500">Registrar todas as ações no sistema</p>
                    </div>
                    <Switch
                      checked={configuracoes.sistema?.logs_auditoria ?? configuracoesDefault.sistema.logs_auditoria}
                      onCheckedChange={(c) => handleChange('sistema', 'logs_auditoria', c)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Nível de Log</Label>
                    <Select
                      value={configuracoes.sistema?.nivel_log ?? configuracoesDefault.sistema.nivel_log}
                      onValueChange={(v) => handleChange('sistema', 'nivel_log', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">Debug (Tudo)</SelectItem>
                        <SelectItem value="info">Info (Normal)</SelectItem>
                        <SelectItem value="warning">Warning (Avisos)</SelectItem>
                        <SelectItem value="error">Error (Apenas Erros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* NOVO: Tab Backup (manual import/export) */}
        <TabsContent value="backup">
          <Card className="border-none shadow-lg">
            <CardHeader><CardTitle><Database className="w-5 h-5 inline mr-2" />Backup e Restauração do Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💾 <strong>Importante:</strong> Faça backups regulares para evitar perda de dados. O backup completo inclui todos os dados do sistema (clientes, produtos, vendas, OS, financeiro, etc.).
                </p>
              </div>

              {/* Seletor de tipo de backup */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <Label className="text-sm font-medium mb-3 block">Tipo de Backup</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${tipoBackup === "completo" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input
                      type="radio"
                      name="tipoBackup"
                      value="completo"
                      checked={tipoBackup === "completo"}
                      onChange={(e) => setTipoBackup(e.target.value)}
                      className="sr-only"
                    />
                    <Database className={`w-8 h-8 mr-3 ${tipoBackup === "completo" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <p className="font-semibold">Backup Completo</p>
                      <p className="text-xs text-slate-500">Todos os dados: clientes, produtos, vendas, OS, financeiro, etc.</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${tipoBackup === "configuracoes" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input
                      type="radio"
                      name="tipoBackup"
                      value="configuracoes"
                      checked={tipoBackup === "configuracoes"}
                      onChange={(e) => setTipoBackup(e.target.value)}
                      className="sr-only"
                    />
                    <Settings className={`w-8 h-8 mr-3 ${tipoBackup === "configuracoes" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <p className="font-semibold">Apenas Configurações</p>
                      <p className="text-xs text-slate-500">Configurações da empresa, PDV, impressão, etc.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardContent className="p-6 text-center space-y-3">
                    <Download className="w-12 h-12 text-blue-600 mx-auto" />
                    <h3 className="font-semibold">Exportar Backup</h3>
                    <p className="text-sm text-slate-600">
                      {tipoBackup === "completo"
                        ? "Baixar backup completo com todos os dados do sistema."
                        : "Baixar apenas as configurações do sistema."}
                    </p>
                    <Button onClick={exportarBackup} className="w-full" disabled={exportando || importando}>
                      <Download className="w-4 h-4 mr-2" />
                      {exportando ? "Exportando..." : `Baixar Backup ${tipoBackup === "completo" ? "Completo" : "Configurações"}`}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardContent className="p-6 text-center space-y-3">
                    <Upload className="w-12 h-12 text-green-600 mx-auto" />
                    <h3 className="font-semibold">Restaurar Backup</h3>
                    <p className="text-sm text-slate-600">Importar um arquivo de backup para restaurar dados e configurações.</p>
                    <label className="w-full">
                      <Button asChild className="w-full" disabled={exportando || importando}>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {importando ? "Importando..." : "Carregar Backup"}
                        </span>
                      </Button>
                      <input type="file" accept=".json" onChange={importarBackup} className="hidden" disabled={exportando || importando} />
                    </label>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de tabelas incluídas no backup completo */}
              {tipoBackup === "completo" && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Tabelas incluídas no backup completo ({tabelasBackup.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {tabelasBackup.map((tabela) => (
                      <Badge key={tabela.nome} variant="outline" className="text-xs">
                        {tabela.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    ⚠️ <strong>Atenção:</strong> Ao restaurar um backup, os dados existentes podem ser atualizados. Recomendamos fazer um backup antes de restaurar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Progresso Backup */}
      <Dialog open={dialogBackup} onOpenChange={() => { }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {exportando ? "Exportando Backup" : "Importando Backup"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-slate-600 mb-2">
                {progressoBackup.tabela || "Preparando..."}
              </p>
              {progressoBackup.total > 0 && (
                <>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(progressoBackup.atual / progressoBackup.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {progressoBackup.atual} de {progressoBackup.total} tabelas
                  </p>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview */}
      <Dialog open={dialogPreview} onOpenChange={setDialogPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview de Impressão</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {/* The PreviewImpressao component will dynamically render based on 'tipo' */}
            <PreviewImpressao
              tipo={tipoPreview}
              config={configuracoes.impressao || {}}
              templateOS={templateOS} // Pass the templateOS to the preview component
              tamanho={configuracoes.impressao?.tamanho_etiqueta_padrao}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogPreview(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cargo */}
      <Dialog open={dialogCargo} onOpenChange={setDialogCargo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCargo ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome do Cargo *</Label>
              <Input
                value={cargoData.nome}
                onChange={(e) => setCargoData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Administrador, Vendedor, Técnico..."
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={cargoData.descricao || ""}
                onChange={(e) => setCargoData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição das responsabilidades do cargo..."
                rows={2}
              />
            </div>

            <div>
              <Label>Nível Hierárquico (1-5) *</Label>
              <p className="text-xs text-slate-500 mb-2">
                1 = Mais alto (Admin/Gerente), 5 = Mais baixo (Estagiário). Ao mudar o nível, as permissões serão ajustadas automaticamente.
              </p>
              <Select
                value={String(cargoData.nivel_hierarquia || 5)}
                onValueChange={(v) => {
                  const nivel = parseInt(v);
                  const preset = presetsPermissoes[nivel] || permissoesPadrao;
                  setCargoData(prev => ({
                    ...prev,
                    nivel_hierarquia: nivel,
                    permissoes: { ...preset }
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Administrador/Diretor</SelectItem>
                  <SelectItem value="2">2 - Gerente</SelectItem>
                  <SelectItem value="3">3 - Supervisor</SelectItem>
                  <SelectItem value="4">4 - Operacional</SelectItem>
                  <SelectItem value="5">5 - Estagiário/Aprendiz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="block">Permissões</Label>
                <p className="text-xs text-slate-500">Você pode ajustar manualmente após selecionar o nível</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários' },
                  { key: 'gerenciar_produtos', label: 'Gerenciar Produtos' },
                  { key: 'gerenciar_clientes', label: 'Gerenciar Clientes' },
                  { key: 'realizar_vendas', label: 'Realizar Vendas' },
                  { key: 'gerenciar_caixa', label: 'Gerenciar Caixa' },
                  { key: 'gerenciar_os', label: 'Gerenciar OS' },
                  { key: 'avaliar_seminovos', label: 'Avaliar Seminovos' },
                  { key: 'cancelar_vendas', label: 'Cancelar Vendas' },
                  { key: 'aplicar_descontos', label: 'Aplicar Descontos' },
                  { key: 'visualizar_relatorios', label: 'Visualizar Relatórios' },
                  { key: 'gerenciar_fornecedores', label: 'Gerenciar Fornecedores' },
                  { key: 'acessar_relatorios', label: 'Acessar Relatórios' },
                  { key: 'acessar_dashboard', label: 'Acessar Dashboard' },
                  { key: 'acessar_metas', label: 'Acessar Metas' },
                  { key: 'acessar_agenda', label: 'Acessar Agenda' },
                  { key: 'acessar_integracoes', label: 'Acessar Integrações' },
                  { key: 'acessar_etiquetas', label: 'Acessar Etiquetas' },
                  { key: 'acessar_logs', label: 'Acessar Logs' },
                  { key: 'acessar_configuracoes', label: 'Acessar Configurações' },
                  { key: 'abrir_fechar_caixa', label: 'Abrir/Fechar Caixa' },
                  { key: 'fazer_sangria_suprimento', label: 'Sangria/Suprimento' },
                  { key: 'editar_produtos', label: 'Editar Produtos' },
                  { key: 'editar_clientes', label: 'Editar Clientes' },
                  { key: 'criar_os', label: 'Criar OS' },
                  { key: 'editar_os', label: 'Editar OS' },
                  { key: 'aprovar_orcamento_os', label: 'Aprovar Orçamento OS' },
                  { key: 'finalizar_os', label: 'Finalizar OS' },
                  { key: 'cancelar_os', label: 'Cancelar OS' },
                  { key: 'acesso_multilojas', label: 'Acesso Multilojas' },
                  { key: 'visualizar_custos', label: 'Visualizar Custos/Lucros' }
                ].map(perm => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={perm.key}
                      checked={cargoData.permissoes?.[perm.key] || false}
                      onChange={(e) => setCargoData(prev => ({
                        ...prev,
                        permissoes: {
                          ...prev.permissoes,
                          [perm.key]: e.target.checked
                        }
                      }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={perm.key} className="cursor-pointer text-sm">
                      {perm.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCargo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCargo}>
              {editingCargo ? "Atualizar" : "Criar Cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar/Editar Usuário */}
      <Dialog open={dialogUsuario} onOpenChange={(open) => {
        setDialogUsuario(open);
        if (!open) {
          setEditingUsuario(null);
          setUsuarioData({ nome: "", email: "", telefone: "", cargo_id: "", senha: "", codigo_barras_autorizacao: "", senha_autorizacao: "", ativo: true });
          setMostrarSenha(false);
          setMostrarSenhaAuth(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUsuario ? "Editar Usuário" : "Adicionar Novo Usuário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={usuarioData.nome || ""}
                onChange={(e) => setUsuarioData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="João da Silva"
              />
            </div>

            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={usuarioData.email || ""}
                onChange={(e) => setUsuarioData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="joao@email.com"
              />
            </div>

            <div>
              <Label>Telefone *</Label>
              <Input
                value={usuarioData.telefone || ""}
                onChange={(e) => {
                  // Formatar telefone brasileiro: (XX) XXXXX-XXXX
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length > 11) value = value.slice(0, 11);
                  if (value.length > 0) {
                    if (value.length <= 2) {
                      value = `(${value}`;
                    } else if (value.length <= 7) {
                      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    } else {
                      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                    }
                  }
                  setUsuarioData(prev => ({ ...prev, telefone: value }));
                }}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label>{editingUsuario ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={usuarioData.senha || ""}
                  onChange={(e) => setUsuarioData(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder={editingUsuario ? "••••••••" : "Digite uma senha"}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  onClick={() => setMostrarSenha(v => !v)}
                  tabIndex={-1}
                  title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!editingUsuario && (
                <p className="text-xs text-slate-500 mt-1">
                  A senha será usada para login no sistema.
                </p>
              )}
            </div>

            <div>
              <Label>Cargo *</Label>
              <Select
                value={usuarioData.cargo_id || ""}
                onValueChange={(value) => setUsuarioData(prev => ({ ...prev, cargo_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar seção de autorizações apenas se o cargo tiver permissões de PDV */}
            {(() => {
              const cargoSelecionado = cargos.find(c => c.id === usuarioData.cargo_id);
              const temPermissoesPDV = cargoSelecionado?.permissoes && (
                cargoSelecionado.permissoes.realizar_vendas ||
                cargoSelecionado.permissoes.gerenciar_caixa ||
                cargoSelecionado.permissoes.aplicar_descontos ||
                cargoSelecionado.permissoes.cancelar_vendas
              );

              if (!temPermissoesPDV) return null;

              return (
                <>
                  <Separator className="my-2" />
                  <p className="text-sm font-medium text-slate-700">Autorizações PDV</p>

                  <div>
                    <Label>Código de Barras do Cartão Físico</Label>
                    <Input
                      value={usuarioData.codigo_barras_autorizacao || ""}
                      onChange={(e) => setUsuarioData(prev => ({ ...prev, codigo_barras_autorizacao: e.target.value }))}
                      placeholder="Escaneie o cartão..."
                      className="font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Usado para escanear cartão físico em autorizações de desconto.
                    </p>
                  </div>

                  <div>
                    <Label>Senha de Autorização (Digitável)</Label>
                    <div className="relative">
                      <Input
                        type={mostrarSenhaAuth ? "text" : "password"}
                        value={usuarioData.senha_autorizacao || ""}
                        onChange={(e) => setUsuarioData(prev => ({ ...prev, senha_autorizacao: e.target.value }))}
                        placeholder="Senha para autorizar no PDV..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        onClick={() => setMostrarSenhaAuth(v => !v)}
                        tabIndex={-1}
                        title={mostrarSenhaAuth ? "Ocultar senha" : "Ver senha"}
                      >
                        {mostrarSenhaAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Usada para digitar em confirmações de venda no PDV.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogUsuario(false);
              setEditingUsuario(null);
              setUsuarioData({ nome: "", email: "", telefone: "", cargo_id: "", senha: "", codigo_barras_autorizacao: "", senha_autorizacao: "", ativo: true });
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Validar campos obrigatórios
                if (!usuarioData.nome.trim()) {
                  toast.error("Digite o nome do usuário");
                  return;
                }
                if (!usuarioData.email.trim()) {
                  toast.error("Digite o e-mail do usuário");
                  return;
                }
                // Validar formato de email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(usuarioData.email.trim())) {
                  toast.error("Digite um e-mail válido");
                  return;
                }
                if (!usuarioData.telefone.trim() || usuarioData.telefone.replace(/\D/g, '').length < 10) {
                  toast.error("Digite um telefone válido");
                  return;
                }
                if (!editingUsuario && !usuarioData.senha.trim()) {
                  toast.error("Digite uma senha");
                  return;
                }
                if (!usuarioData.cargo_id) {
                  toast.error("Selecione um cargo");
                  return;
                }

                if (editingUsuario) {
                  // Atualizar usuário existente
                  const updateData = {
                    nome: usuarioData.nome.trim(),
                    email: usuarioData.email.trim(),
                    telefone: usuarioData.telefone.trim(),
                    cargo_id: usuarioData.cargo_id,
                    codigo_barras_autorizacao: usuarioData.codigo_barras_autorizacao?.trim() || null,
                    senha_autorizacao: usuarioData.senha_autorizacao?.trim() || null
                  };
                  // Só incluir senha se foi preenchida
                  if (usuarioData.senha.trim()) {
                    updateData.senha = usuarioData.senha.trim();
                  }
                  // Buscar o usuarioSistema correspondente
                  const usuarioSistemaExistente = usuariosSistema.find(us => us.user_id === editingUsuario.id);
                  updateUsuarioBaseMutation.mutate({
                    id: editingUsuario.id,
                    data: updateData,
                    usuarioSistemaId: usuarioSistemaExistente?.id || null
                  });
                } else {
                  // Criar novo usuário
                  createUsuarioMutation.mutate({
                    nome: usuarioData.nome.trim(),
                    email: usuarioData.email.trim(),
                    telefone: usuarioData.telefone.trim(),
                    cargo_id: usuarioData.cargo_id,
                    senha: usuarioData.senha.trim(),
                    codigo_barras_autorizacao: usuarioData.codigo_barras_autorizacao?.trim() || null,
                    senha_autorizacao: usuarioData.senha_autorizacao?.trim() || null,
                    ativo: true
                  });
                }
              }}
              disabled={createUsuarioMutation.isPending || updateUsuarioBaseMutation.isPending}
            >
              {editingUsuario
                ? (updateUsuarioBaseMutation.isPending ? "Salvando..." : "Salvar Alterações")
                : (createUsuarioMutation.isPending ? "Criando..." : "Criar Usuário")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Usuário */}
      <Dialog open={dialogDeleteUsuario} onOpenChange={setDialogDeleteUsuario}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Usuário
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
              </p>
            </div>

            {usuarioParaDeletar && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Você está prestes a excluir:</p>
                <p className="font-semibold text-lg">{usuarioParaDeletar.nome || "Sem nome"}</p>
                <p className="text-sm text-slate-500">{usuarioParaDeletar.email}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDialogDeleteUsuario(false);
                setUsuarioParaDeletar(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (usuarioParaDeletar) {
                  deleteUsuarioMutation.mutate({
                    usuarioId: usuarioParaDeletar.id,
                    usuarioSistemaId: usuarioParaDeletar.usuarioSistemaId
                  });
                  setDialogDeleteUsuario(false);
                  setUsuarioParaDeletar(null);
                }
              }}
              disabled={deleteUsuarioMutation.isPending}
            >
              {deleteUsuarioMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}