// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

import { gridSize } from "./utils/gridUtils";

const { ipcRenderer } = require("electron");
const Konva = require("konva");

const devtoolsButton = document.getElementById("toggle-devtools");
let isDevToolsOpen = false;

const editButton = document.getElementById("edit");
let isEditing = false;

/** @type {import('./models/Position').Position} */
let widgetPositions = new Map();

if (devtoolsButton) {
  devtoolsButton.addEventListener("click", () => {
    isDevToolsOpen = !isDevToolsOpen;
    ipcRenderer.send("toggle-devtools", isDevToolsOpen);
  });
}

if (editButton) {
  editButton.addEventListener("click", () => {
    isEditing = !isEditing;
    const gridStack = document.getElementById("grid-stack");
    if (gridStack) {
      gridStack.style.display = isEditing ? "block" : "none";
    }
    ipcRenderer.send("toggle-edit", isEditing, widgetPositions);
  });
}

//Grid systems
document.addEventListener("DOMContentLoaded", () => {
  const stage = new Konva.Stage({
    container: "grid-stack",
    width: 1920, // offsetwidth still to fix
    height: 1080, // offset height fix
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  ipcRenderer.on(
    "create-draggable-widget",
    (event, id, x, y, width, height) => {
      createDraggableWidget(id, { x, y, width, height });
    }
  );

  function createDraggableWidget(
    id: number,
    position: { x: number; y: number; width: number; height: number }
  ) {
    widgetPositions.set(id, position);

    const widgetRect = new Konva.Rect({
      x: snapToGrid(position.x),
      y: snapToGrid(position.y),
      width: position.width,
      height: position.height,
      fill: "#ff0000",
      stroke: "#000",
      strokeWidth: 2,
      draggable: true,
    });

    const resizeHandle = new Konva.Circle({
      x: snapToGrid(position.x) + position.width,
      y: snapToGrid(position.y) + position.height,
      radius: 6,
      fill: "red",
      draggable: true,
    });

    const moveHandle = new Konva.Rect({
      x: snapToGrid(position.x) + position.width,
      y: snapToGrid(position.y) - 20,
      width: 20,
      height: 20,
      radius: 6,
      fill: "blue",
      draggable: true,
    });

    // Drag and drop
    moveHandle.on("dragmove", () => {
      const newX = snapToGrid(moveHandle.x() - widgetRect.width());
      const newY = snapToGrid(moveHandle.y() + 20);
      widgetRect.position({ x: newX, y: newY });
      resizeHandle.position({
        x: newX + widgetRect.width(),
        y: newY + widgetRect.height(),
      });
      moveHandle.position({
        x: newX + widgetRect.width(),
        y: newY - 20,
      });

      updateWidgetPosition(id, { x: newX, y: newY });
      layer.draw();
    });

    // Resize
    resizeHandle.on("dragmove", () => {
      const newWidth = Math.max(
        snapToGrid(resizeHandle.x() - widgetRect.x()),
        gridSize
      );
      const newHeight = Math.max(
        snapToGrid(resizeHandle.y() - widgetRect.y()),
        gridSize
      );
      widgetRect.width(newWidth);
      widgetRect.height(newHeight);
      resizeHandle.position({
        x: widgetRect.x() + newWidth,
        y: widgetRect.y() + newHeight,
      });

      updateWidgetPosition(id, { width: newWidth, height: newHeight });
      layer.draw();
    });

    layer.add(widgetRect);
    layer.add(resizeHandle);
    layer.add(moveHandle);
    layer.draw();
  }

  function snapToGrid(value: number) {
    return Math.round(value / gridSize) * gridSize;
  }

  function updateWidgetPosition(
    id: number,
    newPos: { x?: number; y?: number; width?: number; height?: number }
  ): void {
    const oldPos = widgetPositions.get(id);
    widgetPositions.set(id, {
      x: newPos.x ?? oldPos.x,
      y: newPos.y ?? oldPos.y,
      width: newPos.width ?? oldPos.width,
      height: newPos.height ?? oldPos.height,
    });

    ipcRenderer.send("toggle-edit", false, widgetPositions);
  }

  // Adjust stage size on window resize
  // window.addEventListener('resize', () => {
  //     stage.width(gridStack.offsetWidth);
  //     stage.height(gridStack.offsetHeight);
  //     layer.draw();
  //   });
});
