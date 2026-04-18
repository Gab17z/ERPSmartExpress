
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findOSAndCorrect() {
  console.log('Buscando OS-020...');
  
  // Buscar pela OS-020 ou OS-00020
  const { data: osData, error: osError } = await supabase
    .from('ordem_servico')
    .select('*')
    .or('codigo_os.eq.OS-020,codigo_os.eq.OS-00020,codigo_os.ilike.%020%');

  if (osError) {
    console.error('Erro ao buscar OS-020:', osError);
    return;
  }

  if (!osData || osData.length === 0) {
    console.log('OS-020 não encontrada. Listando últimas 10 para identificar...');
    const { data: recent } = await supabase.from('ordem_servico').select('id, codigo_os, cliente_nome').order('created_date', {ascending: false}).limit(10);
    console.log('Recentes:', JSON.stringify(recent, null, 2));
    return;
  }

  const targetOS = osData[0];
  console.log('OS-020 encontrada:', targetOS.id, targetOS.codigo_os, targetOS.cliente_nome);

  const historico = [
    {
      data: "2026-03-12T15:42:00.000Z",
      usuario: "Administrador",
      status_anterior: null,
      status_novo: "recebido",
      observacao: "OS criada - Aparelho recebido"
    },
    {
      data: "2026-03-12T15:54:00.000Z",
      usuario: "Administrador",
      status_anterior: "recebido",
      status_novo: "em_diagnostico",
      observacao: "Pré Aprovado - R$ 180.00 - Prazo: 1 dias"
    },
    {
      data: "2026-03-12T15:56:00.000Z",
      usuario: "Administrador",
      status_anterior: "em_diagnostico",
      status_novo: "aprovado",
      observacao: "Orçamento aprovado pelo cliente"
    },
    {
      data: "2026-03-12T18:11:00.000Z",
      usuario: "Administrador",
      status_anterior: "aprovado",
      status_novo: "em_conserto",
      observacao: "Serviço iniciado"
    },
    {
      data: "2026-03-12T18:59:00.000Z",
      usuario: "Administrador",
      status_anterior: "em_conserto",
      status_novo: "pronto",
      observacao: "Serviço finalizado - Checklist de saída preenchido"
    }
  ];

  console.log('Atualizando OS-020...');
  const { error: updateError } = await supabase
    .from('ordem_servico')
    .update({
      created_date: "2026-03-12T15:42:00.000Z",
      data_entrada: "2026-03-12T15:42:00.000Z",
      data_conclusao: "2026-03-12T18:59:00.000Z",
      historico: historico,
      updated_date: "2026-03-12T18:59:00.000Z"
    })
    .eq('id', targetOS.id);

  if (updateError) {
    console.error('Erro na atualização:', updateError);
  } else {
    console.log('OS-020 atualizada com sucesso!');
  }
}

findOSAndCorrect();
