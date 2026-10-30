import { bool, int, num, record } from "@aicore-fivem/lib/shared";

/** ai-weathersync's contracts. No natives. */

/** GlobalState keys (shared state everyone needs). */
export const KEYS = {
  /** { base, at, scale, frozen }: game minutes of the day at server time `at` (ms), advancing `scale` game minutes per real minute. */
  clock: "ai:clock",
  /** { type, blackout } the current weather. */
  weather: "ai:weather",
} as const;

export const EVENTS = {
  /** Callback: () -> number, the server's Date.now() (a client takes its clock offset once). */
  now: "ai-weathersync:now",
} as const;

export const WEATHERS = [
  "EXTRASUNNY",
  "CLEAR",
  "NEUTRAL",
  "SMOG",
  "FOGGY",
  "OVERCAST",
  "CLOUDS",
  "CLEARING",
  "RAIN",
  "THUNDER",
  "SNOW",
  "BLIZZARD",
  "SNOWLIGHT",
  "XMAS",
  "HALLOWEEN",
] as const;
export type Weather = (typeof WEATHERS)[number];
export const isWeather = (v: unknown): v is Weather =>
  typeof v === "string" && (WEATHERS as readonly string[]).includes(v);

export interface Clock {
  base: number;
  at: number;
  scale: number;
  frozen: boolean;
}

export interface Settings {
  /** Game minutes per real minute (GTA online: 30). */
  timeScale: number;
  freezeTime: boolean;
  startHour: number;
  /** Weather changes by itself every `changeMinutes`, picking from `weathers`. */
  dynamic: boolean;
  weathers: Weather[];
  changeMinutes: number;
  blackout: boolean;
  /** Wheel grip lost in snow weather (0 = none, GTA default 0.2, 1 = ice). */
  snowGrip: number;
  /** Snow on the ground (tracks and the white pass) in snow weather. */
  snowGround: boolean;
}

/** GlobalState prefix of a region's current weather (`ai:rweather:<id>`). */
export const REGION_PREFIX = "ai:rweather:";
/** Weathers that put snow on the ground. */
export const SNOWY: ReadonlySet<string> = new Set([
  "XMAS",
  "SNOW",
  "BLIZZARD",
  "SNOWLIGHT",
]);

/** A part of the map with its own weather (mountains with snow, a desert without rain). */
export interface Region {
  id: string;
  label: string;
  center: { x: number; y: number; z: number };
  radius: number;
  weathers: Weather[];
  changeMinutes: number;
}

export function readRegions(raw: unknown): Region[] {
  return Object.entries(record(raw)).flatMap(([id, value]) => {
    const v = record(value);
    const c = record(v.center);
    const weathers = Array.isArray(v.weathers)
      ? v.weathers.filter(isWeather)
      : [];
    if (!weathers.length || id === "$schema") return [];
    return [
      {
        id,
        label: typeof v.label === "string" ? v.label : id,
        center: { x: num(c.x, 0), y: num(c.y, 0), z: num(c.z, 0) },
        radius: int(v.radius, 600, 50, 6000),
        weathers,
        changeMinutes: int(v.changeMinutes, 20, 1, 600),
      },
    ];
  });
}

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const list = Array.isArray(s.weathers) ? s.weathers.filter(isWeather) : [];
  return {
    timeScale: num(s.timeScale, 2, 0.1, 120),
    freezeTime: bool(s.freezeTime, false),
    startHour: int(s.startHour, 8, 0, 23),
    dynamic: bool(s.dynamic, true),
    weathers: list.length ? list : ["EXTRASUNNY", "CLEAR", "CLOUDS"],
    changeMinutes: int(s.changeMinutes, 20, 1, 600),
    blackout: bool(s.blackout, false),
    snowGrip: num(s.snowGrip, 0.2, 0, 1),
    snowGround: bool(s.snowGround, true),
  };
}

/** Game minutes of the day for a clock at server time `serverNow`. */
export function minutesAt(clock: Clock, serverNow: number): number {
  const passed = clock.frozen
    ? 0
    : ((serverNow - clock.at) / 60_000) * clock.scale;
  return (((clock.base + passed) % 1440) + 1440) % 1440;
}

export function toClock(v: unknown): Clock | null {
  const c = record(v);
  return typeof c.base === "number" &&
    typeof c.at === "number" &&
    typeof c.scale === "number"
    ? { base: c.base, at: c.at, scale: c.scale, frozen: c.frozen === true }
    : null;
}
