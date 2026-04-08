import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOS() {
  console.log('Checking OS records...');
  const { data, error } = await supabase
    .from('ordem_servico')
    .select('id, numero, codigo_os')
    .limit(20)
    .order('created_date', { ascending: false });

  if (error) {
    console.error('Error fetching OS:', error);
    return;
  }

  console.log('Last 20 OS records:', JSON.stringify(data, null, 2));
}

checkOS();
