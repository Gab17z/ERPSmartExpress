import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function Fiscal() {
  const [notasFiscais, setNotasFiscais] = useState([]);

  const emitirNFe = () => {
    toast.info("Funcionalidade de emissão de NFe requer integração com API fiscal");
  };

  const emitirNFCe = () => {
    toast.info("Funcionalidade de emissão de NFC-e requer integração com API fiscal");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fiscal</h1>
        <p className="text-slate-500">Gestão de documentos fiscais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold mb-2">NFe</h3>
            <p className="text-sm text-slate-500 mb-4">Nota Fiscal Eletrônica</p>
            <Button onClick={emitirNFe} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Emitir NFe
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold mb-2">NFC-e</h3>
            <p className="text-sm text-slate-500 mb-4">Nota Fiscal do Consumidor</p>
            <Button onClick={emitirNFCe} className="w-full bg-green-600">
              <Send className="w-4 h-4 mr-2" />
              Emitir NFC-e
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 text-orange-500 mb-3" />
            <h3 className="font-semibold mb-2">Certificado A1</h3>
            <p className="text-sm text-slate-500 mb-4">Validade: Não configurado</p>
            <Button variant="outline" className="w-full">
              Configurar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notas">
        <TabsList>
          <TabsTrigger value="notas">Notas Emitidas</TabsTrigger>
          <TabsTrigger value="contingencia">Contingência</TabsTrigger>
          <TabsTrigger value="inutilizacao">Inutilização</TabsTrigger>
        </TabsList>

        <TabsContent value="notas">
          <Card>
            <CardHeader>
              <CardTitle>Notas Fiscais Emitidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Nenhuma nota fiscal emitida</p>
                <p className="text-sm mt-2">Configure a integração fiscal nas Configurações</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contingencia">
          <Card>
            <CardHeader>
              <CardTitle>Modo Contingência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900">
                  O modo de contingência permite emitir notas quando o servidor da SEFAZ está indisponível.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inutilizacao">
          <Card>
            <CardHeader>
              <CardTitle>Inutilizar Numeração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Série</Label>
                <Input type="number" placeholder="1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número Inicial</Label>
                  <Input type="number" />
                </div>
                <div>
                  <Label>Número Final</Label>
                  <Input type="number" />
                </div>
              </div>
              <div>
                <Label>Justificativa</Label>
                <Input placeholder="Motivo da inutilização..." />
              </div>
              <Button className="w-full">Inutilizar Numeração</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}