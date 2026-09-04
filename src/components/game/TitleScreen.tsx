"use client";

import { useEffect, useState } from "react";
import { hasSave } from "@/game/save";
import { useGameStore } from "@/game/store";
import { adoptPark } from "@/game/world";
import { loadPark } from "@/game/save";
import { unlockAudio, sfxClick } from "@/game/audio";
import { GAME_VERSION } from "@/game/version";
import { ArrowRight, BookOpen, Building2 } from "lucide-react";
import { LayoutSwitch } from "./LayoutSwitch";

export function TitleScreen() {
  const set = useGameStore((s) => s.set);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(hasSave());
  }, []);

  function boot() {
    unlockAudio();
    sfxClick();
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink">
      <img
        src="/art/title.jpg"
        alt="Wonderpark at golden hour"
        className="absolute inset-0 h-full w-full object-cover"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />
      <p className="absolute right-5 top-8 z-10 text-xs tabular tracking-[0.22em] text-paper-3 sm:right-12">
        v{GAME_VERSION}
      </p>
      <div className="relative z-10 flex min-h-dvh flex-col justify-between gap-8 overflow-y-auto px-5 py-8 sm:px-12 sm:py-12">
        <header className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-paper-3">
            Wonderpark Worldwide
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.03em] text-paper sm:text-6xl">
            We put the wonder to work.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-paper-2 sm:text-base">
            A regional posting in the amusement division. Build rides, feed guests,
            and keep the helicopter on retainer. The board is flexible about methods.
          </p>
          <div className="mt-5 max-w-sm">
            <LayoutSwitch />
          </div>
        </header>
        <div className="flex max-w-md flex-col gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              boot();
              set({ screen: "scenarios" });
            }}
            className="flex h-12 items-center justify-between rounded-[18px] bg-paper px-5 text-left text-ink transition-transform duration-150 ease-out hover:bg-paper-2 active:scale-[0.98]"
          >
            <span className="font-medium">New assignment</span>
            <ArrowRight className="size-4" />
          </button>
          {saved && (
            <p className="px-1 text-[11px] leading-relaxed text-paper-3">
              A new posting replaces the saved park. Lab unlocks do not transfer.
            </p>
          )}
          {saved && (
            <button
              type="button"
              onClick={() => {
                boot();
                const p = loadPark();
                if (p) {
                  adoptPark(p);
                  set({ screen: "park", speed: 1, pauseMenu: false });
                } else {
                  setSaved(false);
                }
              }}
              className="flex h-12 items-center justify-between rounded-[12px] border border-line bg-ink-2/80 px-5 text-left text-paper backdrop-blur-sm transition-transform duration-150 ease-out hover:border-line-strong active:scale-[0.98]"
            >
              <span className="font-medium">Continue park</span>
              <Building2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              boot();
              set({ screen: "handbook" });
            }}
            className="flex h-11 items-center justify-between rounded-[12px] px-5 text-left text-paper-2 transition-colors hover:text-paper"
          >
            <span>Employee handbook</span>
            <BookOpen className="size-4" />
          </button>
          <p className="pt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
            v{GAME_VERSION} · Internal use · Division 7 · Not a licensed simulator
          </p>
        </div>
      </div>
    </main>
  );
}
