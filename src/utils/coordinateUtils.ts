/**
 * Centralized coordinate conversion utilities for Label Designer
 * Single source of truth for mm ↔ dots ↔ pixels conversions
 */

export interface CoordinateSystem {
  labelWidthMm: number;
  labelHeightMm: number;
  dpi: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
}

export class CoordinateConverter {
  private dotsPerMm: number;
  private labelWidthDots: number;
  private labelHeightDots: number;
  private pixelsPerDotX: number;
  private pixelsPerDotY: number;

  constructor(system: CoordinateSystem) {
    this.dotsPerMm = system.dpi / 25.4;
    this.labelWidthDots = Math.round(system.labelWidthMm * this.dotsPerMm);
    this.labelHeightDots = Math.round(system.labelHeightMm * this.dotsPerMm);
    this.pixelsPerDotX = system.canvasWidthPx / this.labelWidthDots;
    this.pixelsPerDotY = system.canvasHeightPx / this.labelHeightDots;
  }

  // MM conversions
  mmToDots(mm: number): number {
    return Math.round(mm * this.dotsPerMm);
  }

  dotsToMm(dots: number): number {
    return dots / this.dotsPerMm;
  }

  // Pixel conversions
  pixelsToDotsX(px: number): number {
    return px / this.pixelsPerDotX;
  }

  pixelsToDotsY(px: number): number {
    return px / this.pixelsPerDotY;
  }

  dotsToPixelsX(dots: number): number {
    return dots * this.pixelsPerDotX;
  }

  dotsToPixelsY(dots: number): number {
    return dots * this.pixelsPerDotY;
  }

  // Getters for label dimensions
  getLabelWidthDots(): number {
    return this.labelWidthDots;
  }

  getLabelHeightDots(): number {
    return this.labelHeightDots;
  }

  getPixelsPerDot(): { x: number; y: number } {
    return {
      x: this.pixelsPerDotX,
      y: this.pixelsPerDotY
    };
  }
}

/**
 * Legacy helper functions for backward compatibility
 */
export function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

export function dotsToMm(dots: number, dpi: number): number {
  return (dots * 25.4) / dpi;
}
