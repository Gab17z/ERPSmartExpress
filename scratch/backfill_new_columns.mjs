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

async function backfill() {
  const tables = ['movimentacao_caixa', 'evento'];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .update({ loja_id: MATRIZ_ID })
      .is('loja_id', null)
      .select();
    if (error) console.error(`Error on ${table}:`, error.message);
    else console.log(`✅ ${table}: backfilled ${data.length} records`);
  }
}

backfill();
