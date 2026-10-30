import {
  every,
  GlobalKey,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { isRecord, record } from "@aicore-fivem/lib/shared";
import { isWeather } from "@aicore-fivem/shared";
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
 * the weather changes over 15 s when GlobalState says so (or the region the player is in has its own). Scripts pause it
 * (interiors) with the qb events, through ai-core's world layer (lib `world.pauseSync`).
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
    this.tickClock();
  }

  setClock(value: unknown): void {
    this.clock = toClock(value);
    this.tickClock();
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
      0,
    );
  }
}

const sync = new Sync();
void sync.start();

clockState.onChange((_id, clock) => sync.setClock(clock));
weatherState.onChange((_id, weather) => sync.applyWeather(weather));

// qb-weathersync's client events: other scripts turn the sync off inside interiors and back on after.
on("qb-weathersync:client:DisableSync", () => {
  sync.enabled = false;
});
on("qb-weathersync:client:EnableSync", () => {
  sync.enabled = true;
  sync.applyWeather(weatherState.get(), true);
});
