import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatarCNPJDigitando, formatarTelefoneDigitando } from "@/components/FormatUtils";
import CEPInput from "@/components/CEPInput";

export default function Fornecedores() {
  const [dialogFornecedor, setDialogFornecedor] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState(null);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);

  const [formData, setFormData] = useState({
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    telefone: "",
    email: "",
    contato_nome: "",
    endereco: {
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: ""
    },
    produtos_fornecidos: "",
    prazo_entrega_dias: 0,
    observacoes: "",
    ativo: true,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        setConfiguracoes(JSON.parse(configSalva));
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
    
    loadUser();
  }, []);

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list('nome_fantasia'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fornecedor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success("Fornecedor cadastrado com sucesso!");
      setDialogFornecedor(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao cadastrar fornecedor:", error);
      toast.error("Erro ao cadastrar fornecedor. Verifique os dados.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fornecedor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success("Fornecedor atualizado!");
      setDialogFornecedor(false);
      setEditingFornecedor(null);
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao atualizar fornecedor:", error);
      toast.error("Erro ao atualizar fornecedor. Verifique os dados.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Fornecedor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success("Fornecedor excluído!");
      setDialogExcluir(false);
      setFornecedorParaExcluir(null);
    },
    onError: (error) => {
      console.error("Erro ao excluir fornecedor:", error);
      toast.error("Erro ao excluir fornecedor.");
    }
  });

  const handleDelete = (fornecedor) => {
    // Check configuration for deletion permission
    const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

    if (!podeExcluir) {
      toast.error("Exclusão desabilitada! Habilite em Configurações → Sistema");
      return;
    }

    setFornecedorParaExcluir(fornecedor);
    setDialogExcluir(true);
  };

  const confirmarExclusao = () => {
    if (fornecedorParaExcluir) {
      deleteMutation.mutate(fornecedorParaExcluir.id);
    }
  };

  const podeExcluirGlobal = configuracoes?.sistema?.permitir_exclusao_produtos;

  const resetForm = () => {
    setFormData({
      nome_fantasia: "",
      razao_social: "",
      cnpj: "",
      telefone: "",
      email: "",
      contato_nome: "",
      endereco: {
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: ""
      },
      produtos_fornecidos: "",
      prazo_entrega_dias: 0,
      observacoes: "",
      ativo: true,
    });
  };

  const handleOpenDialog = (fornecedor = null) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData(fornecedor);
    } else {
      resetForm();
      setEditingFornecedor(null);
    }
    setDialogFornecedor(true);
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações completas
    if (!formData.nome_fantasia || formData.nome_fantasia.trim() === "") {
      toast.error("Digite o nome fantasia!");
      return;
    }

    if (!formData.cnpj || formData.cnpj.trim() === "") {
      toast.error("Digite o CNPJ!");
      return;
    }

    if (formData.prazo_entrega_dias && (isNaN(parseInt(formData.prazo_entrega_dias)) || parseInt(formData.prazo_entrega_dias) < 0)) {
      toast.error("Prazo de entrega inválido!");
      return;
    }

    // Campo 'nome' é obrigatório na tabela - usa nome_fantasia como valor
    const dataToSave = {
      ...formData,
      nome: formData.nome_fantasia
    };

    if (editingFornecedor) {
      updateMutation.mutate({ id: editingFornecedor.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
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
        rua: address.rua,
        bairro: address.bairro,
        cidade: address.cidade,
        estado: address.estado
      }
    }));
  };

  const filteredFornecedores = fornecedores.filter((f) =>
    f.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-slate-500">Gerencie os fornecedores de produtos</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, razão social ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{fornecedor.nome_fantasia}</TableCell>
                    <TableCell className="font-mono text-sm">{fornecedor.cnpj}</TableCell>
                    <TableCell>{fornecedor.contato_nome || '-'}</TableCell>
                    <TableCell>{fornecedor.telefone || '-'}</TableCell>
                    <TableCell>{fornecedor.endereco?.cidade || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(fornecedor)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {podeExcluirGlobal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(fornecedor)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredFornecedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhum fornecedor encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!podeExcluirGlobal && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                ℹ️ A exclusão de fornecedores está <strong>desabilitada</strong>. Habilite em <strong>Configurações → Sistema → Permitir Exclusão de Produtos</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogFornecedor} onOpenChange={setDialogFornecedor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Fantasia *</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                  placeholder="Ex: Distribuidora ABC"
                />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input
                  value={formData.razao_social}
                  onChange={(e) => handleChange('razao_social', e.target.value)}
                  placeholder="Ex: ABC Distribuidora LTDA"
                />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', formatarCNPJDigitando(e.target.value))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', formatarTelefoneDigitando(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contato@fornecedor.com"
                />
              </div>
              <div>
                <Label>Nome do Contato</Label>
                <Input
                  value={formData.contato_nome}
                  onChange={(e) => handleChange('contato_nome', e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CEP</Label>
                  <CEPInput
                    value={formData.endereco.cep || ''}
                    onChange={(value) => handleEnderecoChange('cep', value)}
                    onAddressFound={handleAddressFound}
                  />
                </div>
                <div>
                  <Label>Rua</Label>
                  <Input
                    value={formData.endereco.rua || ''}
                    onChange={(e) => handleEnderecoChange('rua', e.target.value)}
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
                    placeholder="UF"
                  />
                </div>
                <div>
                  <Label>Prazo de Entrega (dias)</Label>
                  <Input
                    type="number"
                    value={formData.prazo_entrega_dias}
                    onChange={(e) => handleChange('prazo_entrega_dias', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Produtos Fornecidos</Label>
              <Textarea
                value={formData.produtos_fornecidos}
                onChange={(e) => handleChange('produtos_fornecidos', e.target.value)}
                rows={2}
                placeholder="Ex: Peças de reposição, acessórios..."
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                rows={2}
                placeholder="Informações adicionais..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => handleChange('ativo', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Fornecedor ativo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFornecedor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingFornecedor ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Fornecedor
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-600 mb-4">
              Tem certeza que deseja excluir o fornecedor:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border">
              <p className="font-semibold text-slate-900">
                {fornecedorParaExcluir?.nome_fantasia}
              </p>
              {fornecedorParaExcluir?.cnpj && (
                <p className="text-sm text-slate-500 font-mono mt-1">
                  CNPJ: {fornecedorParaExcluir.cnpj}
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 mt-4 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Esta ação não pode ser desfeita!
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogExcluir(false);
                setFornecedorParaExcluir(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}