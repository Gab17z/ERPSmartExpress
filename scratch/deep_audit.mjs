import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Tables that MUST have loja_id
const criticalTables = [
  'produto',
  'caixa',
  'venda',
  'ordem_servico',
  'cliente',
  'movimentacao_caixa',
  'avaliacao_seminovo',
  'conta_receber',
  'conta_pagar',
  'evento',
];

async function fullAudit() {
  console.log('=== DEEP DATABASE AUDIT ===\n');
  
  for (const table of criticalTables) {
    // Count records with null loja_id
    const { count: nullCount, error: nullErr } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('loja_id', null);

    // Count total records
    const { count: totalCount, error: totalErr } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (nullErr && nullErr.message.includes('does not exist')) {
      console.log(`${table.padEnd(25)} | ⚠️  NO loja_id COLUMN (schema needs update!)`);
    } else if (nullErr) {
      console.log(`${table.padEnd(25)} | ERROR: ${nullErr.message}`);
    } else {
      const pct = totalCount > 0 ? Math.round((nullCount / totalCount) * 100) : 0;
      const status = nullCount === 0 ? '✅' : '❌';
      console.log(`${table.padEnd(25)} | ${status} Total: ${String(totalCount).padEnd(6)} | NULL loja_id: ${String(nullCount).padEnd(5)} (${pct}%)`);
    }
  }

  console.log('\n=== USERS (should all have loja_id) ===');
  const { data: users } = await supabase
    .from('usuario_sistema')
    .select('nome, email, loja_id, cargo_id');
  
  users?.forEach(u => {
    const status = u.loja_id ? '✅' : '⚠️ (sem loja - provavelmente admin)';
    console.log(`  ${status} ${u.nome} (${u.email}) - loja_id: ${u.loja_id || 'NULL'}`);
  });

  console.log('\n=== OPEN CAIXAS PER LOJA ===');
  const { data: openCaixas } = await supabase
    .from('caixa')
    .select('loja_id, id, created_date')
    .eq('status', 'aberto')
    .order('created_date', { ascending: false });
  
  const byLoja = {};
  openCaixas?.forEach(c => {
    if (!byLoja[c.loja_id]) byLoja[c.loja_id] = [];
    byLoja[c.loja_id].push(c);
  });

  const { data: lojas } = await supabase.from('loja').select('id, nome');
  
  Object.entries(byLoja).forEach(([lojaId, caixas]) => {
    const loja = lojas?.find(l => l.id === lojaId);
    const status = caixas.length === 1 ? '✅' : `❌ ${caixas.length} DUPLICATES!`;
    console.log(`  ${status} ${loja?.nome || lojaId}: ${caixas.length} caixas abertos`);
  });

  if (!openCaixas || openCaixas.length === 0) {
    console.log('  (No open caixas found)');
  }
}

fullAudit();
