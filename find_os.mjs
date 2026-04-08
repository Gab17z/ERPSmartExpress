
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findCudaDePauliOS() {
  console.log('Buscando OS recente de Cuca de Pauli...');
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('*')
    .eq('cliente_id', '19bda79a-bd9e-4e2b-a010-619f5a70716c')
    .order('created_date', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar OS:', error);
  } else {
    console.log('OS Encontrada:', JSON.stringify(data, null, 2));
  }
}

findCudaDePauliOS();
