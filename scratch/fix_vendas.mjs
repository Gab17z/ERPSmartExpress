import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const MATRIZ_ID = '27f2a674-d319-4729-8674-0d9ed0f1ec30';

async function fixVendas() {
  console.log('Checking venda table columns...');
  
  // Check what columns venda has
  const { data: sample, error } = await supabase
    .from('venda')
    .select('id, numero, loja_id, created_date')
    .is('loja_id', null)
    .order('created_date', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample null venda records:');
  sample?.forEach(v => console.log(`  - ${v.numero || v.id} (${v.created_date})`));
  
  console.log('\nFixing 12 vendas with null loja_id -> Matriz...');
  const { data: fixed, error: fixErr } = await supabase
    .from('venda')
    .update({ loja_id: MATRIZ_ID })
    .is('loja_id', null)
    .select();

  if (fixErr) console.error('Error fixing vendas:', fixErr);
  else console.log(`✅ Fixed ${fixed.length} vendas.`);

  // Check tables with errors (no loja_id column)
  console.log('\n--- Checking if movimentacao_caixa has loja_id column ---');
  const { data: mc, error: mcErr } = await supabase
    .from('movimentacao_caixa')
    .select('id, loja_id')
    .limit(1);
  if (mcErr) console.log('movimentacao_caixa: NO loja_id column ->', mcErr.message);
  else console.log('movimentacao_caixa: has loja_id column, sample:', mc);

  console.log('\n--- Checking if avaliacao_seminovo has loja_id column ---');
  const { data: av, error: avErr } = await supabase
    .from('avaliacao_seminovo')
    .select('id, loja_id')
    .limit(1);
  if (avErr) console.log('avaliacao_seminovo: NO loja_id column ->', avErr.message);
  else console.log('avaliacao_seminovo: has loja_id column, sample:', av);

  console.log('\n--- Checking if evento has loja_id column ---');
  const { data: ev, error: evErr } = await supabase
    .from('evento')
    .select('id, loja_id')
    .limit(1);
  if (evErr) console.log('evento: NO loja_id column ->', evErr.message);
  else console.log('evento: has loja_id column, sample:', ev);
}

fixVendas();
