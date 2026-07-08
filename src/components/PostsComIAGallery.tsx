import g1 from "@/assets/postscomia-gallery/g1.asset.json";
import g2 from "@/assets/postscomia-gallery/g2.asset.json";
import g3 from "@/assets/postscomia-gallery/g3.asset.json";
import g4 from "@/assets/postscomia-gallery/g4.asset.json";
import g5 from "@/assets/postscomia-gallery/g5.asset.json";
import g6 from "@/assets/postscomia-gallery/g6.asset.json";
import g7 from "@/assets/postscomia-gallery/g7.asset.json";
import g8 from "@/assets/postscomia-gallery/g8.asset.json";
import g9 from "@/assets/postscomia-gallery/g9.asset.json";
import g10 from "@/assets/postscomia-gallery/g10.asset.json";
import g11 from "@/assets/postscomia-gallery/g11.asset.json";
import g12 from "@/assets/postscomia-gallery/g12.asset.json";
import { Sparkles, Wand2, Palette, Camera, ArrowRight } from "lucide-react";

const heading = { fontFamily: "'Sora', system-ui, sans-serif" };

const images = [
  { src: g1.url, prompt: "criativo profissional para energia solar" },
  { src: g11.url, prompt: "logomarca premium açaí com coroa" },
  { src: g2.url, prompt: "logo urbano academia moderna" },
  { src: g3.url, prompt: "post economia conta de luz 30%" },
  { src: g12.url, prompt: "foto de estúdio profissional sem sair de casa" },
  { src: g4.url, prompt: "flyer aula experimental academia" },
  { src: g5.url, prompt: "post viral instagram tecnologia" },
  { src: g6.url, prompt: "anúncio energia solar cidade" },
  { src: g7.url, prompt: "post lançamento versão premium" },
  { src: g8.url, prompt: "criativo economize até 95% na luz" },
  { src: g9.url, prompt: "post minimalista economia verde" },
  { src: g10.url, prompt: "estética feminina fitness rosé" },
];

const row1 = [...images, ...images];
const row2 = [...images.slice().reverse(), ...images.slice().reverse()];

export default function PostsComIAGallery() {
  return (
    <section className="relative py-20 md:py-24 px-0 overflow-hidden bg-[#050505] border-y border-white/5">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[#eab308]/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#eab308]/30 bg-[#eab308]/5 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#eab308]" />
          <span className="text-[10px] font-bold text-[#eab308] uppercase tracking-[0.25em]">
            Gerado com 1 comando
          </span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold leading-[1.05]" style={heading}>
          Criativos que a I.A entrega <br className="hidden md:block" />
          <span className="text-[#eab308]">no automático</span>
        </h2>
        <p className="mt-4 text-[#a1a1aa] max-w-2xl mx-auto text-sm md:text-base">
          Basta descrever o que você quer. Em segundos você recebe artes profissionais prontas para publicar — como as que passam por aqui:
        </p>
      </div>

      {/* marquee row 1 */}
      <div className="relative group">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 md:w-40 bg-gradient-to-r from-[#050505] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 md:w-40 bg-gradient-to-l from-[#050505] to-transparent z-10" />
        <div className="flex gap-5 animate-[pc-marquee_60s_linear_infinite] group-hover:[animation-play-state:paused]">
          {row1.map((img, i) => (
            <GalleryCard key={`r1-${i}`} src={img.src} prompt={img.prompt} />
          ))}
        </div>
      </div>

      {/* marquee row 2 reverse */}
      <div className="relative group mt-5">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 md:w-40 bg-gradient-to-r from-[#050505] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 md:w-40 bg-gradient-to-l from-[#050505] to-transparent z-10" />
        <div className="flex gap-5 animate-[pc-marquee-rev_75s_linear_infinite] group-hover:[animation-play-state:paused]">
          {row2.map((img, i) => (
            <GalleryCard key={`r2-${i}`} src={img.src} prompt={img.prompt} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pc-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes pc-marquee-rev {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @keyframes pc-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </section>
  );
}

function GalleryCard({ src, prompt }: { src: string; prompt: string }) {
  return (
    <div className="relative shrink-0 w-[220px] md:w-[260px] aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-[0_20px_60px_-20px_rgba(234,179,8,0.25)] group/card">
      <img
        src={src}
        alt={prompt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
      />
      {/* scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-[#eab308]/25 to-transparent"
          style={{ animation: "pc-scan 3.5s ease-in-out infinite" }}
        />
      </div>
      {/* prompt chip */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
        <div className="flex items-start gap-2">
          <Wand2 className="w-3 h-3 text-[#eab308] mt-0.5 shrink-0" />
          <p className="text-[10px] md:text-[11px] text-white/90 leading-snug line-clamp-2">
            <span className="text-[#eab308]">/</span> {prompt}
          </p>
        </div>
      </div>
      {/* top corner tag */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur border border-[#eab308]/30 text-[9px] font-bold text-[#eab308] uppercase tracking-wider">
        I.A
      </div>
    </div>
  );
}
