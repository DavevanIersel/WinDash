import * as path from "path";
import { app } from "electron";
import { Widget } from "./models/Widget";
import {
  gridToPixelCoordinates,
  pixelsToGridCoordinates,
} from "./utils/gridUtils";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { join } from "path";

const WIDGET_FILE_EXTENSION = ".widget.json";

const isPackaged = process.mainModule?.filename.includes("app.asar");
const baseFolder = isPackaged ? app.getPath("userData") : __dirname;

const widgetsFolder = path.join(baseFolder, "widgets");

if (!existsSync(widgetsFolder)) {
  mkdirSync(widgetsFolder, { recursive: true });
}

interface Grid {
  columns: number;
  rows: number;
}

export interface Config {
  enabledWidgets: Widget[];
  allWidgets: Widget[];
  saveWidget: (widget: Widget) => void;
}

const loadWidgetConfig = (filename: string): Widget | null => {
  const archiveFilePath = path.join(__dirname, "widgets", filename);
  const writableFilePath = path.join(widgetsFolder, filename);

  const filePath = existsSync(writableFilePath)
    ? writableFilePath
    : archiveFilePath;

  try {
    const fileContents = readFileSync(filePath, "utf8");
    const widget = JSON.parse(fileContents) as Widget;
    const size = gridToPixelCoordinates(
      widget.x,
      widget.y,
      widget.width,
      widget.height
    );
    return {
      ...widget,
      id: filename.slice(0, -WIDGET_FILE_EXTENSION.length),
      x: size.pixelX,
      y: size.pixelY,
      width: size.pixelWidth,
      height: size.pixelHeight,
    };
  } catch (e) {
    console.error(`Error reading YAML file ${filename}:`, e);
    return null;
  }
};

const getWidgetFiles = (dir: string, baseDir: string = dir): string[] => {
  const entries = readdirSync(dir, { encoding: "utf-8" });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      files.push(...getWidgetFiles(fullPath, baseDir));
    } else if (fullPath.endsWith(WIDGET_FILE_EXTENSION)) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
};

const loadWidgets = (loadDisabled: boolean): Widget[] => {
  return getWidgetFiles(widgetsFolder)
    .map((file) => loadWidgetConfig(file))
    .filter(
      (config): config is Widget =>
        loadDisabled || (config !== null && config.enabled)
    );
};

const saveWidgetConfig = (widget: Widget) => {
  const filename = `${widget.id}${WIDGET_FILE_EXTENSION}`;
  const filePath = path.join(widgetsFolder, filename);

  const widgetIndex = config.allWidgets.findIndex((w) => w.id === widget.id);
  if (widgetIndex !== -1) {
    config.allWidgets[widgetIndex] = widget;
  } else {
    config.allWidgets.push(widget);
  }

  const gridCoordinates = pixelsToGridCoordinates(
    widget.x,
    widget.y,
    widget.width,
    widget.height
  );

  const widgetToSave = {
    ...widget,
    x: gridCoordinates.gridX,
    y: gridCoordinates.gridY,
    width: gridCoordinates.gridWidth,
    height: gridCoordinates.gridHeight,
  };

  try {
    const jsonWidget = JSON.stringify(widgetToSave, null, 2);
    writeFileSync(filePath, jsonWidget, "utf8");
  } catch (e) {
    console.error(`Error saving widget to file ${filename}:`, e);
  }
};

const config: Config = {
  enabledWidgets: loadWidgets(false),
  allWidgets: loadWidgets(true),
  saveWidget: saveWidgetConfig,
};

export default config;
