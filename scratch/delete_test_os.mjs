
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geemqgqjvgghwtqppjhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZW1xZ3FqdmdnaHd0cXBwamhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzYzMzYsImV4cCI6MjA4ODQxMjMzNn0.Zn8FY3CjULJ2UN5utEJqhleMdzsu6iFCcKOgYFp7WMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteOS() {
    console.log('--- Finding OS-00035 ---');
    const { data, error } = await supabase
        .from('ordem_servico')
        .select('id, codigo_os, numero')
        .or(`codigo_os.eq.OS-00035,numero.eq.OS-00035`);
    
    if (error) {
        console.error('Error finding OS:', error);
        return;
    }

    if (data.length === 0) {
        console.log('OS-00035 not found.');
        return;
    }

    const os = data[0];
    console.log(`Found OS: ID=${os.id}, Code=${os.codigo_os}, Number=${os.numero}`);

    console.log(`--- Deleting OS: ${os.id} ---`);
    const { error: deleteError } = await supabase
        .from('ordem_servico')
        .delete()
        .eq('id', os.id);

    if (deleteError) {
        console.error('Error deleting OS:', deleteError);
    } else {
        console.log('OS-00035 deleted successfully.');
    }
}

deleteOS();
