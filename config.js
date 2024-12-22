import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const dirname = path.resolve();

const widgetsFolder = path.join(dirname, 'widgets');

const loadWidgetConfig = (filename) => {
    const filePath = path.join(widgetsFolder, filename);
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error(`Error reading YAML file ${filename}:`, e);
        return null;
    }
};

const loadAllWidgets = () => {
    try {
        return fs
            .readdirSync(widgetsFolder)
            .filter((file) => file.endsWith('.widget.yaml'))
            .map(loadWidgetConfig)
            .filter((config) => config !== null);
    } catch (e) {
        console.error('Error reading widgets folder:', e);
        return [];
    }
};

export default {
    grid: {
        columns: 18,
        rows: 10
    },
    widgets: loadAllWidgets()
};
