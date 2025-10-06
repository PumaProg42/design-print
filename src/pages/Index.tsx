import { useState } from "react";
import { FabricObject, IText, Rect, Line, Ellipse } from "fabric";
import { Toolbar } from "@/components/Toolbar";
import { LabelCanvas } from "@/components/LabelCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TextFieldDialog } from "@/components/TextFieldDialog";
import { BarcodeDialog } from "@/components/BarcodeDialog";
import { ImageDialog } from "@/components/ImageDialog";
import { generateZPL, downloadZPL } from "@/utils/zplGenerator";
import { convertImageToZplGFA } from "@/utils/imageToZpl";
import { toast } from "sonner";

const Index = () => {
  const [labelWidth, setLabelWidth] = useState(100); // mm
  const [labelHeight, setLabelHeight] = useState(50); // mm
  const [dpi, setDpi] = useState(203);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);

  const addElement = (type: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    if (type === "text") {
      setShowTextDialog(true);
      return;
    }

    if (type === "barcode") {
      setShowBarcodeDialog(true);
      return;
    }

    if (type === "image") {
      setShowImageDialog(true);
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
    } else if (type === "ellipse") {
      const ellipse = new Ellipse({
        left: 100,
        top: 100,
        rx: 50,
        ry: 30,
        fill: "transparent",
        stroke: "#000",
        strokeWidth: 2,
      });
      canvas.add(ellipse);
      canvas.setActiveObject(ellipse);
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
    }) as any;

    // Store the field name for ZPL export
    textField.fieldName = fieldName;

    canvas.add(textField);
    canvas.setActiveObject(textField);
    canvas.renderAll();
  };

  const addBarcode = (barcodeData: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Create a visual representation of the barcode
    const barcodeRect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: "white",
      stroke: "#000",
      strokeWidth: 1,
    }) as any;

    // Store barcode data
    barcodeRect.isBarcode = true;
    barcodeRect.barcodeData = barcodeData;
    barcodeRect.moduleWidth = 2;

    canvas.add(barcodeRect);
    canvas.setActiveObject(barcodeRect);
    canvas.renderAll();
    toast.success("EAN-13 barcode added");
  };

  const addImage = async (imageData: Blob | string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      toast.info("Converting image to ZPL format...");
      
      // Convert image to ZPL GFA format
      const { zpl, widthPx, heightPx } = await convertImageToZplGFA(imageData, dpi);
      
      // Create a placeholder rectangle to represent the image on canvas
      const imageRect = new Rect({
        left: 100,
        top: 100,
        width: widthPx / (dpi / 96),
        height: heightPx / (dpi / 96),
        fill: "#e0e0e0",
        stroke: "#000",
        strokeWidth: 1,
      }) as any;

      imageRect.isImage = true;
      imageRect.zplImageData = zpl;

      canvas.add(imageRect);
      canvas.setActiveObject(imageRect);
      canvas.renderAll();
      toast.success("Image added and converted to ZPL");
    } catch (error) {
      console.error("Failed to add image:", error);
      toast.error("Failed to process image");
    }
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

      <BarcodeDialog
        open={showBarcodeDialog}
        onClose={() => setShowBarcodeDialog(false)}
        onConfirm={addBarcode}
      />

      <ImageDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onConfirm={addImage}
      />
    </div>
  );
};

export default Index;
