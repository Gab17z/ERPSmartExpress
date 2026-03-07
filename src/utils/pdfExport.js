import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Exporta dados para PDF com tabela formatada
 * @param {string} title - Título do relatório
 * @param {string[]} headers - Cabeçalhos da tabela
 * @param {any[][]} data - Dados da tabela (array de arrays)
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {object} options - Opções adicionais
 */
export const exportToPDF = (title, headers, data, filename, options = {}) => {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 14, 22);

  // Subtítulo com data
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

  // Linha de período se fornecida
  if (options.periodo) {
    doc.text(`Período: ${options.periodo}`, 14, 36);
  }

  // Tabela
  doc.autoTable({
    head: [headers],
    body: data,
    startY: options.periodo ? 42 : 36,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left'
    },
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: options.columnStyles || {},
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé com número de página
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth - 30,
        doc.internal.pageSize.getHeight() - 10
      );

      // Nome da empresa no rodapé
      if (options.empresa) {
        doc.text(options.empresa, 14, doc.internal.pageSize.getHeight() - 10);
      }
    }
  });

  // Salvar arquivo
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exporta relatório financeiro com resumo
 */
export const exportFinanceiroPDF = (title, resumo, headers, data, filename) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 22);

  // Data
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  // Resumo financeiro
  let startY = 40;
  if (resumo) {
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumo:', 14, startY);

    doc.setFontSize(10);
    startY += 8;

    Object.entries(resumo).forEach(([key, value], index) => {
      const y = startY + (index * 6);
      doc.setTextColor(100, 116, 139);
      doc.text(`${key}:`, 14, y);
      doc.setTextColor(30, 41, 59);
      doc.text(String(value), 60, y);
    });

    startY += (Object.keys(resumo).length * 6) + 10;
  }

  // Tabela
  doc.autoTable({
    head: [headers],
    body: data,
    startY: startY,
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exporta lista simples (clientes, produtos, etc.)
 */
export const exportListaPDF = (title, subtitle, headers, data, filename) => {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 22);

  // Subtítulo
  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 30);
  }

  // Data
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, subtitle ? 38 : 30);

  // Tabela
  doc.autoTable({
    head: [headers],
    body: data,
    startY: subtitle ? 44 : 36,
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export default {
  exportToPDF,
  exportFinanceiroPDF,
  exportListaPDF
};
