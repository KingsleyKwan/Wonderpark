"use client";

import { useEffect, useRef } from "react";
import { DEF_MAP, defById } from "@/game/catalog";
import { addPiece, seedTrack } from "@/game/coaster";
import { isTouchPointer, resolveLayout } from "@/game/layout";
import { demolishAt, footprintFree, hireStaff, inBounds, placeBuilding, placePath } from "@/game/park";
import { ParkView3D, centerCamera } from "@/game/scene3d";
import { tick } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { flushSave, getCamera, getPark, maybeAutosave, setCamera } from "@/game/world";
import {
  onVisibility,
  sfxBreak,
  sfxCash,
  sfxClick,
  sfxDemolish,
  sfxPlace,
  sfxScream,
  tickMusic,
  unlockAudio,
} from "@/game/audio";
import { Hud } from "./Hud";
import { Inspector } from "./Inspector";

const STEP = 1 / 60;
const TAP_SLOP = 12;

type Gesture = {
  mode: "none" | "tap" | "pan" | "pinch" | "paint" | "mousepan";
  sx: number;
  sy: number;
  lx: number;
  ly: number;
  moved: number;
  pinch: number;
};

function zoomAt(
  view: ParkView3D,
  clientX: number,
  clientY: number,
  factor: number,
) {
  const cam = getCamera();
  const park = getPark();
  if (!park) return;
  const before = view.pick(clientX, clientY);
  cam.zoom = Math.max(0.45, Math.min(2.4, cam.zoom * factor));
  view.setLook(cam, park);
  const after = view.pick(clientX, clientY);
  if (before.x >= 0 && after.x >= 0) {
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }
}

