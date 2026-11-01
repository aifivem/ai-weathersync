import { WEATHERS, type FileSpec, type TabSpec } from "@aicore-fivem/shared";

export const regionsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    center: { x: 0, y: 0, z: 0 },
    radius: 600,
    weathers: ["SNOW", "SNOWLIGHT"],
    changeMinutes: 20,
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    center: { type: "vec3" },
    radius: { type: "number", min: 50, max: 6000, integer: true },
    weathers: {
      type: "names",
      max: 15,
      itemMax: 16,
      pattern: `^(${WEATHERS.join("|")})$`,
    },
    changeMinutes: { type: "number", min: 1, max: 600, integer: true },
  },
};

export const regionsTab: TabSpec = {
  id: "regions",
  file: "regions",
  icon: "map",
  label: "ADMIN_TAB_REGIONS",
  desc: "ADMIN_TAB_REGIONS_DESC",
  listSub: "weathers",
  createLabel: "ADMIN_NEW_REGION",
  deleteLabel: "ADMIN_DELETE_REGION",
  cards: [
    {
      icon: "map",
      title: "ADMIN_C_REGION",
      desc: "ADMIN_C_REGION_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_REGION_NAME",
          placeholder: "ADMIN_P_REGION_NAME",
          suggest: { from: "center" },
        },
        {
          widget: "point",
          path: "center",
          label: "ADMIN_F_REGION_CENTER",
          hint: "ADMIN_H_REGION_CENTER",
          ground: true,
        },
        {
          widget: "number",
          path: "radius",
          label: "ADMIN_F_REGION_RADIUS",
          hint: "ADMIN_H_REGION_RADIUS",
          min: 50,
          max: 6000,
          step: 50,
          unit: "m",
        },
        {
          widget: "tags",
          path: "weathers",
          label: "ADMIN_F_WEATHERS",
          hint: "ADMIN_H_REGION_WEATHERS",
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
      ],
    },
  ],
};
