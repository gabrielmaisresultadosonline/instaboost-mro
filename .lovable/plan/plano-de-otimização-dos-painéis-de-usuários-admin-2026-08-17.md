# Plano de Otimização dos Painéis de Usuários (/admin)

Ajuste dos painéis **MRO Ferramenta**, **ZAPMRO** e **Hub Dashboard** para carregar volumes maiores de dados, permitindo a pesquisa completa em todos os registros, mas mantendo a performance ao exibir inicialmente apenas os primeiros 50 usuários.

## Alterações Técnicas

### 1. MRO Ferramenta
- **Edge Function (`mro-tool-api`)**: Aumentado o limite máximo de registros por requisição de 100 para 2000.
- **Componente (`MroUsersPanel.tsx`)**:
  - Alterado o carregamento inicial para buscar até 2000 usuários (garantindo que "não falte ninguém" no cenário atual).
  - Implementada lógica de visualização: mostra apenas os primeiros 50 por padrão.
  - Oculta o restante atrás de um botão "Ver todos".
  - A busca agora filtra localmente sobre o conjunto completo de 2000 registros, garantindo que qualquer usuário seja encontrado instantaneamente.
  - Adicionado botão "Carregar mais do banco" caso o total exceda 2000.

### 2. ZAPMRO
- **Edge Function (`zapmro-api`)**: Embora a função já busque todos (sem `range` explícito no código atual), ela agora suporta a mesma estratégia.
- **Componente (`ZapmroUsersPanel.tsx`)**:
  - Atualizado o placeholder de busca para refletir que a pesquisa é global.
  - Mantida a lógica de `slice(0, 50)` para exibição inicial.

### 3. Hub Dashboard
- **Componente (`HubUsersPanel.tsx`)**:
  - Atualizado o placeholder de busca.
  - Reforçada a lógica de filtro global com exibição paginada.

## Benefícios
- **Velocidade**: A interface permanece fluida pois não renderiza centenas de cartões de uma vez.
- **Precisão**: A busca não falha mais em encontrar usuários que não estavam na "página 1".
- **Escalabilidade**: Preparado para crescer sem causar novos timeouts de 500/521 no backend.
