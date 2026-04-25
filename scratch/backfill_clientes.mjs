import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runMigration() {
  console.log('=== MIGRATION: ADICIONANDO COLUNAS DE REGISTRADOR EM CLIENTE ===\n');

  // 1. Adicionar colunas via RPC ou SQL direto (se disponível)
  // Como não tenho RPC para DDL, vou assumir que posso tentar atualizar
  
  console.log('Avisando: Certifique-se de que as colunas cadastrado_por_id e cadastrado_por_nome existam.');
  console.log('Executando backfill de dados...\n');

  // 2. Buscar clientes sem registrador
  const { data: clientes } = await supabase.from('cliente').select('id, nome_completo');
  
  console.log(`Analisando ${clientes?.length || 0} clientes para backfill...`);

  for (const cliente of clientes || []) {
    // Tentar encontrar primeira interação (venda ou OS)
    const { data: primeiraVenda } = await supabase
      .from('venda')
      .select('vendedor_id, vendedor_nome, data_venda')
      .eq('cliente_id', cliente.id)
      .order('data_venda', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: primeiraOS } = await supabase
      .from('ordem_servico')
      .select('atendente_abertura, created_date')
      .eq('cliente_id', cliente.id)
      .order('created_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    let id = null;
    let nome = null;

    // Comparar datas para ver qual foi o primeiro
    const dataVenda = primeiraVenda ? new Date(primeiraVenda.data_venda) : new Date(8640000000000000);
    const dataOS = primeiraOS ? new Date(primeiraOS.created_date) : new Date(8640000000000000);

    if (primeiraVenda && dataVenda <= dataOS) {
      id = primeiraVenda.vendedor_id;
      nome = primeiraVenda.vendedor_nome;
    } else if (primeiraOS) {
      nome = primeiraOS.atendente_abertura;
      // Para OS, tentamos buscar o ID do usuário pelo nome se possível, ou deixamos null
      const { data: user } = await supabase.from('usuario_sistema').select('id').eq('nome', nome).limit(1).maybeSingle();
      id = user?.id || null;
    }

    if (nome) {
      const { error } = await supabase
        .from('cliente')
        .update({
          cadastrado_por_id: id,
          cadastrado_por_nome: nome
        })
        .eq('id', cliente.id);
      
      if (error) {
        console.error(`Erro ao atualizar cliente ${cliente.nome_completo}:`, error.message);
      } else {
        console.log(`✅ Atualizado: ${cliente.nome_completo} -> ${nome}`);
      }
    }
  }

  console.log('\n=== MIGRATION CONCLUÍDA ===');
}

runMigration();
