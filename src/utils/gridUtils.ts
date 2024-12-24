import { Config } from "../config";

export const calculateGridCellSize = (windowWidth: number, windowHeight: number, config: Config) => {
    const gridWidth = windowWidth / config.grid.columns;
    const gridHeight = windowHeight / config.grid.rows;
    return { gridWidth, gridHeight };
};