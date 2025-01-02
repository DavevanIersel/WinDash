
# WinDash

**WinDash** is a Windows desktop dashboard management tool designed to enhance productivity and customization. It allows users to manage dashboards featuring either:

- **Custom Web Widgets**: Embed web-based widgets using URLs.
- **HTML + JS + CSS Widgets**: Create and add your own widgets using simple web technologies.

---

## Features

- **Custom Widgets**: Add widgets directly from external web URLs or design your own with HTML, JavaScript, and CSS.
- **Built for Windows**: Optimized for Windows environments with a seamless desktop integration.
- **Modern Stack**: Built using Electron, TypeScript, and popular libraries like Konva and lodash.

---

## Installation

### Requirements
- **Node.js** (v16 or later)
- **npm** (v7 or later)
- **Python** (for signing the package using castlabs_evs)

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd win-dash
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the application:
   ```bash
   npm run build
   ```
4. Start the application in development mode:
   ```bash
   npm start
   ```

### Building the Application for Distribution
To build the production-ready application:
```bash
npm run dist
```
The packaged application will be available in the `build` directory.

---

## Development Guide

### Folder Structure
- **`src`**: Contains all source files for the application.
  - **`widgets`**: User-defined HTML/JS/CSS widgets.
  - **`styles`**: Custom CSS styles.
  - **`assets`**: Static assets like images and icons.
  - **`views`**: HTML views for the app interface.
  - **`main.js`**: Electron's main process script.
- **`dist`**: Compiled output directory.

### Scripts
- `npm run build`: Compile TypeScript files and copy necessary resources to the `dist` folder.
- `npm run watch`: Watch for changes and recompile TypeScript files.
- `npm run lint`: Lint TypeScript code using ESLint.
- `npm start`: Build and launch the application in development mode.
- `npm run dist`: Build the application for distribution.

### Adding Custom Widgets
1. Create a new folder in `src/widgets` for your widget.
2. Add the following files to your folder:
   - **HTML**: The widget's structure.
   - **CSS**: Styles for the widget.
   - **JavaScript**: Logic and interactivity.
3. Ensure your widget is included during the build process (handled automatically).

### Development Tips
- Use `npm run watch` to recompile changes instantly.
- Test widgets by adding them to the appropriate dashboard during runtime.

---

## License
This project is licensed under the ISC License. See the `LICENSE` file for details.

---

Happy dashboarding with **WinDash**!

Special thanks to [ChatGPT](https://chatgpt.com/) for generating this readme 
```
