import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const formatarValorBRL = (valor) => {
  const numero = String(valor).replace(/\D/g, '');
  const valorNumerico = (parseInt(numero) || 0) / 100;
  return valorNumerico.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseValorBRL = (valorFormatado) => {
  if (!valorFormatado) return 0;
  return parseFloat(String(valorFormatado).replace(/\./g, '').replace(',', '.')) || 0;
};

const InputMoeda = React.forwardRef(({
  value,
  onChange,
  className,
  placeholder = "0,00",
  ...props
}, ref) => {
  // Converte o valor numérico para exibição formatada
  const valorExibicao = React.useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return value || '';
  }, [value]);

  const handleChange = (e) => {
    const valorFormatado = formatarValorBRL(e.target.value);
    // Retorna o valor numérico, não a string formatada
    const valorNumerico = parseValorBRL(valorFormatado);
    onChange?.(valorNumerico);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={valorExibicao}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-10", className)}
        {...props}
      />
    </div>
  );
});

InputMoeda.displayName = "InputMoeda";

export { InputMoeda, formatarValorBRL, parseValorBRL };