export function ParkScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef({ x: -1, y: -1 });
  const keysRef = useRef(new Set<string>());
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>({
    mode: "none",
    sx: 0,
    sy: 0,
    lx: 0,
    ly: 0,
    moved: 0,
    pinch: 0,
  });
  const lastCash = useRef(0);
  const lastInj = useRef(0);
  const lastDeaths = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    unlockAudio();
    onVisibility();

    const park0 = getPark();
    if (!park0) {
      useGameStore.getState().set({ screen: "title" });
      return;
    }
    lastCash.current = park0.cash;
    lastInj.current = park0.injuries;
    lastDeaths.current = park0.deaths;
    let sawWon = park0.won;
    let sawLost = park0.lost;

    const view = new ParkView3D(canvas);
    const mobile = resolveLayout() === "mobile";
    setCamera(centerCamera(park0, mobile));
    view.setLook(getCamera(), park0);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      view.resize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let hudT = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const park = getPark();
      if (!park) return;
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const ui = useGameStore.getState();
      const speed = ui.pauseMenu ? 0 : ui.speed;

      const cam = getCamera();
      const pan = 420 * dt;
      const keys = keysRef.current;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) view.panScreen(pan, 0, cam);
      if (keys.has("KeyD") || keys.has("ArrowRight")) view.panScreen(-pan, 0, cam);
      if (keys.has("KeyW") || keys.has("ArrowUp")) view.panScreen(0, -pan, cam);
      if (keys.has("KeyS") || keys.has("ArrowDown")) view.panScreen(0, pan, cam);

      acc += dt * speed;
      while (acc >= STEP) {
        tick(park, STEP);
        acc -= STEP;
      }
      tickMusic(dt);
      maybeAutosave(now);

      if (park.cash > lastCash.current + 0.5) sfxCash();
      lastCash.current = park.cash;
      if (park.injuries > lastInj.current) sfxScream();
      lastInj.current = park.injuries;
      if (park.deaths > lastDeaths.current) sfxBreak();
      lastDeaths.current = park.deaths;

      const placing = ui.placing ? DEF_MAP[ui.placing] : null;
      const hover = hoverRef.current;
      let ghost: { x: number; y: number; w: number; h: number; ok: boolean; defId?: string } | null = null;
      if (placing && ui.tool === "place" && hover.x >= 0) {
        const ok =
          placing.category === "staff"
            ? inBounds(park, hover.x, hover.y)
            : footprintFree(park, placing, hover.x, hover.y) && park.cash >= placing.cost;
        ghost = { x: hover.x, y: hover.y, w: placing.w, h: placing.h, ok, defId: placing.id };
      }

      view.sync(park, cam, now, hover.x >= 0 ? hover : null, ghost, ui.selected?.id ?? null);
      view.render();

      hudT += dt;
      if (hudT > 0.18) {
        hudT = 0;
        const thoughts = park.guests
          .filter((g) => g.thoughtT > 0)
          .slice(0, 4)
          .map((g) => `${g.name}: ${g.thought}`);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const justWon = park.won && !sawWon;
        const justLost = park.lost && !sawLost;
        if (justWon) sawWon = true;
        if (justLost) sawLost = true;
        useGameStore.getState().set({
          cash: park.cash,
          guests: park.guests.length,
          rating: Math.round(park.rating),
          dayLabel: `${months[park.month - 1] ?? "Mar"} ${park.day}, ${park.year}`,
          thoughts,
          win: park.won,
          lose: park.lost,
          memo: ui.memo ?? park.memos[0] ?? null,
          ...(justWon || justLost ? { pauseMenu: true, speed: 0 as const } : {}),
        });
      }
    };
    raf = requestAnimationFrame(loop);

    const pinchInfo = () => {
      const pts = [...pointersRef.current.values()];
      if (pts.length < 2) return null;
      const a = pts[0]!;
      const b = pts[1]!;
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    };

    const actAt = (t: { x: number; y: number }) => {
      const ui = useGameStore.getState();
      const park = getPark();
      if (!park) return;
      hoverRef.current = t;
      if (ui.tool === "path") {
        if (placePath(park, t.x, t.y)) sfxPlace();
        return;
      }
      if (ui.tool === "demolish") {
        if (demolishAt(park, t.x, t.y)) sfxDemolish();
        return;
      }
      if (ui.tool === "coaster" && ui.coasterId) {
        const b = park.buildings.find((x) => x.id === ui.coasterId);
        if (b) {
          if (!b.track?.length) b.track = seedTrack(b.x, b.y);
          const lastNode = b.track[b.track.length - 1]!;
          if (Math.abs(t.x - lastNode.x) + Math.abs(t.y - lastNode.y) === 1) {
            const next = addPiece(b.track, "str");
            if (next) {
              b.track = next;
              sfxPlace();
            }
          }
        }
        return;
      }
      if (ui.tool === "place" && ui.placing) {
        const def = defById(ui.placing);
        if (def.category === "staff") {
          if (hireStaff(park, def.id, t.x, t.y)) sfxPlace();
        } else {
          const b = placeBuilding(park, def.id, t.x, t.y);
          if (b) {
            sfxPlace();
            if (def.kind === "coaster") {
              b.track = seedTrack(b.x, b.y);
              useGameStore.getState().set({
                tool: "coaster",
                coasterId: b.id,
                selected: { kind: "building", id: b.id },
              });
            }
          }
        }
        return;
      }
      const guest = park.guests.find((g) => Math.hypot(g.x - t.x - 0.5, g.y - t.y - 0.5) < 0.7);
      if (guest) {
        useGameStore.getState().set({ selected: { kind: "guest", id: guest.id } });
        sfxClick();
        return;
      }
      const b = park.buildings.find((bb) => {
        const d = DEF_MAP[bb.defId];
        if (!d) return false;
        return t.x >= bb.x && t.y >= bb.y && t.x < bb.x + d.w && t.y < bb.y + d.h;
      });
      const st = park.staff.find((s) => Math.hypot(s.x - t.x - 0.5, s.y - t.y - 0.5) < 0.7);
      if (b)
        useGameStore.getState().set({
          selected: { kind: "building", id: b.id },
          coasterId: DEF_MAP[b.defId]?.kind === "coaster" ? b.id : null,
        });
      else if (st) useGameStore.getState().set({ selected: { kind: "staff", id: st.id } });
      else useGameStore.getState().set({ selected: null });
    };

    const resetGesture = () => {
      gestureRef.current.mode = "none";
      gestureRef.current.moved = 0;
      gestureRef.current.pinch = 0;
    };

    const onDown = (ev: PointerEvent) => {
      const uiNow = useGameStore.getState();
      if (uiNow.pauseMenu || uiNow.lose) return;
      unlockAudio();
      const touch = isTouchPointer(ev.pointerType);
      pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (!touch) canvas.setPointerCapture(ev.pointerId);

      const g = gestureRef.current;
      if (touch) {
        if (pointersRef.current.size >= 2) {
          const p = pinchInfo();
          g.mode = "pinch";
          g.pinch = p?.dist ?? 1;
          return;
        }
        const t = view.pick(ev.clientX, ev.clientY);
        hoverRef.current = t;
        g.mode = "tap";
        g.sx = ev.clientX;
        g.sy = ev.clientY;
        g.lx = ev.clientX;
        g.ly = ev.clientY;
        g.moved = 0;
        if (useGameStore.getState().tool === "path") {
          g.mode = "paint";
          actAt(t);
        }
        return;
      }

      if (ev.button === 1 || ev.button === 2 || keysRef.current.has("Space")) {
        g.mode = "mousepan";
        g.lx = ev.clientX;
        g.ly = ev.clientY;
        return;
      }
      const t = view.pick(ev.clientX, ev.clientY);
      hoverRef.current = t;
      if (useGameStore.getState().tool === "path") {
        g.mode = "paint";
        actAt(t);
        return;
      }
      actAt(t);
    };

    const onMove = (ev: PointerEvent) => {
      if (pointersRef.current.has(ev.pointerId)) {
        pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }
      const g = gestureRef.current;
      const t = view.pick(ev.clientX, ev.clientY);

      if (g.mode === "pinch") {
        const p = pinchInfo();
        if (p && g.pinch > 0) {
          zoomAt(view, p.midX, p.midY, p.dist / g.pinch);
          g.pinch = p.dist;
        }
        return;
      }

      if (g.mode === "mousepan") {
        view.panScreen(ev.clientX - g.lx, ev.clientY - g.ly, getCamera());
        g.lx = ev.clientX;
        g.ly = ev.clientY;
        return;
      }

      if (g.mode === "paint") {
        hoverRef.current = t;
        const park = getPark();
        if (park && useGameStore.getState().tool === "path") placePath(park, t.x, t.y);
        return;
      }

      if (g.mode === "tap" || g.mode === "pan") {
        const dx = ev.clientX - g.lx;
        const dy = ev.clientY - g.ly;
        g.moved += Math.hypot(dx, dy);
        g.lx = ev.clientX;
        g.ly = ev.clientY;
        if (g.mode === "tap" && g.moved > TAP_SLOP) g.mode = "pan";
        if (g.mode === "pan") {
          view.panScreen(dx, dy, getCamera());
          hoverRef.current = { x: -1, y: -1 };
        } else {
          hoverRef.current = t;
        }
        return;
      }

      hoverRef.current = t;
    };

    const onUp = (ev: PointerEvent) => {
      const g = gestureRef.current;
      const t = view.pick(ev.clientX, ev.clientY);
      if (g.mode === "tap" && g.moved <= TAP_SLOP) actAt(t);
      pointersRef.current.delete(ev.pointerId);
      if (pointersRef.current.size === 0) resetGesture();
      else if (pointersRef.current.size === 1 && g.mode === "pinch") {
        const remain = [...pointersRef.current.values()][0]!;
        g.mode = "pan";
        g.lx = remain.x;
        g.ly = remain.y;
        g.moved = TAP_SLOP + 1;
      }
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      zoomAt(view, ev.clientX, ev.clientY, ev.deltaY > 0 ? 0.92 : 1.08);
    };

    const onKey = (ev: KeyboardEvent) => {
      keysRef.current.add(ev.code);
      if (ev.code === "Escape") {
        const uiNow = useGameStore.getState();
        if (uiNow.lose) return;
        if (uiNow.pauseMenu) {
          uiNow.set({ pauseMenu: false, speed: uiNow.speed || 1 });
          return;
        }
        uiNow.set({ tool: "select", placing: null, category: null });
      }
      if (ev.code === "Space") ev.preventDefault();
      if (ev.code === "Digit1") useGameStore.getState().set({ speed: 0 });
      if (ev.code === "Digit2") useGameStore.getState().set({ speed: 1 });
      if (ev.code === "Digit3") useGameStore.getState().set({ speed: 2 });
      if (ev.code === "Digit4") useGameStore.getState().set({ speed: 4 });
    };
    const onKeyUp = (ev: KeyboardEvent) => keysRef.current.delete(ev.code);
    const onBlur = () => keysRef.current.clear();
    const blockGesture = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("gesturestart", blockGesture);
    canvas.addEventListener("gesturechange", blockGesture);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    const onHide = () => {
      if (document.hidden) {
        flushSave();
        keysRef.current.clear();
      }
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("gesturestart", blockGesture);
      canvas.removeEventListener("gesturechange", blockGesture);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHide);
      view.dispose();
      flushSave();
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden overscroll-none bg-ink">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        aria-label="Wonderpark isometric 3D park"
      />
      <Hud />
      <Inspector />
    </div>
  );
}
