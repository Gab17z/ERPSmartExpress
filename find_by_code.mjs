
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findOSByCode() {
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('id, codigo_os, cliente_nome, created_date, data_entrada, data_conclusao, historico')
    .eq('codigo_os', 'OS-00018');

  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Dados da OS:', JSON.stringify(data, null, 2));
  }
}

findOSByCode();
