import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, Line, IText, Textbox, FabricImage, Ellipse } from "fabric";
import { Ruler } from "lucide-react";
import { convertImageToZplGFA } from "@/utils/imageToZpl";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

// Throttle helper for performance optimization
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

// Ruler component for millimeter markings - Memoized for performance
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
  const marks = useMemo(() => {
    const result = [];
    const lengthInMm = Math.ceil(length * 25.4 / dpi); // Convert pixels to mm
    const pixelsPerMm = dpi / 25.4;
    
    // Scale factors based on DPI for better readability
    const dpiScale = dpi / 203; // 203 DPI is baseline
    const textSize = Math.max(8, Math.min(14, Math.round(10 * dpiScale))); // Scale text: 8-14px
    const majorTickHeight = Math.max(12, Math.round(14 * dpiScale));
    const mediumTickHeight = Math.max(8, Math.round(9 * dpiScale));
    const minorTickHeight = Math.max(4, Math.round(5 * dpiScale));
    const textOffset = Math.round(textSize * 2);

    // Generate tick marks every millimeter
    for (let mm = 0; mm <= lengthInMm; mm++) {
      const isMajor = mm % 10 === 0;
      const isMedium = mm % 5 === 0 && !isMajor;
      const position = mm * pixelsPerMm + offset;
      
      if (orientation === 'horizontal') {
        result.push(
          <div
            key={mm}
            className="absolute top-0"
            style={{
              left: `${position}px`,
              height: isMajor ? `${majorTickHeight}px` : isMedium ? `${mediumTickHeight}px` : `${minorTickHeight}px`,
              width: isMajor ? '2px' : '1px',
              backgroundColor: isMajor ? 'hsl(var(--foreground))' : isMedium ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
              opacity: isMajor ? 1 : isMedium ? 0.7 : 0.4,
            }}
          >
            {isMajor && mm > 0 && (
              <span 
                className="absolute font-semibold text-foreground font-mono"
                style={{ 
                  left: `${-textSize}px`,
                  top: `-${textOffset}px`,
                  fontSize: `${textSize}px`,
                }}
              >
                {mm}
              </span>
            )}
          </div>
        );
      } else {
        result.push(
          <div
            key={mm}
            className="absolute left-0"
            style={{
              top: `${position}px`,
              width: isMajor ? `${majorTickHeight}px` : isMedium ? `${mediumTickHeight}px` : `${minorTickHeight}px`,
              height: isMajor ? '2px' : '1px',
              backgroundColor: isMajor ? 'hsl(var(--foreground))' : isMedium ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))',
              opacity: isMajor ? 1 : isMedium ? 0.7 : 0.4,
            }}
          >
            {isMajor && mm > 0 && (
              <span 
                className="absolute font-semibold text-foreground font-mono"
                style={{ 
                  top: `${-textSize / 2}px`,
                  left: `-${textOffset + 8}px`,
                  width: `${textOffset}px`,
                  textAlign: 'right',
                  fontSize: `${textSize}px`,
                }}
              >
                {mm}
              </span>
            )}
          </div>
        );
      }
    }
    return result;
  }, [orientation, length, dpi, offset]);

  // Scale ruler height/width based on DPI
  const dpiScale = dpi / 203;
  const rulerSize = Math.max(20, Math.round(20 * dpiScale));

  return (
    <div
      className={`absolute bg-muted/30 backdrop-blur-sm ${
        orientation === 'horizontal'
          ? 'border-b border-border/50'
          : 'border-r border-border/50'
      } shadow-sm`}
      style={
        orientation === 'horizontal'
          ? { left: '0', top: '0', width: `${length}px`, height: `${rulerSize}px` }
          : { top: '0', left: '0', height: `${length}px`, width: `${rulerSize}px` }
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
    lockScalingFlip: true,
  });

  // Configure control visibility based on object type
  if (obj.type === "textbox" && obj.isMultilineText) {
    // Multiline Text: only left/right handles, no rotation
    obj.hasRotatingPoint = false;
    obj.lockRotation = true;
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
  } else if (obj.type === "i-text") {
    // Text: all corner and middle handles for independent width/height scaling
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
  } else if (obj.type === "image") {
    // Image: only corner handles, no rotation handle
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
  } else if (obj.name && obj.name.startsWith("barcode_")) {
    // Barcode: only corner handles, no rotation handle
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

// Setup text scaling handlers - sync fontWidth/fontHeight with scaleX/scaleY
const setupTextScaling = (textObj: any, canvas: any, onSelectionChange: (obj: any) => void) => {
  if (!textObj || textObj.type !== 'i-text') return;
  if (textObj._hasScalingHandlers) return;
  textObj._hasScalingHandlers = true;
  
  // Store initial fontWidth/fontHeight if not set
  if (textObj.fontWidth === undefined) {
    textObj.fontWidth = textObj.fontSize || 20;
  }
  if (textObj.fontHeight === undefined) {
    textObj.fontHeight = textObj.fontSize || 20;
  }
  
  const onScaled = () => {
    // After scaling finishes, update fontWidth/fontHeight to match the new size
    const baseSize = textObj.fontSize || 20;
    const newFontWidth = Math.round(baseSize * (textObj.scaleX || 1));
    const newFontHeight = Math.round(baseSize * (textObj.scaleY || 1));

    // Persist the new values
    textObj.fontWidth = newFontWidth;
    textObj.fontHeight = newFontHeight;

    // DON'T reset scale - keep it as is for visual representation
    textObj.setCoords();
    canvas.requestRenderAll();
    
    // Update properties panel with final values
    onSelectionChange(textObj);
  };
  
  // Listen to scaled event (after mouse release)
  textObj.on('scaled', onScaled);
  
  // Listen to scaling event for real-time updates
  textObj.on('scaling', () => {
    onSelectionChange(textObj);
  });
};

interface LabelCanvasProps {
  width: number;
  height: number;
  dpi: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelectionChange: (object: FabricObject | null) => void;
  textCounter: number;
  onIncrementTextCounter: () => void;
  onBarcodeDoubleClick?: (barcodeObj: any) => void;
  onCodeDoubleClick?: (codeObj: any) => void;
}

export const LabelCanvas = ({ width, height, dpi, zoom, onZoomChange, onSelectionChange, textCounter, onIncrementTextCounter, onBarcodeDoubleClick, onCodeDoubleClick }: LabelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }>({});
  const [contextTarget, setContextTarget] = useState<any | null>(null);
  const [contextPoint, setContextPoint] = useState<{ x: number; y: number } | null>(null);
  const [clipboard, setClipboard] = useState<any | null>(null);
  const [viewportTransform, setViewportTransform] = useState({ zoom: 1, translateX: 0, translateY: 0 });
  const previousDpiRef = useRef<number>(dpi);
  const previousWidthRef = useRef<number>(width);
  const previousHeightRef = useRef<number>(height);
  const viewportRestoredRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Convert label dimensions to pixels based on DPI
  const labelWidthPx = Math.round((width * dpi) / 25.4);
  const labelHeightPx = Math.round((height * dpi) / 25.4);

  // Clipboard helpers - Memoized for performance
  const buildSpecFromObject = useCallback((obj: any) => {
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
        fieldName: obj.fieldName || obj.text || '',
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
      };
    }
    return null;
  }, []);

  const createObjectFromSpec = useCallback(async (spec: any, centerX: number, centerY: number) => {
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
      const textInstanceName = `Text ${textCounter}`;
      newObj = new IText(spec.text, {
        originX: 'center', originY: 'center',
        left: centerX, top: centerY,
        fontSize: spec.fontSize, fill: spec.fill, fontFamily: spec.fontFamily,
        charSpacing: spec.charSpacing, lineHeight: spec.lineHeight, fontWeight: spec.fontWeight,
        scaleX: spec.scaleX || 1,
        scaleY: spec.scaleY || 1,
        lockScalingFlip: true,
        lockUniScaling: true,
      }) as any;
      // Store the field name and instance name
      newObj.fieldName = spec.fieldName || spec.text;
      newObj.textInstanceName = textInstanceName;
      onIncrementTextCounter();
    }
    if (newObj) {
      canvas.add(newObj);
      canvas.setActiveObject(newObj);
      canvas.requestRenderAll();
    }
  }, [textCounter, onIncrementTextCounter]);

  const pasteAtLastPointOrCenter = useCallback(async () => {
    const canvas = (window as any).fabricCanvas as FabricCanvas;
    if (!canvas || !clipboard) return;
    let cx = 200 + labelWidthPx / 2;
    let cy = 200 + labelHeightPx / 2;
    if (contextPoint && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      cx = Math.max(200, Math.min(200 + labelWidthPx, contextPoint.x - rect.left));
      cy = Math.max(200, Math.min(200 + labelHeightPx, contextPoint.y - rect.top));
    }
    await createObjectFromSpec(clipboard, cx, cy);
  }, [clipboard, labelWidthPx, labelHeightPx, contextPoint, createObjectFromSpec]);

  const pasteAtCenter = useCallback(async () => {
    const canvas = (window as any).fabricCanvas as FabricCanvas;
    if (!canvas || !clipboard) return;
    const cx = 200 + labelWidthPx / 2;
    const cy = 200 + labelHeightPx / 2;
    await createObjectFromSpec(clipboard, cx, cy);
  }, [clipboard, labelWidthPx, labelHeightPx, createObjectFromSpec]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const existingCanvas = (window as any).fabricCanvas as FabricCanvas;
    
    // If canvas exists, update it in-place without recreating
    if (existingCanvas) {
      // Canvas size with expanded margins for better visibility when zoomed out
      existingCanvas.setWidth(Math.max(800, labelWidthPx + 600));
      existingCanvas.setHeight(Math.max(600, labelHeightPx + 600));

      // Update label boundary - positioned with padding for visibility
      const boundary = existingCanvas.getObjects().find((o: any) => o.name === 'labelBoundary') as any;
      if (boundary) {
        boundary.set({ 
          left: 200, 
          top: 200,
          width: labelWidthPx, 
          height: labelHeightPx,
          stroke: "#000000",
          strokeWidth: 1,
        });
        boundary.setCoords();
      }

      // All objects keep their exact same position and size - no changes needed
      existingCanvas.getObjects().forEach((obj: any) => {
        if (obj.name === 'labelBoundary') return;
        obj.setCoords?.();
      });

      previousDpiRef.current = dpi;
      previousWidthRef.current = width;
      previousHeightRef.current = height;

      existingCanvas.requestRenderAll();
      viewportRestoredRef.current = true; // Signal to skip auto-centering
      return;
    }

    // Create new canvas only if none exists - with expanded margins for better visibility
    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.max(800, labelWidthPx + 600),
      height: Math.max(600, labelHeightPx + 600),
      backgroundColor: "transparent",
      selectionColor: "hsla(217, 91%, 60%, 0.1)",
      selectionBorderColor: "hsl(217, 91%, 60%)",
      selectionLineWidth: 2,
      renderOnAddRemove: false, // Performance: manual render control
      enableRetinaScaling: true,
      stateful: false, // Performance: disable state tracking
    });

    // Add label boundary rectangle - with padding for visibility when zoomed out
    const labelBoundary = new Rect({
      left: 200,
      top: 200,
      width: labelWidthPx,
      height: labelHeightPx,
      fill: "white",
      stroke: "#000000",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      name: "labelBoundary",
    });

    canvas.add(labelBoundary);
    
    canvas.renderAll();
    setFabricCanvas(canvas);
    (window as any).fabricCanvas = canvas;
    
    // Update refs for next change
    previousDpiRef.current = dpi;
    previousWidthRef.current = width;
    previousHeightRef.current = height;

    // Selection events
    canvas.on("selection:created", (e) => {
      const activeObj = canvas.getActiveObject();
      // Only apply origin changes to single objects, not multi-selections
      if (activeObj && activeObj.type !== 'activeSelection') {
        const obj: any = activeObj;
        // Convert to center origin without moving
        const center = obj.getCenterPoint();
        obj.set({ originX: "center", originY: "center" });
        obj.setPositionByOrigin(center, "center", "center");
        // Apply polished control styling
        customizeObjectControls(obj);
        // Setup text scaling handlers
        if (obj.type === 'i-text') {
          setupTextScaling(obj, canvas, onSelectionChange);
        }
        onSelectionChange(obj);
      } else if (activeObj && activeObj.type === 'activeSelection') {
        // For multi-selection, hide all middle/rotation handles on the selection itself
        (activeObj as any).setControlsVisibility({
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
        // Also hide ALL handles/borders on each individual object within the selection
        const objects = (activeObj as any).getObjects?.();
        if (objects) {
          objects.forEach((obj: any) => {
            obj.set({ hasControls: false, hasBorders: false });
            obj.setControlsVisibility({
              tl: false,
              tr: false,
              bl: false,
              br: false,
              mt: false,
              mb: false,
              ml: false,
              mr: false,
              mtr: false,
            });
            obj.setCoords?.();
          });
        }
        canvas.requestRenderAll();
        onSelectionChange(activeObj);
      }
    });

    canvas.on("selection:updated", (e) => {
      const activeObj = canvas.getActiveObject();
      // Only apply origin changes to single objects, not multi-selections
      if (activeObj && activeObj.type !== 'activeSelection') {
        const obj: any = activeObj;
        const center = obj.getCenterPoint();
        obj.set({ originX: "center", originY: "center" });
        obj.setPositionByOrigin(center, "center", "center");
        // Apply polished control styling
        customizeObjectControls(obj);
        // Setup text scaling handlers
        if (obj.type === 'i-text') {
          setupTextScaling(obj, canvas, onSelectionChange);
        }
        onSelectionChange(obj);
      } else if (activeObj && activeObj.type === 'activeSelection') {
        // For multi-selection, hide all handles on the selection group itself
        (activeObj as any).setControlsVisibility({
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
        // Also hide ALL handles/borders on each individual object within the selection
        const objects = (activeObj as any).getObjects?.();
        if (objects) {
          objects.forEach((obj: any) => {
            obj.set({ hasControls: false, hasBorders: false });
            obj.setControlsVisibility({
              tl: false,
              tr: false,
              bl: false,
              br: false,
              mt: false,
              mb: false,
              ml: false,
              mr: false,
              mtr: false,
            });
            obj.setCoords?.();
          });
        }
        canvas.requestRenderAll();
        onSelectionChange(activeObj);
      }
    });

    canvas.on("selection:cleared", () => {
      // Restore controls visibility for all objects when selection is cleared
      canvas.getObjects().forEach((obj: any) => {
        if (obj.name !== 'labelBoundary' && obj.selectable !== false) {
          obj.set({ hasControls: true, hasBorders: true });
          customizeObjectControls(obj);
        }
      });
      setGuideLines({});
      onSelectionChange(null);
    });

    // Handle double-click on barcode or code to edit
    canvas.on("mouse:dblclick", (e) => {
      const target = e.target as any;
      if (target && target.isBarcode && onBarcodeDoubleClick) {
        onBarcodeDoubleClick(target);
      } else if (target && target.isCode && onCodeDoubleClick) {
        onCodeDoubleClick(target);
      }
    });

    canvas.on("object:modified", async (e) => {
      // Hide guide lines when movement ends
      isDraggingRef.current = false;
      setGuideLines({});
      
      if (e.target) {
        const obj: any = e.target as any;
        // Clear scaling session at end of transform so next drag recomputes center/corner
        if (obj._scalingSession) delete obj._scalingSession;

        // Normalize geometry so visual size == stored size (helps 1:1 ZPL)
        if (obj.type === "i-text") {
          // Keep independent scaleX/scaleY for text to support non-uniform scaling.
          // Persisted values are handled in setupTextScaling's 'scaled' handler.
          onSelectionChange(obj);
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

        // If an image was resized (scale changed), regenerate its ZPL (^GFA) to match visual size
        if (obj.isImage && obj.imageSource) {
          // Only regenerate if scale actually changed (not just moved)
          const scaleChanged = (obj.scaleX && Math.abs(obj.scaleX - 1) > 0.001) || 
                               (obj.scaleY && Math.abs(obj.scaleY - 1) > 0.001);
          
          if (scaleChanged) {
            try {
              const desiredWidth = Math.round(typeof obj.getScaledWidth === "function" ? obj.getScaledWidth() : (obj.width || 0) * (obj.scaleX || 1));
              const desiredHeight = Math.round(typeof obj.getScaledHeight === "function" ? obj.getScaledHeight() : (obj.height || 0) * (obj.scaleY || 1));
              const { zpl } = await convertImageToZplGFA(obj.imageSource, dpi, desiredWidth, desiredHeight);
              obj.zplImageData = zpl;
              // Do NOT change image width/height here; keep natural bitmap size to avoid cropping/zoom
              // Keep current scale so the bounding box reflects what the user sees
            } catch (err) {
              console.error("Failed to regenerate ZPL for image", err);
            }
          }
        }

        // Barcode: keep scale values; do not quantize during finalize to preserve smooth 1:1 scaling
        if ((obj as any).isBarcode) {
          // enforce uniform scaling for subsequent drags
          (obj as any).lockUniScaling = true;
          obj.setCoords();
        }

        // QR codes: bake scale into exact ZPL size (modules + quiet zone) and keep square
        if ((obj as any).isQr) {
          const centerPoint = obj.getCenterPoint();
          const count = Math.max(1, Number((obj as any).qrModuleCount) || 0);
          const unit = count + 8; // modules incl. quiet zone per side
          const desiredWidth = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * (obj.scaleX || 1));
          const mag = Math.max(1, Math.round(desiredWidth / unit));
          const quantized = unit * mag;
          (obj as any).qrMagnification = mag;
          obj.set({ width: quantized, height: quantized, scaleX: 1, scaleY: 1, lockUniScaling: true });
          obj.setPositionByOrigin(centerPoint, 'center', 'center');
        }

        // Final clamp inside label after modifications (resize/normalize)
        {
          const br = obj.getBoundingRect(false, true);
          const c = obj.canvas as FabricCanvas | undefined;
          const boundary = c?.getObjects().find((o: any) => o.name === 'labelBoundary') as any;
          const labelW = boundary?.width ?? labelWidthPx;
          const labelH = boundary?.height ?? labelHeightPx;
          const boundaryLeft = boundary?.left ?? 200;
          const boundaryTop = boundary?.top ?? 200;
          const minCX = boundaryLeft + Math.min(br.width / 2, labelW / 2);
          const maxCX = boundaryLeft + labelW - Math.min(br.width / 2, labelW / 2);
          const minCY = boundaryTop + Math.min(br.height / 2, labelH / 2);
          const maxCY = boundaryTop + labelH - Math.min(br.height / 2, labelH / 2);
          const cpt = obj.getCenterPoint();
          const clampedX = Math.max(minCX, Math.min(cpt.x, maxCX));
          const clampedY = Math.max(minCY, Math.min(cpt.y, maxCY));
          obj.setPositionByOrigin({ x: clampedX, y: clampedY }, 'center', 'center');
          obj.setCoords();
        }

        obj.canvas?.requestRenderAll?.();
        onSelectionChange(e.target);
      }
    });

    // Throttled guide line update for better performance during dragging
    const throttledGuideLineUpdate = throttle((labelX: number, labelY: number) => {
      setGuideLines({ x: labelX, y: labelY });
    }, 16); // ~60fps

    canvas.on("object:moving", (e) => {
      if (e.target) {
        const obj = e.target as any;
        isDraggingRef.current = true;

        // Dynamic label boundaries from boundary rect
        const c = obj.canvas as FabricCanvas | undefined;
        const boundary = c?.getObjects().find((o: any) => o.name === 'labelBoundary') as any;
        const boundaryLeft = boundary?.left ?? 200;
        const boundaryTop = boundary?.top ?? 200;
        const boundaryRight = boundary ? boundary.left + boundary.width : 200 + labelWidthPx;
        const boundaryBottom = boundary ? boundary.top + boundary.height : 200 + labelHeightPx;

        // Work with center + bounding box for precise clamping (independent of origin)
        const center = obj.getCenterPoint();
        const br = obj.getBoundingRect(false, true); // bounding box in canvas coords

        // If object is larger than the label, cap half extents so it sits inside as much as possible
        const labelHalfW = (boundary?.width ?? labelWidthPx) / 2;
        const labelHalfH = (boundary?.height ?? labelHeightPx) / 2;
        const halfW = Math.min(br.width / 2, labelHalfW);
        const halfH = Math.min(br.height / 2, labelHalfH);

        // Allowed center range (keeps bounding box fully inside)
        const minCX = boundaryLeft + halfW;
        const maxCX = boundaryRight - halfW;
        const minCY = boundaryTop + halfH;
        const maxCY = boundaryBottom - halfH;

        const clampedX = Math.max(minCX, Math.min(center.x, maxCX));
        const clampedY = Math.max(minCY, Math.min(center.y, maxCY));

        obj.setPositionByOrigin({ x: clampedX, y: clampedY }, 'center', 'center');
        obj.setCoords();

        // Show guide lines from label origin (0,0) - throttled for performance
        const finalCenter = obj.getCenterPoint();
        if (finalCenter) {
          const labelX = Math.round(finalCenter.x - boundaryLeft);
          const labelY = Math.round(finalCenter.y - boundaryTop);
          throttledGuideLineUpdate(labelX, labelY);
        }
        
        // Use requestAnimationFrame for smooth rendering during drag
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
          onSelectionChange(e.target);
        });
      }
    });

    canvas.on("object:scaling", (e) => {
      if (!e.target) return;
      const obj: any = e.target;

      // Special handling for Multiline Text - resize the box, not scale the glyphs
      if (obj.isMultilineText && obj.type === 'textbox') {
        const tb = obj as Textbox;
        
        // Get label boundaries
        const boundary = canvas.getObjects().find((o: any) => o.name === 'labelBoundary') as any;
        const boundaryLeft = boundary?.left ?? 200;
        const boundaryRight = boundary ? boundary.left + boundary.width : 200 + labelWidthPx;
        
        // Keep origin at top-left for consistent resizing
        const topLeft = tb.getPointByOrigin('left', 'top');
        
        // Calculate new dimensions based on scale
        let newWidth = Math.max(20, Math.round((tb.width ?? 0) * (tb.scaleX ?? 1)));
        const newHeight = Math.max(20, Math.round((tb.height ?? 0) * (tb.scaleY ?? 1)));
        
        // Clamp to label boundaries
        let newLeft = topLeft.x;
        newLeft = Math.max(boundaryLeft, newLeft);
        const maxRight = boundaryRight;
        const newRight = newLeft + newWidth;
        
        if (newRight > maxRight) {
          newWidth = Math.max(20, maxRight - newLeft);
        }
        
        // Update textbox dimensions and reset scale
        tb.set({
          width: newWidth,
          height: newHeight,
          scaleX: 1,
          scaleY: 1,
          left: newLeft,
        });
        
        tb.setCoords();
        canvas.requestRenderAll();
        onSelectionChange(e.target);
        return; // Skip normal scaling logic
      }

      // Dynamic label boundary from live boundary rect
      const c = obj.canvas as FabricCanvas | undefined;
      const boundary = c?.getObjects().find((o: any) => o.name === 'labelBoundary') as any;
      const boundaryLeft = boundary?.left ?? 200;
      const boundaryTop = boundary?.top ?? 200;
      const boundaryRight = boundary ? boundary.left + boundary.width : 200 + labelWidthPx;
      const boundaryBottom = boundary ? boundary.top + boundary.height : 200 + labelHeightPx;

      // Initialize scaling session (fix center & active corner for entire drag)
      const tr = (e as any).transform;
      if (!obj._scalingSession) {
        obj._scalingSession = {
          center: obj.getCenterPoint(),
          corner: tr?.corner || '',
        };
      }
      const session = obj._scalingSession as any;
      const center = session.center as { x: number; y: number };
      const corner = (session.corner || '').toLowerCase();

      // Base unscaled dimensions
      const baseWidth = (() => {
        if (obj.type === 'line') return Math.abs((obj.x2 || 0) - (obj.x1 || 0)) || (obj.width || 0);
        if (typeof obj.width === 'number' && obj.width > 0) return obj.width;
        if (typeof obj.rx === 'number') return (obj.rx || 0) * 2;
        return 0;
      })();
      const baseHeight = (() => {
        if (obj.type === 'line') return Math.abs((obj.y2 || 0) - (obj.y1 || 0)) || (obj.height || 0);
        if (typeof obj.height === 'number' && obj.height > 0) return obj.height;
        if (typeof obj.ry === 'number') return (obj.ry || 0) * 2;
        return 0;
      })();

      // Barcodes: enforce uniform scaling like other elements; let generic logic handle scaling
      if ((obj as any).isBarcode) {
        obj.lockUniScaling = true;
        // no early return; continue to generic scaling
      }

      // QR codes: snap to exact ZPL magnification steps and keep square modules (1:1)
      if ((obj as any).isQr) {
        const count = Math.max(1, Number((obj as any).qrModuleCount) || 0);
        const unit = count > 0 ? (count + 8) : Math.max(baseWidth, baseHeight); // modules + quiet zone
        const desiredW = Math.max(1, Math.round(baseWidth * (obj.scaleX || 1)));
        const mag = Math.max(1, Math.round(desiredW / unit));
        const quantized = unit * mag;
        (obj as any).qrMagnification = mag;
        obj.set({ width: quantized, height: quantized, scaleX: 1, scaleY: 1, lockUniScaling: true });
        // Keep center fixed
        obj.setPositionByOrigin(center, 'center', 'center');
        obj.setCoords();
        onSelectionChange(e.target);
        return; // skip generic scaling logic
      }

      // Distances from fixed center to boundaries
      const distLeft = Math.max(0, center.x - boundaryLeft);
      const distRight = Math.max(0, boundaryRight - center.x);
      const distTop = Math.max(0, center.y - boundaryTop);
      const distBottom = Math.max(0, boundaryBottom - center.y);

      // Allowed half extents per axis considering the dragged handle
      const isLeft = corner.includes('l');
      const isRight = corner.includes('r');
      const isTop = corner.includes('t');
      const isBottom = corner.includes('b');
      const isMiddleH = corner === 'ml' || corner === 'mr';
      const isMiddleV = corner === 'mt' || corner === 'mb';

      let halfWAllowed = Math.min(distLeft, distRight);
      if (isLeft) halfWAllowed = distLeft; else if (isRight) halfWAllowed = distRight; else if (isMiddleH) halfWAllowed = Math.min(distLeft, distRight);

      let halfHAllowed = Math.min(distTop, distBottom);
      if (isTop) halfHAllowed = distTop; else if (isBottom) halfHAllowed = distBottom; else if (isMiddleV) halfHAllowed = Math.min(distTop, distBottom);

      // Maximum scales so the dragged handle sits exactly on the boundary
      let maxScaleX = baseWidth > 0 ? (halfWAllowed * 2) / baseWidth : obj.scaleX || 1;
      let maxScaleY = baseHeight > 0 ? (halfHAllowed * 2) / baseHeight : obj.scaleY || 1;

      // Freeze maxima for the whole scaling gesture to avoid jitter
      if (session.maxScaleX == null) session.maxScaleX = maxScaleX; else maxScaleX = session.maxScaleX;
      if (session.maxScaleY == null) session.maxScaleY = maxScaleY; else maxScaleY = session.maxScaleY;

      // Lines: limit only along their primary axis
      if (obj.type === 'line') {
        const isHorizontal = Math.abs((obj.x2 || 0) - (obj.x1 || 0)) >= Math.abs((obj.y2 || 0) - (obj.y1 || 0));
        if (isHorizontal) maxScaleY = obj.scaleY || 1; else maxScaleX = obj.scaleX || 1;
      }

      // Clamp scales (freeze at edge instead of shrinking)
      const minScale = 0.02;
      const desiredX = typeof obj.scaleX === 'number' ? obj.scaleX : 1;
      const desiredY = typeof obj.scaleY === 'number' ? obj.scaleY : 1;
      const isUniform = tr?.uniformScaling || obj.lockUniScaling || ((e.e as MouseEvent)?.shiftKey ?? false);

      let newScaleX = Math.max(minScale, Math.min(desiredX, maxScaleX));
      let newScaleY = Math.max(minScale, Math.min(desiredY, maxScaleY));

      if (isUniform) {
        const maxUniform = Math.max(minScale, Math.min(maxScaleX, maxScaleY));
        const limited = Math.min(desiredX, desiredY, maxUniform);
        newScaleX = limited;
        newScaleY = limited;
      }

      // Prevent automatic shrinking when dragging outside by not allowing scale to drop below last valid when at limit
      const eps = 1e-3;
      const atLimitX = desiredX >= maxScaleX - eps;
      const atLimitY = desiredY >= maxScaleY - eps;
      if (session.lastScaleX == null) session.lastScaleX = newScaleX;
      if (session.lastScaleY == null) session.lastScaleY = newScaleY;

      if (atLimitX && newScaleX < session.lastScaleX) newScaleX = session.lastScaleX;
      if (atLimitY && newScaleY < session.lastScaleY) newScaleY = session.lastScaleY;

      obj.set({ scaleX: newScaleX, scaleY: newScaleY });

      // Keep center fixed to avoid drift/jitter
      obj.setPositionByOrigin(center, 'center', 'center');
      obj.setCoords();

      // Update last valid
      session.lastScaleX = obj.scaleX;
      session.lastScaleY = obj.scaleY;

      onSelectionChange(e.target);
    });

    canvas.on("object:rotating", (e) => {
      if (e.target) {
        onSelectionChange(e.target);
      }
    });

    // Expose canvas globally for parent component access
    (window as any).fabricCanvas = canvas;

    // Right-click: record pointer only; picking handled in onContextMenu for accuracy
    canvas.on('mouse:down', (e) => {
      const mouseEvent = e.e as MouseEvent;
      if (mouseEvent && mouseEvent.button === 2) {
        setContextPoint({ x: mouseEvent.clientX, y: mouseEvent.clientY });
      }
    });

    return () => {
      // Keep canvas instance across dimension changes; dispose handled on unmount
    };
  }, [width, height, dpi, labelWidthPx, labelHeightPx, onSelectionChange, setGuideLines]);
  // Apply zoom and center label in viewport
  useEffect(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const vpt = fabricCanvas.viewportTransform;
    if (!vpt) return;

    // If we just restored viewport from previous canvas, keep it and skip re-centering
    if (viewportRestoredRef.current) {
      viewportRestoredRef.current = false;
      fabricCanvas.requestRenderAll();
      return;
    }

    // Calculate center position - label is positioned with padding
    const labelCenterX = 200 + labelWidthPx / 2;
    const labelCenterY = 200 + labelHeightPx / 2;

    // Get container dimensions (viewport)
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 600;

    // Calculate the translation to center the label in the viewport
    const translateX = containerWidth / 2 - labelCenterX * zoom;
    const translateY = containerHeight / 2 - labelCenterY * zoom;

    // Set the viewport transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
    fabricCanvas.setViewportTransform([zoom, 0, 0, zoom, translateX, translateY]);
    
    // Update state for ruler positioning
    setViewportTransform({ zoom, translateX, translateY });
    
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, zoom, labelWidthPx, labelHeightPx]);

  // Handle window resize to maintain centering
  useEffect(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const handleResize = () => {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;
      
      const labelCenterX = 200 + labelWidthPx / 2;
      const labelCenterY = 200 + labelHeightPx / 2;
      
      const translateX = containerWidth / 2 - labelCenterX * zoom;
      const translateY = containerHeight / 2 - labelCenterY * zoom;
      
      fabricCanvas.setViewportTransform([zoom, 0, 0, zoom, translateX, translateY]);
      setViewportTransform({ zoom, translateX, translateY });
      fabricCanvas.requestRenderAll();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fabricCanvas, zoom, labelWidthPx, labelHeightPx]);

  // Mouse wheel zoom (zoom toward cursor) - optimized with throttling
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleWheel = throttle((opt: any) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let newZoom = zoom;

      if (delta > 0) {
        // Zoom out
        newZoom = Math.max(0.1, zoom - 0.1);
      } else {
        // Zoom in
        newZoom = Math.min(3, zoom + 0.1);
      }

      // Get current viewport transform
      const vpt = fabricCanvas.viewportTransform;
      if (!vpt) return;

      // Get mouse position relative to canvas
      const pointer = fabricCanvas.getPointer(e);
      
      // Calculate point in canvas space before zoom
      const pointX = (pointer.x - vpt[4]) / zoom;
      const pointY = (pointer.y - vpt[5]) / zoom;
      
      // Calculate new translation to keep the point under cursor
      const newTranslateX = pointer.x - pointX * newZoom;
      const newTranslateY = pointer.y - pointY * newZoom;
      
      // Apply the new viewport transform
      fabricCanvas.setViewportTransform([newZoom, 0, 0, newZoom, newTranslateX, newTranslateY]);
      
      // Update state for ruler positioning
      setViewportTransform({ zoom: newZoom, translateX: newTranslateX, translateY: newTranslateY });
      
      fabricCanvas.requestRenderAll();
      onZoomChange(newZoom);
    }, 16); // ~60fps throttle

    fabricCanvas.on('mouse:wheel', handleWheel);

    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
    };
  }, [fabricCanvas, zoom, onZoomChange]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      const active = fabricCanvas.getActiveObject() as any;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (active && active.type !== 'i-text') {
          setClipboard(buildSpecFromObject(active));
          toast({ title: 'Copied' });
        } else if (active && active.type === 'i-text') {
          toast({ title: 'Text elements cannot be copied' });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteAtCenter();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fabricCanvas, clipboard, textCounter, onIncrementTextCounter]);
 
  // Dispose canvas on unmount only
  useEffect(() => {
    return () => {
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      const c = (window as any).fabricCanvas as FabricCanvas | undefined;
      c?.dispose?.();
      (window as any).fabricCanvas = null;
    };
  }, []);
 
   const handleContextMenu = (ev: React.MouseEvent) => {
     const canvas = (window as any).fabricCanvas as FabricCanvas;
     if (!canvas || !canvasRef.current) return;
     const rect = canvasRef.current.getBoundingClientRect();
     const x = ev.clientX - rect.left;
     const y = ev.clientY - rect.top;
     setContextPoint({ x: ev.clientX, y: ev.clientY });
 
     // If outside the canvas, show paste-only
     if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
       setContextTarget(null);
       canvas.discardActiveObject();
       canvas.requestRenderAll();
       return;
     }
 
     // Check if there's already a multi-selection active
     const activeObj = canvas.getActiveObject();
     if (activeObj && activeObj.type === 'activeSelection') {
       // Check if click is inside the multi-selection bounding box
       const br = (activeObj as any).getBoundingRect?.(true);
       if (br && x >= br.left && x <= br.left + br.width && y >= br.top && y <= br.top + br.height) {
         // Click is inside multi-selection, keep it and show context menu
         setContextTarget(activeObj);
         return;
       }
     }
 
     // Find topmost object under pointer (exclude label boundary)
     const objs = canvas.getObjects().slice().reverse();
     let found: any = null;
     for (const obj of objs) {
       const anyObj: any = obj as any;
       if (anyObj.name === 'labelBoundary' || anyObj.selectable === false) continue;
       const br = anyObj.getBoundingRect?.(true);
       if (br && x >= br.left && x <= br.left + br.width && y >= br.top && y <= br.top + br.height) {
         found = obj;
         break;
       }
     }
 
     if (found) {
       canvas.setActiveObject(found);
       setContextTarget(found);
     } else {
       canvas.discardActiveObject();
       setContextTarget(null);
     }
     canvas.requestRenderAll();
   };
 
  // Memoize ruler styles for performance - adjusted for DPI scaling
  const dpiScale = useMemo(() => dpi / 203, [dpi]);
  const rulerOffset = useMemo(() => Math.max(20, Math.round(20 * dpiScale)), [dpiScale]);

  const horizontalRulerStyle = useMemo(() => ({
    left: `${200 * viewportTransform.zoom + viewportTransform.translateX}px`, 
    top: `${(200 - rulerOffset) * viewportTransform.zoom + viewportTransform.translateY}px`, 
    zIndex: 10,
    transform: `scale(${viewportTransform.zoom})`,
    transformOrigin: 'top left',
    pointerEvents: 'none' as const,
  }), [viewportTransform, rulerOffset]);

  const verticalRulerStyle = useMemo(() => ({
    left: `${(200 - rulerOffset) * viewportTransform.zoom + viewportTransform.translateX}px`, 
    top: `${200 * viewportTransform.zoom + viewportTransform.translateY}px`, 
    zIndex: 10,
    transform: `scale(${viewportTransform.zoom})`,
    transformOrigin: 'top left',
    pointerEvents: 'none' as const,
  }), [viewportTransform, rulerOffset]);

  // Memoize guide line components for performance
  const guideLineComponents = useMemo(() => {
    if (guideLines.x === undefined || guideLines.y === undefined) return null;

    return (
      <>
        {/* Horizontal guide line - extend to rulers, transformed with zoom */}
        <div
          className="absolute bg-primary shadow-sm"
          style={{
            left: `${(200 - rulerOffset) * viewportTransform.zoom + viewportTransform.translateX}px`,
            top: `${(guideLines.y + 200) * viewportTransform.zoom + viewportTransform.translateY}px`,
            width: `${(labelWidthPx + rulerOffset * 2) * viewportTransform.zoom}px`,
            height: '1px',
            boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
            pointerEvents: 'none',
          }}
        />
        {/* Y-axis position label */}
        <div
          className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md"
          style={{
            left: `${(200 + labelWidthPx + 10) * viewportTransform.zoom + viewportTransform.translateX}px`,
            top: `${(guideLines.y + 200 - 4) * viewportTransform.zoom + viewportTransform.translateY}px`,
            pointerEvents: 'none',
          }}
        >
          Y: {(guideLines.y * 25.4 / dpi).toFixed(1)} mm
        </div>
        {/* Vertical guide line - extend to rulers, transformed with zoom */}
        <div
          className="absolute bg-primary shadow-sm"
          style={{
            left: `${(guideLines.x + 200) * viewportTransform.zoom + viewportTransform.translateX}px`,
            top: `${(200 - rulerOffset) * viewportTransform.zoom + viewportTransform.translateY}px`,
            width: '1px',
            height: `${(labelHeightPx + rulerOffset * 2) * viewportTransform.zoom}px`,
            boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.5)',
            pointerEvents: 'none',
          }}
        />
        {/* X-axis position label */}
        <div
          className="absolute text-[10px] font-mono font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded shadow-md"
          style={{
            left: `${(guideLines.x + 200 - 6) * viewportTransform.zoom + viewportTransform.translateX}px`,
            top: `${(200 + labelHeightPx + 10) * viewportTransform.zoom + viewportTransform.translateY}px`,
            pointerEvents: 'none',
          }}
        >
          X: {(guideLines.x * 25.4 / dpi).toFixed(1)} mm
        </div>
      </>
    );
  }, [guideLines, labelWidthPx, labelHeightPx, viewportTransform, dpi, rulerOffset]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          ref={containerRef} 
          className="absolute inset-0 bg-canvas overflow-auto"
          style={{ 
            willChange: isDraggingRef.current ? 'transform' : 'auto',
            transform: 'translateZ(0)', // Force hardware acceleration
          }}
          onContextMenu={handleContextMenu}
        >
          <div className="relative w-full h-full">
            <div 
              className="relative" 
              style={{ 
                display: 'inline-block',
                willChange: isDraggingRef.current ? 'transform' : 'auto',
              }}
            >
              {/* Horizontal ruler at top - positioned relative to label boundary */}
              <div 
                className="absolute" 
                style={horizontalRulerStyle}
              >
                <RulerComponent orientation="horizontal" length={labelWidthPx} dpi={dpi} />
              </div>
              
              {/* Vertical ruler on left - positioned relative to label boundary */}
              <div 
                className="absolute" 
                style={verticalRulerStyle}
              >
                <RulerComponent orientation="vertical" length={labelHeightPx} dpi={dpi} />
              </div>
              
              {/* Guide lines container */}
              <div className="absolute" style={{ inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
                {guideLineComponents}
              </div>
              
              <canvas 
                ref={canvasRef}
                style={{
                  willChange: isDraggingRef.current ? 'transform' : 'auto',
                }}
              />
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="z-[10000] w-56 bg-popover text-popover-foreground border border-border shadow-md">
        {contextTarget ? (
          <>
            <ContextMenuItem onClick={() => {
              if (contextTarget) {
                if (contextTarget.type === 'i-text') {
                  toast({ title: 'Text elements cannot be copied' });
                } else if (contextTarget.type === 'activeSelection') {
                  // For multi-selection, copy the first selected object if it's not text
                  const objects = (contextTarget as any).getObjects?.();
                  if (objects && objects[0] && objects[0].type !== 'i-text') {
                    setClipboard(buildSpecFromObject(objects[0]));
                    toast({ title: 'Copied first element' });
                  } else {
                    toast({ title: 'Text elements cannot be copied' });
                  }
                } else {
                  setClipboard(buildSpecFromObject(contextTarget));
                  toast({ title: 'Copied' });
                }
              }
            }}>
              Copy
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
              if (fabricCanvas && contextTarget) {
                if (contextTarget.type === 'activeSelection') {
                  // For multi-selection, delete all selected objects
                  const objects = (contextTarget as any).getObjects?.();
                  if (objects) {
                    objects.forEach((obj: any) => fabricCanvas.remove(obj));
                    toast({ title: `Deleted ${objects.length} elements` });
                  }
                } else {
                  fabricCanvas.remove(contextTarget);
                  toast({ title: 'Deleted' });
                }
                fabricCanvas.discardActiveObject();
                fabricCanvas.renderAll();
                setContextTarget(null);
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
