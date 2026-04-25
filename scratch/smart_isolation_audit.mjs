import fs from 'fs';
import path from 'path';

// Tables that ARE global by nature (shared across all stores)
const GLOBAL_TABLES = new Set([
  'Configuracao', 'Categoria', 'Marca', 'Cargo', 'Loja', 'Usuario',
  'UsuarioSistema', 'Notificacao', 'TipoEvento', 'DisplaySeminovo',
  'ChatbotConfig', 'ConfigWhatsApp', 'PastaWhatsApp', 'EtiquetaWhatsApp',
  'ConversaWhatsApp', 'CupomDesconto'
]);

// Modules that are intentionally global (admin-only, cross-store views)
const INTENTIONALLY_GLOBAL_MODULES = new Set([
  'MultiLojas.jsx',    // Admin cross-store view
  'Logs.jsx',          // Admin audit log
  'NFe.jsx',           // Fiscal - currently stub
  'NFCe.jsx',          // Fiscal - currently stub  
  'Carrinho.jsx',      // E-commerce public cart
  'Etiquetas.jsx',     // Label printing - reads all products by design
  'Metas.jsx',         // Wrapper that delegates to MetasAprimorado
  'Marketplace.jsx',   // Public marketplace
]);

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let critical = 0;
let warnings = 0;

console.log('=== FINAL ISOLATION AUDIT ===\n');
console.log('Legend: 🔴 CRITICAL (leaks tenant data) | 🟡 WARN (needs review) | ✅ OK\n');

for (const file of files) {
  if (INTENTIONALLY_GLOBAL_MODULES.has(file)) continue;
  
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const hasUseLoja = content.includes('useLoja');
  
  const listCalls = [...content.matchAll(/base44\.entities\.(\w+)\.list\(/g)].map(m => m[1]);
  const unscopedLists = listCalls.filter(e => !GLOBAL_TABLES.has(e));
  
  if (unscopedLists.length > 0) {
    // Check if each unscoped list is actually inside a lojaFiltroId ternary
    const hasLojaGuard = content.includes('lojaFiltroId') && 
      (content.includes('if (!lojaFiltroId)') || 
       content.includes('lojaFiltroId ?') ||
       content.includes('lojaFiltroId\n'));
    
    if (hasUseLoja && hasLojaGuard) {
      // Check specifically which .list() calls have no loja guard nearby  
      const lines = content.split('\n');
      const problematic = [];
      for (const entity of unscopedLists) {
        const lineIdx = lines.findIndex(l => l.includes(`${entity}.list(`));
        if (lineIdx >= 0) {
          // Look at surrounding 5 lines for loja guard
          const ctx = lines.slice(Math.max(0, lineIdx-3), lineIdx+3).join(' ');
          if (!ctx.includes('lojaFiltroId') && !ctx.includes('isAdmin')) {
            problematic.push(entity);
          }
        }
      }
      if (problematic.length > 0) {
        console.log(`🔴 ${file}: unguarded .list() on ${problematic.join(', ')}`);
        critical++;
      }
    } else if (!hasUseLoja) {
      console.log(`🟡 ${file}: no useLoja — .list() on ${unscopedLists.join(', ')} (global queries)`);
      warnings++;
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`🔴 Critical: ${critical} files with unguarded global queries`);
console.log(`🟡 Warnings: ${warnings} files without loja context`);
console.log('\nNote: Files in intentionally global modules (MultiLojas, Logs, NFe, Carrinho, etc.) are excluded as expected global access.');
