const { ipcRenderer } = require("electron");

new Vue({
  el: "#app",
  data: {
    editingWidget: null,
    creatingNewWidget: true,
    searchQuery: "",
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
      return this.editingWidget.url.trim() !== "";
    },
    isHtmlFilled() {
      return this.editingWidget.html.trim() !== "";
    },
    addUserAgent() {
      this.editingWidget.customUserAgent.push({
        domain: "",
        userAgent: "",
      });
    },
    removeUserAgent(index) {
      // Possibly a weird bug where splice doesnt remove the element at index 0 when array is 1 big
      if (this.editingWidget.customUserAgent.length === 1) {
        this.editingWidget.customUserAgent = [];
      } else {
        this.editingWidget.customUserAgent.splice(index, 1);
      }
    },
    filterPermissions() {
      this.filteredPermissions = this.allPermissions.filter(
        (perm) =>
          perm.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
          !(
            this.editingWidget.permissions[perm] === true ||
            this.editingWidget.permissions[perm] === false
          )
      );
    },
    addPermission(perm, permitted) {
      this.$set(this.editingWidget.permissions, perm, permitted);
      this.filteredPermissions = this.filteredPermissions.filter(
        (item) => item !== perm
      );
      this.searchQuery = "";
    },
    removePermission(perm) {
      this.$delete(this.editingWidget.permissions, perm);
      this.filteredPermissions.push(perm);
      this.searchQuery = "";
    },
    updatePreview() {
      ipcRenderer.send("update-preview", this.editingWidget);
    },
    saveWidget() {
      console.log(this.editingWidget);
      this.editingWidget.permissions = this.editingWidget.permissions;
      if ((this.editingWidget.html === "")) {
        this.editingWidget.html = undefined;
      }
      if ((this.editingWidget.url === "")) {
        this.editingWidget.url = undefined;
      }
      this.editingWidget.width = Number(this.editingWidget.width);
      this.editingWidget.height = Number(this.editingWidget.height);
      ipcRenderer.send("create-or-edit-widget", this.editingWidget);
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
        if ((this.editingWidget.html === undefined)) {
          this.editingWidget.html = "";
        }
        if ((this.editingWidget.url === undefined)) {
          this.editingWidget.url = "";
        }
        creatingNewWidget = false;
      } else {
        this.editingWidget = {
          name: "",
          url: "",
          html: "",
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
