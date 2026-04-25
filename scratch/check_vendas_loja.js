
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkVendas() {
  const { data, error } = await supabase.from('venda').select('loja_id, total');
  if (error) {
    console.error(error);
    return;
  }
  
  const counts = {};
  for (const v of data) {
    counts[v.loja_id] = (counts[v.loja_id] || 0) + 1;
  }
  console.log(JSON.stringify(counts, null, 2));
}

checkVendas();
