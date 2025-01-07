const { ipcRenderer } = require("electron");

new Vue({
  el: "#app",
  data: {
    displays: [],
    initialSettings: {
      displayId: null,
      displayResolution: null,
    },
    newSettings: {
      displayId: null,
      displayResolution: null,
    },
    edited: false,
    scaleFactor: 1,
    offsetX: 0,
    offsetY: 0,
    commonResolutions: [
      { width: 3840, height: 2160 },
      { width: 2560, height: 1440 },
      { width: 1920, height: 1080 },
      { width: 1600, height: 900 },
      { width: 1280, height: 720 },
    ],
  },
  methods: {
    computeScaling() {
      if (!this.displays.length) return;
      const minX = Math.min(...this.displays.map((d) => d.bounds.x));
      const minY = Math.min(...this.displays.map((d) => d.bounds.y));
      const maxX = Math.max(
        ...this.displays.map((d) => d.bounds.x + d.bounds.width)
      );
      const maxY = Math.max(
        ...this.displays.map((d) => d.bounds.y + d.bounds.height)
      );

      const width = maxX - minX;
      const height = maxY - minY;

      const container = document.getElementById("display-container");
      this.scaleFactor = Math.min(
        container.clientWidth / width,
        container.clientHeight / height
      );
      this.offsetX = -minX * this.scaleFactor;
      this.offsetY = -minY * this.scaleFactor;
    },
    loadInitialSettings() {
      this.newSettings = { ...this.initialSettings };
      this.edited = false;
    },
    selectDisplay(displayId) {
      this.newSettings.displayId = displayId;
      const display = this.getDisplayById(this.newSettings.displayId);
      if (!display) return;

      const nativeRes = {
        width: display.bounds.width,
        height: display.bounds.height,
      };

      this.updateCommonResolutions(nativeRes);

      this.newSettings.displayResolution = nativeRes;
      this.newSettings.displayX = display.bounds.x;
      this.newSettings.displayY = display.bounds.y;
      this.edited = true;
    },
    updateCommonResolutions(resolution) {
      if (
        !this.commonResolutions.find(
          (res) =>
            res.width === resolution.width && res.height === resolution.height
        )
      ) {
        this.commonResolutions.unshift(resolution);
      }
    },
    formChanged() {
      this.edited = true;
    },
    getDisplayById(id) {
      if (!id) return null;
      return this.displays.find((d) => d.id === id);
    },
    saveSettings() {
      this.initialSettings = { ...this.newSettings };
      this.edited = false;
      ipcRenderer.send("save-settings", this.newSettings);
    },
  },
  mounted() {
    ipcRenderer.on(
      "update-settings",
      (_event, settings, screens) => {
        this.displays = screens;
        this.computeScaling();

        this.initialSettings = settings;
        this.updateCommonResolutions(this.initialSettings.displayResolution);

        this.loadInitialSettings();
      }
    );
  },
});
