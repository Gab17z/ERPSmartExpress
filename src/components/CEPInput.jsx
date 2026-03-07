import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { formatarCEPDigitando } from "@/components/FormatUtils";

export default function CEPInput({ value, onChange, onAddressFound }) {
  const [loading, setLoading] = useState(false);

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
      } else {
        onAddressFound({
          rua: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        });
        toast.success("CEP encontrado!");
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const cepFormatado = formatarCEPDigitando(e.target.value);
    onChange(cepFormatado);

    if (cepFormatado.replace(/\D/g, '').length === 8) {
      buscarCEP(cepFormatado);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        placeholder="00000-000"
        maxLength={9}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
      )}
    </div>
  );
}