// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

/** @type {import('./models/Position').Position} */
let widgets = new Map();

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) {
      element.innerText = text;
    }
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(
      `${type}-version`,
      process.versions[type as keyof NodeJS.ProcessVersions]
    );
  }

  //Set widget locations for click pass through
  ipcRenderer.on("widget-location-update-for-preload", (event, positions) => {
    widgets = positions;
  });

  const isInteractive = (el: Element | null): boolean => {
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    for (let [id, position] of widgets) {
      if (
        rect.left >= position.x &&
        rect.right <= position.x + position.width &&
        rect.top >= position.y &&
        rect.bottom <= position.y + position.height
      ) {
        return true;
      }
    }

    if (
      ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "CANVAS", "DIV", "LABEL", "I"].includes(el.tagName)
    ) {
      return true;
    }

    return el.classList.contains("interactive");
  };

  // Widgets are on a different layer to the renderer layer, meaning no mouse events are thrown in a view
  // Reset click-through state when leaving the renderer layer (going into a view)
  document.addEventListener("mouseleave", (e) => {
    ipcRenderer.send("set-click-through", false);
  });

  // Check if mouse should pass through
  document.addEventListener("mousemove", (e) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    ipcRenderer.send("set-click-through", (element && !isInteractive(element)));
  });
});
