"use client";

import { DEFS, DEF_MAP, PATH_COST } from "@/game/catalog";
import { sfxClick, toggleMute, isMuted } from "@/game/audio";
import { startResearch } from "@/game/sim";
import { researchable } from "@/game/park";
import { takeLoan, runAds } from "@/game/rct";
import { useGameStore, type Category } from "@/game/store";
import { flushSave, getCamera, getPark } from "@/game/world";
import {
  CircleDollarSign,
  Cloud,
  CloudRain,
  FastForward,
  Footprints,
  Hammer,
  Minus,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Store,
  Sun,
  Trees,
  Trash2,
  UserCog,
  Users,
  FlaskConical,
  Volume2,
  VolumeX,
  Star,
  Menu,
  Megaphone,
} from "lucide-react";
import { useState } from "react";
import { LayoutSwitch } from "./LayoutSwitch";

const TOOLS = [
  { id: "select" as const, label: "Inspect", icon: MousePointer2 },
  { id: "path" as const, label: "Path", icon: Footprints },
  { id: "demolish" as const, label: "Clear", icon: Trash2 },
];

const CATS: { id: Category; label: string; icon: typeof Hammer }[] = [
  { id: "rides", label: "Rides", icon: Hammer },
  { id: "shops", label: "Stalls", icon: Store },
  { id: "scenery", label: "Scenery", icon: Trees },
  { id: "staff", label: "Staff", icon: UserCog },
  { id: "research", label: "Research", icon: FlaskConical },
];

function bumpZoom(factor: number) {
  const cam = getCamera();
  cam.zoom = Math.max(0.45, Math.min(2.4, cam.zoom * factor));
}

