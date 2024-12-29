const { ipcRenderer } = require("electron");

new Vue({
  el: "#app",
  data: {
    widgets: [],
    searchQuery: "",
  },
  computed: {
    filteredWidgets() {
      const query = this.searchQuery.toLowerCase();
      return this.widgets.filter(
        (widget) =>
          widget.name?.toLowerCase().includes(query) ||
          widget.description?.toLowerCase().includes(query)
      );
    },
  },
  methods: {
    toggleWidgetEnabled(widget) {
      ipcRenderer.send("toggle-widget-enabled", widget);
    },
    createWidgetView() {
      ipcRenderer.send("toggle-edit-widget-view", true);
    },
    editWidget(widget) {
      ipcRenderer.send("toggle-edit-widget-view", true, widget);
    }
  },
  mounted() {
    ipcRenderer.on("update-widgets", (_event, widgets) => {
      this.widgets = widgets;
    });
  },
});
