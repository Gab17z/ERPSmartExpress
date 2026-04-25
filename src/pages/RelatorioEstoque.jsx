import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertTriangle, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToPDF } from "@/utils/pdfExport";

export default function RelatorioEstoque() {
  const { lojaFiltroId } = useLoja();
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Produto.filter({ loja_id: lojaFiltroId })
      : base44.entities.Produto.list(),
    refetchInterval: 30000
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId })
      : base44.entities.Venda.list('-created_date'),
    refetchInterval: 30000
  });

  // CRÍTICO: Produtos com estoque baixo - apenas ativos e com estoque_minimo definido
  const produtosBaixoEstoque = produtos.filter(p => {
    const ativo = p.ativo !== false;
    const estoqueAtual = parseFloat(p.estoque_atual) || 0;
    const estoqueMinimo = parseFloat(p.estoque_minimo) || 0;
    
    // Só mostra se tem estoque_minimo configurado E estoque atual <= minimo
    return ativo && estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo;
  });
  
  // CRÍTICO: Produtos parados - sem venda nos últimos 30 dias (apenas ativos)
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  
  const produtosParados = produtos.filter(p => {
    if (p.ativo === false) return false;
    
    const vendidoRecente = vendas.some(venda => {
      if (venda.status !== 'finalizada') return false;
      if (new Date(venda.created_date) <= trintaDiasAtras) return false;
      return venda.itens?.some(item => item.produto_id === p.id);
    });
    
    return !vendidoRecente && (parseFloat(p.estoque_atual) || 0) > 0;
  });

  // CRÍTICO: Calcular produtos vendidos com validação
  const produtosVendidos = {};
  vendas.filter(v => v.status === 'finalizada').forEach(venda => {
    venda.itens?.forEach(item => {
      const qtd = parseInt(item.quantidade) || 0;
      produtosVendidos[item.produto_id] = (produtosVendidos[item.produto_id] || 0) + qtd;
    });
  });

  // CRÍTICO: Calcular curva ABC com validação
  const curvaABC = Object.entries(produtosVendidos)
    .map(([id, qtd]) => {
      const produto = produtos.find(p => p.id === id);
      const quantidade = parseInt(qtd) || 0;
      const precoVenda = parseFloat(produto?.preco_venda) || 0;
      return { produto: produto?.nome, quantidade, valor: quantidade * precoVenda };
    })
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 20);

  // CRÍTICO: Valor total em estoque (produtos ativos)
  const valorEstoque = produtos
    .filter(p => p.ativo !== false)
    .reduce((sum, p) => {
      const estoque = parseFloat(p.estoque_atual) || 0;
      const custo = parseFloat(p.preco_custo) || 0;
      return sum + (estoque * custo);
    }, 0);

  const exportarPDF = (tipo) => {
    try {
      let title, headers, data, filename;

      if (tipo === 'baixo') {
        title = 'Relatório de Estoque Baixo';
        headers = ['Produto', 'Estoque Atual', 'Estoque Mínimo', 'Status'];
        data = produtosBaixoEstoque.map(p => [
          p.nome,
          (parseFloat(p.estoque_atual) || 0).toString(),
          (parseFloat(p.estoque_minimo) || 0).toString(),
          'Crítico'
        ]);
        filename = 'estoque-baixo.pdf';
      } else if (tipo === 'parados') {
        title = 'Relatório de Produtos Sem Movimento (30+ dias)';
        headers = ['Produto', 'Estoque', 'Valor Unit.', 'Valor Total'];
        data = produtosParados.map(p => {
          const estoque = parseFloat(p.estoque_atual) || 0;
          const preco = parseFloat(p.preco_venda) || 0;
          return [
            p.nome,
            estoque.toString(),
            `R$ ${preco.toFixed(2)}`,
            `R$ ${(estoque * preco).toFixed(2)}`
          ];
        });
        filename = 'produtos-parados.pdf';
      } else if (tipo === 'abc') {
        title = 'Curva ABC - Top 20 Produtos';
        headers = ['Produto', 'Qtd. Vendida', 'Valor Total'];
        data = curvaABC.map(item => [
          item.produto || '-',
          item.quantidade.toString(),
          `R$ ${item.valor.toFixed(2)}`
        ]);
        filename = 'curva-abc.pdf';
      } else {
        title = 'Relatório Completo de Estoque';
        headers = ['Produto', 'SKU', 'Estoque', 'Valor Unit.', 'Valor Total'];
        data = produtos.filter(p => p.ativo !== false).map(p => {
          const estoque = parseFloat(p.estoque_atual) || 0;
          const custo = parseFloat(p.preco_custo) || 0;
          return [
            p.nome,
            p.sku || '-',
            estoque.toString(),
            `R$ ${custo.toFixed(2)}`,
            `R$ ${(estoque * custo).toFixed(2)}`
          ];
        });
        filename = 'estoque-completo.pdf';
      }

      if (data.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      exportToPDF(title, headers, data, filename);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Estoque</h1>
          <p className="text-slate-500">Análise completa do inventário</p>
        </div>
        <Button onClick={() => exportarPDF('todos')} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total</p>
                <p className="text-2xl font-bold">R$ {valorEstoque.toFixed(2)}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Estoque Baixo</p>
                <p className="text-2xl font-bold text-orange-600">{produtosBaixoEstoque.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Sem Movimento</p>
                <p className="text-2xl font-bold text-red-600">{produtosParados.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="baixo">
        <TabsList>
          <TabsTrigger value="baixo">Estoque Baixo</TabsTrigger>
          <TabsTrigger value="parados">Sem Movimento</TabsTrigger>
          <TabsTrigger value="abc">Curva ABC</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="baixo">
          <Card>
            <CardHeader>
              <CardTitle>Produtos com Estoque Baixo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosBaixoEstoque.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        Nenhum produto com estoque baixo
                      </TableCell>
                    </TableRow>
                  ) : (
                    produtosBaixoEstoque.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.nome}</TableCell>
                        <TableCell className="font-bold text-red-600">{parseFloat(p.estoque_atual) || 0}</TableCell>
                        <TableCell>{parseFloat(p.estoque_minimo) || 0}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Crítico</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parados">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Sem Movimento (30+ dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Valor Unitário</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosParados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        Nenhum produto sem movimento
                      </TableCell>
                    </TableRow>
                  ) : (
                    produtosParados.map(p => {
                      const estoque = parseFloat(p.estoque_atual) || 0;
                      const preco = parseFloat(p.preco_venda) || 0;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{p.nome}</TableCell>
                          <TableCell>{estoque}</TableCell>
                          <TableCell>R$ {preco.toFixed(2)}</TableCell>
                          <TableCell className="font-bold">R$ {(estoque * preco).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc">
          <Card>
            <CardHeader>
              <CardTitle>Curva ABC - Top 20 Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade Vendida</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {curvaABC.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.produto}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell className="font-bold text-green-600">R$ {item.valor.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Valor Unitário</TableHead>
                    <TableHead>Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.filter(p => p.ativo !== false).map(p => {
                    const estoque = parseFloat(p.estoque_atual) || 0;
                    const custo = parseFloat(p.preco_custo) || 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.nome}</TableCell>
                        <TableCell className="font-mono">{p.sku || '-'}</TableCell>
                        <TableCell>{estoque}</TableCell>
                        <TableCell>R$ {custo.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">R$ {(estoque * custo).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}