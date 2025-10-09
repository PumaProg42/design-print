import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, Line, IText, FabricImage, Ellipse } from "fabric";
import { Ruler } from "lucide-react";
import { convertImageToZplGFA } from "@/utils/imageToZpl";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

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
    const isMajor = mm % 10 === 0;
    const isMedium = mm % 5 === 0 && !isMajor;
    const position = mm * pixelsPerMm + offset;
    
    if (orientation === 'horizontal') {
      marks.push(
        <div
          key={mm}
          className="absolute top-0"
          style={{
            left: `${position}px`,
            height: isMajor ? '14px' : isMedium ? '9px' : '5px',
            width: isMajor ? '2px' : '1px',
            backgroundColor: isMajor ? 'hsl(var(--foreground))' : isMedium ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
            opacity: isMajor ? 1 : isMedium ? 0.7 : 0.4,
          }}
        >
          {isMajor && mm > 0 && (
            <span 
              className="absolute -top-5 text-[10px] font-semibold text-foreground font-mono"
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
          className="absolute left-0"
          style={{
            top: `${position}px`,
            width: isMajor ? '14px' : isMedium ? '9px' : '5px',
            height: isMajor ? '2px' : '1px',
            backgroundColor: isMajor ? 'hsl(var(--foreground))' : isMedium ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
            opacity: isMajor ? 1 : isMedium ? 0.7 : 0.4,
          }}
        >
          {isMajor && mm > 0 && (
            <span 
              className="absolute -left-8 text-[10px] font-semibold text-foreground font-mono"
              style={{ top: '-6px', width: '28px', textAlign: 'right' }}
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
  const [contextTarget, setContextTarget] = useState<any | null>(null);
  const [contextPoint, setContextPoint] = useState<{ x: number; y: number } | null>(null);
  const [clipboard, setClipboard] = useState<any | null>(null);

  // Convert label dimensions to pixels based on DPI
  const labelWidthPx = Math.round((width * dpi) / 25.4);
  const labelHeightPx = Math.round((height * dpi) / 25.4);

  // Clipboard helpers
  const buildSpecFromObject = (obj: any) => {
    if (!obj) return null;
    if (obj.type === 'rect') {
      return {
        type: 'rect',
        width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
        height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
        stroke: obj.stroke || '#000',
        strokeWidth: obj.strokeWidth || 1,
        fill: obj.fill || 'transparent',
      };
    }
    if (obj.type === 'ellipse') {
      return {
        type: 'ellipse',
        rx: Math.round((obj.rx || 0) * (obj.scaleX || 1)),
        ry: Math.round((obj.ry || 0) * (obj.scaleY || 1)),
        stroke: obj.stroke || '#000',
        strokeWidth: obj.strokeWidth || 1,
        fill: obj.fill || 'transparent',
      };
    }
    if (obj.type === 'line') {
      const lenX = Math.abs((obj.x2 || 0) - (obj.x1 || 0));
      const lenY = Math.abs((obj.y2 || 0) - (obj.y1 || 0));
      const horizontal = lenX >= lenY;
      const length = horizontal ? lenX : lenY;
      return {
        type: 'line',
        orientation: horizontal ? 'h' : 'v',
        length: Math.round(length * (horizontal ? (obj.scaleX || 1) : (obj.scaleY || 1))),
        stroke: obj.stroke || '#000',
        strokeWidth: obj.strokeWidth || 1,
      };
    }
    if (obj.type === 'i-text') {
      return {
        type: 'i-text',
        text: obj.text || '',
        fontSize: Math.round(obj.fontSize || 16),
        fill: obj.fill || '#000',
        fontFamily: obj.fontFamily,
        charSpacing: obj.charSpacing,
        lineHeight: obj.lineHeight,
        fontWeight: obj.fontWeight,
      };
    }
    return null;
  };

  const createObjectFromSpec = async (spec: any, centerX: number, centerY: number) => {
    const canvas = (window as any).fabricCanvas as FabricCanvas;
    if (!canvas || !spec) return;
    let newObj: any = null;
    if (spec.type === 'rect') {
      newObj = new Rect({
        originX: 'center', originY: 'center',
        left: centerX, top: centerY,
        width: spec.width, height: spec.height,
        stroke: spec.stroke, strokeWidth: spec.strokeWidth,
        fill: spec.fill,
      });
    } else if (spec.type === 'ellipse') {
      newObj = new Ellipse({
        originX: 'center', originY: 'center',
        left: centerX, top: centerY,
        rx: spec.rx, ry: spec.ry,
        stroke: spec.stroke, strokeWidth: spec.strokeWidth,
        fill: spec.fill,
      });
    } else if (spec.type === 'line') {
      if (spec.orientation === 'h') {
        newObj = new Line([centerX - spec.length / 2, centerY, centerX + spec.length / 2, centerY], {
          originX: 'center', originY: 'center',
          stroke: spec.stroke, strokeWidth: spec.strokeWidth, strokeUniform: true, strokeLineCap: 'square'
        });
      } else {
        newObj = new Line([centerX, centerY - spec.length / 2, centerX, centerY + spec.length / 2], {
          originX: 'center', originY: 'center',
          stroke: spec.stroke, strokeWidth: spec.strokeWidth, strokeUniform: true, strokeLineCap: 'square'
        });
      }
    } else if (spec.type === 'i-text') {
      newObj = new IText(spec.text, {
        originX: 'center', originY: 'center',
        left: centerX, top: centerY,
        fontSize: spec.fontSize, fill: spec.fill, fontFamily: spec.fontFamily,
        charSpacing: spec.charSpacing, lineHeight: spec.lineHeight, fontWeight: spec.fontWeight
      }) as any;
    }
    if (newObj) {
      canvas.add(newObj);
      canvas.setActiveObject(newObj);
      canvas.requestRenderAll();
    }
  };

  const pasteAtLastPointOrCenter = async () => {
    const canvas = (window as any).fabricCanvas as FabricCanvas;
    if (!canvas || !clipboard) return;
    let cx = 50 + labelWidthPx / 2;
    let cy = 50 + labelHeightPx / 2;
    if (contextPoint && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      cx = Math.max(50, Math.min(50 + labelWidthPx, contextPoint.x - rect.left));
      cy = Math.max(50, Math.min(50 + labelHeightPx, contextPoint.y - rect.top));
    }
    await createObjectFromSpec(clipboard, cx, cy);
  };

  const pasteAtCenter = async () => {
    const canvas = (window as any).fabricCanvas as FabricCanvas;
    if (!canvas || !clipboard) return;
    const cx = 50 + labelWidthPx / 2;
    const cy = 50 + labelHeightPx / 2;
    await createObjectFromSpec(clipboard, cx, cy);
  };

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
    (window as any).fabricCanvas = canvas;

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
        const obj = e.target as any;
        
        // Constrain object within label boundaries
        const boundaryLeft = 50;
        const boundaryTop = 50;
        const boundaryRight = 50 + labelWidthPx;
        const boundaryBottom = 50 + labelHeightPx;
        
        // Get object bounds
        const objWidth = (obj.width || 0) * (obj.scaleX || 1);
        const objHeight = (obj.height || 0) * (obj.scaleY || 1);
        const halfWidth = objWidth / 2;
        const halfHeight = objHeight / 2;
        
        // For lines, calculate actual dimensions
        if (obj.type === "line") {
          const lineWidth = Math.abs((obj.x2 || 0) - (obj.x1 || 0));
          const lineHeight = Math.abs((obj.y2 || 0) - (obj.y1 || 0));
          const strokeWidth = obj.strokeWidth || 1;
          
          const minX = boundaryLeft + Math.max(lineWidth, strokeWidth) / 2;
          const maxX = boundaryRight - Math.max(lineWidth, strokeWidth) / 2;
          const minY = boundaryTop + Math.max(lineHeight, strokeWidth) / 2;
          const maxY = boundaryBottom - Math.max(lineHeight, strokeWidth) / 2;
          
          obj.left = Math.max(minX, Math.min(obj.left || 0, maxX));
          obj.top = Math.max(minY, Math.min(obj.top || 0, maxY));
        } else {
          // Constrain position to keep object fully inside boundaries
          const minX = boundaryLeft + halfWidth;
          const maxX = boundaryRight - halfWidth;
          const minY = boundaryTop + halfHeight;
          const maxY = boundaryBottom - halfHeight;
          
          obj.left = Math.max(minX, Math.min(obj.left || 0, maxX));
          obj.top = Math.max(minY, Math.min(obj.top || 0, maxY));
        }
        
        obj.setCoords();
        
        // Show guide lines while moving - calculate position from label origin (0,0)
        const center = obj.getCenterPoint?.();
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
        const obj = e.target as any;
        const transform = e.transform;
        
        // Constrain object scaling within label boundaries in real-time
        const boundaryLeft = 50;
        const boundaryTop = 50;
        const boundaryRight = 50 + labelWidthPx;
        const boundaryBottom = 50 + labelHeightPx;
        
        const center = obj.getCenterPoint?.();
        
        if (center && obj.width && obj.height) {
          // Get which control is being used
          const activeControl = transform?.corner || '';
          
          // Calculate maximum allowed dimensions from center to boundaries
          const maxDistanceLeft = center.x - boundaryLeft;
          const maxDistanceRight = boundaryRight - center.x;
          const maxDistanceTop = center.y - boundaryTop;
          const maxDistanceBottom = boundaryBottom - center.y;
          
          // For lines, account for stroke width
          if (obj.type === "line") {
            const strokeWidth = obj.strokeWidth || 1;
            const strokeHalf = strokeWidth / 2;
            const isHorizontal = Math.abs((obj.x2 || 0) - (obj.x1 || 0)) >= Math.abs((obj.y2 || 0) - (obj.y1 || 0));
            
            if (isHorizontal) {
              const lineWidth = Math.abs((obj.x2 || 0) - (obj.x1 || 0));
              const scaledLineWidth = lineWidth * (obj.scaleX || 1);
              const halfScaledWidth = scaledLineWidth / 2;
              
              // Check left and right boundaries
              const maxWidthLeft = (maxDistanceLeft - strokeHalf) * 2;
              const maxWidthRight = (maxDistanceRight - strokeHalf) * 2;
              const maxAllowedWidth = Math.min(maxWidthLeft, maxWidthRight);
              
              if (scaledLineWidth > maxAllowedWidth) {
                obj.set("scaleX", maxAllowedWidth / lineWidth);
              }
            } else {
              const lineHeight = Math.abs((obj.y2 || 0) - (obj.y1 || 0));
              const scaledLineHeight = lineHeight * (obj.scaleY || 1);
              const halfScaledHeight = scaledLineHeight / 2;
              
              // Check top and bottom boundaries
              const maxHeightTop = (maxDistanceTop - strokeHalf) * 2;
              const maxHeightBottom = (maxDistanceBottom - strokeHalf) * 2;
              const maxAllowedHeight = Math.min(maxHeightTop, maxHeightBottom);
              
              if (scaledLineHeight > maxAllowedHeight) {
                obj.set("scaleY", maxAllowedHeight / lineHeight);
              }
            }
          } else {
            // For other objects (rectangles, ellipses, text, images)
            const scaledWidth = obj.width * (obj.scaleX || 1);
            const scaledHeight = obj.height * (obj.scaleY || 1);
            
            // Calculate max scale based on which edge would hit boundary first
            let maxScaleX = obj.scaleX || 1;
            let maxScaleY = obj.scaleY || 1;
            
            // Check horizontal constraints
            if (activeControl.includes('l')) {
              // Scaling from left edge
              maxScaleX = (maxDistanceLeft * 2) / obj.width;
            } else if (activeControl.includes('r')) {
              // Scaling from right edge
              maxScaleX = (maxDistanceRight * 2) / obj.width;
            } else {
              // Scaling from center or both sides
              const maxWidth = Math.min(maxDistanceLeft, maxDistanceRight) * 2;
              maxScaleX = maxWidth / obj.width;
            }
            
            // Check vertical constraints
            if (activeControl.includes('t')) {
              // Scaling from top edge
              maxScaleY = (maxDistanceTop * 2) / obj.height;
            } else if (activeControl.includes('b')) {
              // Scaling from bottom edge
              maxScaleY = (maxDistanceBottom * 2) / obj.height;
            } else {
              // Scaling from center or both sides
              const maxHeight = Math.min(maxDistanceTop, maxDistanceBottom) * 2;
              maxScaleY = maxHeight / obj.height;
            }
            
            // Apply constraints - clamp to maximum allowed scale
            if (obj.scaleX && obj.scaleX > maxScaleX) {
              obj.set("scaleX", maxScaleX);
            }
            if (obj.scaleY && obj.scaleY > maxScaleY) {
              obj.set("scaleY", maxScaleY);
            }
          }
        }
        
        obj.setCoords();
        onSelectionChange(e.target);
      }
    });

    canvas.on("object:rotating", (e) => {
      if (e.target) {
        onSelectionChange(e.target);
      }
    });

    // Expose canvas globally for parent component access
    (window as any).fabricCanvas = canvas;

    // Right-click context menu handler: detect target and store cursor point
    canvas.on('mouse:down', (e) => {
      const mouseEvent = e.e as MouseEvent;
      if (mouseEvent && mouseEvent.button === 2) {
        const picked = e.target as any;
        if (picked && picked.name !== 'labelBoundary') {
          canvas.setActiveObject(picked);
          canvas.requestRenderAll();
          setContextTarget(picked);
        } else {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setContextTarget(null);
        }
        setContextPoint({ x: mouseEvent.clientX, y: mouseEvent.clientY });
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [width, height, dpi, labelWidthPx, labelHeightPx, onSelectionChange, setGuideLines]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      const active = fabricCanvas.getActiveObject() as any;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (active) {
          setClipboard(buildSpecFromObject(active));
          toast({ title: 'Copied' });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteAtCenter();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fabricCanvas, clipboard]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex flex-col items-center justify-center h-full bg-canvas p-8">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Ruler className="w-4 h-4" />
              <span className="font-medium">
                {width}mm × {height}mm @ {dpi} DPI
              </span>
            </div>
            
            <div className="relative" style={{ display: 'inline-block' }}>
              {/* Horizontal ruler at top */}
              <div className="absolute" style={{ left: '50px', top: '30px', zIndex: 10 }}>
                <RulerComponent orientation="horizontal" length={labelWidthPx} dpi={dpi} />
              </div>
              
              {/* Vertical ruler on left */}
              <div className="absolute" style={{ left: '30px', top: '50px', zIndex: 10 }}>
                <RulerComponent orientation="vertical" length={labelHeightPx} dpi={dpi} />
              </div>
              
              {/* Guide lines container */}
              <div className="absolute pointer-events-none" style={{ inset: 0, zIndex: 1000 }}>
                {guideLines.x !== undefined && guideLines.y !== undefined && (
                  <>
                    {/* Horizontal guide line - extend to rulers */}
                    <div
                      className="absolute bg-primary shadow-sm"
                      style={{
                        left: '30px',
                        top: `${guideLines.y + 50}px`,
                        width: `${labelWidthPx + 20}px`,
                        height: '1px',
                        boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
                      }}
                    />
                    {/* Y-axis position label */}
                    <div
                      className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md"
                      style={{
                        left: `${labelWidthPx + 58}px`,
                        top: `${guideLines.y + 46}px`,
                      }}
                    >
                      Y: {(guideLines.y * 25.4 / dpi).toFixed(1)} mm
                    </div>
                    {/* Vertical guide line - extend to rulers */}
                    <div
                      className="absolute bg-primary shadow-sm"
                      style={{
                        left: `${guideLines.x + 50}px`,
                        top: '30px',
                        width: '1px',
                        height: `${labelHeightPx + 20}px`,
                        boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
                      }}
                    />
                    {/* X-axis position label */}
                    <div
                      className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md"
                      style={{
                        left: `${guideLines.x + 44}px`,
                        top: `${labelHeightPx + 58}px`,
                      }}
                    >
                      X: {(guideLines.x * 25.4 / dpi).toFixed(1)} mm
                    </div>
                  </>
                )}
              </div>
              
              <canvas ref={canvasRef} className="border border-border shadow-inner" />
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="z-[10000] w-56 bg-popover text-popover-foreground border border-border shadow-md">
        {contextTarget ? (
          <>
            <ContextMenuItem onClick={() => {
              if (contextTarget) {
                setClipboard(buildSpecFromObject(contextTarget));
                toast({ title: 'Copied' });
              }
            }}>
              Copy
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
              if (fabricCanvas && contextTarget) {
                fabricCanvas.remove(contextTarget);
                fabricCanvas.renderAll();
                setContextTarget(null);
                toast({ title: 'Deleted' });
              }
            }} className="text-destructive focus:text-destructive">
              Delete
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem 
            onClick={() => pasteAtLastPointOrCenter()}
            disabled={!clipboard}
          >
            Paste {!clipboard && '(nothing copied)'}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
