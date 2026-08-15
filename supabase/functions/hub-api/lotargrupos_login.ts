import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export async function loginToLotarGrupos(supabase: any, email: string) {
  const { data: user, error: userErr } = await supabase
    .from("lotargrupos_users")
    .select("*")
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle();

  if (userErr || !user) return { success: false, error: "Usuário não encontrado ou inativo" };

  // O hub-api já roda como service_role, então podemos gerar um link de login ou simplesmente
  // retornar sucesso para que o frontend use signInWithPassword (se soubermos a senha) 
  // ou usemos o token de sessão do hub para injetar no LotarGrupos.
  // Como o usuário quer "entrar direto", vamos retornar as credenciais se disponíveis 
  // ou usar a sessão do Supabase Auth que o Hub já compartilha.
  
  return { success: true, email: user.email };
}
