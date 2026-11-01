import { WEATHERS, type FileSpec, type TabSpec } from "@aicore-fivem/shared";

export const settingsFile: FileSpec = {
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
    snowGrip: { type: "number", min: 0, max: 1, optional: true },
    snowGround: { type: "bool", optional: true },
  },
  defaults: { snowGrip: 0.2, snowGround: true },
};

export const settingsTab: TabSpec = {
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
    {
      icon: "snowflake",
      title: "ADMIN_C_SNOW",
      desc: "ADMIN_C_SNOW_DESC",
      fields: [
        {
          widget: "number",
          path: "snowGrip",
          label: "ADMIN_F_SNOW_GRIP",
          hint: "ADMIN_H_SNOW_GRIP",
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          widget: "switch",
          path: "snowGround",
          label: "ADMIN_F_SNOW_GROUND",
          hint: "ADMIN_H_SNOW_GROUND",
        },
      ],
    },
  ],
};
