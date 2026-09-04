import * as THREE from "three";
import { DEF_MAP } from "./catalog";
import { followTrack } from "./coaster";
import {
  disposeGroup,
  disposeMats,
  makeBuilding,
  makeGate,
  makeHeadGeo,
  makePersonGeo,
  mat,
  tintGhost,
} from "./models3d";
import type { Camera, Park } from "./types";

const ISO_DIST = 38;
const MODEL_REV = 4;

export type GhostSpec = { x: number; y: number; w: number; h: number; ok: boolean; defId?: string };

export class ParkView3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  root = new THREE.Group();
  tileMesh: THREE.InstancedMesh | null = null;
  guestMesh: THREE.InstancedMesh | null = null;
  guestHead: THREE.InstancedMesh | null = null;
  staffMesh: THREE.InstancedMesh | null = null;
  staffHead: THREE.InstancedMesh | null = null;
  umbrellaMesh: THREE.InstancedMesh | null = null;
  balloonMesh: THREE.InstancedMesh | null = null;
  buildings = new Map<string, THREE.Group>();
  trackGroup = new THREE.Group();
  ghostPad = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), mat("#3d8b6e", { transparent: true, opacity: 0.35 }));
  ghostModel: THREE.Group | null = null;
  ghostDef = "";
  ghostOk = true;
  hover = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.08, 1.02), mat("#f3ead7", { transparent: true, opacity: 0.35 }));
  selectRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 20), mat("#f3ead7", { transparent: true, opacity: 0.85 }));
  heli = new THREE.Group();
  dummy = new THREE.Object3D();
  ray = new THREE.Raycaster();
  ndc = new THREE.Vector2();
  hit = new THREE.Vector3();
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  lastPathGen = -1;
  lastVisKey = "";
  lastBKey = "";
  lastTrackKey = "";
  tmpColor = new THREE.Color();
  sun: THREE.DirectionalLight;
  look = new THREE.Vector3();
  camRight = new THREE.Vector3();
  camFwd = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setClearColor(0x8aa4b0, 1);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8aa4b0, 52, 110);
    this.camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 200);
    this.scene.add(this.root);

    const hemi = new THREE.HemisphereLight(0xf3ead7, 0x3f5c45, 0.62);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.45);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -28;
    this.sun.shadow.camera.right = 28;
    this.sun.shadow.camera.top = 28;
    this.sun.shadow.camera.bottom = -28;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    const fill = new THREE.DirectionalLight(0xb8d4e0, 0.35);
    fill.position.set(-12, 10, -6);
    this.scene.add(fill);

    this.ghostPad.receiveShadow = false;
    this.ghostPad.castShadow = false;
    this.hover.receiveShadow = false;
    this.selectRing.rotation.x = -Math.PI / 2;
    this.selectRing.position.y = 0.08;
    this.root.add(this.ghostPad, this.hover, this.selectRing, this.trackGroup);
    this.ghostPad.visible = false;
    this.hover.visible = false;
    this.selectRing.visible = false;

    this.buildHeli();
    this.root.add(this.heli);
    this.heli.visible = false;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat("#5a4a32"));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.root.add(ground);

    this.guestMesh = this.makeCrowd(makePersonGeo(), 160);
    this.guestHead = this.makeCrowd(makeHeadGeo(), 160);
    this.staffMesh = this.makeCrowd(makePersonGeo(), 40);
    this.staffHead = this.makeCrowd(makeHeadGeo(), 40);
    const umbGeo = new THREE.ConeGeometry(0.22, 0.16, 8);
    umbGeo.rotateX(Math.PI);
    this.umbrellaMesh = this.makeCrowd(umbGeo, 160);
    this.balloonMesh = this.makeCrowd(new THREE.SphereGeometry(0.09, 8, 6), 160);
  }

  private makeCrowd(geo: THREE.BufferGeometry, n: number) {
    const mesh = new THREE.InstancedMesh(geo, mat("#ffffff"), n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return mesh;
  }

  private buildHeli() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.45), mat("#2a3342"));
    body.castShadow = true;
    this.heli.add(body);
    this.heli.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), mat("#c24a3a")));
    this.heli.children[1]!.position.set(0, 0.2, 0);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.08), mat("#e8dcc4"));
    rotor.name = "rotor";
    rotor.position.y = 0.32;
    this.heli.add(rotor);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  setLook(cam: Camera, _park: Park) {
    const aspect = this.renderer.domElement.clientWidth / Math.max(1, this.renderer.domElement.clientHeight);
    const view = 16 / Math.max(0.4, cam.zoom);
    this.camera.left = (-view * aspect) / 2;
    this.camera.right = (view * aspect) / 2;
    this.camera.top = view / 2;
    this.camera.bottom = -view / 2;
    this.camera.updateProjectionMatrix();

    this.look.set(cam.x, 0, cam.y);
    this.camera.position.set(cam.x + ISO_DIST, ISO_DIST * 0.68, cam.y + ISO_DIST);
    this.camera.lookAt(this.look);
    this.sun.position.set(cam.x + 16, 26, cam.y + 6);
    this.sun.target.position.copy(this.look);
    if (!this.sun.target.parent) this.scene.add(this.sun.target);

    this.camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.camRight.y = 0;
    this.camRight.normalize();
    this.camFwd.set(-this.camRight.z, 0, this.camRight.x);
  }

  panScreen(dx: number, dy: number, cam: Camera) {
    const k = (16 / Math.max(0.4, cam.zoom)) / Math.max(1, this.renderer.domElement.clientHeight);
    cam.x -= dx * k * this.camRight.x * 1.1 + dy * k * this.camFwd.x * 1.1;
    cam.y -= dx * k * this.camRight.z * 1.1 + dy * k * this.camFwd.z * 1.1;
  }

  pick(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
    this.ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.ray.intersectPlane(this.plane, this.hit);
    if (!hit) return { x: -1, y: -1 };
    return { x: Math.floor(hit.x), y: Math.floor(hit.z) };
  }

  sync(
    park: Park,
    cam: Camera,
    time: number,
    hover: { x: number; y: number } | null,
    ghost: GhostSpec | null,
    selectedId: string | null,
  ) {
    this.setLook(cam, park);
    const rain = park.weather === "rain";
    const overcast = park.weather === "overcast";
    const sky = rain ? 0x4a5e68 : overcast ? 0x7a8a94 : park.biome === "forest" ? 0x7a96a4 : 0xc9b89a;
    this.renderer.setClearColor(sky, 1);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.setHex(sky);
    this.sun.intensity = rain ? 0.52 : overcast ? 0.88 : 1.45;
    this.renderer.toneMappingExposure = rain ? 0.92 : 1.12;

    const visKey = `${park.weather}|${park.day}|${park.grassGen ?? 0}|${Math.floor(park.dayT / 6)}`;
    if (park.pathGen !== this.lastPathGen || visKey !== this.lastVisKey) {
      this.rebuildTiles(park);
      this.lastPathGen = park.pathGen;
      this.lastVisKey = visKey;
    }
    const bkey =
      MODEL_REV +
      "|" +
      park.buildings
        .map((b) => b.id + b.defId + (b.track?.length ?? 0) + (b.broken ? "x" : "") + (b.smashed ? "s" : "") + Math.round((b.moisture ?? 1) * 3))
        .join(",");
    if (bkey !== this.lastBKey) {
      this.rebuildBuildings(park);
      this.lastBKey = bkey;
    }
    this.updateTrack(park);
    this.updateGuests(park, time);
    this.updateStaff(park);
    this.updateAnims(park, time);
    this.updateGhost(hover, ghost, selectedId, park);

    const h = park.helicopter;
    if (h) {
      this.heli.visible = true;
      this.heli.position.set(h.x, 0.4 + h.z * 0.12, h.y);
      const rotor = this.heli.getObjectByName("rotor");
      if (rotor) rotor.rotation.y = time * 0.02;
    } else this.heli.visible = false;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private rebuildTiles(park: Park) {
    if (this.tileMesh) {
      this.root.remove(this.tileMesh);
      this.tileMesh.geometry.dispose();
      this.tileMesh = null;
    }
    const n = park.w * park.h;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.16, 0.96), mat("#ffffff"), n);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    const colors = new Float32Array(n * 3);
    let i = 0;
    for (let y = 0; y < park.h; y++) {
      for (let x = 0; x < park.w; x++) {
        const t = park.tiles[y]![x]!;
        let hex = 0x5c8a52;
        let h = 0.08;
        if (t.kind === "path") {
          hex = 0xd4c2a4;
          h = 0.12;
        } else if (t.kind === "water") {
          hex = 0x2f5d72;
          h = -0.06;
        } else if (t.kind === "dirt") {
          hex = 0x8b6b45;
          h = 0.07;
        } else if (t.kind === "sand") {
          hex = 0xc4b07a;
          h = 0.07;
        } else {
          const gr = t.growth ?? 0;
          hex = gr > 0.7 ? 0x24522c : gr > 0.4 ? 0x3d6b38 : park.biome === "creek" ? 0x6a8a4e : 0x5c8a52;
          h = 0.08 + gr * 0.14;
        }
        this.dummy.position.set(x + 0.5, h, y + 0.5);
        this.dummy.scale.set(1, t.kind === "water" ? 0.5 : 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        this.tmpColor.setHex(hex);
        colors[i * 3] = this.tmpColor.r;
        colors[i * 3 + 1] = this.tmpColor.g;
        colors[i * 3 + 2] = this.tmpColor.b;
        i++;
      }
    }
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = n;
    this.tileMesh = mesh;
    this.root.add(mesh);

    const gate = this.root.getObjectByName("gate");
    if (gate) {
      this.root.remove(gate);
      disposeGroup(gate);
    }
    const g = makeGate();
    g.name = "gate";
    g.position.set(park.entranceX + 0.5, 0, park.entranceY + 0.55);
    this.root.add(g);
  }

  private rebuildBuildings(park: Park) {
    for (const [, group] of this.buildings) {
      this.root.remove(group);
      disposeGroup(group);
    }
    this.buildings.clear();
    for (const b of park.buildings) {
      const def = DEF_MAP[b.defId];
      if (!def || def.category === "staff") continue;
      const group = makeBuilding(def.kind, def.w, def.h, def.color, def.roof, def.id);
      group.position.set(b.x + def.w / 2, 0, b.y + def.h / 2);
      group.rotation.z = b.smashed ? 0.45 : b.broken ? 0.06 : 0;
      group.rotation.x = b.smashed ? 0.18 : 0;
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      this.buildings.set(b.id, group);
      this.root.add(group);
    }
  }

  private updateTrack(park: Park) {
    const key = park.buildings.map((b) => (b.track ? b.id + b.track.length : "")).join("|");
    if (key === this.lastTrackKey) {
      this.updateTrains(park);
      return;
    }
    this.lastTrackKey = key;
    while (this.trackGroup.children.length) {
      const c = this.trackGroup.children.pop()!;
      disposeGroup(c);
      this.trackGroup.remove(c);
    }
    for (const b of park.buildings) {
      if (!b.track || b.track.length < 2) continue;
      const pts = b.track.map((n) => new THREE.Vector3(n.x + 0.5, 0.45 + n.z * 0.45, n.y + 0.5));
      const curve = new THREE.CatmullRomCurve3(pts, false);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 4), 0.06, 5, false), mat("#c24a3a"));
      tube.castShadow = true;
      this.trackGroup.add(tube);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 4), 0.03, 5, false), mat("#e8dcc4"));
      rail.position.y = 0.05;
      this.trackGroup.add(rail);
    }
    this.updateTrains(park);
  }

  private updateTrains(park: Park) {
    let train = this.trackGroup.getObjectByName("coaster-train") as THREE.Mesh | undefined;
    if (!train) {
      train = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.28), mat("#f3ead7"));
      train.name = "coaster-train";
      train.castShadow = true;
      this.trackGroup.add(train);
    }
    const coaster = park.buildings.find((b) => DEF_MAP[b.defId]?.kind === "coaster" && b.track && b.track.length > 2);
    if (!coaster?.track) {
      train.visible = false;
      return;
    }
    train.visible = true;
    const p = followTrack(coaster.track, (coaster.trainT ?? 0) * coaster.track.length);
    train.position.set(p.x, 0.55 + p.z * 0.45, p.y);
  }

  private stampCrowd(
    mesh: THREE.InstancedMesh,
    heads: THREE.InstancedMesh,
    items: { x: number; y: number; z?: number; rot?: number; scale?: number; color: string; tilt?: number }[],
  ) {
    const cap = mesh.instanceMatrix.count;
    const n = Math.min(items.length, cap);
    for (let i = 0; i < n; i++) {
      const g = items[i]!;
      this.dummy.position.set(g.x, 0.28 + (g.z ?? 0) * 0.12, g.y);
      this.dummy.rotation.set(g.tilt ?? 0, -(g.rot ?? 0) + Math.PI / 2, 0);
      this.dummy.scale.setScalar(g.scale ?? 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      this.tmpColor.set(g.color);
      mesh.setColorAt(i, this.tmpColor);

      this.dummy.position.y += 0.24;
      this.dummy.scale.setScalar((g.scale ?? 1) * 0.95);
      this.dummy.updateMatrix();
      heads.setMatrixAt(i, this.dummy.matrix);
      this.tmpColor.set("#e8d5c4");
      heads.setColorAt(i, this.tmpColor);
    }
    mesh.count = n;
    heads.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  }

  private updateGuests(park: Park, time: number) {
    const items = [];
    const umbs: { x: number; y: number; z?: number; rot?: number; scale?: number; color: string; tilt?: number }[] = [];
    const balloons: { x: number; y: number; z?: number; rot?: number; scale?: number; color: string; tilt?: number }[] = [];
    for (const g of park.guests) {
      if (g.state === "ride") continue;
      items.push({
        x: g.x,
        y: g.y,
        z: g.z,
        rot: g.rot,
        scale: g.state === "injured" ? 0.75 : 1,
        color: g.shirt,
        tilt: g.state === "flying" ? time * 0.01 : 0,
      });
      if (g.umbrella && park.weather === "rain") {
        umbs.push({ x: g.x, y: g.y, z: (g.z ?? 0) + 6.2, rot: g.rot, color: g.shirt, scale: 1 });
      }
      if (g.hasBalloon && g.state !== "flying") {
        balloons.push({ x: g.x + 0.16, y: g.y, z: (g.z ?? 0) + 8.5, color: g.shirt, scale: 1 });
      }
    }
    this.stampCrowd(this.guestMesh!, this.guestHead!, items);
    this.stampProp(this.umbrellaMesh!, umbs, 0);
    this.stampProp(this.balloonMesh!, balloons, 0);
  }

  private stampProp(
    mesh: THREE.InstancedMesh,
    items: { x: number; y: number; z?: number; rot?: number; scale?: number; color: string }[],
    yOff: number,
  ) {
    const cap = mesh.instanceMatrix.count;
    const n = Math.min(items.length, cap);
    for (let i = 0; i < n; i++) {
      const g = items[i]!;
      this.dummy.position.set(g.x, 0.28 + (g.z ?? 0) * 0.12 + yOff, g.y);
      this.dummy.rotation.set(0, -(g.rot ?? 0) + Math.PI / 2, 0);
      this.dummy.scale.setScalar(g.scale ?? 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      this.tmpColor.set(g.color);
      mesh.setColorAt(i, this.tmpColor);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private updateStaff(park: Park) {
    const colors: Record<string, string> = {
      janitor: "#5c7f62",
      mechanic: "#c9923a",
      mascot: "#c24a3a",
      medic: "#e8dcc4",
      gardener: "#3d8b6e",
      security: "#2a3342",
      entertainer: "#e8c84a",
    };
    const items = park.staff.map((s) => ({
      x: s.x,
      y: s.y,
      color: colors[s.job] ?? "#c9923a",
      scale: s.job === "entertainer" || s.job === "mascot" ? 1.16 : 1.08,
    }));
    this.stampCrowd(this.staffMesh!, this.staffHead!, items);
  }

  private updateAnims(park: Park, _time: number) {
    for (const b of park.buildings) {
      const group = this.buildings.get(b.id);
      if (!group) continue;
      const def = DEF_MAP[b.defId];
      const running = b.open && !b.broken && b.riders.length > 0;
      const t = b.animT ?? 0;
      const spin = group.getObjectByName("spin");
      if (spin) spin.rotation.y = t * 1.65;
      const spinZ = group.getObjectByName("spinZ");
      if (spinZ) {
        spinZ.rotation.z = t * 0.9;
        spinZ.traverse((o) => {
          if (o.name === "hang") o.rotation.z = -spinZ.rotation.z;
        });
      }
      const swing = group.getObjectByName("swing");
      if (swing) swing.rotation.z = running ? Math.sin(t * 1.7) * (0.45 + (b.speed - 1) * 0.4) : 0;
      const drop = group.getObjectByName("drop");
      if (drop) {
        const max = b.cycleMax || 1;
        const p = running ? 1 - b.cycleT / max : 0;
        let u = 0;
        if (p < 0.35) u = p / 0.35;
        else if (p < 0.48) u = 1;
        else if (p < 0.62) u = 1 - (p - 0.48) / 0.14;
        else u = 0;
        drop.position.y = 0.6 + u * 4.4;
      }
      const jet = group.getObjectByName("jet");
      if (jet) jet.position.y = 0.95 + (running ? Math.abs(Math.sin(t * 5)) * 0.4 : 0);
      const log = group.getObjectByName("log");
      if (log && def) {
        const u = running ? (t * 0.35) % 1 : 0;
        log.position.x = -def.w * 0.2 + u * def.w * 0.5;
      }
      const train = group.getObjectByName("train");
      const curve = group.userData.juniorCurve as THREE.CatmullRomCurve3 | undefined;
      if (train && curve) {
        const u = running ? (t * 0.18) % 1 : 0;
        const p = curve.getPointAt(u);
        train.position.copy(p);
      }
    }
  }

  private updateGhost(hover: { x: number; y: number } | null, ghost: GhostSpec | null, selectedId: string | null, park: Park) {
    if (hover && hover.x >= 0) {
      this.hover.visible = true;
      this.hover.position.set(hover.x + 0.5, 0.18, hover.y + 0.5);
    } else this.hover.visible = false;

    if (ghost) {
      this.ghostPad.visible = true;
      (this.ghostPad.material as THREE.MeshLambertMaterial).color.set(ghost.ok ? "#3d8b6e" : "#c24a3a");
      this.ghostPad.scale.set(ghost.w, 1, ghost.h);
      this.ghostPad.position.set(ghost.x + ghost.w / 2, 0.2, ghost.y + ghost.h / 2);

      const defId = ghost.defId ?? "";
      if (defId && (defId !== this.ghostDef || ghost.ok !== this.ghostOk)) {
        if (this.ghostModel) {
          this.root.remove(this.ghostModel);
          disposeGroup(this.ghostModel);
          this.ghostModel = null;
        }
        const def = DEF_MAP[defId];
        if (def && def.category !== "staff") {
          this.ghostModel = makeBuilding(def.kind, def.w, def.h, def.color, def.roof, def.id);
          tintGhost(this.ghostModel, ghost.ok);
          this.root.add(this.ghostModel);
        }
        this.ghostDef = defId;
        this.ghostOk = ghost.ok;
      }
      if (this.ghostModel) {
        this.ghostModel.visible = true;
        this.ghostModel.position.set(ghost.x + ghost.w / 2, 0, ghost.y + ghost.h / 2);
      }
    } else {
      this.ghostPad.visible = false;
      if (this.ghostModel) this.ghostModel.visible = false;
    }

    const sel =
      park.buildings.find((b) => b.id === selectedId) ||
      park.guests.find((g) => g.id === selectedId) ||
      park.staff.find((s) => s.id === selectedId);
    if (sel && "defId" in sel) {
      const d = DEF_MAP[sel.defId];
      this.selectRing.visible = true;
      this.selectRing.position.set(sel.x + (d?.w ?? 1) / 2, 0.1, sel.y + (d?.h ?? 1) / 2);
    } else if (sel && "shirt" in sel) {
      this.selectRing.visible = true;
      this.selectRing.position.set(sel.x, 0.1, sel.y);
    } else if (sel && "job" in sel) {
      this.selectRing.visible = true;
      this.selectRing.position.set(sel.x, 0.1, sel.y);
    } else this.selectRing.visible = false;
  }

  dispose() {
    this.renderer.dispose();
    disposeMats();
  }
}

export function centerCamera(park: Park, mobile = false): Camera {
  const z = mobile ? 0.78 : 1;
  if (park.biome === "creek") return { x: 18.2, y: 21.5, zoom: 1.12 * z };
  return { x: park.w * 0.48, y: park.h * 0.52, zoom: 0.95 * z };
}
