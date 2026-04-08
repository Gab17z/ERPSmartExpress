
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const osId = 'f3f51fed-ae3a-4467-83eb-5b035176166e';

async function updateOS() {
  console.log('Atualizando histórico e datas da OS-00018...');

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

  const { data, error } = await supabase
    .from('ordem_servico')
    .update({
      created_date: "2026-03-12T15:42:00.000Z",
      data_entrada: "2026-03-12T15:42:00.000Z",
      data_conclusao: "2026-03-12T18:59:00.000Z",
      historico: historico,
      updated_date: "2026-03-12T18:59:00.000Z"
    })
    .eq('id', osId)
    .select();

  if (error) {
    console.error('Erro ao atualizar OS:', error);
  } else {
    console.log('OS Atualizada com sucesso:', JSON.stringify(data[0], null, 2));
  }
}

updateOS();
