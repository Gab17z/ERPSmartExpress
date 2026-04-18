
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const osId = 'f3f51fed-ae3a-4467-83eb-5b035176166e';

async function verifyOS() {
  console.log('Verificando dados da OS-00018 após atualização...');
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('id, codigo_os, created_date, data_entrada, data_conclusao, historico')
    .eq('id', osId)
    .single();

  if (error) {
    console.error('Erro ao buscar OS:', error);
  } else {
    console.log('Dados da OS:', JSON.stringify(data, null, 2));
  }
}

verifyOS();
