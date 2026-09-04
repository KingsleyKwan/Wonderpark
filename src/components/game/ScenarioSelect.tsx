"use client";

import { useState } from "react";
import { SCENARIOS } from "@/game/catalog";
import { pushMemo } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { startScenario } from "@/game/world";
import { hasSave } from "@/game/save";
import { unlockAudio, sfxClick } from "@/game/audio";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function ScenarioSelect() {
  const set = useGameStore((s) => s.set);
  const [replaceId, setReplaceId] = useState<string | null>(null);

  function accept(scId: string) {
    unlockAudio();
    sfxClick();
    if (hasSave() && replaceId !== scId) {
      setReplaceId(scId);
      return;
    }
    const p = startScenario(scId);
    pushMemo(p, scId === "fernwood" ? "welcome_fernwood" : "welcome_hollow");
    set({
      screen: "park",
      speed: 1,
      pauseMenu: false,
      win: false,
      lose: false,
      placing: null,
      tool: "select",
      category: null,
      selected: null,
      coasterId: null,
      thoughts: [],
      memo: p.memos[0] ?? null,
      rev: Date.now(),
    });
  }

  return (
    <main className="min-h-dvh bg-ink px-5 py-8 sm:px-12">
      <button
        type="button"
        onClick={() => set({ screen: "title" })}
        className="mb-8 flex items-center gap-2 text-sm text-paper-2 hover:text-paper"
      >
        <ArrowLeft className="size-4" />
        Front desk
      </button>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-paper-3">Open postings</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.03em] text-paper sm:text-5xl">
        Choose a park.
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper-2">
        Two sites. One lanyard. HQ will assess every disaster against corporate values.
        {hasSave() ? " The board files one park — accepting a posting shreds the saved one, lab included." : ""}
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {SCENARIOS.map((sc) => (
          <article
            key={sc.id}
            className="overflow-hidden rounded-[28px] border border-line bg-ink-2"
          >
            <div className="relative h-44 sm:h-56">
              <img
                src={sc.image}
                alt={sc.name}
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-2 to-transparent" />
              <p className="absolute bottom-3 left-5 text-xs uppercase tracking-[0.18em] text-paper-3">
                {sc.place}
              </p>
            </div>
            <div className="px-5 pb-5 pt-2 sm:px-6">
              <h2 className="font-display text-2xl text-paper">{sc.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-2">{sc.blurb}</p>
              <p className="mt-3 text-xs text-muted">Opening float ${sc.cash.toLocaleString()}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-paper-2">
                {sc.objectives.slice(0, 3).map((o) => (
                  <li key={o.id} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brick" />
                    {o.text}
                  </li>
                ))}
              </ul>
              {replaceId === sc.id ? (
                <div className="mt-5 flex flex-col gap-2">
                  <p className="text-xs leading-relaxed text-paper-3">
                    This posting replaces the saved park. Research stays buried with it.
                  </p>
                  <button
                    type="button"
                    onClick={() => accept(sc.id)}
                    className="flex h-12 w-full items-center justify-between rounded-[18px] bg-paper px-5 text-ink transition-transform duration-150 hover:bg-paper-2 active:scale-[0.98]"
                  >
                    <span className="font-medium">Replace saved park</span>
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sfxClick();
                      setReplaceId(null);
                    }}
                    className="flex h-11 w-full items-center justify-center rounded-[14px] text-sm text-paper-3 hover:text-paper"
                  >
                    Keep the saved park
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => accept(sc.id)}
                  className="mt-5 flex h-12 w-full items-center justify-between rounded-[18px] bg-paper px-5 text-ink transition-transform duration-150 hover:bg-paper-2 active:scale-[0.98]"
                >
                  <span className="font-medium">Accept posting</span>
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}