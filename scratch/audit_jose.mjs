import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});
const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const trintaDias = new Date();
trintaDias.setDate(trintaDias.getDate() - 30);
const desde = trintaDias.toISOString();
const desdeDateOnly = desde.split('T')[0];

async function audit() {
  // 1. Buscar o usuario Jose
  const { data: users } = await s.from('usuario_sistema').select('id, user_id, nome, cargo_id');
  console.log('=== TODOS OS USUARIOS ===');
  users.forEach(u => console.log('  id=' + u.id + ' user_id=' + u.user_id + ' nome=' + u.nome));

  const jose = users.find(u => u.nome?.toLowerCase().includes('jos'));
  console.log('\n=== JOSE ===');
  console.log('  ID interno:', jose?.id);
  console.log('  user_id (UUID):', jose?.user_id);
  console.log('  Nome:', jose?.nome);

  // 2. TODAS vendas da loja nos ultimos 30 dias
  const lojaMatriz = '27f2a674-d319-4729-8674-0d9ed0f1ec30';
  const { data: vendas } = await s.from('venda').select('id, vendedor_id, vendedor_nome, valor_total, data_venda, cliente_nome, loja_id, itens')
    .eq('loja_id', lojaMatriz)
    .gte('data_venda', desdeDateOnly)
    .order('data_venda', { ascending: false });

  console.log('\n=== TODAS VENDAS MATRIZ (30 dias) ===');
  console.log('Total:', vendas?.length);
  const vendasJose = vendas?.filter(v => {
    const vid = v.vendedor_id?.toString().toLowerCase();
    const vn = v.vendedor_nome?.toLowerCase();
    const joseId = jose?.id?.toString().toLowerCase();
    const joseUid = jose?.user_id?.toString().toLowerCase();
    const joseNome = jose?.nome?.toLowerCase();
    return vid === joseId || vid === joseUid || vn === joseNome;
  });
  console.log('Vendas Jose:', vendasJose?.length);
  vendasJose?.forEach(v => {
    console.log('  ' + v.data_venda + ' | vendedor_nome=' + v.vendedor_nome + ' | vendedor_id=' + v.vendedor_id + ' | R$' + v.valor_total + ' | ' + v.cliente_nome);
    // Checar se tem itens com celular/iphone
    try {
      const itens = typeof v.itens === 'string' ? JSON.parse(v.itens) : (v.itens || []);
      if (Array.isArray(itens)) {
        itens.forEach(item => {
          const nome = item.produto_nome || item.nome || item.produto?.nome || 'SEM NOME';
          const cat = item.categoria_id || item.produto?.categoria_id || '?';
          const cond = item.condicao || item.produto?.condicao || '?';
          console.log('    -> item: ' + nome + ' | cat_id=' + cat + ' | cond=' + cond + ' | qtd=' + item.quantidade);
        });
      }
    } catch {}
  });

  // 3. TODAS OS da loja nos ultimos 30 dias
  const { data: os } = await s.from('ordem_servico').select('id, atendente_abertura, tecnico_responsavel, vendedor_id, vendedor_nome, atendente_id, tecnico_id, cliente_nome, created_date, loja_id, codigo_os')
    .eq('loja_id', lojaMatriz)
    .gte('created_date', desde)
    .order('created_date', { ascending: false });

  console.log('\n=== TODAS OS MATRIZ (30 dias) ===');
  console.log('Total:', os?.length);
  const osJose = os?.filter(o => {
    const fields = [o.atendente_abertura, o.tecnico_responsavel, o.vendedor_nome].map(f => f?.toLowerCase());
    const ids = [o.vendedor_id, o.tecnico_id, o.atendente_id].map(f => f?.toString().toLowerCase());
    const joseId = jose?.id?.toString().toLowerCase();
    const joseUid = jose?.user_id?.toString().toLowerCase();
    const joseNome = jose?.nome?.toLowerCase();
    return fields.includes(joseNome) || ids.includes(joseId) || ids.includes(joseUid);
  });
  console.log('OS Jose:', osJose?.length);
  osJose?.forEach(o => {
    console.log('  ' + (o.created_date?.split('T')[0]) + ' | ' + o.codigo_os + ' | atend=' + o.atendente_abertura + ' | tec=' + o.tecnico_responsavel + ' | vend_nome=' + o.vendedor_nome + ' | vend_id=' + o.vendedor_id + ' | tec_id=' + o.tecnico_id + ' | atend_id=' + o.atendente_id + ' | ' + o.cliente_nome);
  });

  // 4. Clientes cadastrados nos ultimos 30 dias
  const { data: clientes } = await s.from('cliente').select('id, nome_completo, created_date, loja_id')
    .eq('loja_id', lojaMatriz)
    .gte('created_date', desde)
    .order('created_date', { ascending: false });

  console.log('\n=== CLIENTES CADASTRADOS (30 dias) ===');
  console.log('Total:', clientes?.length);
  clientes?.forEach(c => console.log('  ' + (c.created_date?.split('T')[0]) + ' | ' + c.nome_completo));

  // 5. Para cada cliente, quem foi o primeiro a interagir
  console.log('\n=== ATRIBUICAO DE CLIENTES ===');
  for (const c of (clientes || [])) {
    const { data: pv } = await s.from('venda').select('vendedor_nome, vendedor_id, data_venda').eq('cliente_id', c.id).order('data_venda', { ascending: true }).limit(1);
    const { data: po } = await s.from('ordem_servico').select('atendente_abertura, vendedor_nome, created_date').eq('cliente_id', c.id).order('created_date', { ascending: true }).limit(1);
    const quemVenda = pv?.[0]?.vendedor_nome || 'NENHUM';
    const quemOS = po?.[0]?.atendente_abertura || 'NENHUM';
    console.log('  ' + c.nome_completo + ': 1a_venda=' + quemVenda + ' | 1a_OS=' + quemOS);
  }

  // 6. Categorias para referência
  const { data: cats } = await s.from('categoria').select('id, nome');
  console.log('\n=== CATEGORIAS ===');
  cats?.forEach(c => console.log('  id=' + c.id + ' nome=' + c.nome));
}

audit();
