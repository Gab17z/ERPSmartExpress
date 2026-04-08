
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const osId = 'b2fce6a2-0941-477d-8152-3269bd8253f5'; // ID real da OS-00018

async function updateOSFinal() {
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

  const { error } = await supabase
    .from('ordem_servico')
    .update({
      created_date: "2026-03-12T15:42:00.000Z",
      data_entrada: "2026-03-12T15:42:00.000Z",
      data_conclusao: "2026-03-12T18:59:00.000Z",
      historico: historico,
      updated_date: "2026-03-12T18:59:00.000Z"
    })
    .eq('id', osId);

    if (error) console.error(error);
    else console.log('OS-00018 atualizada com sucesso!');
}

updateOSFinal();
