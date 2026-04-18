// Utilitários de formatação

// Formata telefone durante a digitação
export const formatarTelefoneDigitando = (telefone) => {
  if (!telefone) return '';
  const numero = telefone.replace(/\D/g, '').slice(0, 11);

  if (numero.length <= 2) {
    return numero.length > 0 ? `(${numero}` : '';
  } else if (numero.length <= 6) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2)}`;
  } else if (numero.length <= 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  } else {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  }
};

// Formata CPF durante a digitação
export const formatarCPFDigitando = (cpf) => {
  if (!cpf) return '';
  const numero = cpf.replace(/\D/g, '').slice(0, 11);

  if (numero.length <= 3) {
    return numero;
  } else if (numero.length <= 6) {
    return `${numero.slice(0, 3)}.${numero.slice(3)}`;
  } else if (numero.length <= 9) {
    return `${numero.slice(0, 3)}.${numero.slice(3, 6)}.${numero.slice(6)}`;
  } else {
    return `${numero.slice(0, 3)}.${numero.slice(3, 6)}.${numero.slice(6, 9)}-${numero.slice(9)}`;
  }
};

// Formata CNPJ durante a digitação
export const formatarCNPJDigitando = (cnpj) => {
  if (!cnpj) return '';
  const numero = cnpj.replace(/\D/g, '').slice(0, 14);

  if (numero.length <= 2) {
    return numero;
  } else if (numero.length <= 5) {
    return `${numero.slice(0, 2)}.${numero.slice(2)}`;
  } else if (numero.length <= 8) {
    return `${numero.slice(0, 2)}.${numero.slice(2, 5)}.${numero.slice(5)}`;
  } else if (numero.length <= 12) {
    return `${numero.slice(0, 2)}.${numero.slice(2, 5)}.${numero.slice(5, 8)}/${numero.slice(8)}`;
  } else {
    return `${numero.slice(0, 2)}.${numero.slice(2, 5)}.${numero.slice(5, 8)}/${numero.slice(8, 12)}-${numero.slice(12)}`;
  }
};

// Formata CPF ou CNPJ automaticamente baseado no tamanho
export const formatarCPFCNPJDigitando = (valor) => {
  if (!valor) return '';
  const numero = valor.replace(/\D/g, '');

  // Se tem mais de 11 dígitos, é CNPJ
  if (numero.length > 11) {
    // Passa apenas os números para evitar formatação incorreta
    return formatarCNPJDigitando(numero);
  }
  return formatarCPFDigitando(numero);
};

// Formata CEP durante a digitação
export const formatarCEPDigitando = (cep) => {
  if (!cep) return '';
  const numero = cep.replace(/\D/g, '').slice(0, 8);

  if (numero.length <= 5) {
    return numero;
  } else {
    return `${numero.slice(0, 5)}-${numero.slice(5)}`;
  }
};

export const formatarTelefone = (telefone) => {
  if (!telefone) return '';
  const numero = telefone.replace(/\D/g, '');
  
  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  } else if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  }
  return telefone;
};

export const formatarCPF = (cpf) => {
  if (!cpf) return '';
  const numero = cpf.replace(/\D/g, '');
  
  if (numero.length === 11) {
    return `${numero.slice(0, 3)}.${numero.slice(3, 6)}.${numero.slice(6, 9)}-${numero.slice(9)}`;
  }
  return cpf;
};

export const formatarCNPJ = (cnpj) => {
  if (!cnpj) return '';
  const numero = cnpj.replace(/\D/g, '');
  
  if (numero.length === 14) {
    return `${numero.slice(0, 2)}.${numero.slice(2, 5)}.${numero.slice(5, 8)}/${numero.slice(8, 12)}-${numero.slice(12)}`;
  }
  return cnpj;
};

export const formatarCEP = (cep) => {
  if (!cep) return '';
  const numero = cep.replace(/\D/g, '');
  
  if (numero.length === 8) {
    return `${numero.slice(0, 5)}-${numero.slice(5)}`;
  }
  return cep;
};

export const formatarData = (data) => {
  if (!data) return '';
  const numero = data.replace(/\D/g, '');
  
  if (numero.length >= 8) {
    return `${numero.slice(0, 2)}/${numero.slice(2, 4)}/${numero.slice(4, 8)}`;
  } else if (numero.length >= 4) {
    return `${numero.slice(0, 2)}/${numero.slice(2, 4)}/${numero.slice(4)}`;
  } else if (numero.length >= 2) {
    return `${numero.slice(0, 2)}/${numero.slice(2)}`;
  }
  return numero;
};

export const validarCPF = (cpf) => {
  const numero = cpf.replace(/\D/g, '');
  
  if (numero.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numero)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(numero.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numero.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(numero.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numero.substring(10, 11))) return false;
  
  return true;
};

export const capitalizarNome = (nome) => {
  if (!nome) return '';
  
  const palavrasMinusculas = ['da', 'de', 'do', 'das', 'dos', 'e'];
  
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      if (index === 0 || !palavrasMinusculas.includes(palavra)) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }
      return palavra;
    })
    .join(' ');
};