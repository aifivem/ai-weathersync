# ai-weathersync

Time and weather, the same for every player, set in the admin panel (speed, start hour, freeze, weather list and change interval, blackout). Stands in for `qb-weathersync`. Depends on ai-core (admin panel).

## Decisions

- The server publishes only changes as GlobalState: `ai:clock` (`{ base, at, scale, frozen }`, game minutes at a server time) and `ai:weather` (`{ type, blackout }`). Clients run the clock themselves on a 2 s timer with a server time offset taken once (`ai-weathersync:now`); no per-minute broadcasts.
- A panel change re-bases the clock at the current game time, so changing the speed does not jump the hour.
- Dynamic weather steps through the panel's list (one or two steps each change).
- Regions (panel `regions`: centre, radius, own weather list and interval) step on their own server timers, published as GlobalState `ai:rweather:<id>`; a client inside one (a tall cylinder) shows the smallest region's weather instead of the world's.
- Snow weather (XMAS, SNOW, SNOWLIGHT, BLIZZARD): the white ground pass and tracks (`ForceSnowPass`, panel switch) and the wheel grip lost in xmas snow (`SetVehicleXmasSnowFactor`, panel value, GTA default 0.2).
- Blackout, a frozen clock and dynamic weather can be changed at runtime through the exports (admin commands through ai-core's world layer); they hold until the panel setting changes or the resource restarts.

## Contracts

- GlobalState `ai:clock`, `ai:weather`. Exports (own and `qb-weathersync`, its whole contract): `setWeather`, `setTime`, `setBlackout`, `setTimeFreeze`, `setDynamicWeather`, `nextWeatherStage`, `getWeatherState`, `getTime`, `getBlackoutState`, `getTimeFreezeState`, `getDynamicWeather`; scripts reach them through ai-core (lib `world`). Client events `qb-weathersync:client:DisableSync` / `EnableSync` pause the sync (interiors).

## Entry points

- Server: clock, weather, panel schema `resource/server/index.ts`. Client: `resource/client/index.ts`.
