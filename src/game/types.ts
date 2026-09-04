export type TileKind = "grass" | "dirt" | "water" | "path" | "sand";
export type Tool = "select" | "path" | "demolish" | "place" | "coaster";
export type GuestState =
  | "enter"
  | "wander"
  | "queue"
  | "ride"
  | "shop"
  | "leave"
  | "flying"
  | "injured";
export type StaffJob = "janitor" | "mechanic" | "mascot" | "medic" | "gardener" | "security" | "entertainer";
export type Weather = "sun" | "overcast" | "rain";

export interface Tile {
  kind: TileKind;
  litter: number;
  growth: number;
  /** 1 = just mowed; fades so the cut stripe stays visible for a few seconds. */
  fresh?: number;
}

export interface Def {
  id: string;
  name: string;
  blurb: string;
  category: "ride" | "shop" | "scenery" | "staff";
  w: number;
  h: number;
  cost: number;
  kind: string;
  color: string;
  roof: string;
  height: number;
  startUnlocked?: boolean;
  researchCost?: number;
  researchDays?: number;
  excitement?: number;
  intensity?: number;
  nausea?: number;
  capacity?: number;
  duration?: number;
  runningCost?: number;
  reliability?: number;
  product?: "food" | "drink" | "sugar" | "souvenir" | "toilet" | "aid" | "info" | "balloon" | "photo" | "umbrella";
  priceDefault?: number;
  serveTime?: number;
  wage?: number;
}

export interface TrackNode {
  x: number;
  y: number;
  z: number;
  dir: number;
  piece: "str" | "left" | "right" | "up" | "down" | "loop";
}

export interface Building {
  id: string;
  defId: string;
  x: number;
  y: number;
  name: string;
  open: boolean;
  tested: boolean;
  broken: boolean;
  reliability: number;
  price: number;
  speed: number;
  duration: number;
  queue: string[];
  riders: string[];
  cycleT: number;
  cycleMax: number;
  animT: number;
  loadT: number;
  customers: number;
  profit: number;
  serviceX: number;
  serviceY: number;
  moisture?: number;
  smashed?: boolean;
  track?: TrackNode[];
  trainT?: number;
  crashed?: boolean;
}

export interface Guest {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  path: { x: number; y: number }[];
  pathI: number;
  happiness: number;
  energy: number;
  hunger: number;
  thirst: number;
  bathroom: number;
  nausea: number;
  cash: number;
  intensityPref: number;
  speedPref: number;
  patience: number;
  thought: string;
  thoughtT: number;
  state: GuestState;
  targetId?: string;
  shirt: string;
  hat: number;
  ridesDone: string[];
  eaten: boolean;
  pathGen: number;
  hasMap: boolean;
  vandal: boolean;
  umbrella: boolean;
  hasBalloon: boolean;
}

export interface Staff {
  id: string;
  job: StaffJob;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  pathI: number;
  busy: number;
  targetId?: string;
  rot?: number;
  mowing?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  size: number;
  kind: "spark" | "cash" | "smoke" | "leaf" | "water" | "text";
  text?: string;
}

export interface Memo {
  id: string;
  from: string;
  title: string;
  body: string;
  tone: "info" | "warn" | "good" | "bad";
}

export interface Objective {
  id: string;
  text: string;
  done: boolean;
}

export interface Helicopter {
  x: number;
  y: number;
  z: number;
  t: number;
  phase: "in" | "hover" | "out";
  targetId?: string;
}

export interface Scenario {
  id: string;
  name: string;
  place: string;
  image: string;
  cash: number;
  blurb: string;
  briefing: string;
  biome: "creek" | "forest";
  objectives: { id: string; text: string }[];
}

export interface Park {
  scenarioId: string;
  biome: "creek" | "forest";
  w: number;
  h: number;
  tiles: Tile[][];
  cash: number;
  day: number;
  dayT: number;
  month: number;
  year: number;
  rating: number;
  admissions: number;
  guests: Guest[];
  buildings: Building[];
  staff: Staff[];
  particles: Particle[];
  memos: Memo[];
  seenMemos: string[];
  objectives: Objective[];
  unlocked: string[];
  research: { defId: string; left: number } | null;
  advertising: number;
  adT: number;
  spawnAcc: number;
  deaths: number;
  injuries: number;
  pathGen: number;
  trauma: number;
  entranceX: number;
  entranceY: number;
  walk: Float32Array;
  helicopter: Helicopter | null;
  won: boolean;
  lost: boolean;
  ticks: number;
  nextId: number;
  grassGen: number;
  /** Highest simultaneous guest count this park has held. */
  peakGuests?: number;
  weather: Weather;
  weatherT: number;
  awards: string[];
  loan: number;
  books: { admissions: number; shops: number; rides: number; wages: number; running: number; photos: number };
  lastBooks: { admissions: number; shops: number; rides: number; wages: number; running: number; photos: number } | null;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface InputState {
  mx: number;
  my: number;
  down: boolean;
  pan: boolean;
  keys: Set<string>;
}
