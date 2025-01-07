import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { screen } from "electron";
import { Settings } from "../models/Settings";

const SETTINGS_FILE_NAME = "settings.json";
const WIDGETS_DIR = "../widgets";

const settingsFilePath = require.main?.filename.includes("app.asar")
  ? join(app.getPath("userData"), "widgets", SETTINGS_FILE_NAME)
  : join(__dirname, WIDGETS_DIR, SETTINGS_FILE_NAME);

export function getSettings(): Settings | null {
  if (!existsSync(settingsFilePath)) {
    const primaryDisplay = screen.getPrimaryDisplay();
    return {
      displayId: primaryDisplay.id,
      displayResolution: {
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
      },
      displayX: primaryDisplay.bounds.x,
      displayY: primaryDisplay.bounds.y,
      firstLaunch: true,
    };
  }

  try {
    const fileContents = readFileSync(settingsFilePath, "utf8");
    return JSON.parse(fileContents) as Settings;
  } catch (e) {
    console.error(`Error reading settings file:`, e);
    return null;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    settings.firstLaunch = false;
    const jsonContent = JSON.stringify(settings, null, 2);
    writeFileSync(settingsFilePath, jsonContent, "utf8");
  } catch (e) {
    console.error(`Error saving settings file:`, e);
  }
}
