import fs from 'fs';
import path from 'path';

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const results = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const hasUseLoja = content.includes('useLoja');
  const hasCreate = content.includes('.create(');
  const hasUpdate = content.includes('.update(');
  const hasLojaIdOnMutation = content.includes('loja_id: lojaFiltroId') || content.includes('loja_id: lojaFiltroId ||');
  const hasUseQuery = content.includes('useQuery');
  const hasFilterByLoja = content.includes('loja_id: lojaFiltroId') || content.includes('{ loja_id: lojaFiltroId }');
  // Check for queries that DON'T filter by loja when they should
  const hasMutationWithoutLoja = hasCreate && !hasLojaIdOnMutation;

  results.push({
    file,
    hasUseLoja,
    hasCreate,
    hasUpdate,
    hasLojaIdOnMutation,
    hasUseQuery,
    hasFilterByLoja,
    hasMutationWithoutLoja
  });
}

console.log('\n=== PAGES AUDIT: Multi-Tenant Compliance ===\n');
console.log('Files with CREATE mutations but WITHOUT loja_id assignment:');
results.filter(r => r.hasMutationWithoutLoja).forEach(r => {
  console.log(`  ⚠️  ${r.file}`);
});

console.log('\nFiles with queries but WITHOUT loja filter:');
results.filter(r => r.hasUseQuery && !r.hasFilterByLoja && r.hasUseLoja).forEach(r => {
  console.log(`  ⚠️  ${r.file}`);
});

console.log('\nFiles with NO useLoja but with queries (may be intentional):');
results.filter(r => !r.hasUseLoja && r.hasUseQuery).forEach(r => {
  console.log(`  ℹ️  ${r.file}`);
});

console.log('\n=== FULL COMPLIANCE TABLE ===\n');
console.log('File                          | useLoja | hasCreate | lojaOnCreate | filterByLoja');
console.log('-'.repeat(90));
results.forEach(r => {
  const name = r.file.padEnd(30);
  const loja = (r.hasUseLoja ? '✅' : '❌').padEnd(9);
  const create = (r.hasCreate ? '✅' : '  ').padEnd(11);
  const lojaCreate = (r.hasLojaIdOnMutation ? '✅' : r.hasCreate ? '❌' : '  ').padEnd(14);
  const filter = (r.hasFilterByLoja ? '✅' : r.hasUseQuery ? '⚠️' : '  ').padEnd(12);
  console.log(`${name} | ${loja} | ${create} | ${lojaCreate} | ${filter}`);
});
