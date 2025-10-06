import { FabricObject, IText } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  });

  useEffect(() => {
    if (selectedObject) {
      setProperties({
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)),
        angle: Math.round(selectedObject.angle || 0),
        fontSize: (selectedObject as IText).fontSize || 0,
        text: (selectedObject as IText).text || "",
      });
    }
  }, [selectedObject]);

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    if (key === "left") selectedObject.set("left", parseFloat(value));
    if (key === "top") selectedObject.set("top", parseFloat(value));
    if (key === "angle") selectedObject.set("angle", parseFloat(value));
    if (key === "fontSize" && selectedObject.type === "i-text") {
      (selectedObject as IText).set("fontSize", parseFloat(value));
    }
    if (key === "text" && selectedObject.type === "i-text") {
      (selectedObject as IText).set("text", value);
    }

    canvas.renderAll();
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  if (!selectedObject) {
    return (
      <div className="w-64 bg-panel border-l border-border p-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Properties</h3>
        <p className="text-xs text-muted-foreground mt-4">
          Select an element to view and edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-panel border-l border-border p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-4">Properties</h3>

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
            <Input id="width" type="number" value={properties.width} disabled className="mt-1" />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">
              Height
            </Label>
            <Input id="height" type="number" value={properties.height} disabled className="mt-1" />
          </div>
        </div>

        <div>
          <Label htmlFor="angle" className="text-xs">
            Rotation (°)
          </Label>
          <Input
            id="angle"
            type="number"
            value={properties.angle}
            onChange={(e) => updateProperty("angle", e.target.value)}
            className="mt-1"
          />
        </div>

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
