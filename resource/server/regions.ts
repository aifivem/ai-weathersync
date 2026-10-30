import { GlobalGroup, stateString } from "@aicore-fivem/lib/server";
import { REGION_PREFIX, type Region } from "common/world";

/**
 * Regions with their own weather: each steps through its own list on its own timer and publishes the current one as
 * GlobalState `ai:rweather:<id>`; clients inside a region show it instead of the world's weather.
 */
class RegionWeather {
  private readonly published = new GlobalGroup(REGION_PREFIX, stateString);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  rebuild(regions: Region[]): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
    const ids = new Set(regions.map((r) => r.id));
    for (const id of [...this.published.ids()])
      if (!ids.has(id)) this.published.set(id, undefined);
    for (const region of regions) {
      const current = this.published.get(region.id);
      if (!current || !region.weathers.includes(current as never))
        this.published.set(region.id, region.weathers[0]);
      this.timers.set(
        region.id,
        setInterval(() => {
          const list = region.weathers;
          const at = list.indexOf(this.published.get(region.id) as never);
          this.published.set(
            region.id,
            list[(at + 1 + Math.floor(Math.random() * 2)) % list.length],
          );
        }, region.changeMinutes * 60_000),
      );
    }
  }
}

export const regionWeather = new RegionWeather();
