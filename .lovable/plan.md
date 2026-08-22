# Plano: Remarketing por E-mail no Admin Renda Extra

Adicionar funcionalidade de remarketing por e-mail no painel administrativo de Renda Extra (/rendaextra/admin). Isso permitirá que o administrador envie e-mails personalizados para leads filtrados por data de cadastro e tipo de dispositivo.

## Mudanças Técnicas

### 1. Backend (Edge Function: `rendaextralead-admin`)
- Adicionar ação `sendRemarketing` no arquivo `supabase/functions/rendaextralead-admin/index.ts`.
- Esta ação deve:
    - Receber filtros (dias desde o cadastro, tipos de computador).
    - Receber o conteúdo do e-mail (assunto e link do grupo).
    - Buscar leads correspondentes na tabela `renda_extra_lead_leads`.
    - Iterar pelos leads e enviar e-mails usando o serviço SMTP já configurado.
    - Registrar os envios na tabela `renda_extra_lead_email_logs` com tipo `remarketing`.
- Adicionar `zod` schema para validar o payload de remarketing.

### 2. Frontend (Página: `RendaExtraAdmin.tsx`)
- Adicionar uma nova aba "Remarketing" no componente `Tabs`.
- Criar o componente de interface para Remarketing que contenha:
    - Filtro de tempo: "Cadastrados há mais de X dias" (padrão 4 dias).
    - Filtro de dispositivos: Checkboxes para "Notebook", "Computador", "MacBook".
    - Campos de edição: Assunto do e-mail e Link do Novo Grupo.
    - Botão "Simular": Mostra quantos leads seriam impactados.
    - Botão "Enviar Remarketing Agora": Executa a ação via Edge Function com confirmação.
- Integrar com a função `supabase.functions.invoke("rendaextralead-admin", ...)` para chamar a nova ação.

### 3. E-mail (Shared Library: `supabase/functions/_shared/rendaext-emails.ts`)
- Criar uma nova função `buildRemarketingEmail(name, groupLink)` com layout profissional focado em convidar para o grupo.

## User Review Required
> [!IMPORTANT]
> O envio de e-mails em massa pode ser lento dependendo da quantidade de leads. O sistema processará em lotes ou sequencialmente na Edge Function. Recomenda-se não ultrapassar limites de envio do provedor SMTP (Hostinger).
