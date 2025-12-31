
import { supabase, supabaseAdmin } from './services';
import { Asset } from './types';

export const carregarAtivos = async (): Promise<Asset[]> => {
  console.group("🔑 [Supabase] carregarAtivos");
  const startTime = performance.now();
  
  try {
    const client = supabaseAdmin || supabase;
    if (supabaseAdmin) console.log("🛡️ Usando supabaseAdmin (Bypass RLS)...");
    else console.warn("🔓 Usando supabase padrão (Sujeito a RLS)...");

    const { data, error, status } = await client
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Erro na consulta:", error.message);
      console.groupEnd();
      throw error;
    }

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`✅ Sucesso em ${duration}ms. Registros: ${data?.length || 0}`);
    console.groupEnd();
    return data || [];

  } catch (err) {
    console.error("💥 Falha no fetch:", err);
    console.groupEnd();
    throw err;
  }
};
