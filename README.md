
# WinDash

**WinDash** is a Windows desktop dashboard management tool designed to enhance productivity and customization.

- **Custom Widgets**: Add widgets directly from external web URLs or design your own with HTML, JavaScript, and CSS.
- **Built for Windows**: Optimized for Windows environments, no support for mac or linux yet.
- **Stack**: Built using Electron and Typescript

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
Widgets can be created through the application UI and will be saved in `%AppData%/WinDash/widgets`. The repository contains multiple widgets you could use if you wish.

### Development Tips
- Use `npm run watch` to recompile changes instantly.
- Test widgets by adding them to the appropriate dashboard during runtime.

Happy dashboarding with **WinDash**!

Special thanks to [ChatGPT](https://chatgpt.com/) for generating this readme :) 
