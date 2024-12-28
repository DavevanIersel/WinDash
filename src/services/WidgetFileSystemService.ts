import { app } from "electron";
import { Widget } from "../models/Widget";
import {
  gridToPixelCoordinates,
  pixelsToGridCoordinates,
} from "../utils/gridUtils";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import { v4 as uuidv4 } from "uuid";

const WIDGET_FILE_EXTENSION = ".widget.json";
const WIDGET_FOLDER_RELATIVE_PATH = "./widgets";
const FILE_ENCODING = "utf8";

const isPackaged = require.main?.filename.includes("app.asar");
const widgetsFolder = isPackaged
  ? join(app.getPath("userData"), WIDGET_FOLDER_RELATIVE_PATH)
  : join(__dirname, `.${WIDGET_FOLDER_RELATIVE_PATH}`);

if (!existsSync(widgetsFolder)) {
  mkdirSync(widgetsFolder, { recursive: true });
}

class WidgetFileSystemService {
  private widgets: Widget[] = [];

  constructor() {
    this.widgets = this.getWidgetFileContentsRecursive(widgetsFolder).map(
      (widgetFile) => this.loadWidgetConfig(widgetFile)
    );
  }

  private getWidgetFileContentsRecursive(
    dir: string,
    baseDir: string = dir
  ): string[] {
    const files = readdirSync(dir, { encoding: "utf-8" });
    const fileContents: string[] = [];

    for (const file of files) {
      const fullPath = join(dir, file);

      if (statSync(fullPath).isDirectory()) {
        fileContents.push(
          ...this.getWidgetFileContentsRecursive(fullPath, baseDir)
        );
      } else if (fullPath.endsWith(WIDGET_FILE_EXTENSION)) {
        fileContents.push(relative(baseDir, fullPath));
      }
    }

    return fileContents;
  }

  private loadWidgetConfig(filename: string): Widget | null {
    const distWidgetsFilePath = join(
      __dirname,
      WIDGET_FOLDER_RELATIVE_PATH,
      filename
    );
    const writableFilePath = join(widgetsFolder, filename);

    const filePath = existsSync(writableFilePath)
      ? writableFilePath
      : distWidgetsFilePath;

    try {
      const fileContents = readFileSync(filePath, FILE_ENCODING);
      const widget = JSON.parse(fileContents) as Widget;
      const pixelCoordinates = gridToPixelCoordinates(
        widget.x,
        widget.y,
        widget.width,
        widget.height
      );
      
      return {
        ...widget,
        id: uuidv4(),
        fileName: filename,
        ...pixelCoordinates,
      };
    } catch (e) {
      console.error(`Error reading JSON file ${filename}:`, e);
      return null;
    }
  }

  public getWidgets(includeDisabled: boolean) {
    return this.widgets.filter((widget) => includeDisabled || widget.enabled);
  }

  public toSafeWidgetName(name: string): string {
    let safeName = name
      .replace(/\s+/g, '-')
      .replace(/[<>:"/\\|?*]/g, '');
  
    safeName = safeName.substring(0, 30);
  
    let newName = `${safeName}/${safeName}.widget.json`;
    let fullPath = join(widgetsFolder, newName);
  
    let counter = 1;
    while (existsSync(fullPath)) {
      newName = `${safeName} (${counter})/${safeName} (${counter}).widget.json`;
      newName = newName.substring(0, 40);
      fullPath = join(widgetsFolder, newName);
      counter++;
    }
  
    return newName;
  }

  public saveWidgetConfig(widget: Widget) {
    const filePath = join(widgetsFolder, widget.fileName);
    this.updateWidgetInMemory(widget);
  
    const gridCoordinates = pixelsToGridCoordinates(
      widget.x,
      widget.y,
      widget.width,
      widget.height
    );
  
    const widgetToSave = {
      ...widget,
      ...gridCoordinates,
    };
  
    try {
      const dirPath = join(widgetsFolder, dirname(widget.fileName));
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true }); 
      }
  
      const jsonContent = JSON.stringify(widgetToSave, null, 2);
  
      writeFileSync(filePath, jsonContent, FILE_ENCODING);
    } catch (e) {
      console.error(`Error saving widget to file ${widget.fileName}:`, e);
    }
  }

  public updateWidgetInMemory(widget: Widget) {
    const widgetIndex = this.widgets.findIndex((w) => w.id === widget.id);
    if (widgetIndex !== -1) {
      this.widgets[widgetIndex] = widget;
    } else {
      this.widgets.push(widget);
    }
  }
}

export default WidgetFileSystemService;
