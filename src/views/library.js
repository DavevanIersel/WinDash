const { ipcRenderer } = require("electron");

ipcRenderer.on("update-widgets", (_event, widgets) => {
  const container = document.getElementById("widget-table-data");

  // Clear existing rows
  container.innerHTML = "";

  // Iterate through widgets and build rows
  widgets.forEach((widget) => {
    const widgetRow = document.createElement("tr");

    // Status column with centered badge
    const status = document.createElement("td");
    status.classList.add("text-center", "whitespace-nowrap"); // Center the badge and prevent wrapping
    const statusBadge = document.createElement("div");
    statusBadge.classList.add(
      "badge",
      "badge-sm",
      widget.enabled ? "badge-success" : "badge-error"
    );
    status.appendChild(statusBadge);
    widgetRow.appendChild(status);

    // Name column, small size
    const name = document.createElement("td");
    name.classList.add("whitespace-nowrap"); // Prevent wrapping for name column
    name.textContent = widget.name;
    widgetRow.appendChild(name);

    // Description column (this can have longer text)
    const description = document.createElement("td");
    description.style.width = "90%";
    description.textContent = widget.description;
    widgetRow.appendChild(description);

    // Action column with button, small size
    const action = document.createElement("td");
    action.classList.add("whitespace-nowrap"); // Prevent wrapping for action column

    // Create the div with the tooltip
    const tooltipDiv = document.createElement("div");
    tooltipDiv.classList.add("tooltip", "tooltip-left");
    tooltipDiv.setAttribute(
      "data-tip",
      widget.enabled ? "Disable Widget" : "Enable Widget"
    );

    const toggleWidgetButton = document.createElement("button");

    const buttonIcon = document.createElement("i");
    buttonIcon.classList = `las ${
      widget.enabled
        ? "la-minus-square text-error"
        : "la-plus-square text-success"
    }`;
    buttonIcon.style.fontSize = "24px";
    toggleWidgetButton.appendChild(buttonIcon);

    toggleWidgetButton.addEventListener(
      "click",
      widget.enabled ? () => onDisabled(widget) : () => onEnabled(widget)
    );
    tooltipDiv.appendChild(toggleWidgetButton);
    action.appendChild(tooltipDiv);
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
