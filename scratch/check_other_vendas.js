
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOtherVendas() {
  const matrizId = '27f2a674-d319-4729-8674-0d9ed0f1ec30';
  const { data, error } = await supabase.from('venda').select('loja_id, total, created_date').neq('loja_id', matrizId);
  if (error) {
    console.error(error);
    return;
  }
  console.log(`Found ${data.length} sales NOT in Matriz`);
  if (data.length > 0) {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkOtherVendas();
