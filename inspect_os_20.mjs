
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectOS20() {
  console.log('Inspecionando todas as OS que contenham "20" no código...');
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('id, codigo_os, cliente_nome, created_date, data_entrada, historico')
    .ilike('codigo_os', '%20%');

  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Registros encontrados:', JSON.stringify(data, null, 2));
  }
}

inspectOS20();
