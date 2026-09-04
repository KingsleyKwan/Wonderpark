import type { Camera } from "./types";

export const TILE_W = 56;
export const TILE_H = 28;

export function isoToScreen(x: number, y: number, z: number, cam: Camera) {
  const sx = (x - y) * (TILE_W / 2);
  const sy = (x + y) * (TILE_H / 2) - z;
  return { x: cam.x + sx * cam.zoom, y: cam.y + sy * cam.zoom };
}

export function screenToIso(px: number, py: number, cam: Camera) {
  const rx = (px - cam.x) / cam.zoom;
  const ry = (py - cam.y) / cam.zoom;
  const x = rx / (TILE_W / 2) + ry / (TILE_H / 2);
  const y = ry / (TILE_H / 2) - rx / (TILE_W / 2);
  return { x: x / 2, y: y / 2 };
}

export function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  cam: Camera,
  fill: string,
  stroke?: string,
) {
  const p = isoToScreen(x, y, z, cam);
  const hw = (TILE_W / 2) * cam.zoom;
  const hh = (TILE_H / 2) * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - hh);
  ctx.lineTo(p.x + hw, p.y);
  ctx.lineTo(p.x, p.y + hh);
  ctx.lineTo(p.x - hw, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.6, cam.zoom * 0.7);
    ctx.stroke();
  }
  return p;
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  cam: Camera,
  left: string,
  right: string,
  top: string,
) {
  const z = 0;
  const a = isoToScreen(x, y, z + h, cam);
  const b = isoToScreen(x + w, y, z + h, cam);
  const c = isoToScreen(x + w, y + d, z + h, cam);
  const e = isoToScreen(x, y + d, z + h, cam);
  const a2 = isoToScreen(x, y, z, cam);
  const b2 = isoToScreen(x + w, y, z, cam);
  const c2 = isoToScreen(x + w, y + d, z, cam);
  const e2 = isoToScreen(x, y + d, z, cam);

  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.closePath();
  ctx.fillStyle = left;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.closePath();
  ctx.fillStyle = right;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(e.x, e.y);
  ctx.closePath();
  ctx.fillStyle = top;
  ctx.fill();
}

export function shade(hex: string, amt: number) {
  const n = hex.replace("#", "");
  const v = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  let r = (v >> 16) & 255;
  let g = (v >> 8) & 255;
  let b = v & 255;
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}

export function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
