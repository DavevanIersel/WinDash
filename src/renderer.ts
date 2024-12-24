// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

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
  const gridSize = 50;
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
    const group = new Konva.Group({
      x: snapToGrid(position.x),
      y: snapToGrid(position.y),
      draggable: true,
    });

    const widgetRect = new Konva.Rect({
      width: position.width,
      height: position.height,
      fill: "#ff0000",
      stroke: "#000",
      strokeWidth: 2,
    });
    group.add(widgetRect);

    const resizeHandle = new Konva.Circle({
      x: position.width,
      y: position.height,
      radius: 6,
      fill: "red",
      draggable: true,
    });
    group.add(resizeHandle);

    // Drag and drop
    group.on("dragmove", () => {
        const newX = snapToGrid(group.x());
        const newY = snapToGrid(group.y());
        group.position({ x: newX, y: newY });
  
        updateWidgetPosition(id, { x: newX, y: newY });
  
        layer.draw();
    });

    // Resize
    resizeHandle.on("dragmove", () => {
      const newWidth = Math.max(snapToGrid(resizeHandle.x()), gridSize);
      const newHeight = Math.max(snapToGrid(resizeHandle.y()), gridSize);
      widgetRect.width(newWidth);
      widgetRect.height(newHeight);
      resizeHandle.x(newWidth);
      resizeHandle.y(newHeight);

      updateWidgetPosition(id, { width: newWidth, height: newHeight });
      layer.draw();
    });

    layer.add(group);
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
