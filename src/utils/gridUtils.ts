export const gridSize = 20;

export function pixelsToGridCoordinates(pixelX: number, pixelY: number, pixelWidth: number, pixelHeight: number) {
    return {
      x: Math.floor(pixelX / gridSize),
      y: Math.floor(pixelY / gridSize),
      width: Math.ceil(pixelWidth / gridSize),
      height: Math.ceil(pixelHeight / gridSize),
    };
  }
  
  export function gridToPixelCoordinates(gridX: number, gridY: number, gridWidth: number, gridHeight: number) {
    return {
      x: gridX * gridSize,
      y: gridY * gridSize,
      width: gridWidth * gridSize,
      height: gridHeight * gridSize,
    };
  }