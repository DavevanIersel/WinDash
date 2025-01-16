const { ipcRenderer } = require("electron");

new Vue({
  el: "#app",
  data: {
    displays: [],
    initialSettings: {
      displayBounds: null,
    },
    newSettings: {
      displayBounds: null,
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
    overwriteNewSettingsWithInitial() {
      this.newSettings = { ...this.initialSettings };
      this.edited = false;
    },
    isSelectedDisplay(bounds) {
      return (
        this.newSettings.displayBounds &&
        bounds.x === this.newSettings.displayBounds.x &&
        bounds.y === this.newSettings.displayBounds.y &&
        bounds.width === this.newSettings.displayBounds.width &&
        bounds.height === this.newSettings.displayBounds.height
      );
    },
    selectDisplay(bounds) {
      this.newSettings.displayBounds = bounds;
      this.updateCommonResolutions(bounds);
      this.formChanged();
    },
    updateCommonResolutions(bounds) {
      if (
        !this.commonResolutions.find(
          (res) =>
            res.width === bounds.width && res.height === bounds.height
        )
      ) {
        this.commonResolutions.unshift({
          width: bounds.width,
          height: bounds.height,
        });
      }
    },
    formChanged() {
      this.edited = true;
    },
    getDisplayByBounds(bounds) {
      if (!bounds) return null;
      return this.displays.find(
        (d) =>
          d.bounds.x === bounds.x &&
          d.bounds.y === bounds.y &&
          d.bounds.width === bounds.width &&
          d.bounds.height === bounds.height
      );
    },
    saveSettings() {
      this.initialSettings = { ...this.newSettings };
      this.edited = false;
      ipcRenderer.send("save-settings", this.newSettings);
    },
  },
  
  mounted() {
    ipcRenderer.on("update-settings", (_event, settings, screens) => {
      this.displays = screens;
      this.computeScaling();
      this.updateCommonResolutions(settings.displayBounds);

      this.initialSettings = settings;
      this.overwriteNewSettingsWithInitial();
    });
  },
});
