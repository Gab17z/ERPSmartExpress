import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const codesToDelete = [
  'OS-00016', 'OS-00015', 'OS-00014', 'OS-00013', 'OS-00012', 
  'OS-00011', 'OS-00010', 'OS-00007', 'OS-00006', 'OS-00005', 
  'OS-00004', 'OS-00003', 'OS-00002'
];

async function deleteOS() {
  console.log(`Attempting to delete ${codesToDelete.length} OS records...`);
  
  const { data, error } = await supabase
    .from('ordem_servico')
    .delete()
    .in('codigo_os', codesToDelete)
    .select();

  if (error) {
    console.error('Error deleting OS:', error);
    return;
  }

  console.log('Successfully deleted OS records:');
  console.table(data.map(os => ({ id: os.id, codigo_os: os.codigo_os })));
  console.log(`Total deleted: ${data.length}`);
}

deleteOS();
