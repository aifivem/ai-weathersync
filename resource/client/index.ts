import { GlobalKey, triggerServerCallback } from "@aicore-fivem/lib/client";
import { isRecord, record } from "@aicore-fivem/lib/shared";
import {
  EVENTS,
  isWeather,
  KEYS,
  minutesAt,
  toClock,
  type Clock,
} from "common/world";

const clockState = new GlobalKey(KEYS.clock, (v) => toClock(v) ?? undefined);
const weatherState = new GlobalKey(KEYS.weather, (v) => (isRecord(v) ? v : undefined));

/**
 * Applies the server's clock and weather: the clock runs on this client's own timer (server time offset taken once),
 * the weather changes over 15 s when GlobalState says so. Scripts can pause it (interiors) with the qb events.
 */
class Sync {
  private clock: Clock | null = clockState.get() ?? null;
  private weather = "";
  private offset = 0;
  enabled = true;

  async start(): Promise<void> {
    const now: unknown = await triggerServerCallback(EVENTS.now).catch(
      () => null,
    );
    if (typeof now === "number") this.offset = now - Date.now();
    this.applyWeather(weatherState.get(), true);
    setInterval(() => this.tickClock(), 2000);
    this.tickClock();
  }

  setClock(value: unknown): void {
    this.clock = toClock(value);
    this.tickClock();
  }

  applyWeather(value: unknown, instant = false): void {
    const w = record(value);
    if (!this.enabled || !isWeather(w.type)) return;
    SetArtificialLightsState(w.blackout === true);
    SetArtificialLightsStateAffectsVehicles(false);
    if (w.type === this.weather) return;
    this.weather = w.type;
    ClearOverrideWeather();
    ClearWeatherTypePersist();
    SetWeatherTypeOvertimePersist(w.type, instant ? 0 : 15);
    if (instant) SetWeatherTypeNowPersist(w.type);
    SetForceVehicleTrails(
      w.type === "XMAS" || w.type === "SNOW" || w.type === "BLIZZARD",
    );
    SetForcePedFootstepsTracks(
      w.type === "XMAS" || w.type === "SNOW" || w.type === "BLIZZARD",
    );
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
