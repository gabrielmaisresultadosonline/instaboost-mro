import { emailEncode } from "./email-encode.ts";

export const sendLotarGruposEmail = async (email: string, name: string, password?: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return false;

  const loginUrl = "https://maisresultadosonline.com.br/login";
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seu acesso ao Lotar Grupos</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; color: #333;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 40px 20px; text-align: center; background-color: #2563eb; color: #ffffff;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Lotar Grupos</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Acesso Liberado!</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Olá, <strong>${name}</strong>!</p>
            <p style="line-height: 1.6; margin-bottom: 20px;">Parabéns pela sua compra! Seu acesso à área de membros exclusiva do <strong>Lotar Grupos</strong> já está disponível.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
              <p style="margin: 0 0 10px; font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 12px;">Seus Dados de Acesso</p>
              <p style="margin: 5px 0;"><strong>Login:</strong> ${email}</p>
              ${password ? `<p style="margin: 5px 0;"><strong>Senha:</strong> ${password}</p>` : ''}
              <p style="margin: 10px 0 0; font-size: 13px; color: #94a3b8;">Recomendamos alterar sua senha após o primeiro acesso.</p>
            </div>

            <p style="line-height: 1.6; margin-bottom: 25px;">O valor investido é irrisório perto do resultado que você terá ao aplicar o método para lotar seus grupos com leads qualificados. Aproveite enquanto duram nossas vagas!</p>

            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; transition: background-color 0.2s;">
                    ACESSAR ÁREA DE MEMBROS
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 14px; color: #64748b;">
            <p style="margin: 0;">MRO - Mais Resultados Online</p>
            <p style="margin: 5px 0 0;">Dúvidas? Entre em contato com o suporte.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lotar Grupos <mro@maisresultadosonline.com.br>",
        to: [email],
        subject: "🚀 Seu acesso ao Lotar Grupos!",
        html: html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Error sending Lotar Grupos email:", e);
    return false;
  }
};
