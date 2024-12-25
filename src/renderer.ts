// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

const { ipcRenderer } = require("electron");
const Konva = require("konva");
const { gridSize } = require("./utils/gridUtils");
const moveHandleSize = 20;

const devtoolsButton = document.getElementById("toggle-devtools");
let isDevToolsOpen = false;

const settingsButton = document.getElementById("settings-button");
const settingsCheckbox = document.getElementById("settings-input") as HTMLInputElement;
let isEditing = false;

/** @type {import('./models/Position').Position} */
let widgetPositions = new Map();

if (devtoolsButton) {
  devtoolsButton.addEventListener("click", () => {
    isDevToolsOpen = !isDevToolsOpen;
    ipcRenderer.send("toggle-devtools", isDevToolsOpen);
  });
}

if (settingsButton) {
  settingsButton.addEventListener("click", () => {
    isEditing = !isEditing;
    settingsCheckbox.checked = isEditing;
    const gridStack = document.getElementById("grid-stack");
    if (gridStack) {
      gridStack.style.display = isEditing ? "block" : "none";
    }
    if (devtoolsButton) {
      devtoolsButton.style.display = isEditing ? "inline-flex" : "none";
    }
    if (!isEditing) {
      ipcRenderer.send("update-widget-positions", widgetPositions, true);
    }
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
    });

    const resizeHandle = new Konva.Circle({
      x: snapToGrid(position.x) + position.width,
      y: snapToGrid(position.y) + position.height,
      radius: 8,
      fill: "transparent",
      stroke: "gray",
      strokeWidth: 2,
      draggable: true,
      shadowColor: "black",
      shadowBlur: 10,
      shadowOffset: { x: 2, y: 2 },
      shadowOpacity: 0.5,
    });

    const moveHandle = new Konva.Rect({
      x: snapToGrid(position.x) + position.width,
      y: snapToGrid(position.y) - moveHandleSize,
      width: moveHandleSize,
      height: moveHandleSize,
      fill: "transparent",
      stroke: "gray",
      strokeWidth: 2,
      draggable: true,
      shadowColor: "black",
      shadowBlur: 10,
      shadowOffset: { x: 2, y: 2 },
      shadowOpacity: 0.5,
    });

    // Drag and drop
    moveHandle.on("dragmove", () => {
      const newX = snapToGrid(moveHandle.x() - widgetRect.width());
      const newY = snapToGrid(moveHandle.y() + moveHandleSize);
      widgetRect.position({ x: newX, y: newY });
      resizeHandle.position({
        x: newX + widgetRect.width(),
        y: newY + widgetRect.height(),
      });
      moveHandle.position({
        x: newX + widgetRect.width(),
        y: newY - moveHandleSize,
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

      moveHandle.position({
        x: widgetRect.x() + newWidth,
        y: widgetRect.y() - moveHandleSize,
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

    ipcRenderer.send("update-widget-positions", widgetPositions, false);
  }

  // Adjust stage size on window resize
  // window.addEventListener('resize', () => {
  //     stage.width(gridStack.offsetWidth);
  //     stage.height(gridStack.offsetHeight);
  //     layer.draw();
  //   });
});
