# Plano de Implementação - Renda Extra para Renddx

Atualizar o fluxo final do quiz de Renda Extra e o e-mail de confirmação para direcionar os usuários ao site Renddx (https://maisresultadosonline.com.br/renddx) em vez de grupos de WhatsApp.

## Alterações Técnicas

### 1. Frontend: RendaExtraLead.tsx
- Modificar o estado final (`submitted`) para exibir o botão "APROVEITAR OPORTUNIDADE !" com link para `https://maisresultadosonline.com.br/renddx`.
- Remover referências a grupos de WhatsApp e convites no estado de sucesso.
- Atualizar o `toast` e os textos de sucesso para refletir a nova oportunidade.

### 2. Backend: Edge Function `renda-extra-register`
- Atualizar o template HTML do e-mail de confirmação.
- **Assunto:** "🔥 Oportunidade Única de Renda Extra liberada!"
- **Corpo:** Mensagem personalizada conforme solicitado: "você recebeu uma oportunidade de renda extra real, e o valor disponível é irrisório perto do resultado aproveite enquanto dura nossas vagas!"
- **Botão no E-mail:** Link direto para `https://maisresultadosonline.com.br/renddx`.
- **Compatibilidade:** O HTML será simplificado para garantir visualização correta em clientes de e-mail antigos (Hotmail, Gmail, mobile antigos) e evitar erros de código.

### 3. Backend: Edge Function `rendaextralead-register` (se aplicável)
- Verificar se esta função também precisa de atualização similar, pois ambas parecem lidar com o registro de leads de Renda Extra.

## Segurança e Padrões
- RLS já está configurado nas tabelas de leads.
- Uso de variáveis de ambiente para segredos SMTP.
- TypeScript strict no frontend.
