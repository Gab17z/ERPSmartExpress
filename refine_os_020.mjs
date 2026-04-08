
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function refineOS20() {
  console.log('Refinando horários e adicionando entrega na OS-00020...');

  const t_start = "2026-03-12T15:42:24-03:00"; // Com segundos
  const t_recebido = "2026-03-12T15:42:24-03:00"; 
  const t_pre_aprovado = "2026-03-12T15:54:00-03:00";
  const t_aprovado = "2026-03-12T15:56:00-03:00";
  const t_iniciado = "2026-03-12T18:11:00-03:00";
  const t_pronto = "2026-03-12T18:59:00-03:00";
  const t_entregue = "2026-03-12T19:34:00-03:00";

  const historico = [
    {
      data: t_recebido,
      usuario: "Administrador",
      status_anterior: null,
      status_novo: "recebido",
      observacao: "OS criada - Aparelho recebido"
    },
    {
      data: t_pre_aprovado,
      usuario: "Administrador",
      status_anterior: "recebido",
      status_novo: "em_diagnostico",
      observacao: "Pré Aprovado - R$ 180.00 - Prazo: 1 dias"
    },
    {
      data: t_aprovado,
      usuario: "Administrador",
      status_anterior: "em_diagnostico",
      status_novo: "aprovado",
      observacao: "Orçamento aprovado pelo cliente"
    },
    {
      data: t_iniciado,
      usuario: "Administrador",
      status_anterior: "aprovado",
      status_novo: "em_conserto",
      observacao: "Serviço iniciado"
    },
    {
      data: t_pronto,
      usuario: "Administrador",
      status_anterior: "em_conserto",
      status_novo: "pronto",
      observacao: "Serviço finalizado - Checklist de saída preenchido"
    },
    {
      data: t_entregue,
      usuario: "Administrador",
      status_anterior: "pronto",
      status_novo: "entregue",
      observacao: "Aparelho entregue ao cliente"
    }
  ];

  const { data, error } = await supabase
    .from('ordem_servico')
    .update({
      created_date: t_start,
      data_entrada: t_start,
      data_conclusao: t_pronto,
      data_entrega: t_entregue,
      status: "entregue",
      historico: historico,
      updated_date: new Date().toISOString()
    })
    .eq('codigo_os', 'OS-00020')
    .select();

  if (error) {
    console.error('Erro ao refinar OS-00020:', error);
  } else if (data && data.length > 0) {
    console.log('OS-00020 refinada com sucesso!');
    console.log('Dados atualizados:', {
        created: data[0].created_date,
        status: data[0].status,
        entrega: data[0].data_entrega
    });
  } else {
    console.log('OS-00020 não encontrada.');
  }
}

refineOS20();
