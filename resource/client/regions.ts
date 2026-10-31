import {
  AdminWorld,
  GlobalGroup,
  stateString,
  Zones,
} from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import {
  readRegion,
  readSettings,
  REGION_PREFIX,
  type Region,
  type Settings,
} from "common/world";

/**
 * The regions this player stands in (panel `regions`, a tall cylinder each) and the snow settings: the smallest
 * region the player is in decides the weather shown, outside every region the world's weather shows.
 */
export class Regions {
  private readonly world = new AdminWorld(["settings", "regions"]);
  private readonly zones = new Zones();
  private readonly weathers = new GlobalGroup(REGION_PREFIX, stateString);
  private readonly inside = new Map<string, Region>();
  private readonly view = this.world.view("settings", readSettings);

  get settings(): Settings {
    return this.view.value;
  }

  constructor(private readonly onChange: (weather: string | null) => void) {
    // One zone per region; an edit replaces only that region's zone (a replaced or removed zone fires its exit).
    new RecordObjects(this.world, "regions", readRegion, (id, region) => {
      this.zones.add(id, {
        shape: {
          type: "cylinder",
          center: region.center,
          radius: region.radius,
          height: 2000,
        },
        interval: 2000,
        onEnter: () => {
          this.inside.set(id, region);
          this.onChange(this.current());
        },
        onExit: () => {
          this.inside.delete(id);
          this.onChange(this.current());
        },
      });
      return () => this.zones.remove(id);
    });
    this.onChange(this.current());
    this.world.onChange("settings", () => {
      SetVehicleXmasSnowFactor(this.settings.snowGrip);
      this.onChange(this.current());
    });
    this.weathers.onChange(
      (id) => this.inside.has(id) && this.onChange(this.current()),
    );
    SetVehicleXmasSnowFactor(this.settings.snowGrip);
  }

  /** The weather of the smallest region the player is in, or null. */
  current(): string | null {
    let best: Region | null = null;
    for (const r of this.inside.values())
      if (!best || r.radius < best.radius) best = r;
    return best ? (this.weathers.get(best.id) ?? null) : null;
  }
}
