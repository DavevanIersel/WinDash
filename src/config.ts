import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface WidgetConfig {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  touchEnabled: boolean;
}

interface Grid {
  columns: number;
  rows: number;
}

export interface Config {
  grid: Grid;
  widgets: WidgetConfig[];
}

const widgetsFolder = path.join(__dirname, 'widgets');

// Load widget configuration from a YAML file
const loadWidgetConfig = (filename: string): WidgetConfig | null => {
  const filePath = path.join(widgetsFolder, filename);
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents) as WidgetConfig;
  } catch (e) {
    console.error(`Error reading YAML file ${filename}:`, e);
    return null;
  }
};

// Load all widgets by reading the folder and filtering YAML files
const loadAllWidgets = (): WidgetConfig[] => {
  try {
    return fs
      .readdirSync(widgetsFolder)
      .filter((file) => file.endsWith('.widget.yaml'))
      .map(loadWidgetConfig)
      .filter((config) => config !== null) as WidgetConfig[];
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
