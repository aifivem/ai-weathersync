import { AdminPanel } from "@aicore-fivem/lib/server";
import { readSettings } from "common/world";
import { schema } from "./schema";

export const panel = new AdminPanel(schema);
const settings = panel.view("settings", readSettings);
/** Panel settings, kept current by the panel's view. */
export const content = {
  get settings() {
    return settings.value;
  },
};
