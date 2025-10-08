import { FabricObject, IText } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PropertiesPanelProps {
  selectedObject: FabricObject | null;
}

export const PropertiesPanel = ({ selectedObject }: PropertiesPanelProps) => {
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    fontSize: 0,
    text: "",
    strokeWidth: 0,
  });

  const updatePropertiesFromObject = (obj: FabricObject) => {
    const center = (obj as any).getCenterPoint?.();
    const left = center ? Math.round(center.x - 50) : Math.round((obj.left || 0) - 50);
    const top = center ? Math.round(center.y - 50) : Math.round((obj.top || 0) - 50);

    setProperties({
      left,
      top,
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      angle: Math.round(obj.angle || 0),
      fontSize: Math.round((obj as IText).fontSize || 0),
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
        if (selectedObject) updatePropertiesFromObject(selectedObject);
      };

      const handleObjectMoving = () => {
        if (selectedObject) updatePropertiesFromObject(selectedObject);
      };

      const handleObjectScaling = () => {
        if (selectedObject) updatePropertiesFromObject(selectedObject);
      };

      canvas.on("object:modified", handleObjectModified);
      canvas.on("object:moving", handleObjectMoving);
      canvas.on("object:scaling", handleObjectScaling);

      return () => {
        canvas.off("object:modified", handleObjectModified);
        canvas.off("object:moving", handleObjectMoving);
        canvas.off("object:scaling", handleObjectScaling);
      };
    }
  }, [selectedObject]);

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

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
      const targetX = parseFloat(value) + 50;
      const center = (selectedObject as any).getCenterPoint?.();
      const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
      (selectedObject as any).setPositionByOrigin({ x: targetX, y: current.y }, 'center', 'center');
    } else if (key === "top") {
      const targetY = parseFloat(value) + 50;
      const center = (selectedObject as any).getCenterPoint?.();
      const current = center || { x: (selectedObject.left || 0), y: (selectedObject.top || 0) };
      (selectedObject as any).setPositionByOrigin({ x: current.x, y: targetY }, 'center', 'center');
    } else if (key === "angle") {
      const angle = parseFloat(value);
      // Store the current center point
      const centerPoint = selectedObject.getCenterPoint();
      // Set the new angle
      selectedObject.set("angle", angle);
      // Restore the center point using setPositionByOrigin
      (selectedObject as any).setPositionByOrigin(centerPoint, 'center', 'center');
    } else if (key === "fontSize" && selectedObject.type === "i-text") {
      (selectedObject as IText).set("fontSize", parseFloat(value));
    } else if (key === "text" && selectedObject.type === "i-text") {
      (selectedObject as IText).set("text", value);
    } else if (key === "strokeWidth") {
      selectedObject.set("strokeWidth", parseFloat(value));
    } else if (key === "width") {
      const newWidth = parseFloat(value);
      const originalWidth = selectedObject.width || 1;
      const newScaleX = newWidth / originalWidth;
      selectedObject.set("scaleX", newScaleX);
    } else if (key === "height") {
      const newHeight = parseFloat(value);
      const originalHeight = selectedObject.height || 1;
      const newScaleY = newHeight / originalHeight;
      selectedObject.set("scaleY", newScaleY);
    }

    selectedObject.setCoords();
    selectedObject.setCoords();
    canvas.requestRenderAll?.();
    updatePropertiesFromObject(selectedObject);
  };

  if (!selectedObject) {
    return (
      <div className="w-72 bg-panel border-l border-border p-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Properties</h3>
        <p className="text-xs text-muted-foreground mt-4">
          Select an element to view and edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-panel border-l border-border p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-2">Element Properties</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Positions in dots from label origin (0,0)
      </p>

      <Card className="p-4 space-y-4">
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
              className="mt-1"
            />
          </div>
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
              <SelectContent className="bg-background z-50">
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
            <div>
              <Label htmlFor="fontSize" className="text-xs">
                Font Size
              </Label>
              <Input
                id="fontSize"
                type="number"
                value={properties.fontSize}
                onChange={(e) => updateProperty("fontSize", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="text" className="text-xs">
                Text Content
              </Label>
              <Input
                id="text"
                value={properties.text}
                onChange={(e) => updateProperty("text", e.target.value)}
                className="mt-1"
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
