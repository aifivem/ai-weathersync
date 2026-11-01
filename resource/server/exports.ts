import { provideExport, registerExport } from "@aicore-fivem/lib/server";
import { isWeather } from "@aicore-fivem/shared";
import { minutesAt } from "common/world";
import { content } from "./content";
import { world } from "./world";

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
