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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Camera, Trash2, Tag, Grid, List } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function Marcas() {
  const confirm = useConfirm();
  const [dialogMarca, setDialogMarca] = useState(false);
  const [editingMarca, setEditingMarca] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [visualizacao, setVisualizacao] = useState('cards'); // 'cards' ou 'lista'
  const [user, setUser] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    pais_origem: "",
    logo_url: "",
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

  const { data: marcas = [], isLoading } = useQuery({
    queryKey: ['marcas'],
    queryFn: () => base44.entities.Marca.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Marca.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] });
      toast.success("Marca cadastrada com sucesso!");
      setDialogMarca(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Marca.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] });
      toast.success("Marca atualizada!");
      setDialogMarca(false);
      setEditingMarca(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Marca.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] });
      toast.success("Marca excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir marca:", error);
      toast.error("Erro ao excluir marca.");
    }
  });

  const handleDelete = async (marca) => {
    const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

    if (!podeExcluir) {
      toast.error("Exclusão desabilitada! Habilite em Configurações → Sistema");
      return;
    }

    const resposta = await confirm({
      title: "Confirmar Exclusão",
      description: `Tem certeza que deseja excluir a marca "${marca.nome}"?\n\nEsta ação não pode ser desfeita!`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      deleteMutation.mutate(marca.id);
    }
  };

  const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

  const resetForm = () => {
    setFormData({
      nome: "",
      pais_origem: "",
      logo_url: "",
      observacoes: "",
      ativo: true,
    });
  };

  const handleOpenDialog = (marca = null) => {
    if (marca) {
      setEditingMarca(marca);
      setFormData(marca);
    } else {
      resetForm();
      setEditingMarca(null);
    }
    setDialogMarca(true);
  };

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("Preencha o nome da marca");
      return;
    }

    if (editingMarca) {
      updateMutation.mutate({ id: editingMarca.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      toast.success("Logo enviada!");
    } catch (error) {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
    }
  };

  const filteredMarcas = marcas.filter((m) =>
    m.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.pais_origem?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marcas</h1>
          <p className="text-slate-500">Gerencie as marcas de produtos</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Marca
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={visualizacao === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setVisualizacao('cards')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={visualizacao === 'lista' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setVisualizacao('lista')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visualizacao === 'cards' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredMarcas.map((marca) => (
                <Card key={marca.id} className="hover:shadow-lg transition-all border-2 group">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className="w-24 h-24 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center p-2 group-hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => handleOpenDialog(marca)}
                      >
                        {marca.logo_url ? (
                          <img
                            src={marca.logo_url}
                            alt={marca.nome}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Tag className="w-12 h-12 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-1 w-full">
                        <h3 className="font-bold text-base truncate">{marca.nome}</h3>
                        {marca.pais_origem && (
                          <p className="text-xs text-slate-500 truncate">{marca.pais_origem}</p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(marca)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        {podeExcluir && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(marca)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMarcas.map((marca) => (
                <div
                  key={marca.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenDialog(marca)}
                >
                  <div className="w-16 h-16 bg-white rounded-lg border-2 border-slate-200 flex items-center justify-center p-2 flex-shrink-0">
                    {marca.logo_url ? (
                      <img
                        src={marca.logo_url}
                        alt={marca.nome}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Tag className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{marca.nome}</h3>
                    {marca.pais_origem && (
                      <p className="text-sm text-slate-500">{marca.pais_origem}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenDialog(marca); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {podeExcluir && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(marca); }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredMarcas.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Tag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma marca encontrada</p>
            </div>
          )}

          {!podeExcluir && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                ℹ️ A exclusão de marcas está <strong>desabilitada</strong>. Habilite em <strong>Configurações → Sistema → Permitir Exclusão de Produtos</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMarca} onOpenChange={setDialogMarca}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMarca ? "Editar Marca" : "Nova Marca"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Logo da Marca</Label>
              <div className="mt-2">
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="w-32 h-32 object-contain border rounded-lg mb-3"
                  />
                )}
                <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {uploading ? "Enviando..." : "Escolher Logo"}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Marca *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: Apple"
                />
              </div>
              <div>
                <Label>País de Origem</Label>
                <Input
                  value={formData.pais_origem}
                  onChange={(e) => handleChange('pais_origem', e.target.value)}
                  placeholder="Ex: Estados Unidos"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre a marca..."
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
                Marca ativa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMarca(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingMarca ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}