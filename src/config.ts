import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { Widget } from './models/Widget';

interface Grid {
  columns: number;
  rows: number;
}

export interface Config {
  grid: Grid;
  widgets: Widget[];
}

const widgetsFolder = path.join(__dirname, 'widgets');

// Load widget configuration from a YAML file
const loadWidgetConfig = (filename: string): Widget | null => {
  const filePath = path.join(widgetsFolder, filename);
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents) as Widget;
  } catch (e) {
    console.error(`Error reading YAML file ${filename}:`, e);
    return null;
  }
};

// Load all widgets by reading the folder and filtering YAML files
const loadAllWidgets = (): Widget[] => {
  try {
    return fs
      .readdirSync(widgetsFolder)
      .filter((file) => file.endsWith('.widget.yaml'))
      .map(loadWidgetConfig)
      .filter((config) => config !== null && config.enabled) as Widget[];
  } catch (e) {
    console.error('Error reading widgets folder:', e);
    return [];
  }
};

// Define the configuration object with the correct type
const config: Config = {
  grid: {
    columns: 18,
    rows: 10
  },
  widgets: loadAllWidgets()
};

export default config;
