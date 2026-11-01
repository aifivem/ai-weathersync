import type { PanelSchema } from "@aicore-fivem/shared";
import { regionsFile, regionsTab } from "./regions";
import { settingsFile, settingsTab } from "./settings";

/** ai-weathersync's panel: how time runs and how the weather changes. */
export const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "sliders",
  files: {
    settings: settingsFile,
    regions: regionsFile,
  },
  tabs: [settingsTab, regionsTab],
};
