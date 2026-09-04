import { create } from "zustand";
import type { LayoutMode, LayoutPref } from "./layout";
import type { Memo, Tool } from "./types";

export type Screen = "title" | "scenarios" | "handbook" | "park";
export type Category = "rides" | "shops" | "scenery" | "staff" | "research" | null;

interface GameUI {
  screen: Screen;
  tool: Tool;
  category: Category;
  placing: string | null;
  selected: { kind: "building" | "guest" | "staff"; id: string } | null;
  speed: 0 | 1 | 2 | 4;
  cash: number;
  guests: number;
  rating: number;
  dayLabel: string;
  thoughts: string[];
  memo: Memo | null;
  pauseMenu: boolean;
  win: boolean;
  lose: boolean;
  savedFlash: boolean;
  coasterId: string | null;
  rev: number;
  layout: LayoutMode;
  layoutPref: LayoutPref;
  set: (p: Partial<GameUI>) => void;
}

export const useGameStore = create<GameUI>((set) => ({
  screen: "title",
  tool: "select",
  category: null,
  placing: null,
  selected: null,
  speed: 1,
  cash: 0,
  guests: 0,
  rating: 0,
  dayLabel: "",
  thoughts: [],
  memo: null,
  pauseMenu: false,
  win: false,
  lose: false,
  savedFlash: false,
  coasterId: null,
  rev: 0,
  layout: "desktop",
  layoutPref: "auto",
  set: (p) => set(p),
}));
