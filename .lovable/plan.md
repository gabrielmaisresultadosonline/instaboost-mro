# Plano de Implementação: Área de Membros Lotar Grupos

Este plano detalha a criação de uma área de membros completa para o produto "Lotar Grupos", incluindo autenticação, painel administrativo, gerenciamento de aulas e integração com o sistema de vendas.

## 1. Banco de Dados e Segurança

*   **Tabelas:**
    *   `lotargrupos_users`: Gerencia o acesso dos alunos (ID, nome, e-mail, status, expiração).
    *   `lotargrupos_lessons`: Armazena as aulas (título, vídeo, thumbnail, descrição, botões).
*   **Segurança (RLS):**
    *   Restringir acesso às aulas apenas para usuários com `status = 'active'`.
    *   Painel administrativo acessível apenas para usuários com a role `admin`.

## 2. Frontend - Área do Aluno

*   **`/lotargrupos` (Página de Acesso):** Página de entrada que redireciona para login ou dashboard.
*   **`/login` (Autenticação):** Interface de login limpa e moderna.
*   **`/dashboard` (Área de Membros):**
    *   Grade de aulas com thumbnails.
    *   Player de vídeo integrado.
    *   Descrições e botões de materiais de apoio.
*   **`/recuperar-senha`:** Fluxo básico de recuperação de acesso.

## 3. Frontend - Área Administrativa

*   **`/admin` (Integração):** Adicionar a aba "Lotar Grupos" ao painel administrativo existente.
*   **Painel de Gestão:**
    *   **Usuários:** Listar, ativar, bloquear e pesquisar alunos.
    *   **Aulas:** CRUD completo de aulas, incluindo upload de mídia e ordenação.

## 4. Integração de Vendas

*   **Webhook (`infinitepay-webhook`):**
    *   Adicionar lógica para processar o prefixo `LOTARGRUPOS_`.
    *   Ao confirmar pagamento: criar/atualizar usuário em `lotargrupos_users` e disparar e-mail de boas-vindas.
*   **E-mail:** Criar template `lotargrupos-email.ts` com dados de acesso e link para a plataforma.

## Detalhes Técnicos

*   **Storage:** Utilizar buckets públicos/privados para thumbnails e vídeos.
*   **API:** Edge Function `lotargrupos-api` para operações administrativas seguras.
*   **Estado:** Uso de TanStack Query para carregamento eficiente de aulas no dashboard.
