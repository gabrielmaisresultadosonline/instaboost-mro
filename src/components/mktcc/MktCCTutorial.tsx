import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MktccTourStep {
  /** Seletor do elemento que recebe o foco (spotlight). */
  selector: string;
  title: string;
  /** Texto explicativo mostrado no balãozinho. */
  text: string;
  /** Aba que deve estar aberta para o passo funcionar. */
  tab?: string;
}

interface MktCCTutorialProps {
  steps: MktccTourStep[];
  /** Passo atual (0-based) ou null quando o tutorial está desligado. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Chamado quando o passo pede uma aba diferente da atual. */
  onRequestTab?: (tab: string) => void;
}

const BUBBLE_WIDTH = 330;
const PADDING = 12;

/**
 * Tutorial guiado do painel do cliente (/mktcc).
 * Escurece a tela, recorta o elemento em foco e explica cada etapa em um
 * balãozinho de "pensamento" com os botões Voltar / Avançar / Sair.
 */
export const MktCCTutorial = ({ steps, index, onIndexChange, onClose, onRequestTab }: MktCCTutorialProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const active = index !== null && index >= 0 && index < steps.length;
  const step = active ? steps[index as number] : null;

  // Garante que a aba correta esteja aberta antes de medir o alvo.
  useEffect(() => {
    if (step?.tab) onRequestTab?.(step.tab);
  }, [step?.tab, onRequestTab]);

  const measure = useCallback(() => {
    if (!step) return setRect(null);
    const el = document.querySelector(step.selector);
    if (!el) return setRect(null);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    // Remede algumas vezes: a aba pode trocar e a rolagem é animada.
    const timers = [80, 220, 450, 700].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  // Navegação por teclado (Esc sai, setas avançam/voltam).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!active || !step) return null;

  const total = steps.length;
  const current = index as number;

  function next() {
    if (current + 1 >= total) return onClose();
    onIndexChange(current + 1);
  }
  function prev() {
    if (current === 0) return;
    onIndexChange(current - 1);
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Posiciona o balão abaixo do alvo; se não couber, joga para cima.
  const spot = rect
    ? {
        top: Math.max(rect.top - 8, 0),
        left: Math.max(rect.left - 8, 0),
        width: rect.width + 16,
        height: rect.height + 16,
      }
    : null;

  let bubbleTop = vh / 2 - 90;
  let bubbleLeft = vw / 2 - BUBBLE_WIDTH / 2;
  let arrow: "up" | "down" | null = null;

  if (spot) {
    const below = spot.top + spot.height + PADDING;
    const fitsBelow = below + 210 < vh;
    bubbleTop = fitsBelow ? below : Math.max(spot.top - 210 - PADDING, PADDING);
    arrow = fitsBelow ? "up" : "down";
    bubbleLeft = Math.min(
      Math.max(spot.left + spot.width / 2 - BUBBLE_WIDTH / 2, PADDING),
      vw - BUBBLE_WIDTH - PADDING,
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      {/* Máscara escura com recorte no elemento em foco */}
      {spot ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-foreground/75" style={{ height: spot.top }} onClick={onClose} />
          <div
            className="absolute inset-x-0 bg-foreground/75"
            style={{ top: spot.top + spot.height, bottom: 0 }}
            onClick={onClose}
          />
          <div className="absolute bg-foreground/75" style={{ top: spot.top, left: 0, width: spot.left, height: spot.height }} onClick={onClose} />
          <div
            className="absolute bg-foreground/75"
            style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }}
            onClick={onClose}
          />
          <div
            className="absolute rounded-xl border-[3px] border-primary ring-4 ring-primary/30 pointer-events-none animate-in fade-in"
            style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground/75" onClick={onClose} />
      )}

      {/* Balãozinho de explicação */}
      <div
        className="absolute animate-in fade-in zoom-in-95"
        style={{ top: bubbleTop, left: bubbleLeft, width: BUBBLE_WIDTH }}
      >
        {arrow === "up" && (
          <div className="ml-6 flex flex-col items-start gap-1">
            <span className="block h-2 w-2 rounded-full border-2 border-foreground bg-card" />
            <span className="block h-3 w-3 rounded-full border-2 border-foreground bg-card" />
          </div>
        )}

        <div className="rounded-2xl border-[3px] border-foreground bg-card p-4 shadow-[6px_6px_0_hsl(var(--foreground)/0.35)]">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border-2 border-foreground bg-primary">
                <GraduationCap className="h-3.5 w-3.5 text-primary-foreground" />
              </span>
              {step.title}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sair do tutorial"
              className="rounded-lg border-2 border-foreground p-1 hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/80">{step.text}</p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase text-muted-foreground">
              Passo {current + 1} de {total}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={prev}
                disabled={current === 0}
                className="rounded-xl border-2 border-foreground font-black uppercase"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={next} className="rounded-xl border-2 border-foreground font-black uppercase">
                {current + 1 === total ? "Concluir" : "Avançar"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full text-[11px] font-bold uppercase text-muted-foreground underline"
          >
            Sair do tutorial
          </button>
        </div>

        {arrow === "down" && (
          <div className="ml-6 flex flex-col items-start gap-1">
            <span className="block h-3 w-3 rounded-full border-2 border-foreground bg-card" />
            <span className="block h-2 w-2 rounded-full border-2 border-foreground bg-card" />
          </div>
        )}
      </div>
    </div>
  );
};
