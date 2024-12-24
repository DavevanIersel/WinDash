import { Config } from "../config";


export const gridSize = 50;

export function pixelsToGridCoordinates(pixelX: number, pixelY: number, pixelWidth: number, pixelHeight: number) {
    return {
      gridX: Math.floor(pixelX / gridSize),
      gridY: Math.floor(pixelY / gridSize),
      gridWidth: Math.ceil(pixelWidth / gridSize),
      gridHeight: Math.ceil(pixelHeight / gridSize),
    };
  }
  
  export function gridToPixelCoordinates(gridX: number, gridY: number, gridWidth: number, gridHeight: number) {
    return {
      pixelX: gridX * gridSize,
      pixelY: gridY * gridSize,
      pixelWidth: gridWidth * gridSize,
      pixelHeight: gridHeight * gridSize,
    };
  }