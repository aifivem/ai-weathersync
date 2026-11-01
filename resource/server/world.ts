import { isRecord } from "@aicore-fivem/lib/shared";
import {
  every,
  GlobalKey,
  type Job,
  onClientCallback,
} from "@aicore-fivem/lib/server";
import { EVENTS, KEYS, minutesAt, toClock, type Clock } from "common/world";
import type { Weather } from "@aicore-fivem/shared";
import { content, panel } from "./content";
import { startRegionWeather } from "./regions";

const clockState = new GlobalKey(KEYS.clock, (v) => toClock(v) ?? undefined);
const weatherState = new GlobalKey(KEYS.weather, (v) =>
  isRecord(v) ? v : undefined,
);

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

export const world = new World();
const restored = clockState.get();
if (restored) world.clock = restored;
world.publish();
world.schedule();
startRegionWeather(panel);
panel.onChange("settings", () => {
  world.setClock(null);
  if (!content.settings.weathers.includes(world.weather))
    world.setWeather(content.settings.weathers[0] ?? "CLEAR");
  world.schedule();
});

onClientCallback(EVENTS.now, () => Date.now(), {
  rate: { count: 2, windowMs: 10_000 },
});
