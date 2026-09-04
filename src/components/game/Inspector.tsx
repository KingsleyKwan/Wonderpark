"use client";

import { DEF_MAP } from "@/game/catalog";
import { addPiece, coasterStats, isClosed, wouldCrash } from "@/game/coaster";
import { sfxClick, sfxPlace } from "@/game/audio";
import { demolishAt } from "@/game/park";
import { rideAudience, rideExcitement, rideIntensity, ridePhase, tasteLabel } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { getPark } from "@/game/world";
import { X } from "lucide-react";

const JOB_LABEL: Record<string, string> = {
  janitor: "Groundskeeper",
  mechanic: "Ridewright",
  mascot: "Captain Wonder",
  medic: "Park Medic",
  gardener: "Flower Hand",
  security: "Park Watch",
};

const JOB_BLURB: Record<string, string> = {
  janitor: "Litter first. Long grass second. Ice cream always wins.",
  mechanic: "Fixes what the physics engine invented this morning.",
  mascot: "A costume with eyes. Happiness goes up.",
  medic: "For when the helicopter is busy.",
  gardener: "Waters beds. Mows when the lawn starts a novel.",
  security: "For guests who treat benches as sport.",
};

export function Inspector() {
  const selected = useGameStore((s) => s.selected);
  const mobile = useGameStore((s) => s.layout) === "mobile";
  const set = useGameStore((s) => s.set);
  useGameStore((s) => s.rev);
  const park = getPark();
  if (!selected || !park) return null;

  const shell = mobile ? panelMobile : panelDesktop;

  if (selected.kind === "guest") {
    const g = park.guests.find((x) => x.id === selected.id);
    if (!g) return null;
    return (
      <aside className={shell}>
        <Head title={g.name} onClose={() => set({ selected: null })} />
        <p className="text-sm italic text-paper-2">“{g.thought}”</p>
        <p className="pt-1 text-sm text-paper">{tasteLabel(g)}</p>
        <p className="tabular text-xs text-muted">
          Wants {g.speedPref.toFixed(1)}× · nerve {g.intensityPref.toFixed(1)}
        </p>
        <p className="pt-1 text-xs text-paper-3">
          {g.hasMap ? "Carries a map." : "Inventing geography."}
          {g.umbrella ? " Brolly up." : ""}
          {g.vandal ? " Security interest." : ""}
        </p>
        <Need label="Happiness" v={g.happiness} />
        <Need label="Hunger" v={g.hunger} invert />
        <Need label="Thirst" v={g.thirst} invert />
        <Need label="Bathroom" v={g.bathroom} invert />
        <Need label="Nausea" v={g.nausea} invert />
        <p className="tabular pt-1 text-xs text-muted">Wallet ${g.cash.toFixed(0)} · {g.state}</p>
      </aside>
    );
  }

  if (selected.kind === "staff") {
    const s = park.staff.find((x) => x.id === selected.id);
    if (!s) return null;
    return (
      <aside className={shell}>
        <Head title={JOB_LABEL[s.job] ?? s.job} onClose={() => set({ selected: null })} />
        <p className="text-sm capitalize text-paper-2">{JOB_BLURB[s.job] ?? `${s.job} on shift.`}</p>
      </aside>
    );
  }

  const b = park.buildings.find((x) => x.id === selected.id);
  if (!b) return null;
  const d = DEF_MAP[b.defId];
  if (!d) return null;
  const isRide = d.category === "ride";
  const stats = d.kind === "coaster" ? coasterStats(b) : null;
  const crowd = isRide ? rideAudience(park, b) : null;

  return (
    <aside className={shell}>
      <Head title={b.name} onClose={() => set({ selected: null })} />
      <p className="text-sm text-paper-2">{d.blurb}</p>
      {b.smashed && <p className="pt-1 text-xs text-paper-3">Smashed. Scenery score is sulking.</p>}
      {d.kind === "flower" && (
        <p className="pt-1 text-xs text-paper-3">Moisture {Math.round((b.moisture ?? 0) * 100)}%</p>
      )}
      {isRide && (
        <>
          <p className="pt-2 text-xs uppercase tracking-[0.14em] text-muted">
            {ridePhase(b) === "running"
              ? "Round in motion"
              : ridePhase(b) === "loading"
                ? "Loading guests"
                : ridePhase(b) === "unloading"
                  ? "Unloading"
                  : ridePhase(b) === "broken"
                    ? "Broken"
                    : ridePhase(b) === "closed"
                      ? "Gates closed"
                      : "Idle — waiting for a queue"}
          </p>
          <p className="tabular pt-1 text-xs text-paper-3">
            Queue {b.queue.length} · On ride {b.riders.length}
            {b.riders.length > 0 && b.cycleMax > 0 ? ` · ${Math.max(0, b.cycleT).toFixed(1)}s left` : ""}
          </p>
          <p className="pt-2 text-xs uppercase tracking-[0.14em] text-muted">Tune</p>
          <label className="mt-2 block text-xs text-paper-3">
            Price ${b.price.toFixed(0)}
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={b.price}
              onChange={(e) => {
                b.price = Number(e.target.value);
                set({ rev: Date.now() });
              }}
              className="mt-1 w-full accent-paper"
            />
          </label>
          <label className="mt-2 block text-xs text-paper-3">
            Speed {b.speed.toFixed(2)}× — gentle guests like ~0.7×, thrill guests want ~1.8×
            <input
              type="range"
              min={0.5}
              max={2.2}
              step={0.05}
              value={b.speed}
              onChange={(e) => {
                b.speed = Number(e.target.value);
                set({ rev: Date.now() });
              }}
              className="mt-1 w-full accent-paper"
            />
          </label>
          {crowd && (
            <p className="pt-1 text-xs text-paper-3">
              At this throttle: {crowd.want} would queue · {crowd.tooFast} say too fast · {crowd.tooSlow} say too slow
            </p>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <Metric k="Excitement" v={rideExcitement(b, d).toFixed(1)} />
            <Metric k="Intensity" v={rideIntensity(b, d).toFixed(1)} />
            <Metric k="Reliability" v={`${Math.round(b.reliability * 100)}%`} />
          </div>
          <p className="tabular pt-2 text-xs text-muted">
            {b.customers} riders · ${b.profit.toFixed(0)} take
          </p>
          <div className="mt-3 flex gap-2">
            {b.broken ? (
              <button
                type="button"
                className="h-11 flex-1 rounded-[12px] bg-paper text-sm text-ink"
                onClick={() => {
                  const cost = Math.max(40, Math.floor((d.cost ?? 800) * 0.12));
                  if (park.cash < cost) return;
                  park.cash -= cost;
                  b.broken = false;
                  b.reliability = Math.max(0.72, b.reliability);
                  b.open = true;
                  sfxClick();
                  set({ rev: Date.now(), cash: park.cash });
                }}
              >
                Repair ${Math.max(40, Math.floor((d.cost ?? 800) * 0.12))}
              </button>
            ) : (
              <button
                type="button"
                className="h-11 flex-1 rounded-[12px] bg-paper text-sm text-ink"
                onClick={() => {
                  b.open = !b.open;
                  sfxClick();
                  set({ rev: Date.now() });
                }}
              >
                {b.open ? "Close gates" : "Open gates"}
              </button>
            )}
          </div>
        </>
      )}
      {d.kind === "coaster" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Track works</p>
          <div className="grid grid-cols-3 gap-1">
            {(["str", "left", "right", "up", "down", "loop"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="h-11 rounded-[10px] bg-ink-3 text-xs capitalize text-paper"
                onClick={() => {
                  if (!b.track) b.track = [];
                  const next = addPiece(b.track, p);
                  if (next) {
                    b.track = next;
                    sfxPlace();
                    set({ tool: "coaster", coasterId: b.id });
                  }
                }}
              >
                {p === "str" ? "Straight" : p}
              </button>
            ))}
          </div>
          {stats && (
            <p className="text-xs text-paper-3">
              {stats.len} pieces · drop {stats.drops} · loops {stats.inversions} ·{" "}
              {stats.closed ? "circuit closed" : "open circuit"}
            </p>
          )}
          <button
            type="button"
            className="h-11 w-full rounded-[12px] border border-line text-sm"
            onClick={() => {
              b.tested = isClosed(b) && !wouldCrash(b);
              b.crashed = !b.tested && isClosed(b);
              b.open = b.tested;
              sfxClick();
              set({ rev: Date.now() });
            }}
          >
            Test train
          </button>
        </div>
      )}
      {d.category === "shop" && (
        <label className="mt-3 block text-xs text-paper-3">
          Price ${b.price.toFixed(1)}
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={b.price}
            onChange={(e) => {
              b.price = Number(e.target.value);
              set({ rev: Date.now() });
            }}
            className="mt-1 w-full accent-paper"
          />
        </label>
      )}
      <button
        type="button"
        className="mt-4 h-11 w-full rounded-[12px] text-sm text-brick hover:bg-ink-3"
        onClick={() => {
          demolishAt(park, b.x, b.y);
          set({ selected: null });
        }}
      >
        Demolish · 45% refund
      </button>
    </aside>
  );
}

const panelDesktop =
  "pointer-events-auto absolute inset-x-3 bottom-28 z-10 max-h-[38vh] overflow-y-auto rounded-[24px] border border-line bg-ink/90 p-4 text-paper backdrop-blur-sm sm:inset-x-auto sm:right-3 sm:top-20 sm:bottom-auto sm:w-72 sm:max-h-[calc(100dvh-11rem)]";

const panelMobile =
  "pointer-events-auto absolute inset-x-3 z-10 max-h-[34vh] overflow-y-auto rounded-[24px] border border-line bg-ink/92 p-4 text-paper backdrop-blur-sm bottom-[calc(5.75rem+env(safe-area-inset-bottom))]";

function Head({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <h2 className="font-display text-xl leading-tight">{title}</h2>
      <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-[10px] hover:bg-ink-3">
        <X className="size-4" />
      </button>
    </div>
  );
}

function Need({ label, v, invert }: { label: string; v: number; invert?: boolean }) {
  const bad = invert ? v > 0.7 : v < 0.35;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        <span className="tabular">{Math.round(v * 100)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-3">
        <div
          className={`h-full ${bad ? "bg-brick" : "bg-paper-2"}`}
          style={{ width: `${Math.max(4, Math.min(100, v * 100))}%` }}
        />
      </div>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[10px] bg-ink-3 px-1 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{k}</p>
      <p className="tabular text-sm">{v}</p>
    </div>
  );
}
