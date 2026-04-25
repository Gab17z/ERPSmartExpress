import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Tag, Grid, List } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function Categorias() {
  const { user } = useAuth();
  const { lojaFiltroId } = useLoja();
  const confirm = useConfirm();
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visualizacao, setVisualizacao] = useState('cards'); // 'cards' ou 'lista'
  const [configuracoes, setConfiguracoes] = useState(null);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    icone: "tag",
    cor: "#3b82f6",
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

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Categoria.filter({ loja_id: lojaFiltroId }, { order: 'nome' })
      : lojaFiltroId ? base44.entities.Categoria.filter({ loja_id: lojaFiltroId }, { order: 'nome' }) : base44.entities.Categoria.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const dataWithLoja = { ...data, loja_id: lojaFiltroId || null };
      return base44.entities.Categoria.create(dataWithLoja);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', lojaFiltroId] });
      toast.success("Categoria cadastrada!");
      setDialogCategoria(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Categoria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', lojaFiltroId] });
      toast.success("Categoria atualizada!");
      setDialogCategoria(false);
      setEditingCategoria(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Categoria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias', lojaFiltroId] });
      toast.success("Categoria excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria.");
    }
  });

  const handleDelete = async (categoria) => {
    const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

    if (!podeExcluir) {
      toast.error("Exclusão desabilitada! Habilite em Configurações → Sistema");
      return;
    }

    const resposta = await confirm({
      title: "Confirmar Exclusão",
      description: `Tem certeza que deseja excluir a categoria "${categoria.nome}"?\n\nEsta ação não pode ser desfeita!`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (resposta) {
      deleteMutation.mutate(categoria.id);
    }
  };

  const podeExcluir = configuracoes?.sistema?.permitir_exclusao_produtos;

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      icone: "tag",
      cor: "#3b82f6",
      ativo: true,
    });
  };

  const handleOpenDialog = (categoria = null) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setFormData(categoria);
    } else {
      resetForm();
      setEditingCategoria(null);
    }
    setDialogCategoria(true);
  };

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("Preencha o nome da categoria");
      return;
    }

    if (editingCategoria) {
      updateMutation.mutate({ id: editingCategoria.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Ocultar categoria "Peças de Reposição" - categoria do sistema que não pode ser editada/excluída
  const filteredCategorias = categorias
    .filter((c) => c.nome !== 'Peças de Reposição')
    .filter((c) => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-slate-500">Gerencie as categorias de produtos</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar categoria..."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategorias.map((categoria) => (
                <Card key={categoria.id} className="hover:shadow-lg transition-shadow border-2">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: categoria.cor + '20', color: categoria.cor }}
                      >
                        <Tag className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-bold text-lg">{categoria.nome}</h3>
                        {categoria.descricao && (
                          <p className="text-sm text-slate-500 line-clamp-2">{categoria.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(categoria)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        {podeExcluir && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(categoria)}
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
              {filteredCategorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: categoria.cor + '20', color: categoria.cor }}
                  >
                    <Tag className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{categoria.nome}</h3>
                    {categoria.descricao && (
                      <p className="text-sm text-slate-500 truncate">{categoria.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(categoria)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {podeExcluir && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(categoria)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredCategorias.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Tag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma categoria encontrada</p>
            </div>
          )}

          {!podeExcluir && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                ℹ️ A exclusão de categorias está <strong>desabilitada</strong>. Habilite em <strong>Configurações → Sistema → Permitir Exclusão de Produtos</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogCategoria} onOpenChange={setDialogCategoria}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Smartphones"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={2}
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(cor => (
                  <button
                    key={cor}
                    onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    className="w-10 h-10 rounded-lg border-2 transition-all"
                    style={{
                      backgroundColor: cor,
                      borderColor: formData.cor === cor ? '#000' : '#e2e8f0'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="ativo">Categoria ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCategoria(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCategoria ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}