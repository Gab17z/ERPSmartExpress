import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Package, Check, X, FileUp, Loader2, Sparkles, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Compras() {
  const { user } = useAuth();
  const [dialogCompra, setDialogCompra] = useState(false);
  const [dialogProduto, setDialogProduto] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [fornecedorOpen, setFornecedorOpen] = useState(false);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  
  const [formData, setFormData] = useState({
    fornecedor_id: "",
    fornecedor_nome: "",
    numero_nota: "",
    itens: [],
    forma_pagamento: "prazo",
    data_entrega: "",
    observacoes: ""
  });

  const queryClient = useQueryClient();

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: async () => {
      try {
        return await base44.entities.Compra.list('-data_compra');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list('nome_fantasia'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      
      const proximoNumero = compras.length + 1;
      const numeroCompra = `CMP-${proximoNumero.toString().padStart(5, '0')}`;

      // Primeiro, criar novos produtos para itens não identificados
      const itensProcessados = [];
      for (const item of data.itens) {
        let produtoId = item.produto_id;
        let produtoNome = item.produto_nome;


        // Se for um produto novo (não identificado)
        if (item.produto_id.startsWith('temp_')) {
          // CRÍTICO: Gerar SKU numérico sequencial (padrão do sistema)
          const skusNumericos = produtos
            .map(p => parseInt(p.sku))
            .filter(sku => !isNaN(sku))
            .sort((a, b) => b - a);
          
          const proximoSku = skusNumericos.length > 0 ? (skusNumericos[0] + 1).toString() : "1";

          // Criar o novo produto
          // CRÍTICO: Criar produto com dados validados
          const novoProduto = await base44.entities.Produto.create({
            sku: proximoSku,
            nome: item.produto_nome.trim(),
            categoria: 'outro',
            preco_custo: parseFloat(item.preco_unitario) || 0,
            preco_venda: parseFloat(item.preco_unitario) * 1.3, // Margem padrão de 30%
            margem_lucro: 30,
            estoque_atual: parseInt(item.quantidade) || 0,
            estoque_minimo: 5,
            fornecedor_nome: data.fornecedor_nome,
            codigo_barras: item.codigo_pdf || '',
            ativo: true
          });

          produtoId = novoProduto.id;
          produtoNome = novoProduto.nome;

          // Registrar movimentação de estoque para o novo produto
          await base44.entities.MovimentacaoEstoque.create({
            tipo: "entrada",
            produto_id: novoProduto.id,
            produto_nome: novoProduto.nome,
            quantidade: item.quantidade,
            estoque_anterior: 0,
            estoque_novo: item.quantidade,
            motivo: "Compra de fornecedor - Produto novo cadastrado",
            documento_referencia: numeroCompra,
            usuario_responsavel: user?.nome,
            data_movimentacao: new Date().toISOString()
          });

          toast.success(`✅ Produto "${item.produto_nome}" cadastrado automaticamente!`);
        } else {
          // CRÍTICO: Produto existente - atualizar estoque com validação
          const produto = produtos.find(p => p.id === produtoId);
          if (produto) {
            const novoEstoque = (produto.estoque_atual || 0) + parseInt(item.quantidade);
            const novoCusto = parseFloat(item.preco_unitario) || produto.preco_custo || 0;
            
            await base44.entities.Produto.update(produto.id, {
              estoque_atual: novoEstoque,
              preco_custo: novoCusto
            });

            await base44.entities.MovimentacaoEstoque.create({
              tipo: "entrada",
              produto_id: produto.id,
              produto_nome: produto.nome,
              quantidade: parseInt(item.quantidade),
              estoque_anterior: produto.estoque_atual || 0,
              estoque_novo: novoEstoque,
              motivo: "Compra de fornecedor",
              documento_referencia: numeroCompra,
              usuario_responsavel: user?.nome,
              data_movimentacao: new Date().toISOString()
            });
          }
        }

        itensProcessados.push({
          produto_id: produtoId,
          produto_nome: produtoNome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal
        });
      }

      // Criar a compra com os itens processados
      const compra = await base44.entities.Compra.create({
        fornecedor_id: data.fornecedor_id,
        fornecedor_nome: data.fornecedor_nome,
        nota_fiscal: data.numero_nota,
        itens: itensProcessados,
        total: data.valor_total,
        data_entrega: data.data_entrega || null,
        observacoes: data.observacoes || null,
        numero: numeroCompra,
        data_compra: new Date().toISOString().split('T')[0],
        status: "pendente"
      });

      return compra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success("Compra registrada! Estoque atualizado e novos produtos cadastrados.");
      resetForm();
    },
    onError: (error) => {
      console.error("❌ Erro ao registrar compra:", error);
      toast.error(`Erro ao registrar compra: ${error.message}`);
    }
  });

  const finalizarMutation = useMutation({
    mutationFn: (id) => base44.entities.Compra.update(id, { status: "entregue" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success("Compra finalizada!");
    },
  });

  const resetForm = () => {
    setFormData({
      fornecedor_id: "",
      fornecedor_nome: "",
      numero_nota: "",
      itens: [],
      forma_pagamento: "prazo",
      data_entrega: "",
      observacoes: ""
    });
    setDialogCompra(false);
  };

  const adicionarItem = (produto) => {
    if (formData.itens.some(i => i.produto_id === produto.id)) {
      toast.error("Produto já adicionado!");
      return;
    }

    setFormData({
      ...formData,
      itens: [...formData.itens, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        preco_unitario: produto.preco_custo || 0,
        subtotal: produto.preco_custo || 0
      }]
    });
    setDialogProduto(false);
  };

  const removerItem = (produtoId) => {
    setFormData({
      ...formData,
      itens: formData.itens.filter(i => i.produto_id !== produtoId)
    });
  };

  const atualizarItem = (produtoId, campo, valor) => {
    setFormData({
      ...formData,
      itens: formData.itens.map(i => {
        if (i.produto_id === produtoId) {
          if (campo === 'produto_nome') {
            return { ...i, produto_nome: valor };
          }
          const updated = { ...i, [campo]: parseFloat(valor) || 0 };
          // CRÍTICO: Cálculo seguro de subtotal
          updated.subtotal = (parseFloat(updated.quantidade) || 0) * (parseFloat(updated.preco_unitario) || 0);
          return updated;
        }
        return i;
      })
    });
  };

  // CRÍTICO: Cálculo seguro do total
  const calcularTotal = () => formData.itens.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPDF(true);
    try {
      toast.info("📄 Enviando PDF...", { duration: 2000 });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      toast.info("🤖 IA analisando produtos...", { duration: 3000 });

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este PDF de nota fiscal ou pedido de compra e extraia TODOS os produtos listados.

  Para cada produto, retorne:
  - codigo: código/SKU/referência do produto (se disponível)
  - nome: nome completo do produto
  - quantidade: quantidade comprada
  - preco_unitario: preço unitário do produto

  Retorne uma lista completa de todos os produtos encontrados no documento.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            produtos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string" },
                  nome: { type: "string" },
                  quantidade: { type: "number" },
                  preco_unitario: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response.produtos && response.produtos.length > 0) {
        const novosItens = response.produtos.map(p => {
          // Melhor correspondência: busca por código primeiro, depois por nome
          let produtoExistente = null;
          let confianca = 0;

          if (p.codigo) {
            produtoExistente = produtos.find(prod => 
              prod.sku?.toLowerCase() === p.codigo.toLowerCase() ||
              prod.codigo_barras?.toLowerCase() === p.codigo.toLowerCase()
            );
            if (produtoExistente) confianca = 100;
          }

          if (!produtoExistente && p.nome) {
            // Busca por nome com palavras-chave
            const palavrasChavePDF = p.nome.toLowerCase().split(/\s+/).filter(w => w.length > 3);

            produtoExistente = produtos.find(prod => {
              const nomeProd = prod.nome.toLowerCase();
              const palavrasChaveProd = nomeProd.split(/\s+/).filter(w => w.length > 3);

              // Conta quantas palavras-chave em comum
              const palavrasComuns = palavrasChavePDF.filter(p => palavrasChaveProd.some(pc => pc.includes(p) || p.includes(pc)));
              const porcentagem = palavrasComuns.length / Math.max(palavrasChavePDF.length, palavrasChaveProd.length);

              return porcentagem >= 0.4; // 40% de palavras em comum
            });

            if (produtoExistente) confianca = 60;
          }

          return {
            produto_id: produtoExistente?.id || `temp_${Date.now()}_${Math.random()}`,
            produto_nome: produtoExistente?.nome || p.nome,
            codigo_pdf: p.codigo || '',
            quantidade: p.quantidade || 1,
            preco_unitario: p.preco_unitario || 0,
            subtotal: (p.quantidade || 1) * (p.preco_unitario || 0),
            _novo: !produtoExistente,
            _confianca: confianca,
            _nome_original_pdf: p.nome
          };
        });

        setFormData({
          ...formData,
          itens: [...formData.itens, ...novosItens]
        });

        const novos = novosItens.filter(i => i._novo).length;
        const existentes = novosItens.length - novos;

        if (novos > 0) {
          toast.warning(
            `⚠️ ${novosItens.length} produtos extraídos!\n` +
            `${existentes} encontrados no cadastro, ${novos} NÃO IDENTIFICADOS (destaque em amarelo)`,
            { duration: 7000 }
          );
        } else {
          toast.success(
            `✅ ${novosItens.length} produtos extraídos!\n` +
            `Todos os produtos foram encontrados no cadastro`,
            { duration: 5000 }
          );
        }
      } else {
        toast.warning("Nenhum produto encontrado no PDF");
      }
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      toast.error("Erro ao processar PDF com IA");
    } finally {
      setUploadingPDF(false);
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações completas antes de registrar compra
    if (!formData.fornecedor_id || formData.itens.length === 0) {
      toast.error("Selecione fornecedor e adicione produtos!");
      return;
    }

    // Validar que produtos novos tenham nome preenchido
    const produtosSemNome = formData.itens.filter(i => i._novo && !i.produto_nome.trim());
    if (produtosSemNome.length > 0) {
      toast.error("Preencha o nome de todos os produtos novos!");
      return;
    }

    // CRÍTICO: Validar quantidades e preços
    const itensInvalidos = formData.itens.filter(i => i.quantidade <= 0 || i.preco_unitario < 0);
    if (itensInvalidos.length > 0) {
      toast.error("Todos os produtos devem ter quantidade e preço válidos!");
      return;
    }

    const totalCalculado = calcularTotal();
    if (totalCalculado <= 0) {
      toast.error("Valor total da compra deve ser maior que zero!");
      return;
    }

    createMutation.mutate({
      ...formData,
      valor_total: totalCalculado
    });
  };

  // Cálculo seguro do total
  const totalCompras = compras.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Compras / Entrada de Produtos
          </h1>
          <p className="text-slate-500">Registre compras de fornecedores</p>
        </div>
        <Button onClick={() => setDialogCompra(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Compra
        </Button>
      </div>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div>
            <p className="text-sm text-slate-500">Total em Compras</p>
            <p className="text-3xl font-bold text-blue-600">R$ {totalCompras.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{compras.length} compras registradas</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-mono">{compra.numero}</TableCell>
                  <TableCell>{compra.fornecedor_nome}</TableCell>
                  <TableCell>{compra.nota_fiscal || "-"}</TableCell>
                  <TableCell>{compra.data_compra ? format(new Date(compra.data_compra), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{compra.itens?.length || 0} produto(s)</TableCell>
                  <TableCell className="font-bold text-blue-600">R$ {(parseFloat(compra.total) || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={compra.status === "entregue" ? "default" : "secondary"}>
                      {compra.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {compra.status === "pendente" && (
                      <Button size="sm" onClick={() => finalizarMutation.mutate(compra.id)}>
                        <Check className="w-3 h-3 mr-1" />
                        Finalizar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogCompra} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Registrar Nova Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-sm text-blue-900 font-medium">Preencha os dados da compra e adicione os produtos manualmente.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fornecedor *</Label>
                <Popover open={fornecedorOpen} onOpenChange={setFornecedorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={fornecedorOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.fornecedor_nome || "Selecione um fornecedor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar fornecedor..." />
                      <CommandList>
                        <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                        <CommandGroup>
                          {fornecedores.filter(f => f.ativo !== false).map((fornecedor) => (
                            <CommandItem
                              key={fornecedor.id}
                              value={fornecedor.nome_fantasia || fornecedor.nome}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  fornecedor_id: fornecedor.id,
                                  fornecedor_nome: fornecedor.nome_fantasia || fornecedor.nome
                                });
                                setFornecedorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.fornecedor_id === fornecedor.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{fornecedor.nome_fantasia || fornecedor.nome}</span>
                                {fornecedor.cnpj && (
                                  <span className="text-xs text-slate-500">{fornecedor.cnpj}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Número da Nota Fiscal</Label>
                <Input
                  value={formData.numero_nota}
                  onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="prazo">A Prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Entrega</Label>
                <Input
                  type="date"
                  value={formData.data_entrega}
                  onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-4 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Produtos da Compra
                </h3>
                <div className="flex gap-2">
                  <Button onClick={() => setDialogProduto(true)} size="sm" className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              </div>

              {formData.itens.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg border-2 border-dashed">
                  <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Nenhum produto adicionado</p>
                  <p className="text-sm mt-1">Use o botão acima para adicionar produtos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itens.map((item) => (
                      <TableRow 
                        key={item.produto_id}
                        className={item._novo ? "bg-yellow-50 border-l-4 border-l-yellow-500" : ""}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {item._novo && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  ⚠️ Novo - Será cadastrado
                                </Badge>
                              )}
                            </div>
                            {item._novo ? (
                              <Input
                                value={item.produto_nome}
                                onChange={(e) => atualizarItem(item.produto_id, 'produto_nome', e.target.value)}
                                className="font-medium border-yellow-300 focus:border-yellow-500"
                                placeholder="Digite o nome do produto"
                              />
                            ) : (
                              <span className="font-medium">{item.produto_nome}</span>
                            )}
                            {item._novo && item._nome_original_pdf && item._nome_original_pdf !== item.produto_nome && (
                              <div className="text-xs text-slate-500">PDF original: {item._nome_original_pdf}</div>
                            )}
                            {item.codigo_pdf && (
                              <div className="text-xs text-slate-500">Código: {item.codigo_pdf}</div>
                            )}
                            {item._novo && (
                              <div className="text-xs text-green-700 mt-1">
                                ✓ Será cadastrado automaticamente ao registrar a compra
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(item.produto_id, 'quantidade', e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => atualizarItem(item.produto_id, 'preco_unitario', e.target.value)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="font-bold">R$ {(parseFloat(item.subtotal) || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => removerItem(item.produto_id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-between items-center p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg mt-4 border-2 border-blue-200">
                <div>
                  <p className="text-sm text-slate-600">Valor Total da Compra</p>
                  <span className="text-xs text-slate-500">{formData.itens.length} produto(s)</span>
                </div>
                <span className="text-3xl font-bold text-blue-600">R$ {calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600">Registrar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogProduto} onOpenChange={(open) => { setDialogProduto(open); if (!open) setBuscaProduto(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar produto por nome ou SKU..."
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              className="w-full"
              autoFocus
            />
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {produtos
                .filter(p => p.ativo !== false)
                .filter(p => {
                  if (!buscaProduto) return true;
                  const busca = buscaProduto.toLowerCase();
                  return (
                    p.nome?.toLowerCase().includes(busca) ||
                    p.sku?.toLowerCase().includes(busca) ||
                    p.codigo_barras?.toLowerCase().includes(busca)
                  );
                })
                .map(produto => (
                  <Button
                    key={produto.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      adicionarItem(produto);
                      setBuscaProduto("");
                    }}
                  >
                    <div className="text-left flex-1">
                      <div className="font-semibold">{produto.nome}</div>
                      <div className="text-xs text-slate-500">
                        SKU: {produto.sku || '-'} | Estoque: {produto.estoque_atual || 0}
                      </div>
                    </div>
                  </Button>
                ))}
              {produtos.filter(p => p.ativo !== false).filter(p => {
                if (!buscaProduto) return true;
                const busca = buscaProduto.toLowerCase();
                return (
                  p.nome?.toLowerCase().includes(busca) ||
                  p.sku?.toLowerCase().includes(busca) ||
                  p.codigo_barras?.toLowerCase().includes(busca)
                );
              }).length === 0 && (
                <div className="text-center py-4 text-slate-500">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}