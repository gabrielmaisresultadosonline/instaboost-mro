/**
 * MRO INSTAGRAM (/IG) — URLs públicas canônicas.
 *
 * A Meta valida o redirect_uri por igualdade exata com o que está cadastrado no
 * App. Por isso usamos SEMPRE o domínio principal de produção, e nunca
 * window.location.origin (que varia entre preview, lovableproject.com e domínio).
 */
export const IG_PUBLIC_ORIGIN = "https://maisresultadosonline.com.br";

/** URI de redirecionamento do OAuth — precisa estar cadastrada no App da Meta. */
export const IG_OAUTH_REDIRECT_URI = `${IG_PUBLIC_ORIGIN}/IG/auth/instagram/callback`;

/** Callback dos webhooks do Instagram (Edge Function). */
export const IG_WEBHOOK_URL =
  "https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/ig-webhook";

/** Página usada como Deauthorize e Data Deletion callback. */
export const IG_PRIVACY_URL = `${IG_PUBLIC_ORIGIN}/politica-de-privacidade-ig`;
