import { DEF_MAP } from "./catalog";
import { followTrack } from "./coaster";
import { drawBox, drawDiamond, hash2, isoToScreen, shade, TILE_H, TILE_W } from "./iso";
import type { Building, Camera, Guest, Park, Staff } from "./types";

function grassColor(park: Park, x: number, y: number) {
  const n = hash2(x, y);
  if (park.biome === "forest") return n > 0.55 ? "#4f7a4a" : "#5c8a52";
  return n > 0.6 ? "#6a8a4e" : "#7a9a56";
}

function drawTile(ctx: CanvasRenderingContext2D, park: Park, x: number, y: number, cam: Camera, time: number) {
  const t = park.tiles[y]![x]!;
  if (t.kind === "water") {
    const w = 0.5 + 0.5 * Math.sin(time * 0.002 + x * 0.5 + y * 0.4);
    const fill = w > 0.5 ? "#3a6d82" : "#2f5d72";
    drawDiamond(ctx, x, y, 0, cam, fill, "#2a4d5e");
    const p = isoToScreen(x, y, 0, cam);
    ctx.strokeStyle = "rgba(232,220,196,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 8 * cam.zoom, p.y);
    ctx.lineTo(p.x + 6 * cam.zoom, p.y - 3 * cam.zoom);
    ctx.stroke();
    return;
  }
  if (t.kind === "path") {
    drawDiamond(ctx, x, y, 0, cam, "#cbb89a", "#a89478");
    drawDiamond(ctx, x, y, 0.6, cam, "#d8c7ab", undefined);
    return;
  }
  if (t.kind === "sand") {
    drawDiamond(ctx, x, y, 0, cam, "#c4b07a", "#a89462");
    return;
  }
  if (t.kind === "dirt") {
    drawDiamond(ctx, x, y, 0, cam, shade("#8b6b45", hash2(x, y) * 18 - 8), "#6e5336");
    return;
  }
  drawDiamond(ctx, x, y, 0, cam, grassColor(park, x, y), shade(grassColor(park, x, y), -24));
  if (t.litter > 0.2) {
    const p = isoToScreen(x + 0.3, y + 0.4, 2, cam);
    ctx.fillStyle = "#c24a3a";
    ctx.fillRect(p.x, p.y, 3 * cam.zoom, 2 * cam.zoom);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Camera, pine: boolean, t: number) {
  const p = isoToScreen(x + 0.5, y + 0.5, 0, cam);
  const z = cam.zoom;
  ctx.fillStyle = "rgba(20,24,32,0.22)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 10 * z, 5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4030";
  ctx.lineWidth = 3 * z;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 16 * z);
  ctx.stroke();
  if (pine) {
    ctx.fillStyle = "#2f4a36";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - (18 + i * 12) * z);
      ctx.lineTo(p.x + (14 - i * 3) * z, p.y - (6 + i * 12) * z);
      ctx.lineTo(p.x - (14 - i * 3) * z, p.y - (6 + i * 12) * z);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#3f5c45";
    ctx.beginPath();
    ctx.arc(p.x - 4 * z, p.y - 22 * z, 12 * z, 0, Math.PI * 2);
    ctx.arc(p.x + 6 * z, p.y - 20 * z, 10 * z, 0, Math.PI * 2);
    ctx.arc(p.x, p.y - 28 * z, 11 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c7f62";
    ctx.beginPath();
    ctx.arc(p.x + 2 * z, p.y - 26 * z, 7 * z, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStall(ctx: CanvasRenderingContext2D, b: Building, cam: Camera) {
  const d = DEF_MAP[b.defId]!;
  drawBox(ctx, b.x + 0.15, b.y + 0.15, d.w - 0.3, d.h - 0.3, 10, cam, shade(d.color, -20), shade(d.color, -40), d.color);
  drawBox(ctx, b.x - 0.05, b.y - 0.05, d.w + 0.1, d.h + 0.1, 7, cam, shade(d.roof, -25), shade(d.roof, -40), d.roof);
  const p = isoToScreen(b.x + d.w / 2, b.y + d.h / 2, 18, cam);
  ctx.fillStyle = "#141820";
  ctx.font = `${Math.max(9, 10 * cam.zoom)}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(d.name.split(" ")[0]!, p.x, p.y);
}

function drawCarousel(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  const cx = b.x + 1.5;
  const cy = b.y + 1.5;
  drawBox(ctx, b.x + 0.2, b.y + 0.2, 2.6, 2.6, 6, cam, "#6b4a32", "#4a3222", "#c24a3a");
  const p = isoToScreen(cx, cy, 22, cam);
  const z = cam.zoom;
  ctx.fillStyle = "#c24a3a";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 18 * z, 28 * z, 12 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f3ead7";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 22 * z, 22 * z, 9 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  const spin = time * 0.0016 * b.speed;
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * Math.PI * 2;
    const hx = cx + Math.cos(a) * 1.05;
    const hy = cy + Math.sin(a) * 1.05;
    const hp = isoToScreen(hx, hy, 8 + Math.sin(a * 2) * 2, cam);
    ctx.fillStyle = i % 2 ? "#c24a3a" : "#f3ead7";
    ctx.fillRect(hp.x - 3 * z, hp.y - 10 * z, 6 * z, 12 * z);
  }
}

function drawFerris(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  const cx = b.x + 1.5;
  const cy = b.y + 1.5;
  drawBox(ctx, b.x + 0.9, b.y + 1.1, 0.7, 0.7, 8, cam, "#2a3342", "#141820", "#c24a3a");
  const hub = isoToScreen(cx, cy, 44, cam);
  const z = cam.zoom;
  const r = 34 * z;
  ctx.strokeStyle = "#e8dcc4";
  ctx.lineWidth = 2.2 * z;
  ctx.beginPath();
  ctx.ellipse(hub.x, hub.y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();
  const spin = time * 0.0007 * b.speed;
  for (let i = 0; i < 10; i++) {
    const a = spin + (i / 10) * Math.PI * 2;
    const gx = hub.x + Math.cos(a) * r;
    const gy = hub.y + Math.sin(a) * r * 0.62;
    ctx.strokeStyle = "#c24a3a";
    ctx.beginPath();
    ctx.moveTo(hub.x, hub.y);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? "#c24a3a" : "#3d8b6e";
    ctx.fillRect(gx - 4 * z, gy - 3 * z, 8 * z, 7 * z);
  }
}

function drawShip(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.3, b.y + 0.2, 0.4, 1.6, 28, cam, "#2a3342", "#141820", "#6b4a32");
  drawBox(ctx, b.x + 3.3, b.y + 0.2, 0.4, 1.6, 28, cam, "#2a3342", "#141820", "#6b4a32");
  const ang = Math.sin(time * 0.0018 * b.speed) * (0.55 + (b.speed - 1) * 0.8);
  const p = isoToScreen(b.x + 2, b.y + 1, 22, cam);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  ctx.fillStyle = "#6b4a32";
  ctx.beginPath();
  ctx.ellipse(0, 0, 26 * cam.zoom, 9 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c24a3a";
  ctx.fillRect(-4 * cam.zoom, -18 * cam.zoom, 8 * cam.zoom, 16 * cam.zoom);
  ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.55, b.y + 0.55, 0.9, 0.9, 70, cam, "#2a3342", "#141820", "#c24a3a");
  const phase = (time * 0.0008 * b.speed) % 1;
  const drop = phase < 0.55 ? phase / 0.55 : 1 - (phase - 0.55) / 0.45;
  const p = isoToScreen(b.x + 1, b.y + 1, 8 + drop * 60, cam);
  ctx.fillStyle = "#c24a3a";
  ctx.fillRect(p.x - 10 * cam.zoom, p.y - 6 * cam.zoom, 20 * cam.zoom, 10 * cam.zoom);
}

function drawBumper(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.1, b.y + 0.1, 2.8, 2.8, 4, cam, "#3d6b5c", "#2a4a40", "#3d8b6e");
  for (let i = 0; i < 5; i++) {
    const a = time * 0.001 + i * 1.3;
    const px = b.x + 1.5 + Math.cos(a) * 0.85;
    const py = b.y + 1.5 + Math.sin(a * 1.3) * 0.7;
    const p = isoToScreen(px, py, 6, cam);
    ctx.fillStyle = i % 2 ? "#c24a3a" : "#c9923a";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 6 * cam.zoom, 4 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHaunt(ctx: CanvasRenderingContext2D, b: Building, cam: Camera) {
  drawBox(ctx, b.x + 0.2, b.y + 0.2, 2.6, 2.6, 28, cam, "#2a3342", "#141820", "#3f5c45");
  const p = isoToScreen(b.x + 1.5, b.y + 0.4, 36, cam);
  ctx.fillStyle = "#141820";
  ctx.beginPath();
  ctx.moveTo(p.x - 22 * cam.zoom, p.y);
  ctx.lineTo(p.x, p.y - 18 * cam.zoom);
  ctx.lineTo(p.x + 22 * cam.zoom, p.y);
  ctx.closePath();
  ctx.fill();
  const w = isoToScreen(b.x + 1.5, b.y + 2.4, 14, cam);
  ctx.fillStyle = "#c9923a";
  ctx.fillRect(w.x - 4 * cam.zoom, w.y - 8 * cam.zoom, 8 * cam.zoom, 10 * cam.zoom);
}

function drawFlume(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.1, b.y + 0.4, 3.8, 2.2, 6, cam, "#3d6b8b", "#2a4a62", "#4a7a96");
  const t = (time * 0.0006) % 1;
  const p = isoToScreen(b.x + 0.4 + t * 3.2, b.y + 1.5, 10, cam);
  ctx.fillStyle = "#6b4a32";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 8 * cam.zoom, 4 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwing(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  const cx = b.x + 1.5;
  const cy = b.y + 1.5;
  drawBox(ctx, b.x + 1.15, b.y + 1.15, 0.7, 0.7, 36, cam, "#c9923a", "#8a6424", "#f3ead7");
  const hub = isoToScreen(cx, cy, 40, cam);
  const spin = time * 0.0014 * b.speed;
  for (let i = 0; i < 10; i++) {
    const a = spin + (i / 10) * Math.PI * 2;
    const p = isoToScreen(cx + Math.cos(a) * 1.2, cy + Math.sin(a) * 1.2, 8, cam);
    ctx.strokeStyle = "#e8dcc4";
    ctx.beginPath();
    ctx.moveTo(hub.x, hub.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? "#c24a3a" : "#2a3342";
    ctx.fillRect(p.x - 3 * cam.zoom, p.y, 6 * cam.zoom, 5 * cam.zoom);
  }
}

function drawTeacup(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.2, b.y + 0.2, 2.6, 2.6, 4, cam, "#8a3a32", "#6a2a24", "#c24a3a");
  const spin = time * 0.002 * b.speed;
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * Math.PI * 2;
    const p = isoToScreen(b.x + 1.5 + Math.cos(a) * 0.9, b.y + 1.5 + Math.sin(a) * 0.9, 8, cam);
    ctx.fillStyle = i % 2 ? "#f3ead7" : "#c24a3a";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 7 * cam.zoom, 5 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawJunior(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.2, b.y + 1.4, 1.4, 1.2, 12, cam, "#2a3342", "#141820", "#c24a3a");
  ctx.strokeStyle = "#c24a3a";
  ctx.lineWidth = 2 * cam.zoom;
  ctx.beginPath();
  const pts = [
    [0.4, 1.8, 8],
    [1.2, 0.6, 16],
    [2.6, 0.5, 22],
    [3.4, 1.6, 10],
    [2.4, 3.2, 8],
    [0.8, 3.0, 8],
    [0.4, 1.8, 8],
  ];
  pts.forEach(([x, y, z], i) => {
    const p = isoToScreen(b.x + x, b.y + y, z, cam);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  const t = (time * 0.0005 * b.speed) % 1;
  const i = Math.floor(t * (pts.length - 1));
  const f = t * (pts.length - 1) - i;
  const a = pts[i]!;
  const c = pts[i + 1] ?? a;
  const p = isoToScreen(b.x + a[0]! + (c[0]! - a[0]!) * f, b.y + a[1]! + (c[1]! - a[1]!) * f, a[2]! + (c[2]! - a[2]!) * f, cam);
  ctx.fillStyle = "#f3ead7";
  ctx.fillRect(p.x - 5 * cam.zoom, p.y - 4 * cam.zoom, 10 * cam.zoom, 6 * cam.zoom);
}

function drawCoaster(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  const d = DEF_MAP[b.defId]!;
  drawBox(ctx, b.x + 0.1, b.y + 0.1, d.w - 0.2, d.h - 0.2, 12, cam, "#2a3342", "#141820", "#c24a3a");
  const track = b.track ?? [];
  if (!track.length) return;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e8dcc4";
  ctx.lineWidth = 2.4 * cam.zoom;
  ctx.beginPath();
  track.forEach((n, i) => {
    const p = isoToScreen(n.x + 0.5, n.y + 0.5, 8 + n.z * 10, cam);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.strokeStyle = "#c24a3a";
  ctx.lineWidth = 1.2 * cam.zoom;
  ctx.stroke();
  for (const n of track) {
    const top = isoToScreen(n.x + 0.5, n.y + 0.5, 8 + n.z * 10, cam);
    const bot = isoToScreen(n.x + 0.5, n.y + 0.5, 0, cam);
    ctx.strokeStyle = "rgba(42,51,66,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
  }
  if (b.riders.length || b.open) {
    const pos = followTrack(track, (b.trainT ?? time * 0.0004) * track.length);
    const p = isoToScreen(pos.x, pos.y, 10 + pos.z * 10, cam);
    ctx.fillStyle = "#c24a3a";
    ctx.fillRect(p.x - 7 * cam.zoom, p.y - 5 * cam.zoom, 14 * cam.zoom, 8 * cam.zoom);
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(p.x - 4 * cam.zoom, p.y - 4 * cam.zoom, 8 * cam.zoom, 5 * cam.zoom);
  }
}

function drawFountain(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  drawBox(ctx, b.x + 0.3, b.y + 0.3, 1.4, 1.4, 6, cam, "#3d6b8b", "#2a4a62", "#e8dcc4");
  const p = isoToScreen(b.x + 1, b.y + 1, 12 + Math.abs(Math.sin(time * 0.004)) * 10, cam);
  ctx.fillStyle = "rgba(180,210,220,0.7)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();
}

function drawRide(ctx: CanvasRenderingContext2D, b: Building, cam: Camera, time: number) {
  const d = DEF_MAP[b.defId];
  if (!d) return;
  if (d.kind === "tree") return drawTree(ctx, b.x, b.y, cam, false, time);
  if (d.kind === "pine") return drawTree(ctx, b.x, b.y, cam, true, time);
  if (d.kind === "stall") return drawStall(ctx, b, cam);
  if (d.kind === "carousel") return drawCarousel(ctx, b, cam, time);
  if (d.kind === "ferris") return drawFerris(ctx, b, cam, time);
  if (d.kind === "ship") return drawShip(ctx, b, cam, time);
  if (d.kind === "drop") return drawDrop(ctx, b, cam, time);
  if (d.kind === "bumper") return drawBumper(ctx, b, cam, time);
  if (d.kind === "haunt") return drawHaunt(ctx, b, cam);
  if (d.kind === "flume") return drawFlume(ctx, b, cam, time);
  if (d.kind === "swing") return drawSwing(ctx, b, cam, time);
  if (d.kind === "teacup") return drawTeacup(ctx, b, cam, time);
  if (d.kind === "junior") return drawJunior(ctx, b, cam, time);
  if (d.kind === "coaster") return drawCoaster(ctx, b, cam, time);
  if (d.kind === "fountain") return drawFountain(ctx, b, cam, time);
  if (d.kind === "flower") {
    const p = isoToScreen(b.x + 0.5, b.y + 0.5, 4, cam);
    ctx.fillStyle = "#3f5c45";
    ctx.fillRect(p.x - 6 * cam.zoom, p.y, 12 * cam.zoom, 3 * cam.zoom);
    ctx.fillStyle = "#c24a3a";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4 * cam.zoom, 3 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (d.kind === "lamp") {
    const p = isoToScreen(b.x + 0.5, b.y + 0.5, 0, cam);
    ctx.strokeStyle = "#2a3342";
    ctx.lineWidth = 2 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 22 * cam.zoom);
    ctx.stroke();
    ctx.fillStyle = "#c9923a";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 24 * cam.zoom, 4 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (d.kind === "bench") {
    drawBox(ctx, b.x + 0.15, b.y + 0.35, 0.7, 0.3, 5, cam, "#6b4a32", "#4a3222", "#c4b49a");
    return;
  }
  if (d.kind === "hedge") {
    drawBox(ctx, b.x + 0.15, b.y + 0.15, 0.7, 0.7, 10, cam, "#2f4a36", "#24382a", "#5c7f62");
    return;
  }
  if (d.kind === "bin") {
    drawBox(ctx, b.x + 0.3, b.y + 0.3, 0.4, 0.4, 8, cam, "#2a3342", "#141820", "#5c7f62");
    return;
  }
  if (d.kind === "statue") {
    drawBox(ctx, b.x + 0.3, b.y + 0.3, 0.4, 0.4, 16, cam, "#6b6a62", "#4a4a46", "#c4b49a");
    return;
  }
  drawBox(ctx, b.x, b.y, d.w, d.h, d.height * 0.4, cam, shade(d.color, -20), shade(d.color, -40), d.roof);
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  rot: number,
  shirt: string,
  cam: Camera,
  hat: number,
  time: number,
  flying: boolean,
) {
  const p = isoToScreen(x, y, z, cam);
  const s = cam.zoom;
  ctx.fillStyle = "rgba(20,24,32,0.25)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2 * s, 5 * s, 2.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  if (flying) ctx.rotate(rot);
  const walk = flying ? 0 : Math.sin(time * 0.012 + x * 8);
  ctx.strokeStyle = "#1c2430";
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3 * s, 6 * s + walk);
  ctx.moveTo(0, 0);
  ctx.lineTo(3 * s, 6 * s - walk);
  ctx.stroke();
  ctx.fillStyle = shirt;
  ctx.fillRect(-3.5 * s, -9 * s, 7 * s, 9 * s);
  ctx.fillStyle = "#e8d5c4";
  ctx.beginPath();
  ctx.arc(0, -12 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
  if (hat === 1) {
    ctx.fillStyle = "#141820";
    ctx.fillRect(-4 * s, -16 * s, 8 * s, 2.5 * s);
  } else if (hat === 2) {
    ctx.fillStyle = "#c24a3a";
    ctx.beginPath();
    ctx.arc(0, -15 * s, 3 * s, Math.PI, 0);
    ctx.fill();
  } else if (hat === 3) {
    ctx.fillStyle = "#3d8b6e";
    ctx.fillRect(-3 * s, -17 * s, 6 * s, 3 * s);
  }
  ctx.restore();
}

function drawThought(ctx: CanvasRenderingContext2D, g: Guest, cam: Camera) {
  if (g.thoughtT <= 0 || g.state === "ride") return;
  const p = isoToScreen(g.x, g.y, 18 + g.z, cam);
  ctx.font = `${Math.max(10, 11 * cam.zoom)}px Outfit, sans-serif`;
  const w = Math.min(220, ctx.measureText(g.thought).width + 14);
  ctx.fillStyle = "rgba(243,234,215,0.94)";
  const x = p.x - w / 2;
  const y = p.y - 28;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, 18, 6);
  else ctx.rect(x, y, w, 18);
  ctx.fill();
  ctx.fillStyle = "#141820";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(g.thought, p.x, y + 9, w - 10);
}

function drawStaff(ctx: CanvasRenderingContext2D, s: Staff, cam: Camera, time: number) {
  const color =
    s.job === "mechanic"
      ? "#c9923a"
      : s.job === "janitor" || s.job === "gardener"
        ? "#5c7f62"
        : s.job === "security"
          ? "#2a3342"
          : s.job === "entertainer"
            ? "#e8c84a"
            : "#c24a3a";
  drawPerson(ctx, s.x, s.y, 0, 0, color, cam, s.job === "mascot" || s.job === "entertainer" ? 2 : 1, time, false);
}

function drawHeli(ctx: CanvasRenderingContext2D, park: Park, cam: Camera, time: number) {
  const h = park.helicopter;
  if (!h) return;
  const p = isoToScreen(h.x, h.y, h.z, cam);
  const z = cam.zoom;
  ctx.fillStyle = "#2a3342";
  ctx.fillRect(p.x - 14 * z, p.y - 5 * z, 28 * z, 10 * z);
  ctx.fillStyle = "#c24a3a";
  ctx.fillRect(p.x - 4 * z, p.y - 8 * z, 8 * z, 4 * z);
  ctx.strokeStyle = "#e8dcc4";
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.translate(p.x, p.y - 8 * z);
  ctx.rotate(time * 0.02);
  ctx.beginPath();
  ctx.moveTo(-22 * z, 0);
  ctx.lineTo(22 * z, 0);
  ctx.moveTo(0, -22 * z);
  ctx.lineTo(0, 22 * z);
  ctx.stroke();
  ctx.restore();
}

export function renderPark(
  ctx: CanvasRenderingContext2D,
  park: Park,
  cam: Camera,
  time: number,
  hover: { x: number; y: number } | null,
  ghost: { x: number; y: number; w: number; h: number; ok: boolean } | null,
  selectedId: string | null,
) {
  const w = ctx.canvas.clientWidth;
  const h = ctx.canvas.clientHeight;
  const sky = park.biome === "forest" ? "#8aa4b0" : "#c9b89a";
  const ground = park.biome === "forest" ? "#2a4030" : "#5a4a32";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky);
  g.addColorStop(0.42, park.biome === "forest" ? "#6b8a74" : "#b89a6a");
  g.addColorStop(1, ground);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const shake = park.trauma * park.trauma * 10;
  if (shake > 0.2) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  const margin = 80;
  for (let d = 0; d < park.w + park.h; d++) {
    for (let x = 0; x < park.w; x++) {
      const y = d - x;
      if (y < 0 || y >= park.h) continue;
      const p = isoToScreen(x, y, 0, cam);
      if (p.x < -margin || p.y < -margin || p.x > w + margin || p.y > h + margin) continue;
      drawTile(ctx, park, x, y, cam, time);
    }
  }

  if (hover && hover.x >= 0) {
    drawDiamond(ctx, hover.x, hover.y, 1, cam, "rgba(243,234,215,0.28)", "rgba(243,234,215,0.8)");
  }
  if (ghost) {
    for (let j = 0; j < ghost.h; j++) {
      for (let i = 0; i < ghost.w; i++) {
        drawDiamond(
          ctx,
          ghost.x + i,
          ghost.y + j,
          1.5,
          cam,
          ghost.ok ? "rgba(61,139,110,0.35)" : "rgba(194,74,58,0.4)",
          ghost.ok ? "#3d8b6e" : "#c24a3a",
        );
      }
    }
  }

  const objs: { k: number; draw: () => void }[] = [];
  for (const b of park.buildings) {
    const d = DEF_MAP[b.defId];
    if (!d) continue;
    objs.push({
      k: b.x + d.w / 2 + b.y + d.h / 2,
      draw: () => {
        drawRide(ctx, b, cam, time);
        if (selectedId === b.id) {
          drawDiamond(ctx, b.x, b.y, 2, cam, "rgba(243,234,215,0.0)", "#f3ead7");
        }
        if (b.broken) {
          const p = isoToScreen(b.x + d.w / 2, b.y + d.h / 2, d.height, cam);
          ctx.fillStyle = "#c9923a";
          ctx.font = `600 ${12 * cam.zoom}px Outfit, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("BROKEN", p.x, p.y);
        }
      },
    });
  }
  for (const g of park.guests) {
    if (g.state === "ride") continue;
    objs.push({
      k: g.x + g.y,
      draw: () => {
        drawPerson(ctx, g.x, g.y, g.z, g.rot, g.shirt, cam, g.hat, time, g.state === "flying");
        if (selectedId === g.id || g.thoughtT > 0) drawThought(ctx, g, cam);
      },
    });
  }
  for (const s of park.staff) {
    objs.push({
      k: s.x + s.y,
      draw: () => drawStaff(ctx, s, cam, time),
    });
  }
  objs.sort((a, b) => a.k - b.k);
  for (const o of objs) o.draw();

  drawHeli(ctx, park, cam, time);

  for (const p of park.particles) {
    const s = isoToScreen(p.x, p.y, Math.max(0, p.z), cam);
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.kind === "text" && p.text) {
      ctx.fillStyle = p.color;
      ctx.font = `600 ${12 * cam.zoom}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(p.text, s.x, s.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * cam.zoom * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const gate = isoToScreen(park.entranceX + 0.5, park.entranceY + 0.5, 18, cam);
  ctx.fillStyle = "#141820";
  ctx.font = `600 ${13 * cam.zoom}px Fraunces, serif`;
  ctx.textAlign = "center";
  ctx.fillText("GATE", gate.x, gate.y - 18 * cam.zoom);
  drawBox(ctx, park.entranceX - 0.2, park.entranceY, 1.4, 0.4, 14, cam, "#2a3342", "#141820", "#c24a3a");

  if (shake > 0.2) ctx.restore();
}

export function centerCamera(park: Park, viewW: number, viewH: number): Camera {
  const p = isoToScreen(park.entranceX, park.entranceY - 6, 0, { x: 0, y: 0, zoom: 1 });
  return { x: viewW / 2 - p.x, y: viewH / 2 - p.y + 40, zoom: 1.05 };
}
