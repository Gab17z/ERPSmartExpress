import fs from 'fs';
import path from 'path';

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const results = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  // Find all .list() calls (no loja filter — potentially global)
  const listCalls = [...content.matchAll(/base44\.entities\.(\w+)\.list\(/g)].map(m => m[1]);
  
  // Find all .filter() calls
  const filterCalls = [...content.matchAll(/base44\.entities\.(\w+)\.filter\(\s*\{([^}]+)\}/g)].map(m => ({
    entity: m[1],
    filter: m[2].replace(/\s+/g, ' ').trim()
  }));
  
  const hasUseLoja = content.includes('useLoja');
  const listWithoutLoja = listCalls.filter(e => !['Configuracao', 'Categoria', 'Marca', 'Cargo', 'Loja', 'UsuarioSistema', 'Usuario', 'Notificacao'].includes(e));
  const filtersWithoutLoja = filterCalls.filter(f => !f.filter.includes('loja_id'));
  
  if (listWithoutLoja.length > 0 || filtersWithoutLoja.length > 0) {
    results.push({ file, listWithoutLoja, filtersWithoutLoja, hasUseLoja });
  }
}

console.log('=== STORE ISOLATION AUDIT: Potential Cross-Store Leaks ===\n');
if (results.length === 0) {
  console.log('✅ No leaks detected.');
} else {
  for (const r of results) {
    console.log(`\n⚠️  ${r.file} (useLoja=${r.hasUseLoja})`);
    if (r.listWithoutLoja.length > 0) {
      console.log(`   .list() calls (unscoped): ${r.listWithoutLoja.join(', ')}`);
    }
    if (r.filtersWithoutLoja.length > 0) {
      r.filtersWithoutLoja.forEach(f => {
        console.log(`   .filter() without loja_id on ${f.entity}: { ${f.filter} }`);
      });
    }
  }
}
