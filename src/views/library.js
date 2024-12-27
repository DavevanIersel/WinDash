const { ipcRenderer } = require("electron");

ipcRenderer.on("update-widgets", (_event, widgets) => {
  const container = document.getElementById("widget-table-data");

  // Clear existing rows
  container.innerHTML = "";

  widgets.forEach((widget) => {
    const widgetRow = document.createElement("tr");

    const status = document.createElement("td");
    status.classList.add("text-center", "whitespace-nowrap");
    const statusBadge = document.createElement("div");
    statusBadge.classList.add(
      "badge",
      "badge-sm",
      widget.enabled ? "badge-success" : "badge-error"
    );
    status.appendChild(statusBadge);
    widgetRow.appendChild(status);

    const name = document.createElement("td");
    name.classList.add("whitespace-nowrap");
    name.textContent = widget.name;
    widgetRow.appendChild(name);

    const description = document.createElement("td");
    description.style.width = "90%";
    description.textContent = widget.description;
    widgetRow.appendChild(description);

    const action = document.createElement("td");
    action.classList.add("whitespace-nowrap");

    //Toggle widget input
    const toggleWidgetInput = document.createElement("input");
    toggleWidgetInput.checked = widget.enabled;
    toggleWidgetInput.type = 'checkbox';
    toggleWidgetInput.classList.add("toggle", "toggle-success")
    toggleWidgetInput.addEventListener("change", (event) => {
      if (event.target.checked) {
        onEnabled(widget);
      } else {
        onDisabled(widget);
      }
    });

    action.appendChild(toggleWidgetInput);
    widgetRow.appendChild(action);

    container.appendChild(widgetRow);
  });
});

function onEnabled(widget) {
  widget.enabled = true;
  ipcRenderer.send("update-widget-data", widget);
}

function onDisabled(widget) {
  widget.enabled = false;
  ipcRenderer.send("update-widget-data", widget);
}
