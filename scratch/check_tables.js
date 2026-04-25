
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  const tables = ['venda', 'ordem_servico', 'caixa', 'produto', 'cliente'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('loja_id').limit(1);
    if (error) {
      console.log(`Table ${table} error: ${error.message}`);
    } else {
      console.log(`Table ${table} has loja_id: ${data.length > 0 && 'loja_id' in data[0]}`);
      
      const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).is('loja_id', null);
      console.log(`Table ${table} has ${count} records with NULL loja_id`);
    }
  }
}

checkTables();
