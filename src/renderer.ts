// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features

// needed in the renderer process.
const { ipcRenderer } = require("electron");
const Konva = require("konva");

const devtoolsButton = document.getElementById("toggle-devtools");
let isDevToolsOpen = false;

/** @type {import('./models/Position').Position} */
let widgetPositions = new Map();

if (devtoolsButton) {
  devtoolsButton.addEventListener("click", () => {
    isDevToolsOpen = !isDevToolsOpen;
    const gridStack = document.getElementById("grid-stack");
    if (gridStack) {
      gridStack.style.display = isDevToolsOpen ? "block" : "none";
    }
    ipcRenderer.send("toggle-devtools", isDevToolsOpen, widgetPositions);
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

  function snapToGrid(value: number) {
    return Math.round(value / gridSize) * gridSize;
  }

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

    // Create a rectangle representing the widget
    const rect = new Konva.Rect({
      width: position.width,
      height: position.height,
      fill: "#ff0000",
      stroke: "#000",
      strokeWidth: 2,
    });
    group.add(rect);

    // Add snapping behavior on drag
    group.on("dragend", () => {
        const newX = snapToGrid(group.x());
        const newY = snapToGrid(group.y());
        group.position({ x: newX, y: newY });
  
        // Update the position in the widgetPositions map

        const oldPos = widgetPositions.get(id);
        widgetPositions.set(id, {
          x: newX,
          y: newY,
          width: oldPos.width,
          height: oldPos.height,
        });
        console.log(widgetPositions);
  
        layer.draw();
      });

    // Create a resize handle (small draggable circle)
    const handle = new Konva.Circle({
      x: position.width,
      y: position.height,
      radius: 6,
      fill: "red",
      draggable: true,
    });
    group.add(handle);

    // Handle resizing logic
    handle.on("dragmove", () => {
        const newWidth = Math.max(snapToGrid(handle.x()), gridSize);
        const newHeight = Math.max(snapToGrid(handle.y()), gridSize);
        rect.width(newWidth);
        rect.height(newHeight);
        handle.x(newWidth);
        handle.y(newHeight);
  
        // Update the size in the widgetPositions map
        const oldPos = widgetPositions.get(id);
        widgetPositions.set(id, {
          x: oldPos.x,
          y: oldPos.y,
          width: newWidth,
          height: newHeight,
        });
  
        console.log(widgetPositions);
  
        layer.draw();
      });

    layer.add(group);
    layer.draw();
  }

  ipcRenderer.on(
    "create-draggable-widget",
    (event, id, x, y, width, height) => {
      createDraggableWidget(id, { x, y, width, height });
    }
  );

  // Adjust stage size on window resize
  // window.addEventListener('resize', () => {
  //     stage.width(gridStack.offsetWidth);
  //     stage.height(gridStack.offsetHeight);
  //     layer.draw();
  //   });
});
