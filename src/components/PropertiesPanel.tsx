import { FabricObject, IText, Textbox } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  // Helper to check if object is a text type (i-text or textbox)
  const isTextObject = (obj: FabricObject | null): boolean => {
    return obj?.type === "i-text" || obj?.type === "textbox";
  };

  const updatePropertiesFromObject = (obj: FabricObject) => {
    const center = (obj as any).getCenterPoint?.();
    const left = center ? Math.round(center.x - 50) : Math.round((obj.left || 0) - 50);
    const top = center ? Math.round(center.y - 50) : Math.round((obj.top || 0) - 50);

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

    setProperties({
      left,
      top,
      width,
      height,
      angle: Math.round(obj.angle || 0),
      fontSize: Math.round((obj as IText).fontSize || 0),
      fontWidth: Math.round(((obj as IText).fontSize || 0) * (obj.scaleX || 1)),
      fontHeight: Math.round(((obj as IText).fontSize || 0) * (obj.scaleY || 1)),
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
    textObj.set({ 
      fontSize: newBaseFontSize,
      charSpacing: 8
    });
    
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

    // Get label boundary dimensions
    const labelBoundary = canvas.getObjects().find((obj: any) => obj.name === "labelBoundary");
    const labelWidth = labelBoundary?.width || 0;
    const labelHeight = labelBoundary?.height || 0;

    // Ensure origin is center for consistent rotation behavior
    if (selectedObject.originX !== 'center' || selectedObject.originY !== 'center') {
      const c = (selectedObject as any).getCenterPoint?.();
      if (c) {
        (selectedObject as any).set({ originX: 'center', originY: 'center' });
        (selectedObject as any).setPositionByOrigin(c, 'center', 'center');
      }
    }

    // Convert label-relative positions back to canvas positions (add 50px offset)
    if (key === "left") {
      const inputValue = parseFloat(value);
      
      // Calculate object bounds for constraint
      const objWidth = (selectedObject.width || 0) * (selectedObject.scaleX || 1);
      const halfWidth = objWidth / 2;
      
      // For lines, use actual dimensions
      if (selectedObject.type === "line") {
        const line = selectedObject as any;
        const lineWidth = Math.abs((line.x2 || 0) - (line.x1 || 0));
        const strokeWidth = line.strokeWidth || 1;
        const effectiveHalfWidth = Math.max(lineWidth, strokeWidth) / 2;
        
        // Constrain within label boundaries (0 to labelWidth)
        const minX = effectiveHalfWidth;
        const maxX = labelWidth - effectiveHalfWidth;
        const constrainedX = Math.max(minX, Math.min(inputValue, maxX));
        
        const targetX = constrainedX + 50;
        const center = (selectedObject as any).getCenterPoint?.();
        const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
        (selectedObject as any).setPositionByOrigin({ x: targetX, y: current.y }, 'center', 'center');
      } else {
        // Constrain within label boundaries (0 to labelWidth)
        const minX = halfWidth;
        const maxX = labelWidth - halfWidth;
        const constrainedX = Math.max(minX, Math.min(inputValue, maxX));
        
        const targetX = constrainedX + 50;
        const center = (selectedObject as any).getCenterPoint?.();
        const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
        (selectedObject as any).setPositionByOrigin({ x: targetX, y: current.y }, 'center', 'center');
      }
    } else if (key === "top") {
      const inputValue = parseFloat(value);
      
      // Calculate object bounds for constraint
      const objHeight = (selectedObject.height || 0) * (selectedObject.scaleY || 1);
      const halfHeight = objHeight / 2;
      
      // For lines, use actual dimensions
      if (selectedObject.type === "line") {
        const line = selectedObject as any;
        const lineHeight = Math.abs((line.y2 || 0) - (line.y1 || 0));
        const strokeWidth = line.strokeWidth || 1;
        const effectiveHalfHeight = Math.max(lineHeight, strokeWidth) / 2;
        
        // Constrain within label boundaries (0 to labelHeight)
        const minY = effectiveHalfHeight;
        const maxY = labelHeight - effectiveHalfHeight;
        const constrainedY = Math.max(minY, Math.min(inputValue, maxY));
        
        const targetY = constrainedY + 50;
        const center = (selectedObject as any).getCenterPoint?.();
        const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
        (selectedObject as any).setPositionByOrigin({ x: current.x, y: targetY }, 'center', 'center');
      } else {
        // Constrain within label boundaries (0 to labelHeight)
        const minY = halfHeight;
        const maxY = labelHeight - halfHeight;
        const constrainedY = Math.max(minY, Math.min(inputValue, maxY));
        
        const targetY = constrainedY + 50;
        const center = (selectedObject as any).getCenterPoint?.();
        const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
        (selectedObject as any).setPositionByOrigin({ x: current.x, y: targetY }, 'center', 'center');
      }
    } else if (key === "angle") {
      const angle = parseFloat(value);
      // Store the current center point
      const centerPoint = selectedObject.getCenterPoint();
      // Set the new angle
      selectedObject.set("angle", angle);
      // Restore the center point using setPositionByOrigin
      (selectedObject as any).setPositionByOrigin(centerPoint, 'center', 'center');
    } else if (key === "fontSize" && isTextObject(selectedObject)) {
      const newFontSize = parseFloat(value);
      (selectedObject as IText).set("fontSize", newFontSize);
      // Update fontWidth and fontHeight proportionally if they exist
      if ((selectedObject as any).fontWidth && (selectedObject as any).fontHeight) {
        const currentFontSize = (selectedObject as IText).fontSize || 20;
        const ratio = newFontSize / currentFontSize;
        (selectedObject as any).fontWidth = Math.round((selectedObject as any).fontWidth * ratio);
        (selectedObject as any).fontHeight = Math.round((selectedObject as any).fontHeight * ratio);
      }
    } else if (key === "fontWidth" && isTextObject(selectedObject)) {
      const newFontWidth = Math.max(1, parseFloat(value));
      (selectedObject as any).fontWidth = newFontWidth;
      // Set horizontal scale to match desired width in dots
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleX', newFontWidth / baseSize);
      
      // Update properties to reflect changes (though fontWidth doesn't affect effective font size)
      setTimeout(() => updatePropertiesFromObject(selectedObject), 0);
    } else if (key === "fontHeight" && isTextObject(selectedObject)) {
      const newFontHeight = Math.max(1, parseFloat(value));
      (selectedObject as any).fontHeight = newFontHeight;
      // Set vertical scale to match desired height in dots
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleY', newFontHeight / baseSize);
      
      // Update properties to reflect new effective font size in dropdown
      setTimeout(() => updatePropertiesFromObject(selectedObject), 0);
    } else if (key === "text" && isTextObject(selectedObject)) {
      (selectedObject as IText).set({
        text: value,
        charSpacing: 8
      });
    } else if (key === "strokeWidth") {
      const newStrokeWidth = parseFloat(value);
      
      // For Rectangle, Ellipse, and Line: preserve center position when changing stroke
      if (selectedObject.type === "rect" || selectedObject.type === "ellipse" || selectedObject.type === "line") {
        const center = selectedObject.getCenterPoint();
        
        selectedObject.set({
          strokeWidth: newStrokeWidth,
          strokeUniform: true, // Keep stroke consistent when scaling
        });
        
        // For lines, ensure proper rendering
        if (selectedObject.type === "line") {
          (selectedObject as any).set({ strokeLineCap: 'square', objectCaching: false });
        }
        
        // Restore center position
        (selectedObject as any).setPositionByOrigin(center, 'center', 'center');
        selectedObject.setCoords();
      } else {
        selectedObject.set("strokeWidth", newStrokeWidth);
      }
    } else if (key === "width") {
      const newWidth = parseFloat(value);
      
      if (selectedObject.type === "line") {
        // For lines, directly update the line coordinates
        const line = selectedObject as any;
        const center = line.getCenterPoint?.();
        const centerX = center ? center.x - 50 : 0; // Relative to label origin
        const isHorizontal = Math.abs((line.x2 || 0) - (line.x1 || 0)) >= Math.abs((line.y2 || 0) - (line.y1 || 0));
        
        if (isHorizontal) {
          // Check if new width would exceed boundaries
          const halfWidth = newWidth / 2;
          const maxWidth = Math.min(centerX, labelWidth - centerX) * 2;
          const constrainedWidth = Math.min(newWidth, maxWidth);
          
          line.set({
            x1: -constrainedWidth / 2,
            x2: constrainedWidth / 2,
          });
        }
      } else {
        // Get current center position
        const center = (selectedObject as any).getCenterPoint?.();
        const centerX = center ? center.x - 50 : 0; // Relative to label origin
        
        // Calculate maximum allowed width based on position
        const maxWidth = Math.min(centerX, labelWidth - centerX) * 2;
        const constrainedWidth = Math.min(newWidth, maxWidth);
        
        const originalWidth = selectedObject.width || 1;
        const newScaleX = constrainedWidth / originalWidth;
        selectedObject.set("scaleX", newScaleX);
      }
    } else if (key === "height") {
      const newHeight = parseFloat(value);
      
      if (selectedObject.type === "line") {
        // For lines, directly update the line coordinates
        const line = selectedObject as any;
        const center = line.getCenterPoint?.();
        const centerY = center ? center.y - 50 : 0; // Relative to label origin
        const isHorizontal = Math.abs((line.x2 || 0) - (line.x1 || 0)) >= Math.abs((line.y2 || 0) - (line.y1 || 0));
        
        if (!isHorizontal) {
          // Check if new height would exceed boundaries
          const halfHeight = newHeight / 2;
          const maxHeight = Math.min(centerY, labelHeight - centerY) * 2;
          const constrainedHeight = Math.min(newHeight, maxHeight);
          
          line.set({
            y1: -constrainedHeight / 2,
            y2: constrainedHeight / 2,
          });
        }
      } else {
        // Get current center position
        const center = (selectedObject as any).getCenterPoint?.();
        const centerY = center ? center.y - 50 : 0; // Relative to label origin
        
        // Calculate maximum allowed height based on position
        const maxHeight = Math.min(centerY, labelHeight - centerY) * 2;
        const constrainedHeight = Math.min(newHeight, maxHeight);
        
        const originalHeight = selectedObject.height || 1;
        const newScaleY = constrainedHeight / originalHeight;
        selectedObject.set("scaleY", newScaleY);
      }
    } else if (key === "text") {
      // Update text content for text objects
      if (isTextObject(selectedObject)) {
        (selectedObject as IText).set({
          text: value,
          charSpacing: 8
        });
      }
    }

    selectedObject.setCoords();
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
      textObj.set({
        text: "Fixed Text",
        charSpacing: 8
      });
    } else {
      // Convert to dynamic text - auto-fill content with field name
      (textObj as any).fieldName = newType;
      (textObj as any).isFixedText = false;
      textObj.set({
        text: newType,
        charSpacing: 8
      });
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
    } else {
      // Fixed Text or undefined category
      allFields = Array.from({ length: 50 }, (_, i) => `Text${i + 1}`);
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
        )}

        {(selectedObject as any).isImage && (
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
            <div>
              <Label htmlFor="fontSize" className="text-xs font-semibold">
                Font Size
              </Label>
              <Input
                id="fontSize"
                type="number"
                value={fontSizeInput}
                onChange={(e) => handleFontSizeInputChange(e.target.value)}
                onBlur={applyFontSizeFromInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFontSizeFromInput();
                    e.currentTarget.blur();
                  }
                }}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="width" className="text-xs">
                  Width (dots)
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={properties.width}
                  onChange={(e) => updateProperty("width", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs">
                  Height (dots)
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={properties.height}
                  onChange={(e) => updateProperty("height", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <div>Text Scaling:</div>
              <div>Width: {Math.round(((selectedObject as any).scaleX || 1) * 100)}%</div>
              <div>Height: {Math.round(((selectedObject as any).scaleY || 1) * 100)}%</div>
            </div>

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
