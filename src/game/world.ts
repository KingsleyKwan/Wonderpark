import type { Camera, Park } from "./types";
import { createPark } from "./park";
import { savePark } from "./save";

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

export function startScenario(id: string) {
  park = createPark(id);
  lastSave = 0;
  return park;
}

export function adoptPark(p: Park) {
  park = p;
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
