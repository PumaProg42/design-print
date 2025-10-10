import { useState, useEffect } from "react";
import { FabricObject, IText, Rect, Line, Ellipse, FabricImage } from "fabric";
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
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [textCounter, setTextCounter] = useState(1);

  // Helper to get label center in canvas coordinates
  const getLabelCenter = () => {
    const labelWidthPx = Math.round(labelWidth * (dpi / 25.4));
    const labelHeightPx = Math.round(labelHeight * (dpi / 25.4));
    return {
      x: 50 + labelWidthPx / 2,
      y: 50 + labelHeightPx / 2,
    };
  };

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
      // Scale dimensions to printer DPI
      const scaledWidth = Math.round(100 * (dpi / 203));
      const scaledHeight = Math.round(60 * (dpi / 203));
      const scaledStroke = Math.round(2 * (dpi / 203));
      const center = getLabelCenter();

      const rect = new Rect({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        width: scaledWidth,
        height: scaledHeight,
        fill: "transparent",
        stroke: "#000",
        strokeWidth: scaledStroke,
        lockRotation: true,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    } else if (type === "line-horizontal") {
      // Scale line to printer DPI
      const scaledLength = Math.round(100 * (dpi / 203));
      const scaledStroke = Math.round(2 * (dpi / 203));
      const center = getLabelCenter();

      const line = new Line([center.x - scaledLength / 2, center.y, center.x + scaledLength / 2, center.y], {
        originX: "center",
        originY: "center",
        stroke: "#000",
        strokeWidth: scaledStroke,
        strokeUniform: true,
        strokeLineCap: "square",
        objectCaching: false,
        lockRotation: true,
        lockScalingY: true,
        lockScalingX: false,
        hasControls: true,
      });

      canvas.add(line);
      canvas.setActiveObject(line);
    } else if (type === "line-vertical") {
      // Scale line to printer DPI
      const scaledLength = Math.round(100 * (dpi / 203));
      const scaledStroke = Math.round(2 * (dpi / 203));
      const center = getLabelCenter();

      const line = new Line([center.x, center.y - scaledLength / 2, center.x, center.y + scaledLength / 2], {
        originX: "center",
        originY: "center",
        stroke: "#000",
        strokeWidth: scaledStroke,
        strokeUniform: true,
        strokeLineCap: "square",
        objectCaching: false,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: false,
        hasControls: true,
      });

      canvas.add(line);
      canvas.setActiveObject(line);
    } else if (type === "ellipse") {
      // Scale ellipse to printer DPI
      const scaledRx = Math.round(50 * (dpi / 203));
      const scaledRy = Math.round(30 * (dpi / 203));
      const scaledStroke = Math.round(2 * (dpi / 203));
      const center = getLabelCenter();

      const ellipse = new Ellipse({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        rx: scaledRx,
        ry: scaledRy,
        fill: "transparent",
        stroke: "#000",
        strokeWidth: scaledStroke,
        lockRotation: true,
      });
      canvas.add(ellipse);
      canvas.setActiveObject(ellipse);
    }

    canvas.renderAll();
  };

  const addTextField = (fieldName: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Scale font size to printer DPI (20pt at 72 DPI baseline)
    const scaledFontSize = Math.round(20 * (dpi / 72));
    const center = getLabelCenter();
    const textInstanceName = `Text ${textCounter}`;

    const textField = new IText(fieldName, {
      left: center.x,
      top: center.y,
      originX: "center",
      originY: "center",
      fontSize: scaledFontSize,
      fill: "#000",
      fontFamily: "'Swiss 721 Bold Condensed', 'Roboto Condensed', Oswald, 'Arial Narrow', sans-serif",
      fontWeight: 700,
      charSpacing: 27,
      lineHeight: 1,
      scaleX: 1,
      scaleY: 1.176,
      lockScalingFlip: true,
      lockUniScaling: true,
    }) as any;

    // Store the field name and instance name for ZPL export and display
    textField.fieldName = fieldName;
    textField.textInstanceName = textInstanceName;

    canvas.add(textField);
    canvas.setActiveObject(textField);
    canvas.renderAll();
    
    setTextCounter(textCounter + 1);
  };

  // Generate EAN-13 barcode image
  const generateBarcodeImage = async (barcodeData: string): Promise<string> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // EAN-13 dimensions
    const width = 250;
    const height = 120;
    const barWidth = 2;
    
    canvas.width = width;
    canvas.height = height;
    
    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    
    // Draw bars (simplified EAN-13 pattern)
    ctx.fillStyle = "black";
    
    // Start guard
    ctx.fillRect(10, 10, barWidth, height - 30);
    ctx.fillRect(10 + barWidth * 2, 10, barWidth, height - 30);
    
    // Draw bars for each digit (simplified)
    let x = 20;
    for (let i = 0; i < barcodeData.length; i++) {
      const digit = parseInt(barcodeData[i]);
      // Simple pattern: varying widths based on digit
      const w = digit % 2 === 0 ? barWidth : barWidth * 1.5;
      ctx.fillRect(x, 10, w, height - 30);
      x += barWidth * 3;
      
      // Center guard
      if (i === 6) {
        ctx.fillRect(x, 10, barWidth, height - 30);
        x += barWidth * 2;
        ctx.fillRect(x, 10, barWidth, height - 30);
        x += barWidth * 3;
      }
    }
    
    // End guard
    ctx.fillRect(x, 10, barWidth, height - 30);
    ctx.fillRect(x + barWidth * 2, 10, barWidth, height - 30);
    
    // Draw text
    ctx.fillStyle = "black";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(barcodeData, width / 2, height - 8);
    
    return canvas.toDataURL();
  };

  const addBarcode = async (barcodeData: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      const barcodeImageUrl = await generateBarcodeImage(barcodeData);
      const img = await FabricImage.fromURL(barcodeImageUrl);
      const center = getLabelCenter();
      
      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: 0.8,
        scaleY: 0.8,
      });

      (img as any).isBarcode = true;
      (img as any).barcodeData = barcodeData;
      (img as any).moduleWidth = 2;

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      toast.success("EAN-13 barcode added");
    } catch (error) {
      console.error("Failed to generate barcode:", error);
      toast.error("Failed to generate barcode");
    }
  };

  const addImage = async (imageData: Blob | string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      toast.info("Converting image to ZPL format...");
      
      // Convert image to ZPL GFA format
      const { zpl, widthPx, heightPx } = await convertImageToZplGFA(imageData, dpi);
      
      // Load the actual image to display it on canvas
      let imageUrl: string;
      if (typeof imageData === "string") {
        imageUrl = imageData;
      } else {
        imageUrl = URL.createObjectURL(imageData);
      }
      
      const img = await FabricImage.fromURL(imageUrl);
      const center = getLabelCenter();
      
      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5,
      });

      (img as any).isImage = true;
      (img as any).zplImageData = zpl;
      (img as any).imageSource = imageData;

      canvas.add(img);
      canvas.setActiveObject(img);
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

  const handleDelete = () => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject as any).name !== "labelBoundary") {
      canvas.remove(activeObject);
      canvas.renderAll();
      setSelectedObject(null);
      toast.success("Element deleted");
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the entire label?")) {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return;

      // Remove all objects except label boundary
      const objects = canvas.getObjects();
      objects.forEach((obj: FabricObject) => {
        if ((obj as any).name !== "labelBoundary") {
          canvas.remove(obj);
        }
      });

      // Reset settings to defaults
      setLabelWidth(100);
      setLabelHeight(50);
      setDpi(203);
      setSelectedObject(null);
      setTextCounter(1);
      
      canvas.renderAll();
      toast.success("Label cleared");
    }
  };

  // Auto-adjust zoom based on DPI
  useEffect(() => {
    if (dpi === 203) {
      setZoom(1);
    } else if (dpi === 300) {
      setZoom(0.8);
    } else if (dpi === 600) {
      setZoom(0.4);
    }
  }, [dpi]);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedObject) {
        // Prevent default behavior for Backspace to avoid navigation
        if (e.key === "Backspace") {
          e.preventDefault();
        }
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObject]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <SettingsPanel
        width={labelWidth}
        height={labelHeight}
        dpi={dpi}
        zoom={zoom}
        onWidthChange={setLabelWidth}
        onHeightChange={setLabelHeight}
        onDpiChange={setDpi}
        onZoomChange={setZoom}
        onExport={handleExport}
        onPrint={handlePrint}
        onClear={handleClear}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar onAddElement={addElement} onClear={handleClear} />
        <div className="flex-1 overflow-auto pr-72">
          <LabelCanvas
            width={labelWidth}
            height={labelHeight}
            dpi={dpi}
            zoom={zoom}
            onZoomChange={setZoom}
            onSelectionChange={setSelectedObject}
            textCounter={textCounter}
            onIncrementTextCounter={() => setTextCounter(textCounter + 1)}
          />
        </div>
        <div className="fixed right-0 top-[108px] bottom-0 z-10">
          <PropertiesPanel selectedObject={selectedObject} />
        </div>
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
