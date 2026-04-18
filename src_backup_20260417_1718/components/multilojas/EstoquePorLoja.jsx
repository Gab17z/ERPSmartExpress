import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, AlertTriangle, Package, ArrowRightLeft } from "lucide-react";

export default function EstoquePorLoja({ loja, produtos, onTransferir }) {
  const [busca, setBusca] = useState("");

  const produtosLoja = produtos.map(p => {
    const estoqueLoja = p.estoque_por_loja?.find(e => e.loja_id === loja.id);
    return {
      ...p,
      estoque_loja: estoqueLoja?.quantidade || 0
    };
  }).filter(p => 
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.sku?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Estoque - {loja.nome}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosLoja.map(produto => {
              const baixo = produto.estoque_loja <= produto.estoque_minimo;
              
              return (
                <TableRow key={produto.id} className={baixo ? "bg-orange-50" : ""}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{produto.sku}</TableCell>
                  <TableCell className="text-right">
                    <span className={baixo ? "text-orange-600 font-bold" : ""}>
                      {produto.estoque_loja}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {produto.estoque_minimo}
                  </TableCell>
                  <TableCell className="text-right">
                    {baixo ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Baixo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTransferir(produto)}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}