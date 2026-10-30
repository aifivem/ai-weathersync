import { isRecord } from "@aicore-fivem/lib/shared";
import {
  AdminPanel,
  every,
  GlobalKey,
  type Job,
  onClientCallback,
  provideExport,
  registerExport,
} from "@aicore-fivem/lib/server";
import { regionWeather } from "./regions";
import { schema } from "./schema";
import {
  EVENTS,
  KEYS,
  minutesAt,
  readRegions,
  readSettings,
  toClock,
  type Clock,
} from "common/world";
import { isWeather, type Weather } from "@aicore-fivem/shared";

const clockState = new GlobalKey(KEYS.clock, (v) => toClock(v) ?? undefined);
const weatherState = new GlobalKey(KEYS.weather, (v) =>
  isRecord(v) ? v : undefined,
);

const panel = new AdminPanel(schema);
const settings = panel.view("settings", readSettings);
/** Panel settings, kept current by the panel's view. */
const content = {
  get settings() {
    return settings.value;
  },
};

/** The world's clock and weather: published as GlobalState only when they change (clients run the clock themselves). */
class World {
  clock: Clock = {
    base: content.settings.startHour * 60,
    at: Date.now(),
    scale: content.settings.timeScale,
    frozen: content.settings.freezeTime,
  };
  weather: Weather = content.settings.weathers[0] ?? "CLEAR";
  /** Runtime overrides from the exports (admin commands); null = the panel's setting. */
  blackout: boolean | null = null;
  frozen: boolean | null = null;
  dynamic: boolean | null = null;
  private timer: Job | null = null;

  publish(): void {
    clockState.set(this.clock);
    weatherState.set({
      type: this.weather,
      blackout: this.blackout ?? content.settings.blackout,
    });
  }

  /** Re-bases the clock at the current game time with new speed / freeze. */
  setClock(minutes: number | null): void {
    const now = Date.now();
    const base = minutes ?? minutesAt(this.clock, now);
    this.clock = {
      base,
      at: now,
      scale: content.settings.timeScale,
      frozen: this.frozen ?? content.settings.freezeTime,
    };
    this.publish();
  }

  setWeather(weather: Weather): void {
    this.weather = weather;
    this.publish();
  }

  /** Dynamic weather: the next one from the list, a step at a time (rain clears before sun). */
  schedule(): void {
    this.timer?.stop();
    this.timer = null;
    if (!(this.dynamic ?? content.settings.dynamic)) return;
    this.timer = every(
      content.settings.changeMinutes * 60_000,
      () => {
        const list = content.settings.weathers;
        const index = list.indexOf(this.weather);
        const next =
          list[(index + 1 + Math.floor(Math.random() * 2)) % list.length] ??
          this.weather;
        this.setWeather(next);
      },
      { name: "weather" },
    );
  }
}

const world = new World();
const restored = clockState.get();
if (restored) world.clock = restored;
world.publish();
world.schedule();
regionWeather.rebuild(readRegions(panel.get("regions")));
panel.onChange("regions", () =>
  regionWeather.rebuild(readRegions(panel.get("regions"))),
);
panel.onChange("settings", () => {
  world.setClock(null);
  if (!content.settings.weathers.includes(world.weather))
    world.setWeather(content.settings.weathers[0] ?? "CLEAR");
  world.schedule();
});

onClientCallback(EVENTS.now, () => Date.now(), {
  rate: { count: 2, windowMs: 10_000 },
});

/** Exports (own and qb-weathersync names) for admin tools and scripts. */
const api: Record<string, (...args: unknown[]) => unknown> = {
  setWeather: (type) => {
    const upper = typeof type === "string" ? type.toUpperCase() : "";
    if (!isWeather(upper)) return false;
    world.setWeather(upper);
    return true;
  },
  setTime: (hour, minute) => {
    if (typeof hour !== "number") return false;
    world.setClock(
      ((Math.floor(hour) % 24) * 60 +
        (typeof minute === "number" ? Math.floor(minute) : 0)) %
        1440,
    );
    return true;
  },
  getWeatherState: () => world.weather,
  setBlackout: (on) => {
    world.blackout = on === true;
    world.publish();
    return true;
  },
  setTimeFreeze: (on) => {
    world.frozen = on === true;
    world.setClock(null);
    return true;
  },
  setDynamicWeather: (on) => {
    world.dynamic = on === true;
    world.schedule();
    return true;
  },
  nextWeatherStage: () => {
    const list = content.settings.weathers;
    world.setWeather(
      list[(list.indexOf(world.weather) + 1) % list.length] ?? world.weather,
    );
    return true;
  },
  getBlackoutState: () => world.blackout ?? content.settings.blackout,
  getTimeFreezeState: () => world.frozen ?? content.settings.freezeTime,
  getDynamicWeather: () => world.dynamic ?? content.settings.dynamic,
  getTime: () => {
    const m = minutesAt(world.clock, Date.now());
    return { hour: Math.floor(m / 60), minute: Math.floor(m % 60) };
  },
};
for (const [name, fn] of Object.entries(api)) {
  registerExport(name, fn);
  provideExport("qb-weathersync", name, fn);
}
