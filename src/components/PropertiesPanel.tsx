import { FabricObject, IText, Textbox } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface PropertiesPanelProps {
  selectedObject: FabricObject | null;
  onTypeChange?: () => void;
}

export const PropertiesPanel = ({ selectedObject, onTypeChange }: PropertiesPanelProps) => {
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    fontSize: 0,
    fontWidth: 0,
    fontHeight: 0,
    text: "",
    strokeWidth: 0,
  });

  const [fontSizeInput, setFontSizeInput] = useState<string>("");
  const [fontRatioSlider, setFontRatioSlider] = useState(0);

  // Helper to check if object is a text type (i-text or textbox)
  const isTextObject = (obj: FabricObject | null): boolean => {
    return obj?.type === "i-text" || obj?.type === "textbox";
  };

  // Get ZPL FO position using bounding rect and rotation adjustment
  const getFoForZpl = (obj: any) => {
    const rect = obj.getBoundingRect(true);
    let x = rect.left;
    let y = rect.top;

    const w = (obj.width || 0) * (obj.scaleX || 1);
    const h = (obj.height || 0) * (obj.scaleY || 1);

    switch (obj.angle % 360) {
      case 0:
        break;

      case 90:
        y -= h;
        break;

      case 180:
        x -= w;
        y -= h;
        break;

      case 270: // A0B
        y -= w; // Key adjustment for 270 degrees
        break;
    }

    return {
      x: Math.round(x),
      y: Math.round(y)
    };
  };

  const updatePropertiesFromObject = (obj: FabricObject) => {
    const canvas = (window as any).fabricCanvas;
    const labelBoundary = canvas?.getObjects().find((o: any) => o.name === 'labelBoundary');
    const boundaryLeft = labelBoundary?.left ?? 200;
    const boundaryTop = labelBoundary?.top ?? 200;
    const labelWidthDots = (canvas as any)?.labelWidthDots || 800;
    const labelHeightDots = (canvas as any)?.labelHeightDots || 400;
    
    // Get FO position matching ZPL (using bounding rect + rotation adjustment)
    const topLeft = getFoForZpl(obj);
    
    // Canvas pixels = dots (1:1), just subtract boundary offset like ZPL generator
    const left = Math.round(topLeft.x - boundaryLeft);
    const top = Math.round(topLeft.y - boundaryTop);

    // For lines, calculate actual length (excluding stroke width from dimensions)
    let width = Math.round((obj.width || 0) * (obj.scaleX || 1));
    let height = Math.round((obj.height || 0) * (obj.scaleY || 1));
    
    if (obj.type === "line") {
      const line = obj as any;
      width = Math.round(Math.abs((line.x2 || 0) - (line.x1 || 0)));
      height = Math.round(Math.abs((line.y2 || 0) - (line.y1 || 0)));
    }

    // Update font size input with effective size for text objects
    if (isTextObject(obj)) {
      const effectiveSize = getEffectiveFontSize(obj as IText);
      setFontSizeInput(Math.round(effectiveSize).toString());
    }

    // Get fontWidth and fontHeight directly from object, or calculate from fontSize * scale
    const baseFontSize = (obj as IText).fontSize || 20;
    const objFontWidth = (obj as any).fontWidth ?? Math.round(baseFontSize * (obj.scaleX || 1));
    const objFontHeight = (obj as any).fontHeight ?? Math.round(baseFontSize * (obj.scaleY || 1));

    setProperties({
      left,
      top,
      width,
      height,
      angle: Math.round(obj.angle || 0),
      fontSize: Math.round(baseFontSize),
      fontWidth: objFontWidth,
      fontHeight: objFontHeight,
      text: (obj as IText).text || "",
      strokeWidth: Math.round((obj as any).strokeWidth || 0),
    });
  };

  useEffect(() => {
    if (selectedObject) {
      updatePropertiesFromObject(selectedObject);

      const canvas = (window as any).fabricCanvas;
      if (!canvas) return;

      // Add real-time event listeners
      const handleObjectModified = () => {
        if (selectedObject) {
          updatePropertiesFromObject(selectedObject);
        }
      };

      const handleObjectMoving = () => {
        if (selectedObject) {
          updatePropertiesFromObject(selectedObject);
        }
      };

      const handleObjectScaling = () => {
        if (selectedObject) {
          updatePropertiesFromObject(selectedObject);
        }
      };

      const handleObjectRotating = () => {
        if (selectedObject) {
          updatePropertiesFromObject(selectedObject);
        }
      };

      canvas.on("object:modified", handleObjectModified);
      canvas.on("object:moving", handleObjectMoving);
      canvas.on("object:scaling", handleObjectScaling);
      canvas.on("object:rotating", handleObjectRotating);

      return () => {
        canvas.off("object:modified", handleObjectModified);
        canvas.off("object:moving", handleObjectMoving);
        canvas.off("object:scaling", handleObjectScaling);
        canvas.off("object:rotating", handleObjectRotating);
      };
    }
  }, [selectedObject]);

  // Calculate effective font size (what the user sees = fontSize * scaleY)
  const getEffectiveFontSize = (textObj: IText): number => {
    const baseFontSize = textObj.fontSize ?? 16;
    const scaleY = textObj.scaleY ?? 1;
    return baseFontSize * scaleY;
  };

  const updateFontSize = (newEffectiveSize: number) => {
    if (!selectedObject || !isTextObject(selectedObject)) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Clamp to safe range
    const clampedSize = Math.max(4, Math.min(400, newEffectiveSize));

    const textObj = selectedObject as IText;
    const currentScaleY = textObj.scaleY || 1;
    
    // Calculate new base fontSize to achieve the desired effective size
    // effectiveSize = baseFontSize * scaleY
    // therefore: baseFontSize = effectiveSize / scaleY
    const newBaseFontSize = clampedSize / currentScaleY;

    // Update fontSize without changing scale
    textObj.set({ fontSize: newBaseFontSize });
    
    // Update fontWidth and fontHeight properties based on actual rendered size
    (textObj as any).fontWidth = Math.round(newBaseFontSize * (textObj.scaleX || 1));
    (textObj as any).fontHeight = Math.round(newBaseFontSize * currentScaleY);

    textObj.setCoords();
    canvas.requestRenderAll?.();
    setFontSizeInput(Math.round(clampedSize).toString());
    updatePropertiesFromObject(selectedObject);
  };

  const handleFontSizeInputChange = (value: string) => {
    setFontSizeInput(value);
    
    // Apply change immediately (live update)
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      updateFontSize(parsed);
    }
  };

  const applyFontSizeFromInput = () => {
    const parsed = parseFloat(fontSizeInput);
    if (!isNaN(parsed) && parsed > 0) {
      updateFontSize(parsed);
    } else if (isTextObject(selectedObject)) {
      // Reset to current effective size if invalid
      const effectiveSize = getEffectiveFontSize(selectedObject as IText);
      setFontSizeInput(Math.round(effectiveSize).toString());
    }
  };

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Get label dimensions in dots from canvas metadata (set during canvas initialization)
    const labelWidthDots = (canvas as any).labelWidthDots || 800;
    const labelHeightDots = (canvas as any).labelHeightDots || 400;

    // Ensure origin is center for consistent rotation behavior
    if (selectedObject.originX !== 'center' || selectedObject.originY !== 'center') {
      const c = (selectedObject as any).getCenterPoint?.();
      if (c) {
        (selectedObject as any).set({ originX: 'center', originY: 'center' });
        (selectedObject as any).setPositionByOrigin(c, 'center', 'center');
      }
    }

    // Get boundary offset (canvas pixels = dots, 1:1)
    const labelBoundary = canvas.getObjects().find((obj: any) => obj.name === 'labelBoundary');
    const boundaryLeft = labelBoundary?.left ?? 200;
    const boundaryTop = labelBoundary?.top ?? 200;

    // Convert label-relative dots (UNROTATED TOP-LEFT corner) to canvas pixels
    // We use center-based positioning so rotation doesn't affect the displayed X/Y
    if (key === "left") {
      const inputValue = parseFloat(value);
      const constrainedX = Math.max(0, Math.min(inputValue, labelWidthDots));
      
      // Calculate half dimensions (unrotated)
      const scaleX = selectedObject.scaleX || 1;
      const w = (selectedObject.width || 0) * scaleX;
      
      // Get current center Y
      const currentCenter = selectedObject.getCenterPoint();
      
      // New center X = desired unrotated top-left X + half width + boundary offset
      const newCenterX = constrainedX + boundaryLeft + w / 2;
      
      (selectedObject as any).setPositionByOrigin({ x: newCenterX, y: currentCenter.y }, 'center', 'center');
    } else if (key === "top") {
      const inputValue = parseFloat(value);
      const constrainedY = Math.max(0, Math.min(inputValue, labelHeightDots));
      
      // Get current center X
      const currentCenter = selectedObject.getCenterPoint();
      
      // For text objects, use font height offset
      if (isTextObject(selectedObject)) {
        const scaleY = selectedObject.scaleY || 1;
        const fontHeight = (selectedObject as any).fontHeight || ((selectedObject as IText).fontSize || 20) * scaleY;
        const newCenterY = constrainedY + boundaryTop + fontHeight;
        (selectedObject as any).setPositionByOrigin({ x: currentCenter.x, y: newCenterY }, 'center', 'center');
      } else {
        const scaleY = selectedObject.scaleY || 1;
        const h = (selectedObject.height || 0) * scaleY;
        const newCenterY = constrainedY + boundaryTop + h / 2;
        (selectedObject as any).setPositionByOrigin({ x: currentCenter.x, y: newCenterY }, 'center', 'center');
      }
    } else if (key === "angle") {
      const angle = parseFloat(value);
      const centerPoint = selectedObject.getCenterPoint();
      selectedObject.set("angle", angle);
      (selectedObject as any).setPositionByOrigin(centerPoint, 'center', 'center');
    } else if (key === "fontSize" && isTextObject(selectedObject)) {
      const newFontSize = parseFloat(value);
      (selectedObject as IText).set("fontSize", newFontSize);
      if ((selectedObject as any).fontWidth && (selectedObject as any).fontHeight) {
        const currentFontSize = (selectedObject as IText).fontSize || 20;
        const ratio = newFontSize / currentFontSize;
        (selectedObject as any).fontWidth = Math.round((selectedObject as any).fontWidth * ratio);
        (selectedObject as any).fontHeight = Math.round((selectedObject as any).fontHeight * ratio);
      }
    } else if (key === "fontWidth" && isTextObject(selectedObject)) {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return;
      const newFontWidth = Math.max(1, parsed);
      (selectedObject as any).fontWidth = newFontWidth;
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleX', newFontWidth / baseSize);
      selectedObject.setCoords();
    } else if (key === "fontHeight" && isTextObject(selectedObject)) {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return;
      const newFontHeight = Math.max(1, parsed);
      (selectedObject as any).fontHeight = newFontHeight;
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleY', newFontHeight / baseSize);
      selectedObject.setCoords();
    } else if (key === "text" && isTextObject(selectedObject)) {
      (selectedObject as IText).set("text", value);
    } else if (key === "strokeWidth") {
      const newStrokeWidth = parseFloat(value);
      if (selectedObject.type === "rect" || selectedObject.type === "ellipse" || selectedObject.type === "line") {
        const center = selectedObject.getCenterPoint();
        selectedObject.set({
          strokeWidth: newStrokeWidth,
          strokeUniform: true,
        });
        if (selectedObject.type === "line") {
          (selectedObject as any).set({ strokeLineCap: 'square', objectCaching: false });
        }
        (selectedObject as any).setPositionByOrigin(center, 'center', 'center');
        selectedObject.setCoords();
      } else {
        selectedObject.set("strokeWidth", newStrokeWidth);
      }
    } else if (key === "width") {
      const newWidth = parseFloat(value);
      if (selectedObject.type === "line") {
        const line = selectedObject as any;
        const isHorizontal = Math.abs((line.x2 || 0) - (line.x1 || 0)) >= Math.abs((line.y2 || 0) - (line.y1 || 0));
        if (isHorizontal) {
          line.set({
            x1: -newWidth / 2,
            x2: newWidth / 2,
          });
        }
      } else {
        const originalWidth = selectedObject.width || 1;
        const newScaleX = newWidth / originalWidth;
        selectedObject.set("scaleX", newScaleX);
      }
    } else if (key === "height") {
      const newHeight = parseFloat(value);
      if (selectedObject.type === "line") {
        const line = selectedObject as any;
        const isHorizontal = Math.abs((line.x2 || 0) - (line.x1 || 0)) >= Math.abs((line.y2 || 0) - (line.y1 || 0));
        if (!isHorizontal) {
          line.set({
            y1: -newHeight / 2,
            y2: newHeight / 2,
          });
        }
      } else {
        const originalHeight = selectedObject.height || 1;
        const newScaleY = newHeight / originalHeight;
        selectedObject.set("scaleY", newScaleY);
      }
    }

    selectedObject.setCoords();
    canvas.requestRenderAll?.();
    updatePropertiesFromObject(selectedObject);
  };

  const getUsedTextFields = (): string[] => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return [];
    
    const usedFields: string[] = [];
    canvas.getObjects().forEach((obj: any) => {
      if (isTextObject(obj) && obj.fieldName && !obj.isFixedText && obj !== selectedObject) {
        usedFields.push(obj.fieldName);
      }
    });
    return usedFields;
  };

  const handleTypeChange = (newType: string) => {
    if (!selectedObject || !isTextObject(selectedObject)) return;
    
    const textObj = selectedObject as IText;
    const canvas = (window as any).fabricCanvas;
    
    // Prevent re-render if the type is the same
    const currentType = (textObj as any).isFixedText ? "fixed" : ((textObj as any).fieldName || "fixed");
    if (currentType === newType) return;
    
    if (newType === "fixed") {
      // Convert to fixed text - auto-fill content with "Fixed Text"
      (textObj as any).fieldName = "";
      (textObj as any).isFixedText = true;
      textObj.set("text", "Fixed Text");
    } else {
      // Convert to dynamic text - auto-fill content with field name
      (textObj as any).fieldName = newType;
      (textObj as any).isFixedText = false;
      textObj.set("text", newType);
    }
    
    textObj.setCoords();
    
    if (canvas) {
      canvas.requestRenderAll?.();
    }
    
    // Update properties to reflect the new text content
    updatePropertiesFromObject(selectedObject);
    onTypeChange?.();
  };

  const getAvailableTextFields = (): string[] => {
    const textCategory = (selectedObject as any)?.textCategory;
    const usedFields = getUsedTextFields();
    
    // Generate options based on category
    let allFields: string[] = [];
    
    if (textCategory === "Date & Time") {
      allFields = [
        "Date_Text1", "Date_Text2", "Date_Text3", 
        "Date_Text4", "Date_Text5", "Date_Text6", "Clock"
      ];
    } else if (textCategory === "Nutrition & Energy Values") {
      allFields = Array.from({ length: 30 }, (_, i) => `Text_EV${i + 1}`);
    } else if (textCategory === "Weight & Price") {
      allFields = Array.from({ length: 20 }, (_, i) => `Text_WP${i + 1}`);
    } else if (textCategory === "Multiline Text") {
      allFields = Array.from({ length: 5 }, (_, i) => `text_ml${i + 1}`);
    } else if (textCategory === "Teksti") {
      allFields = Array.from({ length: 30 }, (_, i) => `TEKST${i + 1}`);
    } else {
      // Fixed Text or undefined category - no dynamic fields needed
      allFields = [];
    }
    
    return allFields.filter(field => !usedFields.includes(field));
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedObject || !isTextObject(selectedObject)) return;
    
    const textObj = selectedObject as IText | Textbox;
    textObj.set('textAlign', alignment);
    textObj.setCoords();
    
    const canvas = (window as any).fabricCanvas;
    if (canvas) {
      canvas.requestRenderAll?.();
    }
    
    updatePropertiesFromObject(selectedObject);
  };

  if (!selectedObject) {
    return (
      <div className="w-72 h-full bg-panel border-l border-border p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Properties</h3>
        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Select an element to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-panel border-l border-border p-4 overflow-y-auto shadow-xl">
      <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider">Element Properties</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Positions in dots from label origin (0,0)
      </p>

      <Card className="p-4 space-y-4 shadow-md border-border/50">
        {isTextObject(selectedObject) ? (
          <div>
            <Label htmlFor="type" className="text-xs">
              Type
            </Label>
            <Select
              key={`type-${(selectedObject as any).isFixedText ? "fixed" : ((selectedObject as any).fieldName || "fixed")}`}
              value={(selectedObject as any).isFixedText ? "fixed" : ((selectedObject as any).fieldName || "fixed")}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                className="bg-background z-[100] max-h-60"
                position="popper"
                sideOffset={5}
              >
                {((selectedObject as any).textCategory === "Fixed Text" || !(selectedObject as any).textCategory) && (
                  <SelectItem value="fixed">Fixed Text</SelectItem>
                )}
                {getAvailableTextFields().map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
                {(selectedObject as any).fieldName && !(selectedObject as any).isFixedText && (
                  <SelectItem value={(selectedObject as any).fieldName}>
                    {(selectedObject as any).fieldName} (current)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="type" className="text-xs">
              Type
            </Label>
            <Input
              id="type"
              value={selectedObject.type || "unknown"}
              disabled
              className="mt-1"
            />
          </div>
        )}

        {/* Text Alias - only for Teksti category */}
        {isTextObject(selectedObject) && (selectedObject as any)?.textCategory === "Teksti" && (
          <div>
            <Label htmlFor="textAlias" className="text-xs">
              Text Alias
            </Label>
            <Input
              id="textAlias"
              value={(selectedObject as any).textAlias || ''}
              onChange={(e) => {
                (selectedObject as any).textAlias = e.target.value;
                const canvas = (window as any).fabricCanvas;
                if (canvas) canvas.requestRenderAll?.();
                updatePropertiesFromObject(selectedObject);
              }}
              className="mt-1"
              placeholder="Custom name..."
            />
          </div>
        )}

        <div>
          <Label htmlFor="layout" className="text-xs">
            Layout
          </Label>
          <Select
            key={`layout-${(selectedObject as any).layoutNumber || 1}`}
            value={String((selectedObject as any).layoutNumber || 1)}
            onValueChange={(value) => {
              (selectedObject as any).layoutNumber = parseInt(value);
              const canvas = (window as any).fabricCanvas;
              if (canvas) {
                // Reorder all objects by layout number (lower layouts on top)
                const objects = canvas.getObjects().filter((o: any) => o.name !== 'labelBoundary');
                objects.sort((a: any, b: any) => (b.layoutNumber || 1) - (a.layoutNumber || 1));
                objects.forEach((obj: any) => canvas.bringObjectToFront(obj));
                // Keep labelBoundary at back
                const labelBoundary = canvas.getObjects().find((o: any) => o.name === 'labelBoundary');
                if (labelBoundary) canvas.sendObjectToBack(labelBoundary);
                canvas.requestRenderAll?.();
              }
              updatePropertiesFromObject(selectedObject);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-[100]">
              <SelectItem value="1">Layout 1</SelectItem>
              <SelectItem value="2">Layout 2</SelectItem>
              <SelectItem value="3">Layout 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="left" className="text-xs">
              X Position
            </Label>
            <Input
              id="left"
              type="number"
              value={properties.left}
              onChange={(e) => updateProperty("left", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="top" className="text-xs">
              Y Position
            </Label>
            <Input
              id="top"
              type="number"
              value={properties.top}
              onChange={(e) => updateProperty("top", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {!isTextObject(selectedObject) && (() => {
          // Hide Width/Height for all barcode types and images
          const isCode = (selectedObject as any).isCode;
          const isImage = selectedObject.type === "image" && !isCode;
          
          if (isCode || isImage) {
            return null; // Hide Width/Height for barcodes and images
          }
          
          return (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="width" className="text-xs">
                  Width
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={properties.width}
                  onChange={(e) => updateProperty("width", e.target.value)}
                  className="mt-1"
                />
              </div>
              {selectedObject.type !== "line" && (
                <div>
                  <Label htmlFor="height" className="text-xs">
                    Height
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={properties.height}
                    onChange={(e) => updateProperty("height", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          );
        })()}

        {isTextObject(selectedObject) && (
          <div>
            <Label htmlFor="angle" className="text-xs">
              Rotation
            </Label>
            <Select
              value={properties.angle.toString()}
              onValueChange={(value) => updateProperty("angle", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                className="bg-background z-[100]"
                position="popper"
                sideOffset={5}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <SelectItem value="0">0° (Normal)</SelectItem>
                <SelectItem value="90">90° (Clockwise)</SelectItem>
                <SelectItem value="180">180° (Upside Down)</SelectItem>
                <SelectItem value="270">270° (Counter-Clockwise)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {((selectedObject as any).name && (selectedObject as any).name.startsWith("barcode_")) && (
          <div>
            <Label htmlFor="angle" className="text-xs">
              Rotation
            </Label>
            <Select
              value={properties.angle.toString()}
              onValueChange={(value) => updateProperty("angle", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                className="bg-background z-[100]"
                position="popper"
                sideOffset={5}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <SelectItem value="0">0° (Normal)</SelectItem>
                <SelectItem value="90">90° (Clockwise)</SelectItem>
                <SelectItem value="180">180° (Upside Down)</SelectItem>
                <SelectItem value="270">270° (Counter-Clockwise)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(selectedObject as any).isCode && (
          <>
            <div>
              <Label htmlFor="codeAlias" className="text-xs">
                Alias
              </Label>
              <Input
                id="codeAlias"
                value={(selectedObject as any).codeAlias || ''}
                onChange={(e) => {
                  (selectedObject as any).codeAlias = e.target.value;
                  const canvas = (window as any).fabricCanvas;
                  if (canvas) canvas.requestRenderAll?.();
                  updatePropertiesFromObject(selectedObject);
                }}
                className="mt-1"
                placeholder="Custom name..."
              />
            </div>
            <div>
              <Label htmlFor="angle" className="text-xs">
                Rotation
              </Label>
              <Select
                value={properties.angle.toString()}
                onValueChange={(value) => updateProperty("angle", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="bg-background z-[100]"
                  position="popper"
                  sideOffset={5}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <SelectItem value="0">0°</SelectItem>
                  <SelectItem value="90">90°</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270°</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {(selectedObject as any).isImage && (
          <>
            <div>
              <Label htmlFor="imageAlias" className="text-xs">
                Alias
              </Label>
              <Input
                id="imageAlias"
                value={(selectedObject as any).imageAlias || ''}
                onChange={(e) => {
                  (selectedObject as any).imageAlias = e.target.value;
                  const canvas = (window as any).fabricCanvas;
                  if (canvas) canvas.requestRenderAll?.();
                  updatePropertiesFromObject(selectedObject);
                }}
                className="mt-1"
                placeholder="Custom name..."
              />
            </div>
            <div>
              <Label htmlFor="imageType" className="text-xs">
                Type
              </Label>
              <Select
                key={`image-type-${(selectedObject as any).isFixedImage !== false ? "fixed" : ((selectedObject as any).imageFieldName || "fixed")}`}
                value={(selectedObject as any).isFixedImage !== false ? "fixed" : ((selectedObject as any).imageFieldName || "fixed")}
                onValueChange={(newType) => {
                  const canvas = (window as any).fabricCanvas;
                  if (newType === "fixed") {
                    (selectedObject as any).imageFieldName = "";
                    (selectedObject as any).isFixedImage = true;
                  } else {
                    (selectedObject as any).imageFieldName = newType;
                    (selectedObject as any).isFixedImage = false;
                  }
                  if (canvas) {
                    canvas.requestRenderAll?.();
                  }
                  updatePropertiesFromObject(selectedObject);
                  onTypeChange?.();
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-background z-[100] max-h-60"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectItem value="fixed">Fixed Image</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={`Image${i + 1}`} value={`Image${i + 1}`}>
                      Image{i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(selectedObject as any).isFixedImage === false && (selectedObject as any).imageFieldName && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                <div>Placeholder: <strong>{(selectedObject as any).imageFieldName}</strong></div>
              </div>
            )}
            <div>
              <Label htmlFor="angle" className="text-xs">
                Rotation
              </Label>
              <Select
                value={properties.angle.toString()}
                onValueChange={(value) => updateProperty("angle", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="bg-background z-[100]"
                  position="popper"
                  sideOffset={5}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <SelectItem value="0">0° (Normal)</SelectItem>
                  <SelectItem value="90">90°</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270°</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {(selectedObject.type === "rect" || selectedObject.type === "ellipse" || selectedObject.type === "line") && (
          <div>
            <Label htmlFor="strokeWidth" className="text-xs">
              Line Thickness
            </Label>
            <Input
              id="strokeWidth"
              type="number"
              min="1"
              value={properties.strokeWidth}
              onChange={(e) => updateProperty("strokeWidth", e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        {isTextObject(selectedObject) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fontWidth" className="text-xs">
                  Font Width
                </Label>
                <Input
                  id="fontWidth"
                  type="number"
                  min="1"
                  value={properties.fontWidth}
                  onChange={(e) => updateProperty("fontWidth", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fontHeight" className="text-xs">
                  Font Height
                </Label>
                <Input
                  id="fontHeight"
                  type="number"
                  min="1"
                  value={properties.fontHeight}
                  onChange={(e) => updateProperty("fontHeight", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Font ratio slider - only for Teksti category */}
            {(selectedObject as any)?.textCategory === "Teksti" && (
              <div>
                <Label className="text-xs">Font Ratio ±10</Label>
                <Slider
                  min={-10}
                  max={10}
                  step={1}
                  value={[fontRatioSlider]}
                  onValueChange={(values) => {
                    setFontRatioSlider(values[0]);
                  }}
                  onValueCommit={(values) => {
                    const delta = values[0];
                    if (delta !== 0 && selectedObject) {
                      const currentFontWidth = (selectedObject as any).fontWidth || 20;
                      const currentFontHeight = (selectedObject as any).fontHeight || 20;
                      const newFontWidth = Math.max(1, currentFontWidth + delta);
                      const newFontHeight = Math.max(1, currentFontHeight - delta);
                      
                      updateProperty("fontWidth", newFontWidth.toString());
                      updateProperty("fontHeight", newFontHeight.toString());
                    }
                    // Reset slider to center
                    setFontRatioSlider(0);
                  }}
                  className="mt-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>-10</span>
                  <span>0</span>
                  <span>+10</span>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <div>ZPL: ^A0N,{properties.fontHeight},{properties.fontWidth}</div>
            </div>

            {!((selectedObject as any)?.textCategory === "Fixed Text" || (selectedObject as any)?.isFixedText) && (
            <div>
              <Label className="text-xs font-semibold">
                Horizontal Alignment
              </Label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={(selectedObject as IText | Textbox).textAlign === 'left' ? "default" : "outline"}
                  onClick={() => handleAlignmentChange('left')}
                  className="flex-1"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={((selectedObject as IText | Textbox).textAlign === 'center' || !(selectedObject as IText | Textbox).textAlign) ? "default" : "outline"}
                  onClick={() => handleAlignmentChange('center')}
                  className="flex-1"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={(selectedObject as IText | Textbox).textAlign === 'right' ? "default" : "outline"}
                  onClick={() => handleAlignmentChange('right')}
                  className="flex-1"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            )}
            <div>
              <Label htmlFor="text" className="text-xs">
                Text Content
              </Label>
              <Input
                id="text"
                value={properties.text}
                onChange={(e) => updateProperty("text", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="mt-1"
              />
            </div>
          </>
        )}
        
        {(selectedObject as any).isCode && (
          <div>
            <Button
              onClick={() => {
                const canvas = (window as any).fabricCanvas;
                if (canvas) {
                  // Trigger edit by dispatching a double-click event simulation
                  canvas.fire('mouse:dblclick', { target: selectedObject });
                }
              }}
              className="w-full mt-2"
            >
              Edit Code Data
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