export function Hud() {
  const cash = useGameStore((s) => s.cash);
  const guests = useGameStore((s) => s.guests);
  const rating = useGameStore((s) => s.rating);
  const dayLabel = useGameStore((s) => s.dayLabel);
  const speed = useGameStore((s) => s.speed);
  const tool = useGameStore((s) => s.tool);
  const category = useGameStore((s) => s.category);
  const placing = useGameStore((s) => s.placing);
  const thoughts = useGameStore((s) => s.thoughts);
  const memo = useGameStore((s) => s.memo);
  const pauseMenu = useGameStore((s) => s.pauseMenu);
  const win = useGameStore((s) => s.win);
  const lose = useGameStore((s) => s.lose);
  const mobile = useGameStore((s) => s.layout) === "mobile";
  const set = useGameStore((s) => s.set);
  useGameStore((s) => s.rev);
  const [muted, setMuted] = useState(isMuted());
  const park = getPark();

  const catalog =
    category && category !== "research"
      ? DEFS.filter((d) => {
          const map = { rides: "ride", shops: "shop", scenery: "scenery", staff: "staff" } as const;
          return d.category === map[category] && !!park?.unlocked.includes(d.id);
        })
      : [];

  return (
    <>
      <header
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 ${
          mobile
            ? "px-3 pt-[max(0.65rem,env(safe-area-inset-top))]"
            : "p-3 sm:p-4"
        }`}
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-ink/80 px-3 py-2 backdrop-blur-sm">
          <Stat icon={CircleDollarSign} label="Cash" value={`$${Math.floor(cash).toLocaleString()}`} compact={mobile} />
          <Stat icon={Users} label="Guests" value={String(guests)} compact={mobile} />
          <Stat icon={Star} label="Rating" value={String(rating)} compact={mobile} />
          {park && (
            <Stat
              icon={park.weather === "rain" ? CloudRain : park.weather === "overcast" ? Cloud : Sun}
              label="Sky"
              value={park.weather === "rain" ? "Rain" : park.weather === "overcast" ? "Grey" : "Sun"}
              compact={mobile}
            />
          )}
          {park && park.advertising > 1.05 && (
            <Stat icon={Megaphone} label="Ads" value="On" compact={mobile} />
          )}
          {!mobile && <p className="hidden pl-2 text-xs text-paper-3 sm:block">{dayLabel}</p>}
          {win && !lose && (
            <p className="rounded-full bg-paper/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-paper">
              Objectives met
            </p>
          )}
          {park?.research && (
            <p className="hidden max-w-[10rem] truncate pl-2 text-xs text-paper-3 sm:block">
              Lab {DEF_MAP[park.research.defId]?.name ?? park.research.defId} · {park.research.left}d
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-[18px] border border-line bg-ink/80 p-1 backdrop-blur-sm">
          <IconBtn label="Pause" onClick={() => set({ speed: 0 })} active={speed === 0} big={mobile}>
            <Pause className="size-4" />
          </IconBtn>
          <IconBtn label="Normal speed" onClick={() => set({ speed: 1 })} active={speed === 1} big={mobile}>
            <Play className="size-4" />
          </IconBtn>
          <IconBtn label="Fast" onClick={() => set({ speed: speed === 4 ? 2 : 4 })} active={speed >= 2} big={mobile}>
            <FastForward className="size-4" />
          </IconBtn>
          <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(toggleMute())} big={mobile}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconBtn>
          <IconBtn label="Menu" onClick={() => set({ pauseMenu: true, speed: 0 })} big={mobile}>
            <Menu className="size-4" />
          </IconBtn>
        </div>
      </header>

      {mobile && (
        <div className="pointer-events-auto absolute right-3 top-[42%] z-10 flex -translate-y-1/2 flex-col gap-1 rounded-[16px] border border-line bg-ink/80 p-1 backdrop-blur-sm">
          <IconBtn label="Zoom in" onClick={() => bumpZoom(1.14)} big>
            <Plus className="size-4" />
          </IconBtn>
          <IconBtn label="Zoom out" onClick={() => bumpZoom(0.88)} big>
            <Minus className="size-4" />
          </IconBtn>
        </div>
      )}

      <nav
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${
          mobile ? "px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]" : "p-3 sm:p-4"
        }`}
      >
        {mobile && !category && !placing && (
          <p className="pointer-events-none mb-2 text-center text-[11px] tracking-wide text-paper-3">
            Drag to look · pinch to zoom · tap to act
          </p>
        )}
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-[28px] border border-line bg-ink/88 p-2 backdrop-blur-sm">
          <div className={`flex gap-1 ${mobile ? "flex-wrap" : "overflow-x-auto"}`}>
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  sfxClick();
                  set({ tool: t.id, placing: null, category: null });
                }}
                className={`flex h-11 min-w-11 shrink-0 items-center gap-2 rounded-[12px] px-3 text-sm ${
                  tool === t.id && !placing ? "bg-paper text-ink" : "text-paper-2 hover:bg-ink-3"
                }`}
              >
                <t.icon className="size-4 shrink-0" />
                <span className={mobile ? "inline" : "hidden sm:inline"}>
                  {t.id === "path" ? (mobile ? "Path" : `Path $${PATH_COST}`) : t.label}
                </span>
              </button>
            ))}
            <div className="mx-1 w-px shrink-0 bg-line" />
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  sfxClick();
                  set({ category: category === c.id ? null : c.id, tool: "select", placing: null, selected: null });
                }}
                className={`flex h-11 min-w-11 shrink-0 items-center gap-2 rounded-[12px] px-3 text-sm ${
                  category === c.id ? "bg-paper text-ink" : "text-paper-2 hover:bg-ink-3"
                }`}
              >
                <c.icon className="size-4 shrink-0" />
                <span className={mobile ? "inline" : "hidden sm:inline"}>{c.label}</span>
              </button>
            ))}
          </div>
          {category === "research" && park && (
            <div className={`mt-2 grid max-h-44 gap-1 overflow-y-auto ${mobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {researchable(park).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={!!park.research || park.cash < (d.researchCost ?? 0)}
                  onClick={() => {
                    if (startResearch(park, d.id)) {
                      sfxClick();
                      set({ cash: park.cash, rev: Date.now() });
                    }
                  }}
                  className="flex min-h-11 items-center justify-between rounded-[12px] bg-ink-2 px-3 py-2 text-left text-sm text-paper disabled:opacity-40"
                >
                  <span>
                    {d.name}
                    <span className="ml-2 text-xs text-muted">{d.researchDays}d</span>
                  </span>
                  <span className="tabular text-paper-3">${d.researchCost}</span>
                </button>
              ))}
              {park.research && (
                <p className="px-2 py-1 text-xs text-paper-3">
                  In lab: {DEF_MAP[park.research.defId]?.name ?? park.research.defId} · {park.research.left} days remaining
                </p>
              )}
            </div>
          )}
          {catalog.length > 0 && (
            <div
              className={
                mobile
                  ? "mt-2 grid max-h-[32vh] grid-cols-2 gap-1 overflow-y-auto"
                  : "mt-2 flex gap-1 overflow-x-auto pb-1"
              }
            >
              {catalog.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    sfxClick();
                    set({ tool: "place", placing: d.id, selected: null });
                  }}
                  className={`flex min-h-11 items-center gap-2 rounded-[12px] px-2 py-2 text-left ${
                    mobile ? "min-w-0" : "min-w-[10.5rem]"
                  } ${placing === d.id ? "bg-paper text-ink" : "bg-ink-2 text-paper hover:bg-ink-3"}`}
                >
                  <span
                    className="size-9 shrink-0 rounded-[6px] border border-line"
                    style={{ backgroundColor: d.color, boxShadow: `inset 0 -11px 0 ${d.roof}` }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="tabular text-xs opacity-70">${d.cost}</p>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {thoughts[0] && !mobile && (
          <p className="pointer-events-none mx-auto mt-2 max-w-3xl truncate px-2 text-center text-xs text-paper-2">
            {thoughts[0]}
          </p>
        )}
      </nav>

      {memo && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <article className="w-full max-w-md rounded-[28px] border border-line bg-paper p-5 text-ink shadow-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Internal memo · {memo.from}</p>
            <h2 className="mt-2 font-display text-2xl">{memo.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">{memo.body}</p>
            <button
              type="button"
              onClick={() => {
                const p = getPark();
                if (p && p.memos[0]?.id === memo.id) p.memos.shift();
                set({ memo: p?.memos[0] ?? null });
                sfxClick();
              }}
              className="mt-5 h-12 w-full rounded-[14px] bg-ink text-paper"
            >
              File it
            </button>
          </article>
        </div>
      )}

      {(pauseMenu || lose) && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center bg-ink/55 p-4 sm:items-center"
          style={{ pointerEvents: "auto", touchAction: "manipulation" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="park-menu-title"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-[max(0.5rem,env(safe-area-inset-bottom))] w-full max-w-sm rounded-[28px] border border-line bg-ink-2 p-6 text-paper sm:mb-0">
            <h2 id="park-menu-title" className="font-display text-3xl">
              {lose ? "Park seized" : win ? "Objectives met" : "On break"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-paper-2">
              {lose
                ? "HQ has collected the keys. You may keep the lanyard."
                : win
                  ? "The annual report will use your better photographs. Resume to keep building — this is not a lock."
                  : "The guests continue to have needs, even paused."}
            </p>
            {park && park.loan > 0 && (
              <p className="mt-2 tabular text-xs text-paper-3">Board loan ${Math.floor(park.loan).toLocaleString()}</p>
            )}
            {park?.lastBooks && (
              <p className="mt-1 text-xs leading-relaxed text-paper-3">
                Last month · tickets ${park.lastBooks.admissions.toFixed(0)} · rides ${park.lastBooks.rides.toFixed(0)} ·
                stalls ${park.lastBooks.shops.toFixed(0)} · photos {park.lastBooks.photos}
              </p>
            )}
            {park && park.awards.length > 0 && (
              <p className="mt-1 text-xs text-paper-3">Plaques: {park.awards.slice(-2).join(" · ")}</p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              {!lose && (
                <button
                  type="button"
                  className="h-12 min-h-12 rounded-[14px] bg-paper text-ink"
                  onClick={() => {
                    sfxClick();
                    set({ pauseMenu: false, speed: 1 });
                  }}
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                className="h-12 min-h-12 rounded-[14px] border border-line text-paper"
                onClick={() => {
                  sfxClick();
                  flushSave();
                  set({ savedFlash: true, pauseMenu: lose, speed: lose ? 0 : 1 });
                }}
              >
                Save park
              </button>
              {!lose && park && park.loan < 8000 && (
                <button
                  type="button"
                  className="h-12 min-h-12 rounded-[14px] border border-line text-paper"
                  onClick={() => {
                    if (takeLoan(park, 2000)) {
                      sfxClick();
                      set({
                        cash: park.cash,
                        memo: park.memos[0] ?? null,
                        rev: Date.now(),
                        pauseMenu: false,
                        speed: 1,
                      });
                    }
                  }}
                >
                  Borrow $2,000
                </button>
              )}
              {!lose && park && park.advertising <= 1.05 && (
                <button
                  type="button"
                  className="h-12 min-h-12 rounded-[14px] border border-line text-paper"
                  onClick={() => {
                    if (runAds(park, 350)) {
                      sfxClick();
                      set({
                        cash: park.cash,
                        memo: park.memos[0] ?? null,
                        rev: Date.now(),
                        pauseMenu: false,
                        speed: 1,
                      });
                    }
                  }}
                >
                  Handbills $350
                </button>
              )}
              <button
                type="button"
                className="h-12 min-h-12 rounded-[14px] text-paper-3"
                onClick={() => {
                  sfxClick();
                  flushSave();
                  set({ screen: "title", pauseMenu: false, win: false, lose: false, speed: 1 });
                }}
              >
                Return to desk
              </button>
              <div className="pt-2">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">Field kit</p>
                <LayoutSwitch compact />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  compact,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "pr-1" : "pr-3"}`}>
      <Icon className="size-3.5 text-paper-3" />
      <div>
        {!compact && <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>}
        <p className={`tabular font-medium leading-none ${compact ? "text-xs" : "text-sm"}`}>{value}</p>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  label,
  big,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid place-items-center rounded-[12px] ${big ? "size-11" : "size-10"} ${
        active ? "bg-paper text-ink" : "text-paper-2 hover:bg-ink-3"
      }`}
    >
      {children}
    </button>
  );
}
