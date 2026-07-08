import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  src: string;
  poster?: string;
  videoId: string;
  videoTitle: string;
  className?: string;
}

export default function TrackedVideo({ src, poster, videoId, videoTitle, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const fired = useRef<Set<string>>(new Set());

  function track(event_type: string) {
    if (fired.current.has(event_type)) return;
    fired.current.add(event_type);
    const sid = sessionStorage.getItem("pcia_sid") || "";
    supabase.functions
      .invoke("postscomia-admin", {
        body: { action: "track", event_type, video_id: videoId, video_title: videoTitle, session_id: sid },
      })
      .catch(() => {});
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      controls
      preload="metadata"
      playsInline
      className={className || "absolute inset-0 w-full h-full bg-black object-contain"}
      onPlay={() => track("video_start")}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (!v.duration || !isFinite(v.duration)) return;
        const pct = (v.currentTime / v.duration) * 100;
        if (pct >= 25) track("video_25");
        if (pct >= 50) track("video_50");
        if (pct >= 75) track("video_75");
      }}
      onEnded={() => track("video_100")}
    />
  );
}
