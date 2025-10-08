import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, Line, IText, FabricImage, Control } from "fabric";
import { Ruler } from "lucide-react";
import { convertImageToZplGFA } from "@/utils/imageToZpl";

// Ruler component for millimeter markings
const RulerComponent = ({ 
  orientation, 
  length, 
  dpi 
}: { 
  orientation: 'horizontal' | 'vertical'; 
  length: number; 
  dpi: number;
}) => {
  const marks = [];
  const lengthInMm = Math.ceil(length * 25.4 / dpi); // Convert pixels to mm
  const pixelsPerMm = dpi / 25.4;

  // Generate tick marks every millimeter
  for (let mm = 0; mm <= lengthInMm; mm++) {
    const position = mm * pixelsPerMm;
    const isMajor = mm % 10 === 0;
    const isMedium = mm % 5 === 0 && !isMajor;
    
    if (orientation === 'horizontal') {
      marks.push(
        <div
          key={mm}
          className="absolute"
          style={{
            left: `${position}px`,
            height: isMajor ? '16px' : isMedium ? '12px' : '8px',
            width: '1px',
            backgroundColor: 'hsl(var(--muted-foreground))',
            opacity: isMajor ? 0.8 : 0.4,
          }}
        >
          {isMajor && (
            <span className="absolute -top-4 -left-2 text-[10px] text-muted-foreground font-mono">
              {mm}
            </span>
          )}
        </div>
      );
    } else {
      marks.push(
        <div
          key={mm}
          className="absolute"
          style={{
            top: `${position}px`,
            width: isMajor ? '16px' : isMedium ? '12px' : '8px',
            height: '1px',
            backgroundColor: 'hsl(var(--muted-foreground))',
            opacity: isMajor ? 0.8 : 0.4,
          }}
        >
          {isMajor && (
            <span className="absolute -left-6 -top-2 text-[10px] text-muted-foreground font-mono">
              {mm}
            </span>
          )}
        </div>
      );
    }
  }

  return (
    <div
      className={`absolute bg-background border-border ${
        orientation === 'horizontal'
          ? 'h-6 border-b flex items-end'
          : 'w-10 border-r flex items-end'
      }`}
      style={
        orientation === 'horizontal'
          ? { left: '50px', top: '0', width: `${length}px` }
          : { top: '50px', left: '0', height: `${length}px` }
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
        // Show guide lines while moving
        const center = (e.target as any).getCenterPoint?.();
        if (center) {
          setGuideLines({
            x: Math.round(center.x - 50),
            y: Math.round(center.y - 50),
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
      <div className="bg-white rounded-lg shadow-lg p-4 relative">
        {/* Top ruler */}
        <RulerComponent orientation="horizontal" length={labelWidthPx} dpi={dpi} />
        
        {/* Left ruler */}
        <RulerComponent orientation="vertical" length={labelHeightPx} dpi={dpi} />
        
        {/* Guide lines during movement */}
        {guideLines.x !== undefined && (
          <>
            <div
              className="absolute bg-primary/30 pointer-events-none"
              style={{
                left: '50px',
                top: `${guideLines.y + 50}px`,
                width: `${labelWidthPx}px`,
                height: '1px',
                zIndex: 1000,
              }}
            />
            <div
              className="absolute text-[10px] font-mono text-primary bg-primary/10 px-1 rounded pointer-events-none"
              style={{
                left: `${labelWidthPx + 55}px`,
                top: `${guideLines.y + 47}px`,
                zIndex: 1001,
              }}
            >
              {guideLines.y}
            </div>
          </>
        )}
        {guideLines.y !== undefined && (
          <>
            <div
              className="absolute bg-primary/30 pointer-events-none"
              style={{
                left: `${guideLines.x + 50}px`,
                top: '50px',
                width: '1px',
                height: `${labelHeightPx}px`,
                zIndex: 1000,
              }}
            />
            <div
              className="absolute text-[10px] font-mono text-primary bg-primary/10 px-1 rounded pointer-events-none"
              style={{
                left: `${guideLines.x + 47}px`,
                top: `${labelHeightPx + 55}px`,
                zIndex: 1001,
              }}
            >
              {guideLines.x}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground" style={{ marginTop: '30px', marginLeft: '40px' }}>
          <Ruler className="w-4 h-4" />
          <span>
            {width}mm × {height}mm @ {dpi} DPI
          </span>
        </div>
        <div style={{ marginLeft: '40px', marginTop: '20px' }}>
          <canvas ref={canvasRef} className="border border-border" />
        </div>
      </div>
    </div>
  );
};
