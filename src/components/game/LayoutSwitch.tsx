"use client";

import { resolveLayout, writePref, type LayoutPref } from "@/game/layout";
import { useGameStore } from "@/game/store";
import { sfxClick } from "@/game/audio";

const OPTIONS: { id: LayoutPref; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "mobile", label: "Phone" },
  { id: "desktop", label: "Desk" },
];

export function LayoutSwitch({ compact = false }: { compact?: boolean }) {
  const layout = useGameStore((s) => s.layout);
  const layoutPref = useGameStore((s) => s.layoutPref);
  const set = useGameStore((s) => s.set);

  function choose(pref: LayoutPref) {
    sfxClick();
    writePref(pref);
    const next = resolveLayout(pref);
    set({ layoutPref: pref, layout: next });
    document.documentElement.dataset.layout = next;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2 pt-1"}>
      <div className="flex rounded-[14px] border border-line bg-ink-2/70 p-1 backdrop-blur-sm">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(o.id)}
            className={`h-11 flex-1 rounded-[10px] text-xs font-medium uppercase tracking-[0.16em] transition-colors ${
              layoutPref === o.id ? "bg-paper text-ink" : "text-paper-3 hover:text-paper"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!compact && (
        <p className="text-[11px] leading-relaxed text-muted">
          {layout === "mobile"
            ? "Phone kit — drag to pan, pinch to zoom, tap to place."
            : "Desk kit — WASD to pan, wheel to zoom, right-drag to look."}
        </p>
      )}
    </div>
  );
}
