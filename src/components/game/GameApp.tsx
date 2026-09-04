"use client";

import { useEffect } from "react";
import { readPref, resolveLayout } from "@/game/layout";
import { useGameStore } from "@/game/store";
import { TitleScreen } from "./TitleScreen";
import { ScenarioSelect } from "./ScenarioSelect";
import { Handbook } from "./Handbook";
import { ParkScreen } from "./ParkScreen";

export function GameApp() {
  const screen = useGameStore((s) => s.screen);
  const layout = useGameStore((s) => s.layout);
  const set = useGameStore((s) => s.set);

  useEffect(() => {
    const apply = () => {
      const pref = readPref();
      const next = resolveLayout(pref);
      const cur = useGameStore.getState();
      if (cur.layout !== next || cur.layoutPref !== pref) {
        set({ layout: next, layoutPref: pref });
      }
      document.documentElement.dataset.layout = next;
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    const coarse = window.matchMedia("(pointer: coarse)");
    coarse.addEventListener("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      coarse.removeEventListener("change", apply);
    };
  }, [set]);

  return (
    <div className={`game-root text-paper ${layout === "mobile" ? "layout-mobile" : "layout-desktop"}`}>
      {screen === "title" && <TitleScreen />}
      {screen === "scenarios" && <ScenarioSelect />}
      {screen === "handbook" && <Handbook />}
      {screen === "park" && <ParkScreen />}
    </div>
  );
}
