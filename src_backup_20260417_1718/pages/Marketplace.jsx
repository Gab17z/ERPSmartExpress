import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Search,
  Package,
  Star,
  Heart,
  Filter,
  Grid3x3,
  List
} from "lucide-react";
import { toast } from "sonner";

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [ordenacao, setOrdenacao] = useState("relevancia");
  const [visualizacao, setVisualizacao] = useState("grid");
  const [carrinho, setCarrinho] = useState(
    JSON.parse(localStorage.getItem('carrinho_marketplace') || '[]')
  );

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos-marketplace'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
  });

  const { data: configuracoes } = useQuery({
    queryKey: ['config-marketplace'],
    queryFn: async () => {
      const config = localStorage.getItem('configuracoes_erp');
      return config ? JSON.parse(config) : null;
    },
    refetchInterval: 5000
  });

  const adicionarCarrinho = (produto) => {
    const novoCarrinho = [...carrinho];
    const itemExistente = novoCarrinho.find(item => item.id === produto.id);

    if (itemExistente) {
      itemExistente.quantidade++;
    } else {
      novoCarrinho.push({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco_venda,
        imagem: produto.imagem_url,
        quantidade: 1
      });
    }

    setCarrinho(novoCarrinho);
    localStorage.setItem('carrinho_marketplace', JSON.stringify(novoCarrinho));
    toast.success(`${produto.nome} adicionado ao carrinho!`);
  };

  const produtosFiltrados = produtos
    .filter(p => 
      (categoriaFiltro === "todas" || p.categoria === categoriaFiltro) &&
      (p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.marca_nome?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (ordenacao === "menor_preco") return a.preco_venda - b.preco_venda;
      if (ordenacao === "maior_preco") return b.preco_venda - a.preco_venda;
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome);
      return 0;
    });

  const totalItensCarrinho = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  const empresaNome = configuracoes?.empresa?.nome || "Smart Express";
  const empresaLogo = configuracoes?.empresa?.logo_url;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Marketplace */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {empresaLogo && (
                <img src={empresaLogo} alt={empresaNome} className="h-10 w-auto object-contain" />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">{empresaNome}</h1>
                <p className="text-xs text-slate-500">Loja Online</p>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = createPageUrl("Carrinho")}
              className="bg-blue-600 hover:bg-blue-700 relative"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Carrinho
              {totalItensCarrinho > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
                  {totalItensCarrinho}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros e Busca */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Categorias</SelectItem>
                <SelectItem value="celular">Celulares</SelectItem>
                <SelectItem value="acessorio">Acessórios</SelectItem>
                <SelectItem value="peca_reposicao">Peças</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ordenacao} onValueChange={setOrdenacao}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancia">Relevância</SelectItem>
                <SelectItem value="menor_preco">Menor Preço</SelectItem>
                <SelectItem value="maior_preco">Maior Preço</SelectItem>
                <SelectItem value="nome">Nome A-Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={visualizacao === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setVisualizacao("grid")}
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                variant={visualizacao === "lista" ? "default" : "outline"}
                size="icon"
                onClick={() => setVisualizacao("lista")}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>{produtosFiltrados.length} produtos encontrados</p>
          </div>
        </div>

        {/* Grid de Produtos */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-600">Carregando produtos...</p>
            </div>
          </div>
        ) : visualizacao === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtosFiltrados.map((produto) => (
              <Card key={produto.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                <div className="aspect-square bg-slate-100 overflow-hidden relative">
                  {produto.imagem_url ? (
                    <img 
                      src={produto.imagem_url} 
                      alt={produto.nome} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-300" />
                    </div>
                  )}
                  {produto.estoque_atual <= produto.estoque_minimo && (
                    <Badge className="absolute top-2 right-2 bg-orange-500">
                      Últimas unidades
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs mb-2">
                      {produto.categoria?.replace(/_/g, ' ')}
                    </Badge>
                    {produto.marca_nome && (
                      <p className="text-xs text-slate-500">{produto.marca_nome}</p>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 h-10">
                    {produto.nome}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-green-600">
                      R$ {produto.preco_venda?.toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    onClick={() => adicionarCarrinho(produto)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={produto.estoque_atual === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {produto.estoque_atual === 0 ? "Sem Estoque" : "Adicionar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {produtosFiltrados.map((produto) => (
              <Card key={produto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-32 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {produto.imagem_url ? (
                        <img 
                          src={produto.imagem_url} 
                          alt={produto.nome} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {produto.categoria?.replace(/_/g, ' ')}
                            </Badge>
                            {produto.marca_nome && (
                              <span className="text-xs text-slate-500">{produto.marca_nome}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-lg mb-2">{produto.nome}</h3>
                          {produto.descricao && (
                            <p className="text-sm text-slate-600 line-clamp-2">{produto.descricao}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600">
                            R$ {produto.preco_venda?.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Estoque: {produto.estoque_atual}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <Button 
                          onClick={() => adicionarCarrinho(produto)}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={produto.estoque_atual === 0}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {produto.estoque_atual === 0 ? "Sem Estoque" : "Adicionar ao Carrinho"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {produtosFiltrados.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Botão Flutuante Carrinho Mobile */}
      {totalItensCarrinho > 0 && (
        <button
          onClick={() => window.location.href = createPageUrl("Carrinho")}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 z-40"
        >
          <ShoppingCart className="w-6 h-6" />
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
            {totalItensCarrinho}
          </Badge>
        </button>
      )}
    </div>
  );
}