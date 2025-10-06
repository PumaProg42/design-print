import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, Line, IText, FabricImage } from "fabric";
import { Ruler } from "lucide-react";

interface LabelCanvasProps {
  width: number;
  height: number;
  dpi: number;
  onSelectionChange: (object: FabricObject | null) => void;
}

export const LabelCanvas = ({ width, height, dpi, onSelectionChange }: LabelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  // Convert label dimensions to pixels based on DPI
  const labelWidthPx = (width * dpi) / 25.4; // Convert mm to pixels
  const labelHeightPx = (height * dpi) / 25.4;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.max(800, labelWidthPx + 100),
      height: Math.max(600, labelHeightPx + 100),
      backgroundColor: "#f0f0f0",
    });

    // Add label boundary rectangle
    const labelBoundary = new Rect({
      left: 50,
      top: 50,
      width: labelWidthPx,
      height: labelHeightPx,
      fill: "white",
      stroke: "#333",
      strokeWidth: 2,
      selectable: false,
      evented: false,
      name: "labelBoundary",
    });

    canvas.add(labelBoundary);
    canvas.renderAll();
    setFabricCanvas(canvas);

    // Selection events
    canvas.on("selection:created", (e) => {
      if (e.selected && e.selected[0]) {
        onSelectionChange(e.selected[0]);
      }
    });

    canvas.on("selection:updated", (e) => {
      if (e.selected && e.selected[0]) {
        onSelectionChange(e.selected[0]);
      }
    });

    canvas.on("selection:cleared", () => {
      onSelectionChange(null);
    });

    canvas.on("object:modified", (e) => {
      if (e.target) {
        onSelectionChange(e.target);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [width, height, dpi, labelWidthPx, labelHeightPx, onSelectionChange]);

  // Expose canvas instance for parent components
  useEffect(() => {
    if (fabricCanvas) {
      (window as any).fabricCanvas = fabricCanvas;
    }
  }, [fabricCanvas]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-canvas p-8">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Ruler className="w-4 h-4" />
          <span>
            {width}mm × {height}mm @ {dpi} DPI
          </span>
        </div>
        <canvas ref={canvasRef} className="border border-border" />
      </div>
    </div>
  );
};
