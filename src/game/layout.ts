export type LayoutMode = "desktop" | "mobile";
export type LayoutPref = "auto" | LayoutMode;

const KEY = "wonderpark-layout";

export function detectLayout(): LayoutMode {
  if (typeof window === "undefined") return "desktop";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const phoneLandscape =
    window.matchMedia("(max-height: 520px)").matches && window.innerWidth < 1000;
  const touch = navigator.maxTouchPoints > 0;
  if (narrow || phoneLandscape) return "mobile";
  if (coarse && touch && window.innerWidth < 1100) return "mobile";
  return "desktop";
}

export function readPref(): LayoutPref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "auto" || v === "desktop" || v === "mobile") return v;
  } catch {
    /* private mode */
  }
  return "auto";
}

export function writePref(pref: LayoutPref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* private mode */
  }
}

export function resolveLayout(pref: LayoutPref = readPref()): LayoutMode {
  if (pref === "desktop" || pref === "mobile") return pref;
  return detectLayout();
}

export function isTouchPointer(type: string) {
  return type === "touch" || type === "pen";
}
