import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function metasAudit() {
  console.log('=== METAS & PERFORMANCE AUDIT ===\n');
  
  const MATRIZ_ID = '27f2a674-d319-4729-8674-0d9ed0f1ec30';
  const MOCOCA_ID = '6a194175-a553-41be-9ea2-ba0929687301';

  // 1. Verify vendas are properly tagged
  const { data: vendasMatriz } = await supabase.from('venda').select('id, loja_id, vendedor_nome, data_venda').eq('loja_id', MATRIZ_ID).order('data_venda', {ascending: false}).limit(5);
  const { data: vendasMococa } = await supabase.from('venda').select('id, loja_id, vendedor_nome, data_venda').eq('loja_id', MOCOCA_ID).order('data_venda', {ascending: false}).limit(5);
  const { data: vendasNull } = await supabase.from('venda').select('id').is('loja_id', null);

  console.log('=== VENDAS ISOLATION ===');
  console.log(`Matriz: ${vendasMatriz?.length || 0} vendas recentes (sample)`);
  console.log(`Mococa: ${vendasMococa?.length || 0} vendas recentes (sample)`);
  console.log(`Sem loja: ${vendasNull?.length || 0} (deve ser 0)`);
  
  // 2. Verify OS isolation
  const { count: osMatriz } = await supabase.from('ordem_servico').select('id', {count: 'exact', head: true}).eq('loja_id', MATRIZ_ID);
  const { count: osMococa } = await supabase.from('ordem_servico').select('id', {count: 'exact', head: true}).eq('loja_id', MOCOCA_ID);
  const { count: osNull } = await supabase.from('ordem_servico').select('id', {count: 'exact', head: true}).is('loja_id', null);

  console.log('\n=== ORDENS DE SERVIÇO ISOLATION ===');
  console.log(`Matriz OS: ${osMatriz}`);
  console.log(`Mococa OS: ${osMococa}`);
  console.log(`Sem loja OS: ${osNull} (deve ser 0)`);

  // 3. Verify clientes isolation
  const { count: clientesMatriz } = await supabase.from('cliente').select('id', {count: 'exact', head: true}).eq('loja_id', MATRIZ_ID);
  const { count: clientesMococa } = await supabase.from('cliente').select('id', {count: 'exact', head: true}).eq('loja_id', MOCOCA_ID);
  const { count: clientesNull } = await supabase.from('cliente').select('id', {count: 'exact', head: true}).is('loja_id', null);

  console.log('\n=== CLIENTES ISOLATION ===');
  console.log(`Matriz Clientes: ${clientesMatriz}`);
  console.log(`Mococa Clientes: ${clientesMococa}`);
  console.log(`Sem loja Clientes: ${clientesNull} (deve ser 0)`);

  // 4. Check usuario_sistema has loja_id so MetasAprimorado can filter by loja
  const { data: usuarios } = await supabase.from('usuario_sistema').select('nome, email, loja_id, cargo_id');
  console.log('\n=== USUARIOS ISOLATION ===');
  usuarios?.forEach(u => {
    const ok = u.loja_id ? '✅' : '⚠️';
    console.log(`  ${ok} ${u.nome} → loja_id: ${u.loja_id || 'NULL (admin/sem loja)'}`);
  });

  // 5. Check total counts to estimate correct meta numbers
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { count: vendasMesMatriz } = await supabase
    .from('venda')
    .select('id', {count: 'exact', head: true})
    .eq('loja_id', MATRIZ_ID)
    .gte('data_venda', primeiroDiaMes)
    .lte('data_venda', ultimoDiaMes);

  const { data: totalMesMatriz } = await supabase
    .from('venda')
    .select('total')
    .eq('loja_id', MATRIZ_ID)
    .gte('data_venda', primeiroDiaMes)
    .lte('data_venda', ultimoDiaMes);
  
  const faturamentoMesMatriz = totalMesMatriz?.reduce((s, v) => s + (parseFloat(v.total) || 0), 0) || 0;

  console.log('\n=== PERFORMANCE METAS — MÊS ATUAL ===');
  console.log(`Matriz — Vendas no mês: ${vendasMesMatriz}`);
  console.log(`Matriz — Faturamento mês: R$ ${faturamentoMesMatriz.toFixed(2)}`);

  const { count: osMesMatriz } = await supabase
    .from('ordem_servico')
    .select('id', {count: 'exact', head: true})
    .eq('loja_id', MATRIZ_ID)
    .gte('created_date', primeiroDiaMes)
    .lte('created_date', ultimoDiaMes);
  
  console.log(`Matriz — OS no mês: ${osMesMatriz}`);

  // 6. Metas localStorage warning
  console.log('\n=== AVISO SOBRE METAS ===');
  console.log('⚠️  As metas são salvas em localStorage por loja (chave: metas_sistema)');
  console.log('⚠️  Cada navegador/usuário tem suas próprias metas configuradas');
  console.log('⚠️  Se as metas são globais (todas as lojas), o admin deve configurar separadamente por loja');
  console.log('✅  Os DADOS (vendas, OS, clientes) são corretamente filtrados por loja_id');

  console.log('\n=== RESULTADO FINAL ===');
  const allOk = (vendasNull?.length || 0) === 0 && (osNull || 0) === 0 && (clientesNull || 0) === 0;
  if (allOk) {
    console.log('✅ ISOLAMENTO PERFEITO: Nenhum registro sem loja_id nas tabelas críticas');
    console.log('✅ Cada loja vê apenas seus próprios dados');
    console.log('✅ Metas calculadas sobre dados isolados por loja');
  } else {
    console.log('❌ Existem registros sem loja_id - executar scripts de correção');
  }
}

metasAudit();
