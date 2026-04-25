import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";
import { base44 } from "@/api/base44Client";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Eye, Phone, Mail, MapPin, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import CEPInput from "@/components/CEPInput";
import { formatarTelefone, formatarTelefoneDigitando, formatarCPF, formatarCNPJ, formatarCPFCNPJDigitando, validarCPF, capitalizarNome } from "@/components/FormatUtils";

export default function Clientes() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 20;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf_cnpj: "",
    tipo_pessoa: "fisica",
    telefone1: "",
    telefone2: "",
    email: "",
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
    fonte: "loja_fisica",
    observacoes: ""
  });

  const { user, hasPermission } = useAuth();
  const podeEditarClientes = hasPermission('editar_clientes') || hasPermission('gerenciar_clientes');
  const { lojaFiltroId } = useLoja();
  const [configuracoes, setConfiguracoes] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);

  // Verificar parâmetros da URL para abrir dialog de novo cliente
  useEffect(() => {
    const novoCliente = searchParams.get('novo');
    if (novoCliente === 'true') {
      const telefone = searchParams.get('telefone1') || '';
      const nome = searchParams.get('nome_completo') || '';

      // Preencher dados do formulário
      setFormData(prev => ({
        ...prev,
        nome_completo: nome,
        telefone1: telefone,
        fonte: "whatsapp"
      }));
      setSelectedCliente(null);
      setDialogOpen(true);

      // Limpar parâmetros da URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : lojaFiltroId ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }, { order: '-created_date' }) : base44.entities.Cliente.list('-created_date'),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : lojaFiltroId ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date' }) : base44.entities.Venda.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // CRÍTICO: Fresh fetch para validar CPF - OTIMIZADO para usar filter
      if (data.cpf_cnpj) {
        const cpfLimpo = data.cpf_cnpj.replace(/\D/g, '');
        const existentes = await base44.entities.Cliente.filter({ 
          cpf_cnpj: data.cpf_cnpj,
          loja_id: lojaFiltroId || user?.loja_id || null
        });

        const clienteExistente = existentes.find(c =>
          c.cpf_cnpj?.replace(/\D/g, '') === cpfLimpo
        );

        if (clienteExistente) {
          throw new Error(`CPF/CNPJ já cadastrado para: ${clienteExistente.nome_completo}`);
        }
      }

      // CRÍTICO: Garantir atribuição ao usuário e loja_id (Regra de Ouro)
      const dataWithLoja = { 
        ...data, 
        loja_id: lojaFiltroId || user?.loja_id || null
      };
      return base44.entities.Cliente.create(dataWithLoja);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', lojaFiltroId] });
      toast.success("Cliente cadastrado com sucesso!");
      setDialogOpen(false);
      setSelectedCliente(null);
      resetForm();
      setIsSubmitting(false);
      submitLockRef.current = false;
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar cliente");
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // CRÍTICO: Fresh fetch para validar CPF duplicado (exceto o próprio cliente)
      if (data.cpf_cnpj) {
        const cpfLimpo = data.cpf_cnpj.replace(/\D/g, '');
        const existentes = await base44.entities.Cliente.filter({ 
          cpf_cnpj: data.cpf_cnpj,
          loja_id: lojaFiltroId || user?.loja_id || null
        });

        const clienteExistente = existentes.find(c =>
          c.cpf_cnpj?.replace(/\D/g, '') === cpfLimpo && c.id !== id
        );

        if (clienteExistente) {
          throw new Error(`CPF/CNPJ já cadastrado para: ${clienteExistente.nome_completo}`);
        }
      }

      return base44.entities.Cliente.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', lojaFiltroId] });
      toast.success("Cliente atualizado!");
      setDialogOpen(false);
      setSelectedCliente(null);
      resetForm();
      setIsSubmitting(false);
      submitLockRef.current = false;
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar cliente");
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // CRÍTICO: Verificar se cliente tem vendas/OS antes de deletar (usando filter ao invés de list global)
      const [vendasCliente, osCliente] = await Promise.all([
        base44.entities.Venda.filter({ cliente_id: id }),
        base44.entities.OrdemServico.filter({ cliente_id: id })
      ]);

      if (vendasCliente.length > 0) {
        throw new Error(`Este cliente possui ${vendasCliente.length} venda(s) no histórico. Para manter a integridade dos seus registros financeiros, não é possível excluí-lo.`);
      }

      if (osCliente.length > 0) {
        throw new Error(`Este cliente possui ${osCliente.length} ordem(s) de serviço vinculada(s). Para preservar o histórico de atendimentos, não é possível excluí-lo.`);
      }

      return base44.entities.Cliente.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', lojaFiltroId] });
      toast.success("Cliente excluído!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir cliente.");
    }
  });

  const resetForm = () => {
    setFormData({
      nome_completo: "",
      cpf_cnpj: "",
      tipo_pessoa: "fisica",
      telefone1: "",
      telefone2: "",
      email: "",
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
      fonte: "loja_fisica",
      observacoes: ""
    });
    setSelectedCliente(null);
  };

  const handleOpenDialog = (cliente = null) => {
    if (cliente) {
      setSelectedCliente(cliente);
      setFormData({
        ...cliente,
        telefone2: cliente.telefone2 || '',
        email: cliente.email || '',
        data_nascimento: cliente.data_nascimento || '',
        endereco: {
          cep: cliente.endereco?.cep || '',
          logradouro: cliente.endereco?.logradouro || cliente.endereco?.rua || '',
          tipo_logradouro: cliente.endereco?.tipo_logradouro || 'rua',
          numero: cliente.endereco?.numero || '',
          complemento: cliente.endereco?.complemento || '',
          bairro: cliente.endereco?.bairro || '',
          cidade: cliente.endereco?.cidade || '',
          estado: cliente.endereco?.estado || ''
        }
      });
    } else {
      resetForm();
      setSelectedCliente(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // CRÍTICO: Mutex para prevenir double-submit
    if (submitLockRef.current || isSubmitting) {
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);

    // Validações - apenas verificar tamanho correto (11 para CPF, 14 para CNPJ)
    if (formData.cpf_cnpj) {
      const cpfLimpo = formData.cpf_cnpj.replace(/\D/g, '');
      if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
        toast.error("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos!");
        setIsSubmitting(false);
        submitLockRef.current = false;
        return;
      }
    }

    // Remover campos que não devem ser enviados na atualização
    const { id, created_date, updated_date, ...dadosLimpos } = formData;

    // Capitalizar nome e limpar campos vazios (converter "" em null para campos de data)
    const dadosFormatados = {
      ...dadosLimpos,
      nome_completo: capitalizarNome(formData.nome_completo),
      data_nascimento: formData.data_nascimento || null,
      cpf_cnpj: formData.cpf_cnpj || null,
      telefone2: formData.telefone2 || null,
      email: formData.email || null,
      observacoes: formData.observacoes || null,
    };

    if (selectedCliente) {
      updateMutation.mutate({ id: selectedCliente.id, data: dadosFormatados });
    } else {
      createMutation.mutate({ 
        ...dadosFormatados, 
        ativo: true
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEnderecoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value }
    }));
  };

  const handleAddressFound = (address) => {
    setFormData(prev => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        ...address,
        // Prioritize logradouro if available, otherwise use rua, maintaining previous if neither
        logradouro: address.logradouro || address.rua || prev.endereco.logradouro,
        // Ensure tipo_logradouro isn't overwritten by CEP data unless explicitly provided
        tipo_logradouro: address.tipo_logradouro || prev.endereco.tipo_logradouro
      }
    }));
  };

  const handleDelete = (cliente) => {
    const podeExcluir = configuracoes?.sistema?.permitir_exclusao_clientes;

    if (!podeExcluir) {
      toast.error("Exclusão desabilitada! Habilite em Configurações → Sistema");
      return;
    }

    setClienteParaExcluir(cliente);
    setDeleteDialogOpen(true);
  };

  const confirmarExclusao = () => {
    if (clienteParaExcluir) {
      deleteMutation.mutate(clienteParaExcluir.id);
    }
    setDeleteDialogOpen(false);
    setClienteParaExcluir(null);
  };

  const podeExcluir = configuracoes?.sistema?.permitir_exclusao_clientes;

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf_cnpj?.includes(searchTerm) ||
    cliente.telefone1?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">Gerencie seus clientes</p>
        </div>
        {podeEditarClientes && (
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        )}
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA).map((cliente) => {
                  const comprasCliente = vendas.filter(v => v.cliente_id === cliente.id && v.status === 'finalizada');
                  const totalGasto = comprasCliente.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
                  const score = Math.min(100, Math.floor((comprasCliente.length * 10) + (totalGasto / 100)));
                  
                  return (
                    <TableRow key={cliente.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.nome_completo}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                              <div 
                                className={`h-full transition-all ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{score}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.cpf_cnpj?.replace(/\D/g, '').length > 11
                          ? formatarCNPJ(cliente.cpf_cnpj)
                          : formatarCPF(cliente.cpf_cnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {formatarTelefone(cliente.telefone1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {cliente.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.endereco?.cidade && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {cliente.endereco.cidade}/{cliente.endereco.estado}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {cliente.fonte?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {podeEditarClientes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(cliente);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Editar cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          )}
                          {podeExcluir && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(cliente);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredClientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {Math.ceil(filteredClientes.length / ITENS_POR_PAGINA) > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-slate-500">
                Mostrando {((pagina - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(pagina * ITENS_POR_PAGINA, filteredClientes.length)} de {filteredClientes.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-2">{pagina} / {Math.ceil(filteredClientes.length / ITENS_POR_PAGINA)}</span>
                <Button variant="outline" size="sm" disabled={pagina >= Math.ceil(filteredClientes.length / ITENS_POR_PAGINA)} onClick={() => setPagina(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!podeExcluir && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                ℹ️ A exclusão de clientes está <strong>desabilitada</strong>. Habilite em <strong>Configurações → Sistema</strong> para permitir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCliente ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => handleChange('nome_completo', e.target.value)}
                  onBlur={(e) => handleChange('nome_completo', capitalizarNome(e.target.value))}
                  required
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.cpf_cnpj}
                  onChange={(e) => {
                    const valor = e.target.value;
                    const numeros = valor.replace(/\D/g, '');
                    const formatado = formatarCPFCNPJDigitando(valor);

                    setFormData(prev => ({
                      ...prev,
                      cpf_cnpj: formatado,
                      tipo_pessoa: numeros.length > 11 ? 'juridica' : 'fisica'
                    }));
                  }}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.data_nascimento || ''}
                  onChange={(e) => handleChange('data_nascimento', e.target.value)}
                />
              </div>

              <div>
                <Label>Telefone Principal *</Label>
                <Input
                  value={formData.telefone1}
                  onChange={(e) => handleChange('telefone1', formatarTelefoneDigitando(e.target.value))}
                  placeholder="(00) 00000-0000"
                  required
                  maxLength={15}
                />
              </div>

              <div>
                <Label>Telefone Secundário</Label>
                <Input
                  value={formData.telefone2 || ''}
                  onChange={(e) => handleChange('telefone2', formatarTelefoneDigitando(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div className="col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h3 className="font-semibold mb-3">Endereço</h3>
              </div>

              <div>
                <Label>CEP</Label>
                <CEPInput
                  value={formData.endereco.cep || ''}
                  onChange={(value) => handleEnderecoChange('cep', value)}
                  onAddressFound={handleAddressFound}
                />
              </div>

              <div>
                <Label>Tipo de Logradouro</Label>
                <Select
                  value={formData.endereco.tipo_logradouro || 'rua'}
                  onValueChange={(value) => handleEnderecoChange('tipo_logradouro', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rua">Rua</SelectItem>
                    <SelectItem value="avenida">Avenida</SelectItem>
                    <SelectItem value="travessa">Travessa</SelectItem>
                    <SelectItem value="alameda">Alameda</SelectItem>
                    <SelectItem value="rodovia">Rodovia</SelectItem>
                    <SelectItem value="estrada">Estrada</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Logradouro</Label>
                <Input
                  value={formData.endereco.logradouro || ''}
                  onChange={(e) => handleEnderecoChange('logradouro', e.target.value)}
                  placeholder="Nome da rua, avenida, etc."
                />
              </div>

              <div>
                <Label>Número</Label>
                <Input
                  value={formData.endereco.numero || ''}
                  onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                />
              </div>

              <div>
                <Label>Complemento</Label>
                <Input
                  value={formData.endereco.complemento || ''}
                  onChange={(e) => handleEnderecoChange('complemento', e.target.value)}
                />
              </div>

              <div>
                <Label>Bairro</Label>
                <Input
                  value={formData.endereco.bairro || ''}
                  onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                />
              </div>

              <div>
                <Label>Cidade</Label>
                <Input
                  value={formData.endereco.cidade || ''}
                  onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                />
              </div>

              <div>
                <Label>Estado</Label>
                <Input
                  value={formData.endereco.estado || ''}
                  onChange={(e) => handleEnderecoChange('estado', e.target.value)}
                  maxLength={2}
                />
              </div>

              <div>
                <Label>Como nos conheceu?</Label>
                <Select
                  value={formData.fonte}
                  onValueChange={(value) => handleChange('fonte', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loja_fisica">Loja Física</SelectItem>
                    <SelectItem value="anuncio_online">Anúncio Online</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="redes_socials">Redes Sociais</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  selectedCliente ? "Atualizar" : "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Tem certeza que deseja excluir o cliente{" "}
              <strong className="text-slate-900">{clienteParaExcluir?.nome_completo}</strong>?
              <br /><br />
              <span className="text-red-500 font-medium">Esta ação não pode ser desfeita!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClienteParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}