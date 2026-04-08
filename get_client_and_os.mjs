
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getData() {
  console.log('Searching for client "Cuca de Pauli"...');
  const { data: clients, error: clientError } = await supabase
    .from('cliente')
    .select('id, nome_completo, telefone1')
    .ilike('nome_completo', '%Cuca de Pauli%');

  if (clientError) {
    console.error('Error fetching client:', clientError);
  } else {
    console.log('Clients found:', JSON.stringify(clients, null, 2));
  }

  console.log('\nChecking latest OS number/code...');
  const { data: osData, error: osError } = await supabase
    .from('ordem_servico')
    .select('numero, codigo_os')
    .order('created_date', { ascending: false })
    .limit(1);

  if (osError) {
    console.error('Error fetching OS:', osError);
  } else {
    console.log('Latest OS:', JSON.stringify(osData, null, 2));
  }
}

getData();
