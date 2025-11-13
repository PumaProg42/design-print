import { FabricObject, IText } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    } else if (key === "fontSize" && selectedObject.type === "i-text") {
      const newFontSize = parseFloat(value);
      (selectedObject as IText).set("fontSize", newFontSize);
      // Update fontWidth and fontHeight proportionally if they exist
      if ((selectedObject as any).fontWidth && (selectedObject as any).fontHeight) {
        const currentFontSize = (selectedObject as IText).fontSize || 20;
        const ratio = newFontSize / currentFontSize;
        (selectedObject as any).fontWidth = Math.round((selectedObject as any).fontWidth * ratio);
        (selectedObject as any).fontHeight = Math.round((selectedObject as any).fontHeight * ratio);
      }
    } else if (key === "fontWidth" && selectedObject.type === "i-text") {
      const newFontWidth = Math.max(1, parseFloat(value));
      (selectedObject as any).fontWidth = newFontWidth;
      // Set horizontal scale to match desired width in dots
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleX', newFontWidth / baseSize);
    } else if (key === "fontHeight" && selectedObject.type === "i-text") {
      const newFontHeight = Math.max(1, parseFloat(value));
      (selectedObject as any).fontHeight = newFontHeight;
      // Set vertical scale to match desired height in dots
      const baseSize = (selectedObject as IText).fontSize || 20;
      selectedObject.set('scaleY', newFontHeight / baseSize);
    } else if (key === "text" && selectedObject.type === "i-text") {
      (selectedObject as IText).set("text", value);
    } else if (key === "strokeWidth") {
      selectedObject.set("strokeWidth", parseFloat(value));
      // For lines, ensure coords are updated to reflect new stroke bounds
      if (selectedObject.type === "line") {
        (selectedObject as any).set({ strokeLineCap: 'square', objectCaching: false });
        selectedObject.setCoords();
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
      if (obj.type === 'i-text' && obj.fieldName && !obj.isFixedText && obj !== selectedObject) {
        usedFields.push(obj.fieldName);
      }
    });
    return usedFields;
  };

  const handleTypeChange = (newType: string) => {
    if (!selectedObject || selectedObject.type !== "i-text") return;
    
    const textObj = selectedObject as any;
    const canvas = (window as any).fabricCanvas;
    
    // Prevent re-render if the type is the same
    const currentType = textObj.isFixedText ? "fixed" : (textObj.fieldName || "fixed");
    if (currentType === newType) return;
    
    if (newType === "fixed") {
      // Convert to fixed text - auto-fill content with "Fixed Text"
      textObj.fieldName = "";
      textObj.isFixedText = true;
      textObj.text = "Fixed Text";
    } else {
      // Convert to dynamic text (Text1, Text2, etc.) - auto-fill content with field name
      textObj.fieldName = newType;
      textObj.isFixedText = false;
      textObj.text = newType;
    }
    
    if (canvas) {
      canvas.requestRenderAll?.();
    }
    
    // Update properties to reflect the new text content
    updatePropertiesFromObject(selectedObject);
    onTypeChange?.();
  };

  const getAvailableTextFields = (): string[] => {
    const usedFields = getUsedTextFields();
    const allFields = Array.from({ length: 50 }, (_, i) => `Text${i + 1}`);
    return allFields.filter(field => !usedFields.includes(field));
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
        {selectedObject.type === "i-text" ? (
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
                <SelectItem value="fixed">Fixed Text</SelectItem>
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
              disabled={selectedObject.type === "i-text"}
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
                disabled={selectedObject.type === "i-text"}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {selectedObject.type === "i-text" && (
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

        {selectedObject.type === "i-text" && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Text Scaling</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round((properties.fontWidth / (properties.fontSize || 1)) * 100)}% × {Math.round((properties.fontHeight / (properties.fontSize || 1)) * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fontWidth" className="text-xs">
                    Width (dots)
                  </Label>
                  <Input
                    id="fontWidth"
                    type="number"
                    min="1"
                    max="9999"
                    value={properties.fontWidth}
                    onChange={(e) => updateProperty("fontWidth", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fontHeight" className="text-xs">
                    Height (dots)
                  </Label>
                  <Input
                    id="fontHeight"
                    type="number"
                    min="1"
                    max="9999"
                    value={properties.fontHeight}
                    onChange={(e) => updateProperty("fontHeight", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Drag handles to resize. Values auto-save on change.
              </p>
            </div>
            <Separator />
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
      </Card>
    </div>
  );
};
