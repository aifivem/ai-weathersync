# ai-weathersync

Time and weather, the same for every player, set in the admin panel (speed, start hour, freeze, weather list and change interval, blackout). Stands in for `qb-weathersync`. Depends on ai-core (admin panel).

## Decisions

- The server publishes only changes as GlobalState: `ai:clock` (`{ base, at, scale, frozen }`, game minutes at a server time) and `ai:weather` (`{ type, blackout }`). Clients run the clock themselves on a 2 s timer with a server time offset taken once (`ai-weathersync:now`); no per-minute broadcasts.
- A panel change re-bases the clock at the current game time, so changing the speed does not jump the hour.
- Dynamic weather steps through the panel's list (one or two steps each change).

## Contracts

- GlobalState `ai:clock`, `ai:weather`. Exports (own and `qb-weathersync`): `setWeather(type)`, `setTime(hour, minute)`, `getWeatherState()`, `getTime()`. Client events `qb-weathersync:client:DisableSync` / `EnableSync` pause the sync (interiors).

## Entry points

- Server: clock, weather, panel schema `resource/server/index.ts`. Client: `resource/client/index.ts`.
