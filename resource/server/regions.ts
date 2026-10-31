import { every, GlobalGroup, stateString } from "@aicore-fivem/lib/server";
import { RecordObjects, type RecordSource } from "@aicore-fivem/lib/shared";
import { readRegion, REGION_PREFIX } from "common/world";

const published = new GlobalGroup(REGION_PREFIX, stateString);

/**
 * Regions with their own weather: each steps through its own list on its own job and publishes the current one as
 * GlobalState `ai:rweather:<id>`; clients inside a region show it instead of the world's weather. A panel edit
 * restarts only that region's job; a deleted region's weather is removed.
 */
export function startRegionWeather(panel: RecordSource): void {
  const regions = new RecordObjects(
    panel,
    "regions",
    readRegion,
    (id, region) => {
      const current = published.get(id);
      if (!current || !region.weathers.includes(current as never))
        published.set(id, region.weathers[0]);
      const timer = every(
        region.changeMinutes * 60_000,
        () => {
          const list = region.weathers;
          const at = list.indexOf(published.get(id) as never);
          published.set(
            id,
            list[(at + 1 + Math.floor(Math.random() * 2)) % list.length],
          );
        },
        { name: `region ${id}` },
      );
      return () => {
        timer.stop();
        if (!regions.records.has(id)) published.set(id, undefined);
      };
    },
  );
  // Regions deleted while the resource was stopped (GlobalState outlives a restart).
  for (const id of published.ids())
    if (!regions.records.has(id)) published.set(id, undefined);
}
