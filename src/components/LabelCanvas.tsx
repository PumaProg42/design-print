import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, Line, IText, FabricImage, Control } from "fabric";
import { Ruler } from "lucide-react";
import { convertImageToZplGFA } from "@/utils/imageToZpl";

// Ruler component for millimeter markings
const RulerComponent = ({ 
  orientation, 
  length, 
  dpi,
  offset = 0
}: { 
  orientation: 'horizontal' | 'vertical'; 
  length: number; 
  dpi: number;
  offset?: number;
}) => {
  const marks = [];
  const lengthInMm = Math.ceil(length * 25.4 / dpi); // Convert pixels to mm
  const pixelsPerMm = dpi / 25.4;

  // Generate tick marks every millimeter
  for (let mm = 0; mm <= lengthInMm; mm++) {
    const position = mm * pixelsPerMm + offset;
    const isMajor = mm % 10 === 0;
    const isMedium = mm % 5 === 0 && !isMajor;
    
    if (orientation === 'horizontal') {
      marks.push(
        <div
          key={mm}
          className="absolute bottom-0"
          style={{
            left: `${position}px`,
            height: isMajor ? '12px' : isMedium ? '8px' : '5px',
            width: '1px',
            backgroundColor: isMajor ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
            opacity: isMajor ? 0.9 : 0.5,
          }}
        >
          {isMajor && mm > 0 && (
            <span 
              className="absolute -bottom-4 text-[9px] text-muted-foreground font-mono"
              style={{ left: '-8px' }}
            >
              {mm}
            </span>
          )}
        </div>
      );
    } else {
      marks.push(
        <div
          key={mm}
          className="absolute right-0"
          style={{
            top: `${position}px`,
            width: isMajor ? '12px' : isMedium ? '8px' : '5px',
            height: '1px',
            backgroundColor: isMajor ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
            opacity: isMajor ? 0.9 : 0.5,
          }}
        >
          {isMajor && mm > 0 && (
            <span 
              className="absolute -right-5 text-[9px] text-muted-foreground font-mono"
              style={{ top: '-6px', width: '20px', textAlign: 'right' }}
            >
              {mm}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div
      className={`absolute bg-muted/30 backdrop-blur-sm ${
        orientation === 'horizontal'
          ? 'h-5 border-b border-border/50'
          : 'w-5 border-r border-border/50'
      } shadow-sm`}
      style={
        orientation === 'horizontal'
          ? { left: '0', top: '0', width: `${length}px` }
          : { top: '0', left: '0', height: `${length}px` }
      }
    >
      {marks}
    </div>
  );
};

// Customize Fabric.js control appearance for a polished look
const customizeObjectControls = (obj: any) => {
  if (!obj) return;

  // Modern, polished control styling
  obj.set({
    borderColor: "hsl(217, 91%, 60%)", // Primary color from design system
    borderScaleFactor: 2,
    cornerColor: "hsl(217, 91%, 60%)",
    cornerStrokeColor: "white",
    cornerStyle: "circle" as const,
    cornerSize: 10,
    transparentCorners: false,
    borderOpacityWhenMoving: 0.5,
  });

  // Configure control visibility based on object type
  if (obj.type === "i-text") {
    // Text: only corner handles, no rotation, no middle handles
    obj.setControlsVisibility({
      tl: true,
      tr: true,
      bl: true,
      br: true,
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      mtr: false,
    });
  } else if (obj.type === "rect" || obj.type === "ellipse") {
    // Rectangle & Ellipse: all resize handles, no rotation
    obj.setControlsVisibility({
      tl: true,
      tr: true,
      bl: true,
      br: true,
      mt: true,
      mb: true,
      ml: true,
      mr: true,
      mtr: false,
    });
  } else if (obj.type === "line") {
    // Line: determine if horizontal or vertical based on coordinates
    const isHorizontal = Math.abs((obj.x2 || 0) - (obj.x1 || 0)) >= Math.abs((obj.y2 || 0) - (obj.y1 || 0));
    
    if (isHorizontal) {
      // Horizontal line: only left/right handles
      obj.setControlsVisibility({
        tl: false,
        tr: false,
        bl: false,
        br: false,
        mt: false,
        mb: false,
        ml: true,
        mr: true,
        mtr: false,
      });
    } else {
      // Vertical line: only top/bottom handles
      obj.setControlsVisibility({
        tl: false,
        tr: false,
        bl: false,
        br: false,
        mt: true,
        mb: true,
        ml: false,
        mr: false,
        mtr: false,
      });
    }
  }

  obj.setCoords();
};

interface LabelCanvasProps {
  width: number;
  height: number;
  dpi: number;
  onSelectionChange: (object: FabricObject | null) => void;
}

export const LabelCanvas = ({ width, height, dpi, onSelectionChange }: LabelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }>({});

  // Convert label dimensions to pixels based on DPI
  const labelWidthPx = (width * dpi) / 25.4; // Convert mm to pixels
  const labelHeightPx = (height * dpi) / 25.4;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.max(800, labelWidthPx + 100),
      height: Math.max(600, labelHeightPx + 100),
      backgroundColor: "#f0f0f0",
      selectionColor: "hsla(217, 91%, 60%, 0.1)",
      selectionBorderColor: "hsl(217, 91%, 60%)",
      selectionLineWidth: 2,
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
        const obj: any = e.selected[0];
        // Convert to center origin without moving
        const center = obj.getCenterPoint();
        obj.set({ originX: "center", originY: "center" });
        obj.setPositionByOrigin(center, "center", "center");
        // Apply polished control styling
        customizeObjectControls(obj);
        onSelectionChange(obj);
      }
    });

    canvas.on("selection:updated", (e) => {
      if (e.selected && e.selected[0]) {
        const obj: any = e.selected[0];
        const center = obj.getCenterPoint();
        obj.set({ originX: "center", originY: "center" });
        obj.setPositionByOrigin(center, "center", "center");
        // Apply polished control styling
        customizeObjectControls(obj);
        onSelectionChange(obj);
      }
    });

    canvas.on("selection:cleared", () => {
      setGuideLines({});
      onSelectionChange(null);
    });

    canvas.on("object:modified", async (e) => {
      // Hide guide lines when movement ends
      setGuideLines({});
      
      if (e.target) {
        const obj: any = e.target as any;

        // Normalize geometry so visual size == stored size (helps 1:1 ZPL)
        if (obj.type === "i-text") {
          // Use uniform scaling (take the larger scale factor to maintain readability)
          const scale = Math.max(obj.scaleX || 1, obj.scaleY || 1);
          const newFontSize = Math.max(1, Math.round(((obj.fontSize || 20) as number) * scale));
          obj.set({ fontSize: newFontSize, scaleX: 1, scaleY: 1 });
        } else if (obj.type === "rect") {
          // Preserve center point when changing dimensions
          const centerPoint = obj.getCenterPoint();
          const newW = Math.max(1, Math.round(((obj.width || 0) as number) * (obj.scaleX || 1)));
          const newH = Math.max(1, Math.round(((obj.height || 0) as number) * (obj.scaleY || 1)));
          obj.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 });
          obj.setPositionByOrigin(centerPoint, 'center', 'center');
        } else if (obj.type === "ellipse") {
          // Preserve center point when changing dimensions
          const centerPoint = obj.getCenterPoint();
          const newRx = Math.max(1, Math.round(((obj.rx || 0) as number) * (obj.scaleX || 1)));
          const newRy = Math.max(1, Math.round(((obj.ry || 0) as number) * (obj.scaleY || 1)));
          obj.set({ rx: newRx, ry: newRy, scaleX: 1, scaleY: 1 });
          obj.setPositionByOrigin(centerPoint, 'center', 'center');
        } else if (obj.type === "line") {
          // Preserve center point when changing dimensions
          const centerPoint = obj.getCenterPoint();
          const isHorizontal = Math.abs((obj.x2 || 0) - (obj.x1 || 0)) >= Math.abs((obj.y2 || 0) - (obj.y1 || 0));
          
          if (isHorizontal) {
            const newWidth = Math.max(1, Math.round(Math.abs((obj.x2 || 0) - (obj.x1 || 0)) * (obj.scaleX || 1)));
            obj.set({ 
              x1: -newWidth / 2,
              x2: newWidth / 2,
              y1: 0,
              y2: 0,
              scaleX: 1,
              scaleY: 1
            });
          } else {
            const newHeight = Math.max(1, Math.round(Math.abs((obj.y2 || 0) - (obj.y1 || 0)) * (obj.scaleY || 1)));
            obj.set({ 
              x1: 0,
              x2: 0,
              y1: -newHeight / 2,
              y2: newHeight / 2,
              scaleX: 1,
              scaleY: 1
            });
          }
          obj.set({ strokeLineCap: 'square', objectCaching: false });
          obj.setPositionByOrigin(centerPoint, 'center', 'center');
        }

        // If an image was resized, regenerate its ZPL (^GFA) to match visual size
        if (obj.isImage && obj.imageSource) {
          try {
            const desiredWidth = Math.round(typeof obj.getScaledWidth === "function" ? obj.getScaledWidth() : (obj.width || 0) * (obj.scaleX || 1));
            const desiredHeight = Math.round(typeof obj.getScaledHeight === "function" ? obj.getScaledHeight() : (obj.height || 0) * (obj.scaleY || 1));
            const { zpl } = await convertImageToZplGFA(obj.imageSource, dpi, desiredWidth, desiredHeight);
            obj.zplImageData = zpl;
            // Bake scale into size for images too
            if (obj.width && obj.height) {
              obj.set({ width: desiredWidth, height: desiredHeight, scaleX: 1, scaleY: 1 });
            }
          } catch (err) {
            console.error("Failed to regenerate ZPL for image", err);
          }
        }

        obj.canvas?.requestRenderAll?.();
        onSelectionChange(e.target);
      }
    });

    canvas.on("object:moving", (e) => {
      if (e.target) {
        // Show guide lines while moving - calculate position from label origin (0,0)
        const center = (e.target as any).getCenterPoint?.();
        if (center) {
          // Position relative to label origin (subtract canvas offset of 50px)
          const labelX = Math.round(center.x - 50);
          const labelY = Math.round(center.y - 50);
          setGuideLines({
            x: labelX,
            y: labelY,
          });
        }
        onSelectionChange(e.target);
      }
    });

    canvas.on("object:scaling", (e) => {
      if (e.target) {
        onSelectionChange(e.target);
      }
    });

    canvas.on("object:rotating", (e) => {
      if (e.target) {
        onSelectionChange(e.target);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [width, height, dpi, labelWidthPx, labelHeightPx, onSelectionChange, setGuideLines]);

  // Expose canvas instance for parent components
  useEffect(() => {
    if (fabricCanvas) {
      (window as any).fabricCanvas = fabricCanvas;
    }
  }, [fabricCanvas]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-canvas p-8">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Ruler className="w-4 h-4" />
          <span className="font-medium">
            {width}mm × {height}mm @ {dpi} DPI
          </span>
        </div>
        
        <div className="relative inline-block">
          {/* Horizontal ruler at top */}
          <div className="absolute" style={{ left: '50px', top: '30px', zIndex: 10 }}>
            <RulerComponent orientation="horizontal" length={labelWidthPx} dpi={dpi} />
          </div>
          
          {/* Vertical ruler on left */}
          <div className="absolute" style={{ left: '30px', top: '50px', zIndex: 10 }}>
            <RulerComponent orientation="vertical" length={labelHeightPx} dpi={dpi} />
          </div>
          
          {/* Guide lines during movement */}
          {guideLines.x !== undefined && (
            <>
              {/* Horizontal guide line */}
              <div
                className="absolute bg-primary pointer-events-none shadow-sm"
                style={{
                  left: '50px',
                  top: `${guideLines.y + 50}px`,
                  width: `${labelWidthPx}px`,
                  height: '1px',
                  zIndex: 1000,
                  boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
                }}
              />
              {/* Y-axis position label */}
              <div
                className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md pointer-events-none"
                style={{
                  left: `${labelWidthPx + 58}px`,
                  top: `${guideLines.y + 46}px`,
                  zIndex: 1001,
                }}
              >
                Y: {guideLines.y}
              </div>
            </>
          )}
          {guideLines.y !== undefined && (
            <>
              {/* Vertical guide line */}
              <div
                className="absolute bg-primary pointer-events-none shadow-sm"
                style={{
                  left: `${guideLines.x + 50}px`,
                  top: '50px',
                  width: '1px',
                  height: `${labelHeightPx}px`,
                  zIndex: 1000,
                  boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
                }}
              />
              {/* X-axis position label */}
              <div
                className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md pointer-events-none"
                style={{
                  left: `${guideLines.x + 44}px`,
                  top: `${labelHeightPx + 58}px`,
                  zIndex: 1001,
                }}
              >
                X: {guideLines.x}
              </div>
            </>
          )}
          
          <canvas ref={canvasRef} className="border border-border shadow-inner" />
        </div>
      </div>
    </div>
  );
};
