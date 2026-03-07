import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { capitalizarNome, formatarTelefoneDigitando, formatarCPFCNPJDigitando, formatarCEPDigitando } from "@/components/FormatUtils";

export default function ClienteFormDialog({ open, onOpenChange, clienteInicial = null }) {
  const queryClient = useQueryClient();
  const [buscandoCep, setBuscandoCep] = useState(false);
  const estadoInicial = {
    nome_completo: "",
    tipo_pessoa: "fisica",
    cpf_cnpj: "",
    data_nascimento: "",
    telefone1: "",
    telefone2: "",
    email: "",
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
  };

  const [formData, setFormData] = useState(clienteInicial || estadoInicial);

  useEffect(() => {
    if (open) {
      setFormData(clienteInicial || estadoInicial);
    }
  }, [clienteInicial, open]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (clienteInicial?.id) {
        return base44.entities.Cliente.update(clienteInicial.id, data);
      }
      return base44.entities.Cliente.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(clienteInicial ? "Cliente atualizado!" : "Cliente cadastrado!");
      onOpenChange(false);
    },
  });

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
      } else {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            cep: cep,
            logradouro: data.logradouro || prev.endereco?.logradouro,
            bairro: data.bairro || prev.endereco?.bairro,
            cidade: data.localidade || prev.endereco?.cidade,
            estado: data.uf || prev.endereco?.estado
          }
        }));
        toast.success("CEP encontrado!");
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome_completo || !formData.telefone1) {
      toast.error("Preencha nome e telefone!");
      return;
    }

    // Limpar dados antes de enviar - converter strings vazias em null para campos de data
    const dadosLimpos = {
      ...formData,
      data_nascimento: formData.data_nascimento || null,
      cpf_cnpj: formData.cpf_cnpj || null,
      telefone2: formData.telefone2 || null,
      email: formData.email || null,
      observacoes: formData.observacoes || null,
    };

    mutation.mutate(dadosLimpos);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clienteInicial ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {clienteInicial ? "Atualize os dados do cliente" : "Preencha os dados do novo cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({...formData, nome_completo: capitalizarNome(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>CPF/CNPJ</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => {
                  const valor = e.target.value;
                  const numeros = valor.replace(/\D/g, '');
                  setFormData({
                    ...formData,
                    cpf_cnpj: formatarCPFCNPJDigitando(valor),
                    tipo_pessoa: numeros.length > 11 ? 'juridica' : 'fisica'
                  });
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div>
              <Label>Data Nascimento</Label>
              <Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})} />
            </div>

            <div>
              <Label>Telefone Principal *</Label>
              <Input
                value={formData.telefone1}
                onChange={(e) => setFormData({...formData, telefone1: formatarTelefoneDigitando(e.target.value)})}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>

            <div>
              <Label>Telefone 2</Label>
              <Input
                value={formData.telefone2}
                onChange={(e) => setFormData({...formData, telefone2: formatarTelefoneDigitando(e.target.value)})}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="col-span-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="col-span-2 border-t pt-4">
              <h3 className="font-semibold mb-3">Endereço</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Label>CEP</Label>
                  <Input
                    value={formData.endereco?.cep || ""}
                    onChange={(e) => {
                      const cepFormatado = formatarCEPDigitando(e.target.value);
                      setFormData({...formData, endereco: {...formData.endereco, cep: cepFormatado}});
                      if (cepFormatado.replace(/\D/g, '').length === 8) {
                        buscarCEP(cepFormatado);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {buscandoCep && (
                    <Loader2 className="absolute right-3 top-8 w-4 h-4 animate-spin text-blue-600" />
                  )}
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.endereco?.tipo_logradouro || "rua"} onValueChange={(v) => setFormData({...formData, endereco: {...formData.endereco, tipo_logradouro: v}})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rua">Rua</SelectItem>
                      <SelectItem value="avenida">Avenida</SelectItem>
                      <SelectItem value="travessa">Travessa</SelectItem>
                      <SelectItem value="alameda">Alameda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={formData.endereco?.logradouro || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, logradouro: e.target.value}})} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={formData.endereco?.numero || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, numero: e.target.value}})} />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={formData.endereco?.complemento || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, complemento: e.target.value}})} />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input value={formData.endereco?.bairro || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, bairro: e.target.value}})} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={formData.endereco?.cidade || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cidade: e.target.value}})} />
                </div>
                <div className="col-span-2">
                  <Label>Estado</Label>
                  <Input value={formData.endereco?.estado || ""} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, estado: e.target.value}})} placeholder="SP" maxLength={2} />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <Label>Como conheceu a loja?</Label>
              <Select value={formData.fonte || "loja_fisica"} onValueChange={(v) => setFormData({...formData, fonte: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja_fisica">Loja Física</SelectItem>
                  <SelectItem value="anuncio_online">Anúncio Online</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes || ""} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600">{clienteInicial ? "Atualizar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}