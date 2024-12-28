const { ipcRenderer } = require("electron");

new Vue({
  el: "#app",
  data: {
    editingWidget: null,
    creatingNewWidget: true,
    searchQuery: "",
    selectedPermissions: [],
    allPermissions: [
      "clipboard-read",
      "clipboard-sanitized-write",
      "display-capture",
      "fullscreen",
      "geolocation",
      "idle-detection",
      "media",
      "mediaKeySystem",
      "midi",
      "midiSysex",
      "notifications",
      "pointerLock",
      "keyboardLock",
      "openExternal",
      "speaker-selection",
      "storage-access",
      "top-level-storage-access",
      "window-management",
      "unknown",
      "fileSystem",
    ],
    filteredPermissions: [],
    touchTooltip: "Enable touch controls for mobile-like interactions.",
  },
  methods: {
    isUrlFilled() {
      return this.editingWidget.url.trim() !== '';
    },
    isHtmlFilled() {
      return this.editingWidget.html.trim() !== '';
    },
    addUserAgent() {
      this.editingWidget.customUserAgent.push({
        domain: "",
        userAgent: "",
      });
    },
    removeUserAgent(index) {
        // Possibly a weird bug where splice doesnt remove the element at index 0 when array is 1 big
        console.log(" removing")
        console.log(this.editingWidget.customUserAgent)
        if (this.editingWidget.customUserAgent.length === 1) {
          this.editingWidget.customUserAgent = [];
        } else {
          this.editingWidget.customUserAgent.splice(index, 1);
        }
        console.log(this.editingWidget.customUserAgent)
    },
    filterPermissions() {
      this.filteredPermissions = this.allPermissions.filter(
        (perm) =>
          perm.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
          !this.selectedPermissions.includes(perm)
      );
    },
    addPermission(perm) {
      this.selectedPermissions.push(perm);
      this.filteredPermissions = this.filteredPermissions.filter(
        (item) => item !== perm
      );
      this.searchQuery = "";
    },
    removePermission(perm) {
      this.selectedPermissions = this.selectedPermissions.filter(
        (item) => item !== perm
      );
      this.filteredPermissions.push(perm);
      this.searchQuery = "";
    },
    updatePreview() {
      ipcRenderer.send("update-preview", this.editingWidget);
    },
    saveWidget() {
      ipcRenderer.send("create-or-edit-widget", this.editingWidget);
      if (this.isUrlFilled()) {
        this.editingWidget.html = undefined;
      } else {
        this.editingWidget.url = undefined;
      }
      ipcRenderer.send("update-preview", this.editingWidget);
      this.cancelEditing(); 
    },
    cancelEditing() {
      this.editingWidget = null;
      this.form = {};
      ipcRenderer.send("toggle-edit-widget-view", false);
    },
  },
  mounted() {
    this.filteredPermissions = this.allPermissions.slice();

    ipcRenderer.on("load-widget", (_event, widget) => {
      if (widget) {
        this.editingWidget = widget;
        creatingNewWidget = false;
      } else {
        this.editingWidget = {
          name: "",
          url: '',
          html: '',
          x: 40,
          y: 40,
          width: 600,
          height: 400,
          enabled: undefined,
          touchEnabled: undefined,
          customUserAgent: [],
          permissions: [],
          customScript: undefined,
          devTools: undefined,
        };
      }
    });
  },
});
