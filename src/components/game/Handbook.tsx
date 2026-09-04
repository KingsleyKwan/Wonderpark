"use client";

import { useGameStore } from "@/game/store";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    t: "Paths",
    b: "Guests will walk on grass, slowly and unhappily. They follow beige paths to every door. Paint from the gate to each ride entrance.",
  },
  {
    t: "Needs",
    b: "Hunger, thirst, and toilets are not optional. Delete the Relief Block and civilization recedes in real time.",
  },
  {
    t: "Rides",
    b: "Open a ride. Guests queue on the path to the entrance — never across the ride — then board a round and unload. Each guest has a nerve and a preferred throttle. Tap a guest to read their taste. Hollow Creek's mothballed rides need Repair before anyone boards.",
  },
  {
    t: "Research",
    b: "The lab unlocks extra rides one blueprint at a time. Each listed day is a park day. When the memo lands, the new ride appears under Rides. Research stays with that park — a new assignment starts from the starter blueprints only.",
  },
  {
    t: "Staff",
    b: "Groundskeepers eat litter and long grass — you will see the stripe. Flower Hands water beds. Park Watch stops vandals. Ridewrights inspect before a ride dies. Jesters stop in a crowd and perform. Captain Wonder eats the will to complain.",
  },
  {
    t: "Weather & money",
    b: "Rain thins the gate. Guests without a brolly buy one, then hide in stalls and the haunted house. Umbrellas show up in 3D. Map kiosks stop guests inventing geography. Flash Hut sells the photograph. Pause menu: borrow $2,000, or spend $350 on handbills to thicken the gate.",
  },
  {
    t: "Awards",
    b: "Keep the lawn short, the flowers wet, and the photographs selling. Monthly plaques arrive with $450 and a sentence you can frame.",
  },
  {
    t: "Chaos",
    b: "If a guest leaves a ride without using the exit, call it engagement and wait for the helicopter. Usually bad for business. Not always.",
  },
  {
    t: "Controls",
    b: "Desk: WASD or right-drag to pan, wheel to zoom. Phone: drag to pan, pinch or ± to zoom, tap to place. Esc cancels a tool. Saves write themselves.",
  },
];

export function Handbook() {
  const set = useGameStore((s) => s.set);
  return (
    <main className="min-h-dvh bg-paper px-5 py-8 text-ink sm:px-16">
      <button
        type="button"
        onClick={() => set({ screen: "title" })}
        className="mb-8 flex items-center gap-2 text-sm text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Return the lanyard
      </button>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Form WW-7</p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-[-0.03em]">Employee handbook</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-3">
        Issued without warranty. The creek is decorative. The guests are not.
      </p>
      <ol className="mt-10 max-w-2xl space-y-6">
        {SECTIONS.map((s, i) => (
          <li key={s.t} className="border-t border-paper-3 pt-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-display text-2xl">{s.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.b}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
