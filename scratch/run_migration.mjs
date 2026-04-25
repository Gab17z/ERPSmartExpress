import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY);

// Execute raw SQL migration
const migration = `
ALTER TABLE movimentacao_caixa ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE avaliacao_seminovo ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE evento ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
`;

const MATRIZ_ID = '27f2a674-d319-4729-8674-0d9ed0f1ec30';

async function runMigration() {
  console.log('Running migration via RPC...');
  
  const { error } = await supabase.rpc('exec_sql', { query: migration });
  if (error) {
    console.log('RPC exec_sql not available:', error.message);
    console.log('\n⚠️  MANUAL STEP REQUIRED:');
    console.log('Run the following SQL in the Supabase SQL Editor:');
    console.log('---');
    console.log(migration.trim());
    console.log('---');
    console.log('\nThen backfill with:');
    console.log(`UPDATE movimentacao_caixa SET loja_id = '${MATRIZ_ID}' WHERE loja_id IS NULL;`);
    console.log(`UPDATE avaliacao_seminovo SET loja_id = '${MATRIZ_ID}' WHERE loja_id IS NULL;`);
    console.log(`UPDATE evento SET loja_id = '${MATRIZ_ID}' WHERE loja_id IS NULL;`);
  } else {
    console.log('✅ Migration applied.');
  }
}

runMigration();
