import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Widget } from './models/Widget';
import { gridToPixelCoordinates, pixelsToGridCoordinates } from './utils/gridUtils';

const WIDGET_FILE_EXTENSION = '.widget.yaml';

const isPackaged = process.mainModule?.filename.includes('app.asar');
const baseFolder = isPackaged
  ? app.getPath('userData')
  : __dirname;

const widgetsFolder = path.join(baseFolder, 'widgets');

if (!fs.existsSync(widgetsFolder)) {
  fs.mkdirSync(widgetsFolder, { recursive: true });
}

interface Grid {
  columns: number;
  rows: number;
}

export interface Config {
  widgets: Widget[];
  saveWidget: (widget: Widget) => void;
}

const loadWidgetConfig = (filename: string): Widget | null => {
  const archiveFilePath = path.join(__dirname, 'widgets', filename);
  const writableFilePath = path.join(widgetsFolder, filename);

  const filePath = fs.existsSync(writableFilePath)
    ? writableFilePath
    : archiveFilePath;

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const widget = yaml.load(fileContents) as Widget;
    const size = gridToPixelCoordinates(widget.x, widget.y, widget.width, widget.height);
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

const loadAllWidgets = (): Widget[] => {
  try {
    return fs
      .readdirSync(widgetsFolder)
      .filter((file) => file.endsWith(WIDGET_FILE_EXTENSION))
      .map(loadWidgetConfig)
      .filter((config) => config !== null && config.enabled) as Widget[];
  } catch (e) {
    console.error('Error reading widgets folder:', e);
    return [];
  }
};

const saveWidgetConfig = (widget: Widget) => {
  const filename = `${widget.id}${WIDGET_FILE_EXTENSION}`;
  const filePath = path.join(widgetsFolder, filename);

  console.log(`Saving widget to: ${filePath}`);

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
    const yamlString = yaml.dump(widgetToSave);
    fs.writeFileSync(filePath, yamlString, 'utf8');
  } catch (e) {
    console.error(`Error saving widget to file ${filename}:`, e);
  }
};

const config: Config = {
  widgets: loadAllWidgets(),
  saveWidget: saveWidgetConfig,
};

export default config;
