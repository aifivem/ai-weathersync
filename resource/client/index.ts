import {
  every,
  GlobalKey,
  optionalExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { isRecord, record } from "@aicore-fivem/lib/shared";
import { CORE, isWeather } from "@aicore-fivem/shared";
import {
  EVENTS,
  KEYS,
  minutesAt,
  toClock,
  SNOWY,
  type Clock,
} from "common/world";
import { Regions } from "./regions";

const clockState = new GlobalKey(KEYS.clock, (v) => toClock(v) ?? undefined);
const weatherState = new GlobalKey(KEYS.weather, (v) =>
  isRecord(v) ? v : undefined,
);

/**
 * Applies the server's clock and weather: the clock runs on this client's own timer (server time offset taken once),
 * the weather changes over 15 s when GlobalState says so (or the region the player is in has its own). The game's own
 * clock runs at the server's speed (or is paused while time is frozen), so the 2 s correction never moves it back and
 * forth. Pauses (interiors, other scripts' pause events) come only from ai-core's world layer.
 */
class Sync {
  private clock: Clock | null = clockState.get() ?? null;
  private weather = "";
  private offset = 0;
  enabled = true;
  /** The weather of the region the player is in (null: the world's). */
  private region: string | null = null;
  private last: unknown = null;
  private readonly regions = new Regions((weather) => {
    this.region = weather;
    this.applyWeather(this.last);
  });

  async start(): Promise<void> {
    const now: unknown = await triggerServerCallback(EVENTS.now).catch(
      () => null,
    );
    if (typeof now === "number") this.offset = now - Date.now();
    this.applyWeather(weatherState.get(), true);
    every(2000, () => this.tickClock(), { name: "clock" });
    this.applyRate();
    this.tickClock();
  }

  setClock(value: unknown): void {
    this.clock = toClock(value);
    this.applyRate();
    this.tickClock();
  }

  /** The game's clock speed follows the server's (game minutes per real minute), or stops while time is frozen. */
  applyRate(): void {
    if (!this.enabled || !this.clock) return;
    PauseClock(this.clock.frozen);
    if (!this.clock.frozen && this.clock.scale > 0)
      NetworkOverrideClockMillisecondsPerGameMinute(
        Math.max(1, Math.round(60_000 / this.clock.scale)),
      );
  }

  /** The sync is paused (an interior's own time): the game clock gets GTA's default speed back. */
  release(): void {
    PauseClock(false);
    NetworkOverrideClockMillisecondsPerGameMinute(2000);
  }

  applyWeather(value: unknown, instant = false): void {
    this.last = value;
    const w = record(value);
    const type = this.region ?? w.type;
    if (!this.enabled || !isWeather(type)) return;
    SetArtificialLightsState(w.blackout === true);
    SetArtificialLightsStateAffectsVehicles(false);
    const snowy = SNOWY.has(type);
    ForceSnowPass(snowy && this.regions.settings.snowGround);
    SetForceVehicleTrails(snowy);
    SetForcePedFootstepsTracks(snowy);
    if (type === this.weather) return;
    this.weather = type;
    ClearOverrideWeather();
    ClearWeatherTypePersist();
    SetWeatherTypeOvertimePersist(type, instant ? 0 : 15);
    if (instant) SetWeatherTypeNowPersist(type);
  }

  private tickClock(): void {
    if (!this.enabled || !this.clock) return;
    const minutes = minutesAt(this.clock, Date.now() + this.offset);
    NetworkOverrideClockTime(
      Math.floor(minutes / 60),
      Math.floor(minutes % 60),
      Math.floor((minutes % 1) * 60),
    );
  }
}

const sync = new Sync();
void sync.start();

clockState.onChange((_id, clock) => sync.setClock(clock));
weatherState.onChange((_id, weather) => sync.applyWeather(weather));

// ai-core's world layer counts every pause (lib world.pauseSync and the qb / cd_easytime / vSync events other
// scripts send) and tells this script when the sync is paused or runs again.
function setPaused(paused: boolean): void {
  sync.enabled = !paused;
  if (paused) return sync.release();
  sync.applyRate();
  sync.applyWeather(weatherState.get(), true);
}
on(CORE.clientWorldSyncEvent, (paused: unknown) => setPaused(paused === true));
if (optionalExport("ai-core")?.IsWorldSyncPaused() === true) setPaused(true);
