import * as THREE from "three";

const mats = new Map<string, THREE.MeshLambertMaterial>();

export function mat(color: string, opts?: { flat?: boolean; transparent?: boolean; opacity?: number }) {
  const key = `${color}|${opts?.flat ? 1 : 0}|${opts?.opacity ?? 1}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: opts?.flat ?? true,
      transparent: opts?.transparent ?? (opts?.opacity != null && opts.opacity < 1),
      opacity: opts?.opacity ?? 1,
    });
    mats.set(key, m);
  }
  return m;
}

function mesh(
  geo: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const o = new THREE.Mesh(geo, mat(color));
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r: number, seg = 8) => new THREE.SphereGeometry(r, seg, seg);
const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);

function pad(g: THREE.Group, w: number, d: number, color = "#3a342c") {
  g.add(mesh(box(w * 0.98, 0.12, d * 0.98), color, 0, 0.06, 0));
}

function posts(g: THREE.Group, radius: number, n: number, color = "#c4b49a") {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.add(mesh(cyl(0.035, 0.04, 0.55, 5), color, Math.cos(a) * radius, 0.34, Math.sin(a) * radius));
  }
  g.add(mesh(new THREE.TorusGeometry(radius, 0.03, 5, n), color, 0, 0.58, 0, Math.PI / 2, 0, 0));
}

function addHorse(parent: THREE.Object3D, color: string, x: number, y: number, z: number, yaw: number) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = yaw;
  h.add(mesh(box(0.36, 0.18, 0.16), color, 0, 0.28, 0));
  h.add(mesh(box(0.12, 0.16, 0.12), color, 0.18, 0.4, 0));
  h.add(mesh(box(0.16, 0.12, 0.12), color, 0.28, 0.46, 0));
  h.add(mesh(box(0.05, 0.06, 0.05), "#2a3342", 0.34, 0.44, 0.04));
  h.add(mesh(box(0.05, 0.06, 0.05), "#2a3342", 0.34, 0.44, -0.04));
  h.add(mesh(box(0.08, 0.1, 0.04), "#4a3222", -0.2, 0.3, 0));
  for (const [lx, lz] of [
    [0.12, 0.06],
    [0.12, -0.06],
    [-0.12, 0.06],
    [-0.12, -0.06],
  ] as const) {
    h.add(mesh(box(0.05, 0.22, 0.05), "#4a3222", lx, 0.11, lz));
  }
  parent.add(h);
}

function addBug(parent: THREE.Object3D, color: string, x: number, y: number, z: number, yaw: number) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = yaw;
  c.add(mesh(box(0.46, 0.14, 0.3), color, 0, 0.14, 0));
  c.add(mesh(box(0.22, 0.12, 0.26), "#e8dcc4", -0.04, 0.26, 0));
  c.add(mesh(box(0.08, 0.06, 0.22), "#2a3342", 0.18, 0.16, 0));
  for (const [wx, wz] of [
    [0.14, 0.16],
    [0.14, -0.16],
    [-0.16, 0.16],
    [-0.16, -0.16],
  ] as const) {
    c.add(mesh(cyl(0.07, 0.07, 0.06, 8), "#141820", wx, 0.07, wz, Math.PI / 2, 0, 0));
  }
  parent.add(c);
}

export function makeBuilding(kind: string, w: number, d: number, color: string, roof: string, defId = ""): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case "carousel":
      buildCarousel(g, color, roof);
      break;
    case "ferris":
      buildFerris(g, color, roof);
      break;
    case "ship":
      buildShip(g, w, d, color, roof);
      break;
    case "drop":
      buildDrop(g, color, roof);
      break;
    case "bumper":
      buildBumper(g, color, roof);
      break;
    case "haunt":
      buildHaunt(g, color, roof);
      break;
    case "flume":
      buildFlume(g, w, d, color, roof);
      break;
    case "swing":
      buildSwing(g, color, roof);
      break;
    case "teacup":
      buildTeacup(g, color, roof);
      break;
    case "junior":
      buildJunior(g, color, roof);
      break;
    case "coaster":
      buildStation(g, w, d, color, roof);
      break;
    case "stall":
      buildStall(g, w, d, color, roof, defId);
      break;
    case "tree":
      buildOak(g);
      break;
    case "pine":
      buildPine(g);
      break;
    case "flower":
      buildFlower(g, color);
      break;
    case "lamp":
      buildLamp(g);
      break;
    case "bench":
      buildBench(g);
      break;
    case "hedge":
      g.add(mesh(box(0.85, 0.85, 0.85), "#3f5c45", 0, 0.42, 0));
      g.add(mesh(box(0.92, 0.14, 0.92), "#5c7f62", 0, 0.88, 0));
      break;
    case "bin":
      g.add(mesh(cyl(0.16, 0.18, 0.5, 8), "#2a3342", 0, 0.26, 0));
      g.add(mesh(cyl(0.18, 0.18, 0.06, 8), "#5c7f62", 0, 0.54, 0));
      g.add(mesh(box(0.12, 0.08, 0.04), "#c9923a", 0.12, 0.34, 0.12));
      break;
    case "fountain":
      buildFountain(g);
      break;
    case "statue":
      g.add(mesh(box(0.55, 0.22, 0.55), "#6b6a62", 0, 0.11, 0));
      g.add(mesh(cyl(0.13, 0.16, 0.85, 8), "#8a8880", 0, 0.62, 0));
      g.add(mesh(sph(0.18), "#c4b49a", 0, 1.16, 0));
      g.add(mesh(box(0.42, 0.08, 0.12), "#c9923a", 0, 0.72, 0.18));
      break;
    case "bandstand":
      g.add(mesh(cyl(0.95, 0.95, 0.14, 12), color, 0, 0.08, 0));
      g.add(mesh(cyl(0.08, 0.08, 1.4, 6), roof, 0.55, 0.8, 0.55));
      g.add(mesh(cyl(0.08, 0.08, 1.4, 6), roof, -0.55, 0.8, 0.55));
      g.add(mesh(cyl(0.08, 0.08, 1.4, 6), roof, 0.55, 0.8, -0.55));
      g.add(mesh(cyl(0.08, 0.08, 1.4, 6), roof, -0.55, 0.8, -0.55));
      g.add(mesh(cone(1.15, 0.35, 10), roof, 0, 1.7, 0));
      g.add(mesh(box(0.12, 0.45, 0.08), "#e8dcc4", 0, 0.7, 0.2));
      g.add(mesh(cyl(0.14, 0.16, 0.18, 8), color, 0.22, 0.55, -0.1));
      break;
    default:
      g.add(mesh(box(w * 0.85, 1.1, d * 0.85), color, 0, 0.55, 0));
      g.add(mesh(box(w * 0.95, 0.16, d * 0.95), roof, 0, 1.18, 0));
  }
  return g;
}

function buildCarousel(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3);
  g.add(mesh(cyl(1.38, 1.42, 0.28, 18), "#6b4a32", 0, 0.22, 0));
  g.add(mesh(cyl(1.32, 1.32, 0.06, 18), "#c9923a", 0, 0.38, 0));
  g.add(mesh(cyl(0.14, 0.16, 2.05, 8), roof, 0, 1.35, 0));
  g.add(mesh(cone(1.48, 0.85, 14), color, 0, 2.45, 0));
  g.add(mesh(cyl(0.22, 0.22, 0.1, 10), roof, 0, 2.9, 0));
  g.add(mesh(sph(0.1, 8), "#c9923a", 0, 3.05, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(mesh(sph(0.07, 6), i % 2 ? roof : "#c9923a", Math.cos(a) * 1.15, 2.15, Math.sin(a) * 1.15));
  }
  const ride = new THREE.Group();
  ride.name = "spin";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.95;
    const z = Math.sin(a) * 0.95;
    ride.add(mesh(cyl(0.035, 0.035, 1.35, 6), "#e8dcc4", x, 1.05, z));
    addHorse(ride, i % 2 ? color : roof, x, 0.38, z, a + Math.PI / 2);
  }
  g.add(ride);
}

function buildFerris(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3, "#2a3342");
  const leg = mesh(box(0.16, 3.1, 0.16), "#2a3342", -0.7, 1.55, 0);
  leg.rotation.z = 0.32;
  g.add(leg);
  const leg2 = mesh(box(0.16, 3.1, 0.16), "#2a3342", 0.7, 1.55, 0);
  leg2.rotation.z = -0.32;
  g.add(leg2);
  g.add(mesh(box(1.7, 0.22, 0.4), "#141820", 0, 0.14, 0));
  g.add(mesh(box(0.35, 0.35, 0.35), color, 0, 2.55, 0));
  const wheel = new THREE.Group();
  wheel.name = "spinZ";
  wheel.position.y = 2.55;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.06, 8, 28), mat(roof));
  torus.castShadow = true;
  wheel.add(torus);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 6, 22), mat(color)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wheel.add(mesh(box(0.045, 3.1, 0.045), color, 0, 0, 0, 0, 0, a));
    const gondola = new THREE.Group();
    gondola.name = "hang";
    gondola.position.set(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0);
    gondola.add(mesh(box(0.08, 0.18, 0.08), "#2a3342", 0, -0.08, 0));
    gondola.add(mesh(box(0.34, 0.28, 0.28), i % 2 ? color : "#3d8b6e", 0, -0.28, 0));
    gondola.add(mesh(box(0.36, 0.05, 0.3), roof, 0, -0.12, 0));
    gondola.add(mesh(box(0.3, 0.12, 0.02), "#8ec4d4", 0, -0.24, 0.14));
    wheel.add(gondola);
  }
  g.add(wheel);
}

function buildShip(g: THREE.Group, w: number, d: number, color: string, roof: string) {
  pad(g, w, d);
  g.add(mesh(box(0.18, 2.2, 0.18), "#2a3342", -w * 0.34, 1.15, 0));
  g.add(mesh(box(0.18, 2.2, 0.18), "#2a3342", w * 0.34, 1.15, 0));
  g.add(mesh(box(w * 0.78, 0.14, 0.14), "#141820", 0, 2.2, 0));
  const boom = new THREE.Group();
  boom.name = "swing";
  boom.position.y = 2.2;
  boom.add(mesh(box(0.06, 1.15, 0.06), "#2a3342", -0.7, -0.55, 0));
  boom.add(mesh(box(0.06, 1.15, 0.06), "#2a3342", 0.7, -0.55, 0));
  const hull = new THREE.Group();
  hull.position.y = -1.15;
  hull.add(mesh(box(2.2, 0.42, 0.78), color, 0, 0, 0));
  hull.add(mesh(cone(0.42, 0.7, 4), color, 1.25, 0, 0, 0, 0, -Math.PI / 2));
  hull.add(mesh(cone(0.38, 0.5, 4), color, -1.2, 0, 0, 0, 0, Math.PI / 2));
  hull.add(mesh(box(1.6, 0.22, 0.55), "#4a3222", 0, 0.28, 0));
  hull.add(mesh(box(0.1, 1.15, 0.1), roof, 0.15, 0.85, 0));
  hull.add(mesh(box(0.7, 0.45, 0.04), "#f3ead7", 0.15, 1.2, 0));
  boom.add(hull);
  g.add(boom);
}

function buildDrop(g: THREE.Group, color: string, roof: string) {
  pad(g, 2, 2, "#2a3342");
  g.add(mesh(box(1.1, 0.28, 1.1), color, 0, 0.2, 0));
  g.add(mesh(box(0.22, 5.4, 0.22), "#2a3342", 0, 2.85, 0));
  g.add(mesh(box(0.08, 5.2, 0.08), "#5c5c58", 0.18, 2.75, 0.18));
  g.add(mesh(box(0.08, 5.2, 0.08), "#5c5c58", -0.18, 2.75, 0.18));
  g.add(mesh(box(0.08, 5.2, 0.08), "#5c5c58", 0.18, 2.75, -0.18));
  g.add(mesh(box(0.08, 5.2, 0.08), "#5c5c58", -0.18, 2.75, -0.18));
  g.add(mesh(box(0.55, 0.2, 0.55), roof, 0, 5.6, 0));
  g.add(mesh(cyl(0.08, 0.08, 0.35, 6), "#c24a3a", 0, 5.85, 0));
  const car = new THREE.Group();
  car.name = "drop";
  car.add(mesh(box(1.05, 0.42, 1.05), roof, 0, 0, 0));
  car.add(mesh(box(1.1, 0.08, 1.1), "#141820", 0, 0.22, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    car.add(mesh(box(0.2, 0.22, 0.2), "#c24a3a", Math.cos(a) * 0.32, 0.28, Math.sin(a) * 0.32));
    car.add(mesh(sph(0.08, 6), "#e8d5c4", Math.cos(a) * 0.32, 0.48, Math.sin(a) * 0.32));
  }
  car.position.y = 1.4;
  g.add(car);
}

function buildBumper(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3);
  g.add(mesh(cyl(1.42, 1.42, 0.2, 18), color, 0, 0.16, 0));
  g.add(mesh(cyl(1.28, 1.28, 0.04, 16), "#2a3342", 0, 0.27, 0));
  g.add(mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 22), "#2a3342", 0, 0.32, 0, Math.PI / 2, 0, 0));
  g.add(mesh(cyl(0.22, 0.28, 0.7, 8), roof, 0, 0.55, 0));
  g.add(mesh(cone(0.55, 0.28, 8), color, 0, 1.02, 0));
  posts(g, 1.48, 10, "#c4b49a");
  const cars = new THREE.Group();
  cars.name = "spin";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addBug(cars, i % 2 ? roof : "#c24a3a", Math.cos(a) * 0.82, 0.28, Math.sin(a) * 0.82, a + Math.PI / 2);
  }
  g.add(cars);
}

function buildHaunt(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3, "#1a1e26");
  g.add(mesh(box(2.4, 1.7, 2.1), color, 0, 0.95, 0));
  g.add(mesh(box(0.55, 1.05, 0.16), "#6b4a32", 0, 0.55, 1.12));
  g.add(mesh(box(0.22, 0.35, 0.04), "#c9923a", 0.12, 0.55, 1.2));
  g.add(mesh(box(0.32, 0.38, 0.06), "#141820", -0.65, 1.25, 1.08));
  g.add(mesh(box(0.32, 0.38, 0.06), "#141820", 0.65, 1.25, 1.08));
  g.add(mesh(box(0.18, 0.22, 0.04), "#c9923a", -0.65, 1.25, 1.12));
  g.add(mesh(box(0.18, 0.22, 0.04), "#c9923a", 0.65, 1.25, 1.12));
  const peak = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.15, 4), mat("#141820"));
  peak.position.set(0, 2.35, 0);
  peak.rotation.y = Math.PI / 4;
  peak.castShadow = true;
  g.add(peak);
  g.add(mesh(box(2.6, 0.12, 2.3), roof, 0, 1.82, 0));
  g.add(mesh(cyl(0.14, 0.18, 0.85, 6), "#2a3342", 0.75, 2.2, -0.45));
  g.add(mesh(box(0.28, 0.12, 0.28), "#141820", 0.75, 2.66, -0.45));
  g.add(mesh(box(0.5, 0.55, 0.5), color, -0.85, 2.05, 0.35));
  g.add(mesh(cone(0.4, 0.5, 4), "#141820", -0.85, 2.55, 0.35, 0, Math.PI / 4, 0));
  g.add(mesh(box(0.08, 0.7, 0.08), "#c24a3a", 0.2, 2.85, 0.2));
}

function buildFlume(g: THREE.Group, w: number, d: number, color: string, roof: string) {
  pad(g, w, d);
  g.add(mesh(box(w * 0.92, 0.28, d * 0.55), color, 0, 0.28, 0));
  g.add(mesh(box(w * 0.82, 0.16, d * 0.32), "#3d8baf", 0, 0.46, 0));
  g.add(mesh(box(0.08, 0.22, d * 0.32), "#e8dcc4", -w * 0.38, 0.55, 0));
  g.add(mesh(box(0.08, 0.22, d * 0.32), "#e8dcc4", w * 0.38, 0.55, 0));
  g.add(mesh(box(1.15, 1.05, 1.1), roof, -w * 0.28, 0.75, d * 0.18));
  g.add(mesh(box(1.28, 0.12, 1.22), "#2a3342", -w * 0.28, 1.32, d * 0.18));
  g.add(mesh(cone(0.18, 0.35, 6), "#c24a3a", -w * 0.28, 1.55, d * 0.18));
  const lift = mesh(box(0.35, 1.6, 0.35), "#2a3342", w * 0.28, 1.0, -d * 0.12);
  g.add(lift);
  g.add(mesh(box(0.9, 0.12, 0.18), color, w * 0.12, 1.7, -d * 0.12));
  const log = new THREE.Group();
  log.name = "log";
  log.add(mesh(cyl(0.18, 0.18, 0.85, 8), "#6b4a32", 0, 0, 0, 0, 0, Math.PI / 2));
  log.add(mesh(cyl(0.2, 0.2, 0.08, 8), "#4a3222", 0.4, 0, 0, 0, 0, Math.PI / 2));
  log.add(mesh(cyl(0.2, 0.2, 0.08, 8), "#4a3222", -0.4, 0, 0, 0, 0, Math.PI / 2));
  log.add(mesh(sph(0.08, 6), "#e8d5c4", 0.1, 0.2, 0.08));
  log.position.set(w * 0.1, 0.55, 0);
  g.add(log);
}

function buildSwing(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3);
  g.add(mesh(cyl(0.2, 0.28, 3.1, 10), color, 0, 1.6, 0));
  g.add(mesh(cyl(1.05, 1.05, 0.1, 14), roof, 0, 3.15, 0));
  g.add(mesh(cone(0.28, 0.35, 8), roof, 0, 3.4, 0));
  const ride = new THREE.Group();
  ride.name = "spin";
  ride.position.y = 3.1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.y = a;
    arm.add(mesh(box(0.045, 0.045, 1.15), "#e8dcc4", 0, -0.04, 0.55));
    arm.add(mesh(box(0.02, 1.55, 0.02), "#2a3342", 0, -0.85, 1.05));
    arm.add(mesh(box(0.26, 0.18, 0.2), i % 2 ? roof : "#2a3342", 0, -1.65, 1.05));
    arm.add(mesh(sph(0.07, 6), "#e8d5c4", 0, -1.48, 1.05));
    ride.add(arm);
  }
  g.add(ride);
}

function buildTeacup(g: THREE.Group, color: string, roof: string) {
  pad(g, 3, 3);
  g.add(mesh(cyl(1.38, 1.38, 0.22, 18), color, 0, 0.16, 0));
  g.add(mesh(cyl(1.22, 1.22, 0.05, 16), "#e8dcc4", 0, 0.28, 0));
  g.add(mesh(cyl(0.16, 0.2, 0.45, 8), roof, 0, 0.45, 0));
  const ride = new THREE.Group();
  ride.name = "spin";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.82;
    const z = Math.sin(a) * 0.82;
    const cupC = i % 2 ? roof : color;
    ride.add(mesh(cyl(0.32, 0.22, 0.28, 12), cupC, x, 0.4, z));
    ride.add(mesh(cyl(0.34, 0.34, 0.05, 12), "#f3ead7", x, 0.55, z));
    ride.add(mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 10, Math.PI), cupC, x + 0.34, 0.42, z, 0, 0, Math.PI / 2));
    ride.add(mesh(sph(0.08, 6), "#e8d5c4", x, 0.58, z));
  }
  g.add(ride);
}

function buildJunior(g: THREE.Group, color: string, roof: string) {
  pad(g, 4, 4);
  buildStation(g, 1.8, 1.5, color, roof);
  const track = new THREE.Group();
  const pts = [
    new THREE.Vector3(-0.4, 0.55, 0.15),
    new THREE.Vector3(0.7, 1.35, -1.1),
    new THREE.Vector3(1.7, 1.9, -0.35),
    new THREE.Vector3(1.85, 0.85, 1.0),
    new THREE.Vector3(0.5, 0.55, 1.55),
    new THREE.Vector3(-0.85, 0.7, 0.7),
    new THREE.Vector3(-0.4, 0.55, 0.15),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.05, 6, true), mat(color));
  tube.castShadow = true;
  track.add(tube);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.025, 5, true), mat("#e8dcc4"));
  rail.position.y = 0.05;
  track.add(rail);
  const car = mesh(box(0.34, 0.18, 0.22), roof, 0, 0, 0);
  car.name = "train";
  track.add(car);
  g.add(track);
  g.userData.juniorCurve = curve;
}

function buildStation(g: THREE.Group, w: number, d: number, color: string, roof: string) {
  g.add(mesh(box(Math.max(w * 0.75, 1.55), 0.18, Math.max(d * 0.8, 1.15)), "#4a4038", 0, 0.16, 0));
  g.add(mesh(box(Math.max(w * 0.7, 1.4), 0.95, Math.max(d * 0.65, 0.95)), color, 0, 0.7, 0));
  g.add(mesh(box(Math.max(w * 0.88, 1.7), 0.12, Math.max(d * 0.88, 1.2)), roof, 0, 1.22, 0));
  g.add(mesh(cyl(0.06, 0.06, 0.7, 6), "#f3ead7", -0.55, 1.55, -0.28));
  g.add(mesh(box(0.42, 0.22, 0.08), "#c24a3a", -0.55, 1.92, -0.28));
  g.add(mesh(box(0.55, 0.22, 0.28), roof, 0.45, 0.38, 0.55));
  g.add(mesh(box(0.4, 0.16, 0.22), "#2a3342", 0.45, 0.55, 0.55));
}

function kiosk(g: THREE.Group, w: number, d: number, color: string, roof: string, body = "#e8dcc4") {
  const bw = Math.max(0.95, w * 0.88);
  const bd = Math.max(0.85, d * 0.88);
  g.add(mesh(box(bw, 1.05, bd * 0.72), body, 0, 0.58, -bd * 0.08));
  g.add(mesh(box(bw + 0.12, 0.1, bd * 0.95), roof, 0, 1.22, 0));
  g.add(mesh(box(bw + 0.1, 0.1, bd * 0.95), color, 0, 1.12, 0));
  g.add(mesh(box(bw + 0.18, 0.07, 0.62), color, 0, 1.18, bd * 0.32, -0.4, 0, 0));
  g.add(mesh(box(bw * 0.92, 0.14, 0.32), "#6b4a32", 0, 0.62, bd * 0.32));
  g.add(mesh(cyl(0.045, 0.045, 1.15, 6), "#6b4a32", bw * 0.42, 0.62, bd * 0.28));
  g.add(mesh(cyl(0.045, 0.045, 1.15, 6), "#6b4a32", -bw * 0.42, 0.62, bd * 0.28));
  return { bw, bd };
}

function roofPole(g: THREE.Group, y = 1.55) {
  g.add(mesh(cyl(0.04, 0.04, 0.55, 6), "#6b4a32", 0, y, 0));
}

function buildStall(g: THREE.Group, w: number, d: number, color: string, roof: string, id: string) {
  if (id === "restroom") {
    buildRestroom(g, w, d, color, roof);
    return;
  }
  if (id === "first-aid") {
    buildAid(g, w, d, color, roof);
    return;
  }
  kiosk(g, w, d, color, roof);
  const z = Math.max(0.85, d * 0.88) * 0.28;
  switch (id) {
    case "dog-cart": {
      roofPole(g);
      g.add(mesh(cyl(0.08, 0.08, 0.55, 8), "#6b4a32", 0, 1.55, z));
      g.add(mesh(cyl(0.1, 0.1, 0.55, 8), "#f3ead7", 0, 1.55, z, 0, 0, Math.PI / 2));
      g.add(mesh(sph(0.09, 6), "#c24a3a", 0.28, 1.55, z));
      g.add(mesh(cone(0.55, 0.18, 10), color, 0, 1.85, 0));
      g.add(mesh(cyl(0.07, 0.07, 0.2, 8), "#c9923a", -0.18, 0.78, z));
      break;
    }
    case "soda-fizz": {
      g.add(mesh(cyl(0.16, 0.18, 0.45, 10), color, 0, 1.55, 0));
      g.add(mesh(cyl(0.18, 0.18, 0.08, 10), "#f3ead7", 0, 1.8, 0));
      g.add(mesh(cyl(0.025, 0.025, 0.45, 5), "#e8dcc4", 0.08, 2.05, 0));
      g.add(mesh(sph(0.07, 6), "#8ec4d4", 0.08, 2.28, 0));
      g.add(mesh(cyl(0.06, 0.06, 0.18, 8), "#3d6b8b", -0.16, 0.78, z));
      g.add(mesh(cyl(0.06, 0.06, 0.18, 8), "#c24a3a", 0.16, 0.78, z));
      break;
    }
    case "candy-floss": {
      roofPole(g);
      g.add(mesh(sph(0.32, 8), "#e8a0b4", 0, 1.85, 0));
      g.add(mesh(sph(0.22, 8), "#f3ead7", 0.12, 2.0, 0.08));
      g.add(mesh(cyl(0.025, 0.025, 0.55, 5), "#e8dcc4", 0, 1.45, 0));
      g.add(mesh(sph(0.12, 6), "#e8a0b4", 0.2, 0.82, z));
      break;
    }
    case "scoop-shop": {
      g.add(mesh(cone(0.22, 0.45, 8), "#c9923a", 0, 1.55, 0));
      g.add(mesh(sph(0.2, 8), "#f3ead7", 0, 1.88, 0));
      g.add(mesh(sph(0.16, 8), "#c24a3a", 0.08, 2.08, 0.04));
      g.add(mesh(sph(0.12, 8), "#3d8b6e", -0.06, 2.12, -0.04));
      g.add(mesh(cyl(0.08, 0.08, 0.16, 8), "#f3ead7", -0.18, 0.78, z));
      break;
    }
    case "pizza-slice": {
      g.add(mesh(cyl(0.42, 0.42, 0.08, 10), "#c9923a", 0, 1.55, 0));
      g.add(mesh(cyl(0.34, 0.34, 0.05, 10), "#e8dcc4", 0, 1.6, 0));
      g.add(mesh(sph(0.05, 5), "#c24a3a", 0.12, 1.66, 0.08));
      g.add(mesh(sph(0.05, 5), "#c24a3a", -0.1, 1.66, -0.06));
      g.add(mesh(sph(0.05, 5), "#3f5c45", 0.02, 1.66, -0.14));
      g.add(mesh(box(0.22, 0.05, 0.18), "#c9923a", 0.16, 0.76, z));
      break;
    }
    case "balloon-box": {
      const cols = ["#c24a3a", "#3d8b6e", "#c9923a", "#3d6b8b"];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const bx = Math.cos(a) * 0.22;
        const bz = Math.sin(a) * 0.22;
        g.add(mesh(cyl(0.01, 0.01, 0.7, 4), "#e8dcc4", bx, 1.55, bz));
        g.add(mesh(sph(0.14, 8), cols[i]!, bx, 2.0, bz));
      }
      g.add(mesh(sph(0.1, 6), "#c24a3a", 0.18, 0.82, z));
      break;
    }
    case "souvenir-hut": {
      g.add(mesh(box(0.7, 0.35, 0.08), color, 0, 1.55, 0));
      g.add(mesh(box(0.55, 0.12, 0.06), roof, 0, 1.78, 0));
      g.add(mesh(box(0.12, 0.18, 0.08), "#c9923a", -0.18, 0.82, z));
      g.add(mesh(box(0.1, 0.14, 0.06), "#3d8b6e", 0.16, 0.8, z));
      break;
    }
    case "park-map": {
      g.add(mesh(box(0.55, 0.7, 0.06), "#e8dcc4", 0, 1.55, 0));
      g.add(mesh(box(0.42, 0.5, 0.04), "#3d8b6e", 0, 1.55, 0.03));
      g.add(mesh(box(0.08, 0.08, 0.04), "#c24a3a", 0.08, 1.62, 0.05));
      break;
    }
    case "flash-hut": {
      g.add(mesh(box(0.55, 0.28, 0.22), "#2a3342", 0, 1.5, 0));
      g.add(mesh(cyl(0.1, 0.1, 0.16, 8), "#e8dcc4", 0.18, 1.62, 0.12));
      g.add(mesh(sph(0.08, 6), "#c9923a", 0.18, 1.72, 0.12));
      break;
    }
    case "brolly-cart": {
      g.add(mesh(cone(0.42, 0.16, 10), "#3d6b8b", 0, 1.85, 0));
      g.add(mesh(cyl(0.02, 0.02, 0.7, 5), "#2a3342", 0, 1.45, 0));
      g.add(mesh(cone(0.22, 0.1, 8), "#c24a3a", 0.22, 1.55, 0.1));
      break;
    }
    default: {
      g.add(mesh(cyl(0.12, 0.12, 0.28, 8), color, 0, 1.5, 0));
      g.add(mesh(sph(0.12, 6), roof, 0.16, 0.8, z));
    }
  }
}

function buildRestroom(g: THREE.Group, w: number, d: number, color: string, roof: string) {
  g.add(mesh(box(Math.max(1.7, w * 0.9), 1.25, Math.max(0.85, d * 0.8)), color, 0, 0.7, 0));
  g.add(mesh(box(Math.max(1.85, w * 0.98), 0.12, Math.max(0.95, d * 0.9)), roof, 0, 1.36, 0));
  g.add(mesh(box(0.42, 0.85, 0.08), "#6b4a32", -0.4, 0.5, 0.44));
  g.add(mesh(box(0.42, 0.85, 0.08), "#6b4a32", 0.4, 0.5, 0.44));
  g.add(mesh(box(0.08, 0.12, 0.04), "#c9923a", -0.28, 0.55, 0.5));
  g.add(mesh(box(0.08, 0.12, 0.04), "#c9923a", 0.52, 0.55, 0.5));
  g.add(mesh(cyl(0.08, 0.1, 0.45, 6), "#2a3342", 0.7, 1.55, -0.1));
  g.add(mesh(box(0.5, 0.28, 0.06), "#3d6b8b", 0, 1.58, 0.2));
  g.add(mesh(cyl(0.12, 0.1, 0.16, 8), "#e8dcc4", 0, 1.82, 0.2));
}

function buildAid(g: THREE.Group, _w: number, _d: number, color: string, roof: string) {
  g.add(mesh(box(1.7, 1.0, 1.5), roof, 0, 0.58, 0));
  const r1 = mesh(box(1.9, 0.08, 1.05), color, 0, 1.28, 0.32, 0.55, 0, 0);
  const r2 = mesh(box(1.9, 0.08, 1.05), color, 0, 1.28, -0.32, -0.55, 0, 0);
  g.add(r1, r2);
  g.add(mesh(box(0.12, 0.55, 0.06), color, 0, 0.75, 0.78));
  g.add(mesh(box(0.4, 0.14, 0.06), color, 0, 0.75, 0.78));
  g.add(mesh(box(0.45, 0.7, 0.08), "#6b4a32", 0, 0.42, 0.78));
}

function buildOak(g: THREE.Group) {
  g.add(mesh(cyl(0.12, 0.16, 1.15, 6), "#6b4a32", 0, 0.55, 0));
  g.add(mesh(sph(0.62, 7), "#3f5c45", -0.18, 1.35, 0.08));
  g.add(mesh(sph(0.52, 7), "#5c7f62", 0.25, 1.42, -0.12));
  g.add(mesh(sph(0.44, 7), "#4a6e52", 0.05, 1.78, 0.14));
  g.add(mesh(sph(0.32, 6), "#3f5c45", -0.22, 1.7, -0.16));
}

function buildPine(g: THREE.Group) {
  g.add(mesh(cyl(0.09, 0.12, 0.85, 6), "#5a4030", 0, 0.42, 0));
  g.add(mesh(cone(0.62, 0.85, 8), "#2f4a36", 0, 1.0, 0));
  g.add(mesh(cone(0.48, 0.75, 8), "#3f5c45", 0, 1.5, 0));
  g.add(mesh(cone(0.32, 0.65, 8), "#2f4a36", 0, 1.95, 0));
}

function buildFlower(g: THREE.Group, color: string) {
  g.add(mesh(box(0.78, 0.1, 0.78), "#3f5c45", 0, 0.05, 0));
  g.add(mesh(cyl(0.02, 0.02, 0.28, 4), "#5c7f62", -0.16, 0.22, 0.1));
  g.add(mesh(sph(0.11, 6), color, -0.16, 0.38, 0.1));
  g.add(mesh(cyl(0.02, 0.02, 0.24, 4), "#5c7f62", 0.18, 0.2, -0.12));
  g.add(mesh(sph(0.1, 6), "#c9923a", 0.18, 0.34, -0.12));
  g.add(mesh(cyl(0.02, 0.02, 0.3, 4), "#5c7f62", 0.05, 0.24, 0.18));
  g.add(mesh(sph(0.09, 6), "#f3ead7", 0.05, 0.4, 0.18));
}

function buildLamp(g: THREE.Group) {
  g.add(mesh(cyl(0.07, 0.09, 0.16, 6), "#2a3342", 0, 0.08, 0));
  g.add(mesh(cyl(0.05, 0.055, 1.55, 6), "#2a3342", 0, 0.88, 0));
  g.add(mesh(sph(0.16, 8), "#c9923a", 0, 1.72, 0));
  g.add(mesh(cyl(0.2, 0.12, 0.1, 8), "#141820", 0, 1.86, 0));
}

function buildBench(g: THREE.Group) {
  g.add(mesh(box(0.82, 0.08, 0.26), "#c4b49a", 0, 0.32, 0));
  g.add(mesh(box(0.82, 0.28, 0.07), "#6b4a32", 0, 0.5, -0.12));
  g.add(mesh(box(0.07, 0.32, 0.07), "#4a3222", -0.32, 0.16, 0.08));
  g.add(mesh(box(0.07, 0.32, 0.07), "#4a3222", 0.32, 0.16, 0.08));
  g.add(mesh(box(0.07, 0.32, 0.07), "#4a3222", -0.32, 0.16, -0.1));
  g.add(mesh(box(0.07, 0.32, 0.07), "#4a3222", 0.32, 0.16, -0.1));
}

function buildFountain(g: THREE.Group) {
  g.add(mesh(cyl(0.95, 1.0, 0.32, 14), "#c4b49a", 0, 0.16, 0));
  g.add(mesh(cyl(0.62, 0.62, 0.18, 14), "#3d6b8b", 0, 0.34, 0));
  g.add(mesh(cyl(0.22, 0.28, 0.22, 10), "#e8dcc4", 0, 0.52, 0));
  g.add(mesh(cyl(0.08, 0.08, 0.7, 6), "#e8dcc4", 0, 0.85, 0));
  const jet = mesh(sph(0.12, 6), "#8ec4d4", 0, 1.25, 0);
  jet.name = "jet";
  g.add(jet);
}

export function makeGate(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.22, 1.85, 0.22), "#2a3342", -0.85, 0.92, 0));
  g.add(mesh(box(0.22, 1.85, 0.22), "#2a3342", 0.85, 0.92, 0));
  g.add(mesh(box(2.05, 0.28, 0.28), "#c24a3a", 0, 1.85, 0));
  g.add(mesh(box(1.45, 0.22, 0.1), "#f3ead7", 0, 2.12, 0));
  g.add(mesh(box(0.08, 1.1, 0.7), "#2a3342", -0.55, 0.55, 0.15));
  g.add(mesh(box(0.08, 1.1, 0.7), "#2a3342", 0.55, 0.55, 0.15));
  g.add(mesh(sph(0.1, 6), "#c9923a", -0.85, 1.9, 0));
  g.add(mesh(sph(0.1, 6), "#c9923a", 0.85, 1.9, 0));
  return g;
}

export function makePersonGeo() {
  return new THREE.CapsuleGeometry(0.1, 0.2, 3, 6);
}

export function makeHeadGeo() {
  return new THREE.SphereGeometry(0.09, 6, 6);
}

export function tintGhost(group: THREE.Group, ok: boolean) {
  const c = ok ? "#3d8b6e" : "#c24a3a";
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = mat(c, { transparent: true, opacity: 0.48 });
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

export function disposeMats() {
  for (const m of mats.values()) m.dispose();
  mats.clear();
}
