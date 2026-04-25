/**
 * C01/C02 FIX: Funções de formatação centralizadas
 * 
 * ANTES: formatarData e formatarMoeda duplicadas em 6+ arquivos (Dashboard.jsx,
 * OrdensServico.jsx, Financeiro.jsx, Marketing.jsx, Relatorios.jsx, AdmWhatsApp.jsx...)
 * 
 * AGORA: Importar sempre deste arquivo:
 * import { formatarMoeda, formatarData, formatarDataHora } from '@/lib/formatters';
 */

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * C02 FIX: Padroniza para Intl.NumberFormat em vez de .toFixed(2) manual
 * @param {number} valor
 * @returns {string} Ex: "R$ 1.234,56"
 */
export function formatarMoeda(valor) {
  const num = parseFloat(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata um valor como número simples (sem símbolo de moeda)
 * Ex: 1234.56 → "1.234,56"
 */
export function formatarNumero(valor, decimais = 2) {
  const num = parseFloat(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(num);
}

/**
 * Formata uma data ISO ou YYYY-MM-DD como DD/MM/YYYY
 * C01 FIX: Centraliza a lógica de formatação de data
 * @param {string|Date} dataStr
 * @returns {string} Ex: "25/04/2026" ou "N/A"
 */
export function formatarData(dataStr) {
  if (!dataStr) return 'N/A';
  try {
    // Tratar string YYYY-MM-DD sem componente de hora (evita problema de timezone)
    if (typeof dataStr === 'string' && dataStr.length === 10 && !dataStr.includes('T')) {
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return 'Data inválida';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return 'N/A';
  }
}

/**
 * Formata uma data ISO como DD/MM/YYYY HH:mm
 * @param {string|Date} dataStr
 * @returns {string} Ex: "25/04/2026 14:30"
 */
export function formatarDataHora(dataStr) {
  if (!dataStr) return 'N/A';
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return 'N/A';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Formata um percentual como string com 1 decimal
 * @param {number} valor
 * @returns {string} Ex: "15,3%"
 */
export function formatarPercentual(valor) {
  const num = parseFloat(valor) || 0;
  return `${num.toFixed(1).replace('.', ',')}%`;
}

/**
 * Converte valor monetário formatado (BRL) para número
 * Ex: "R$ 1.234,56" → 1234.56
 */
export function parseMoedaBRL(str) {
  if (!str) return 0;
  const limpo = String(str)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpo) || 0;
}
