import type { Camera, Park } from "./types";
import { createPark } from "./park";
import { clearSave, savePark } from "./save";

let park: Park | null = null;
let camera: Camera = { x: 0, y: 0, zoom: 1 };
let lastSave = 0;

export function getPark() {
  return park;
}

export function getCamera() {
  return camera;
}

export function setCamera(c: Camera) {
  camera = c;
}

/** Fresh park. Wipes the single save slot so lab unlocks cannot leak into Continue. */
export function startScenario(id: string) {
  const next = createPark(id);
  park = next;
  lastSave = 0;
  clearSave();
  savePark(next);
  lastSave = typeof performance !== "undefined" ? performance.now() : 0;
  return next;
}

export function adoptPark(p: Park) {
  park = p;
}

/** Write this park only if it is still the live one — stale unmounts must not restore an old lab. */
export function flushPark(p: Park) {
  if (park === p) savePark(p);
}

export function maybeAutosave(now: number) {
  if (!park) return;
  if (now - lastSave < 8000) return;
  lastSave = now;
  savePark(park);
}

export function flushSave() {
  if (park) savePark(park);
}

if (typeof window !== "undefined") {
  (window as unknown as { __wonderpark: { getPark: typeof getPark; getCamera: typeof getCamera } }).__wonderpark = {
    getPark,
    getCamera,
  };
}