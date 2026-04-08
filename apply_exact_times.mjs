
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyExactTimesOS20() {
  console.log('Aplicando horários exatos na OS-00020 com fuso UTC-3...');

  // Horários solicitados com offset -03:00
  const t1 = "2026-03-12T15:42:00-03:00";
  const t2 = "2026-03-12T15:54:00-03:00";
  const t3 = "2026-03-12T15:56:00-03:00";
  const t4 = "2026-03-12T18:11:00-03:00";
  const t5 = "2026-03-12T18:59:00-03:00";

  const historico = [
    {
      data: t1,
      usuario: "Administrador",
      status_anterior: null,
      status_novo: "recebido",
      observacao: "OS criada - Aparelho recebido"
    },
    {
      data: t2,
      usuario: "Administrador",
      status_anterior: "recebido",
      status_novo: "em_diagnostico",
      observacao: "Pré Aprovado - R$ 180.00 - Prazo: 1 dias"
    },
    {
      data: t3,
      usuario: "Administrador",
      status_anterior: "em_diagnostico",
      status_novo: "aprovado",
      observacao: "Orçamento aprovado pelo cliente"
    },
    {
      data: t4,
      usuario: "Administrador",
      status_anterior: "aprovado",
      status_novo: "em_conserto",
      observacao: "Serviço iniciado"
    },
    {
      data: t5,
      usuario: "Administrador",
      status_anterior: "em_conserto",
      status_novo: "pronto",
      observacao: "Serviço finalizado - Checklist de saída preenchido"
    }
  ];

  const { data, error } = await supabase
    .from('ordem_servico')
    .update({
      created_date: t1,
      data_entrada: t1,
      data_conclusao: t5,
      historico: historico,
      updated_date: new Date().toISOString()
    })
    .eq('codigo_os', 'OS-00020')
    .select();

  if (error) {
    console.error('Erro ao atualizar OS-00020:', error);
  } else if (data && data.length > 0) {
    console.log('OS-00020 atualizada com sucesso!');
    console.log('Novas datas persistidas:', {
        created: data[0].created_date,
        entrada: data[0].data_entrada,
        conclusao: data[0].data_conclusao
    });
  } else {
    console.log('OS-00020 não encontrada para atualização.');
  }
}

applyExactTimesOS20();
