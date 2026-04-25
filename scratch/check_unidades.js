
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUnidades() {
  const { data, error } = await supabase.from('venda').select('unidade_id, loja_id, total');
  if (error) {
    console.error(error);
    return;
  }
  
  const countsLoja = {};
  const countsUnidade = {};
  for (const v of data) {
    countsLoja[v.loja_id] = (countsLoja[v.loja_id] || 0) + 1;
    countsUnidade[v.unidade_id] = (countsUnidade[v.unidade_id] || 0) + 1;
  }
  console.log("Loja IDs:", JSON.stringify(countsLoja, null, 2));
  console.log("Unidade IDs:", JSON.stringify(countsUnidade, null, 2));
}

checkUnidades();
