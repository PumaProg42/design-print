import { useState } from "react";
import { FabricObject, IText, Rect, Line } from "fabric";
import { Toolbar } from "@/components/Toolbar";
import { LabelCanvas } from "@/components/LabelCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TextFieldDialog } from "@/components/TextFieldDialog";
import { generateZPL, downloadZPL } from "@/utils/zplGenerator";
import { toast } from "sonner";

const Index = () => {
  const [labelWidth, setLabelWidth] = useState(100); // mm
  const [labelHeight, setLabelHeight] = useState(50); // mm
  const [dpi, setDpi] = useState(203);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);

  const addElement = (type: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    if (type === "text") {
      setShowTextDialog(true);
      return;
    }

    if (type === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 60,
        fill: "transparent",
        stroke: "#000",
        strokeWidth: 2,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    } else if (type === "line") {
      const line = new Line([100, 100, 200, 100], {
        stroke: "#000",
        strokeWidth: 2,
      });
      canvas.add(line);
      canvas.setActiveObject(line);
    } else if (type === "date") {
      const dateText = new IText(new Date().toLocaleDateString(), {
        left: 100,
        top: 100,
        fontSize: 20,
        fill: "#000",
      });
      canvas.add(dateText);
      canvas.setActiveObject(dateText);
    } else if (type === "barcode") {
      // Placeholder for barcode
      const barcodeText = new IText("*BARCODE*", {
        left: 100,
        top: 100,
        fontSize: 24,
        fill: "#000",
        fontFamily: "Courier New",
      });
      canvas.add(barcodeText);
      canvas.setActiveObject(barcodeText);
      toast.info("Barcode placeholder added. Use ZPL ^BC command for actual barcodes.");
    } else if (type === "image") {
      toast.info("Image upload feature coming soon!");
    }

    canvas.renderAll();
  };

  const addTextField = (fieldName: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const textField = new IText(fieldName, {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: "#000",
    });

    canvas.add(textField);
    canvas.setActiveObject(textField);
    canvas.renderAll();
  };

  const handleExport = (withValues: boolean) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const zplCode = generateZPL(canvas, {
      dpi,
      width: labelWidth,
      height: labelHeight,
      withValues,
    });

    downloadZPL(zplCode, withValues ? "label-values.zpl" : "label-fields.zpl");
    toast.success("ZPL code exported successfully!");
  };

  const handlePrint = () => {
    toast.info("Print dialog coming soon! For now, export ZPL and send to printer.");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <SettingsPanel
        width={labelWidth}
        height={labelHeight}
        dpi={dpi}
        onWidthChange={setLabelWidth}
        onHeightChange={setLabelHeight}
        onDpiChange={setDpi}
        onExport={handleExport}
        onPrint={handlePrint}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar onAddElement={addElement} />
        <div className="flex-1">
          <LabelCanvas
            width={labelWidth}
            height={labelHeight}
            dpi={dpi}
            onSelectionChange={setSelectedObject}
          />
        </div>
        <PropertiesPanel selectedObject={selectedObject} />
      </div>

      <TextFieldDialog
        open={showTextDialog}
        onClose={() => setShowTextDialog(false)}
        onConfirm={addTextField}
      />
    </div>
  );
};

export default Index;
