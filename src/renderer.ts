// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

const { ipcRenderer } = require("electron");
const Konva = require("konva");
const { gridSize } = require("./utils/gridUtils");
const moveHandleSize = 20;

let isEditing = false;

/** @type {import('./models/Position').Position} */
let widgetPositions = new Map();

let widgetIdToKonvaGroupMap = new Map();

//Grid systems
document.addEventListener("DOMContentLoaded", () => {
  const stage = new Konva.Stage({
    container: "grid-stack",
    width: 1920, // offsetwidth still to fix
    height: 1080, // offset height fix
  });
  
  ipcRenderer.on("start-drag-and-drop", () => {
    console.log(" hia")
    isEditing = true;
    const gridStack = document.getElementById("grid-stack");
    if (gridStack) {
      gridStack.style.display = "block";
    }
  });

  ipcRenderer.on("stop-drag-and-drop", () => {
    isEditing = false;
    const gridStack = document.getElementById("grid-stack");
    if (gridStack) {
      gridStack.style.display = "none";
    }
    ipcRenderer.send("update-widget-positions", widgetPositions, true);
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  ipcRenderer.on(
    "create-draggable-widget",
    (_event, widgetId, viewId, x, y, width, height) => {
      createDraggableWidget(widgetId, viewId, { x, y, width, height });
    }
  );

  ipcRenderer.on("remove-draggable-widget", (_event, widget) => {
    widgetIdToKonvaGroupMap.get(widget.id).destroy();
    widgetIdToKonvaGroupMap.delete(widget.id);
    for (const [viewId, position] of widgetPositions) {
      if (position.widgetId === widget.id) {
          widgetPositions.delete(viewId);
          break;
      }
  }
    layer.draw();
  });

  function createDraggableWidget(
    widgetId: string,
    viewId: number,
    position: { x: number; y: number; width: number; height: number }
  ) {
    widgetPositions.set(viewId, {...position, widgetId: widgetId});

    const widgetGroup = new Konva.Group({
      x: snapToGrid(position.x),
      y: snapToGrid(position.y),
      draggable: true,
    });
    widgetGroup.width(position.width);
    widgetGroup.height(position.height);

    const resizeHandle = new Konva.Circle({
      x: 0 + position.width,
      y: 0 + position.height,
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
      x: 0 + position.width,
      y: 0 - moveHandleSize,
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
      const newX = snapToGrid(
        widgetGroup.x() + moveHandle.x() - widgetGroup.width()
      );
      const newY = snapToGrid(
        widgetGroup.y() + moveHandle.y() + moveHandleSize
      );
      widgetGroup.position({ x: newX, y: newY });

      moveHandle.position({
        x: widgetGroup.width(),
        y: -moveHandleSize,
      });

      updateWidgetPosition(widgetId, viewId, { x: newX, y: newY });
      layer.draw();
    });

    // Resize
    resizeHandle.on("dragmove", () => {
      const newWidth = Math.max(snapToGrid(resizeHandle.x()), gridSize);
      const newHeight = Math.max(snapToGrid(resizeHandle.y()), gridSize);
      widgetGroup.width(newWidth);
      widgetGroup.height(newHeight);

      resizeHandle.position({
        x: newWidth,
        y: newHeight,
      });

      moveHandle.position({
        x: newWidth,
        y: -moveHandleSize,
      });

      updateWidgetPosition(widgetId, viewId, { width: newWidth, height: newHeight });
      layer.draw();
    });

    widgetGroup.add(resizeHandle);
    widgetGroup.add(moveHandle);
    layer.add(widgetGroup);
    widgetIdToKonvaGroupMap.set(widgetId, widgetGroup);
    layer.draw();
  }

  function snapToGrid(value: number) {
    return Math.round(value / gridSize) * gridSize;
  }

  function updateWidgetPosition(
    widgetId: string,
    viewId: number,
    newPos: { x?: number; y?: number; width?: number; height?: number }
  ): void {
    const oldPos = widgetPositions.get(viewId);
    widgetPositions.set(viewId, {
      widgetId: widgetId,
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
