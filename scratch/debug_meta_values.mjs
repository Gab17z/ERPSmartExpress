import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { startOfMonth } from 'date-fns';

const envContent = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const parseSafeDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (typeof dateStr === 'string' && dateStr.length === 10 && !dateStr.includes('T')) {
    return new Date(`${dateStr}T00:00:00`);
  }
  return new Date(dateStr);
};

const meuId = 'f01bf529-7848-49d6-9c3c-8a677b647d44';

async function debug() {
  const { data: vendas } = await supabase.from('venda').select('*').eq('loja_id', '27f2a674-d319-4729-8674-0d9ed0f1ec30');
  
  const vendasMesAtual = vendas.filter(v => {
    const dataVenda = parseSafeDate(v.created_date || v.data_venda);
    return dataVenda >= startOfMonth(new Date()) && v.status === 'finalizada';
  });

  const minhasVendasMes = vendasMesAtual.filter(v => 
    v.vendedor_id?.toString() === meuId || 
    v.usuario_id?.toString() === meuId
  );

  const total = minhasVendasMes.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
  
  console.log(`Total Vendas Mes: ${vendasMesAtual.length}`);
  console.log(`Minhas Vendas Mes: ${minhasVendasMes.length}`);
  console.log(`Faturamento: R$ ${total}`);
  
  if (minhasVendasMes.length > 0) {
    console.log("Sample sale date:", minhasVendasMes[0].created_date);
  }
}

debug();
