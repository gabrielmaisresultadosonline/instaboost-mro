# Plano: Rodapé "Todos os direitos reservados" com cor mais fraca e opaca

## Contexto atual (confirmado por leitura)

A página inicial (`/`) é renderizada por `src/pages/ToolSelector.tsx` sobre um fundo **preto** (`bg-black`, linha 118) com gradientes radiais amarelos. O rodapé está nas linhas 407-415:

```text
<footer className="... border-t border-yellow-400/10 ...">
  <p className="text-[10px] ... text-white/40">          // linha 409 — "Mais Resultados Online • Gabriel..."
  <p className="text-[10px] ... text-white/15">          // linha 412 — "© 2024 • Todos os direitos reservados"
</footer>
```

- A 1ª linha já usa `text-white/40` (40% opacidade).
- A 2ª linha ("© 2024 • Todos os direitos reservados") está em `text-white/15` após o ajuste da rodada anterior (antes era `text-white/30`).

## Objetivo

Deixar o texto "© 2024 • Todos os direitos reservados" (e opcionalmente a 1ª linha do rodapé) com uma cor **mais fraca, mais opaca/escura** — ou seja, menos visível, mais discreto sobre o preto, sem sumir totalmente.

## Abordagem recomendada

Como o fundo é preto, "mais fraca e opaca" = **menor opacidade do branco** (o texto fica mais cinza-escuro translúcido). Ajustar apenas a classe de opacidade do Tailwind, sem tocar no design system nem em tokens.

### Editar (escopo mínimo, só o rodapé)

Arquivo: `src/pages/ToolSelector.tsx`

| Linha | Texto | De | Para |
|------|-------|----|----|
| 412 | "© 2024 • Todos os direitos reservados" | `text-white/15` | `text-white/10` |
| 409 (opcional) | "Mais Resultados Online • Gabriel..." | `text-white/40` | `text-white/25` |

`text-white/10` = 10% de opacidade de branco sobre preto → cinza muito escuro, discreto mas legível. É o ponto onde o texto fica "fraco e opaco" sem desaparecer.

## Alternativas consideradas

1. **`text-white/10`** (recomendado) — discreto, legível, mantém hierarquia (a 1ª linha continua mais visível que a 2ª).
2. **`text-white/[0.08]`** — ainda mais fraco; arriscado em telas com baixo contraste.
3. **Token semântico `text-muted-foreground`** — não recomendado aqui: o tema escuro global usa cinza-claro (`215 20.2% 65.1%`), que ficaria **mais claro** que o atual, indo contra o pedido. O rodapé amarelo/preto é uma identidade visual própria desta página, então manter `text-white/N` é coerente.
4. **Cor sólida cinza** (`text-neutral-600`) — quebra a consistência com o resto do rodapé translúcido.

## Fora do escopo (não será alterado)

- Background, gradientes, malha pontilhada, glows amarelos.
- Estrutura do `<footer>`, espaçamentos, borda `border-yellow-400/10`.
- Nenhuma outra página (apenas a home `/` é alvo).

## Validação

Após a edição, recarregar `/` e confirmar visualmente que:
- O texto "© 2024 • Todos os direitos reservados" continua legível mas visivelmente mais fraco que a linha de cima.
- Nenhum erro de build/typecheck.
