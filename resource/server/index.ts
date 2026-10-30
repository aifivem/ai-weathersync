import { isRecord } from "@aicore-fivem/lib/shared";
import {
  AdminPanel,
  GlobalKey,
  onClientCallback,
  provideExport,
  registerExport,
} from "@aicore-fivem/lib/server";
import type { PanelSchema } from "@aicore-fivem/shared";
import {
  EVENTS,
  isWeather,
  KEYS,
  minutesAt,
  readSettings,
  toClock,
  WEATHERS,
  type Clock,
  type Weather,
} from "common/world";

const clockState = new GlobalKey(KEYS.clock, (v) => toClock(v) ?? undefined);
const weatherState = new GlobalKey(KEYS.weather, (v) =>
  isRecord(v) ? v : undefined,
);

/** ai-weathersync's panel: how time runs and how the weather changes. */
const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "sliders",
  files: {
    settings: {
      kind: "settings",
      sync: "all",
      sections: {
        timeScale: { type: "number", min: 0.1, max: 120 },
        freezeTime: { type: "bool" },
        startHour: { type: "number", min: 0, max: 23, integer: true },
        dynamic: { type: "bool" },
        weathers: {
          type: "names",
          max: 15,
          itemMax: 16,
          pattern: `^(${WEATHERS.join("|")})$`,
        },
        changeMinutes: { type: "number", min: 1, max: 600, integer: true },
        blackout: { type: "bool" },
      },
    },
  },
  tabs: [
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: [
        {
          icon: "sliders",
          title: "ADMIN_C_TIME",
          desc: "ADMIN_C_TIME_DESC",
          fields: [
            {
              widget: "number",
              path: "timeScale",
              label: "ADMIN_F_SCALE",
              hint: "ADMIN_H_SCALE",
              min: 0.1,
              max: 120,
              step: 0.5,
            },
            {
              widget: "number",
              path: "startHour",
              label: "ADMIN_F_START_HOUR",
              hint: "ADMIN_H_START_HOUR",
              min: 0,
              max: 23,
            },
            {
              widget: "switch",
              path: "freezeTime",
              label: "ADMIN_F_FREEZE",
              hint: "ADMIN_H_FREEZE",
            },
          ],
        },
        {
          icon: "sliders",
          title: "ADMIN_C_WEATHER",
          desc: "ADMIN_C_WEATHER_DESC",
          fields: [
            {
              widget: "switch",
              path: "dynamic",
              label: "ADMIN_F_DYNAMIC",
              hint: "ADMIN_H_DYNAMIC",
            },
            {
              widget: "tags",
              path: "weathers",
              label: "ADMIN_F_WEATHERS",
              hint: "ADMIN_H_WEATHERS",
              placeholder: "ADMIN_P_WEATHERS",
            },
            {
              widget: "number",
              path: "changeMinutes",
              label: "ADMIN_F_CHANGE",
              hint: "ADMIN_H_CHANGE",
              min: 1,
              max: 600,
              unit: "min",
            },
            {
              widget: "switch",
              path: "blackout",
              label: "ADMIN_F_BLACKOUT",
              hint: "ADMIN_H_BLACKOUT",
            },
          ],
        },
      ],
    },
  ],
};

const panel = new AdminPanel(schema);
/** Panel settings, parsed again after every change. */
const content = { settings: readSettings(panel.get("settings")) };

/** The world's clock and weather: published as GlobalState only when they change (clients run the clock themselves). */
class World {
  clock: Clock = {
    base: content.settings.startHour * 60,
    at: Date.now(),
    scale: content.settings.timeScale,
    frozen: content.settings.freezeTime,
  };
  weather: Weather = content.settings.weathers[0] ?? "CLEAR";
  private timer: ReturnType<typeof setInterval> | null = null;

  publish(): void {
    clockState.set(this.clock);
    weatherState.set({
      type: this.weather,
      blackout: content.settings.blackout,
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
      frozen: content.settings.freezeTime,
    };
    this.publish();
  }

  setWeather(weather: Weather): void {
    this.weather = weather;
    this.publish();
  }

  /** Dynamic weather: the next one from the list, a step at a time (rain clears before sun). */
  schedule(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!content.settings.dynamic) return;
    this.timer = setInterval(() => {
      const list = content.settings.weathers;
      const index = list.indexOf(this.weather);
      const next =
        list[(index + 1 + Math.floor(Math.random() * 2)) % list.length] ??
        this.weather;
      this.setWeather(next);
    }, content.settings.changeMinutes * 60_000);
  }
}

const world = new World();
const restored = clockState.get();
if (restored) world.clock = restored;
world.publish();
world.schedule();
panel.onChange("settings", () => {
  content.settings = readSettings(panel.get("settings"));
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
  getTime: () => {
    const m = minutesAt(world.clock, Date.now());
    return { hour: Math.floor(m / 60), minute: Math.floor(m % 60) };
  },
};
for (const [name, fn] of Object.entries(api)) {
  registerExport(name, fn);
  provideExport("qb-weathersync", name, fn);
}
