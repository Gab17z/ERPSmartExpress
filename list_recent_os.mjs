
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listRecentOS() {
  console.log('Listando as 20 OS mais recentes...');
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('id, codigo_os, cliente_nome, equipamento, created_date, status')
    .order('created_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Erro ao listar OS:', error);
  } else {
    console.log('OS Recentes:', JSON.stringify(data, null, 2));
  }
}

listRecentOS();
