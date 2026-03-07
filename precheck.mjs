/**
 * PRE-CHECK: Verifica cliente DJ Denis e produto Tela A32 no banco
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        env[key] = value;
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function preCheck() {
    console.log('\n🔍 PRE-CHECK: Verificando dados necessários para a simulação...\n');

    // 1. Buscar cliente DJ Denis
    const { data: clientes, error: errCliente } = await supabase
        .from('cliente')
        .select('*')
        .ilike('nome_completo', '%Denis%');

    console.log('─'.repeat(60));
    console.log('👤 CLIENTES com "Denis":');
    if (errCliente) console.error('Erro:', errCliente);
    else console.log(JSON.stringify(clientes, null, 2));

    // 2. Buscar produto tela/display A32
    const { data: produtosA32, error: errProd } = await supabase
        .from('produto')
        .select('id, nome, sku, preco_venda, estoque_atual, ativo')
        .ilike('nome', '%A32%');

    console.log('\n─'.repeat(60));
    console.log('📦 PRODUTOS com "A32":');
    if (errProd) console.error('Erro:', errProd);
    else console.log(JSON.stringify(produtosA32, null, 2));

    // 3. Buscar qualquer produto de tela/display
    const { data: produtosTela, error: errTela } = await supabase
        .from('produto')
        .select('id, nome, sku, preco_venda, estoque_atual, ativo')
        .or('nome.ilike.%tela%,nome.ilike.%display%,nome.ilike.%lcd%');

    console.log('\n─'.repeat(60));
    console.log('📦 PRODUTOS de Tela/Display/LCD:');
    if (errTela) console.error('Erro:', errTela);
    else console.log(JSON.stringify(produtosTela, null, 2));

    // 4. Todos os clientes existentes
    const { data: todosClientes } = await supabase
        .from('cliente')
        .select('id, nome_completo, telefone1, cpf_cnpj')
        .order('nome_completo');

    console.log('\n─'.repeat(60));
    console.log('👥 TODOS OS CLIENTES:');
    console.log(JSON.stringify(todosClientes, null, 2));

    // Salvar resultado
    const result = { clientes, produtosA32, produtosTela, todosClientes };
    fs.writeFileSync('precheck_result.json', JSON.stringify(result, null, 2));
    console.log('\n💾 Salvo em precheck_result.json');
}

preCheck().catch(console.error);
