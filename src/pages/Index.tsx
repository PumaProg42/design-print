import { useState, useEffect } from "react";
import { FabricObject, IText, Rect, Line, Ellipse, FabricImage } from "fabric";
import { Toolbar } from "@/components/Toolbar";
import { LabelCanvas } from "@/components/LabelCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TextFieldDialog } from "@/components/TextFieldDialog";
import { BarcodeDialog } from "@/components/BarcodeDialog";
import { ImageDialog } from "@/components/ImageDialog";
import { ClearLabelDialog } from "@/components/ClearLabelDialog";
import { ZplImportDialog } from "@/components/ZplImportDialog";
import { generateZPL, downloadZPL } from "@/utils/zplGenerator";
import { convertImageToZplGFA } from "@/utils/imageToZpl";
import { parseZPL, ParsedScene } from "@/utils/zplParser";
import { toast } from "sonner";
import QRCode from "qrcode-generator";
import { QrDialog } from "@/components/QrDialog";

const Index = () => {
  const [labelWidth, setLabelWidth] = useState(100); // mm
  const [labelHeight, setLabelHeight] = useState(50); // mm
  const [dpi, setDpi] = useState(203);
  const [zoom, setZoom] = useState(1);
  const [rotate180, setRotate180] = useState(false);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedScene, setParsedScene] = useState<ParsedScene | null>(null);
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

    if (type === "qr") {
      setShowQrDialog(true);
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
    setSelectedObject(textField as unknown as FabricObject);
    canvas.renderAll();
    
    setTextCounter(textCounter + 1);
  };
  
  // Get all used text field names from canvas
  const getUsedTextFields = (): string[] => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return [];
    
    const usedFields: string[] = [];
    canvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'i-text' && obj.fieldName) {
        usedFields.push(obj.fieldName);
      }
    });
    return usedFields;
  };

  // Generate true EAN-13 barcode matching ZPL ^BE output exactly
  const generateBarcodeImage = async (normalizedData: string): Promise<string> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Encoding tables
    const L = [
      "0001101","0011001","0010011","0111101","0100011",
      "0110001","0101111","0111011","0110111","0001011",
    ];
    const G = [
      "0100111","0110011","0011011","0100001","0011101",
      "0111001","0000101","0010001","0001001","0010111",
    ];
    const R = L.map(p => p.split('').map(b => (b === '0' ? '1' : '0')).join(''));
    const parityMap = [
      "LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG",
      "LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL",
    ];

    // Base EAN-13 metrics to match ZPL ^BY and ^BE
    const moduleWidth = 2; // dots (matches ^BY2 default)
    const barHeight = 112; // dots (bars only, not including text)
    const symbolModules = 95; // modules for bars region
    const quietLeftModules = 10; // symmetric quiet zones for 1:1 centering
    const quietRightModules = 10;
    const textHeight = 18; // dots for human-readable text below bars

    const leftQuiet = quietLeftModules * moduleWidth;
    const rightQuiet = quietRightModules * moduleWidth;

    const width = leftQuiet + symbolModules * moduleWidth + rightQuiet;
    const height = barHeight + textHeight;

    canvas.width = width;
    canvas.height = height;

    // Transparent background to respect label color; draw only bars/text
    // Build module bit string
    const digits = normalizedData.replace(/\D/g, "").slice(0, 13);
    const first = parseInt(digits[0], 10);
    const left6 = digits.slice(1, 7);
    const right6 = digits.slice(7, 13);
    const parity = parityMap[first];

    let bits = "101"; // start guard
    for (let i = 0; i < 6; i++) {
      const d = parseInt(left6[i], 10);
      bits += parity[i] === 'L' ? L[d] : G[d];
    }
    bits += "01010"; // center guard
    for (let i = 0; i < 6; i++) {
      const d = parseInt(right6[i], 10);
      bits += R[d];
    }
    bits += "101"; // end guard

    // Draw bars
    ctx.fillStyle = "black";
    const barsStartX = leftQuiet;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        ctx.fillRect(barsStartX + i * moduleWidth, 0, moduleWidth, barHeight);
      }
    }

    // Human-readable text (approximate placement)
    ctx.fillStyle = "black";
    ctx.font = `${textHeight}px Arial`;
    ctx.textBaseline = "top";

    // First digit on far left (placed inside left quiet zone)
    ctx.textAlign = "left";
    ctx.fillText(digits[0], Math.max(0, barsStartX - textHeight), barHeight + 2);

    // Left 6 digits (digits 1-6) centered under left bars group
    ctx.textAlign = "center";
    const leftGroupStart = barsStartX + (3 * moduleWidth); // After start guard
    const leftGroupWidth = 42 * moduleWidth; // 6 digits * 7 modules each
    const leftTextX = leftGroupStart + (leftGroupWidth / 2);
    ctx.fillText(digits.slice(1, 7), leftTextX, barHeight + 2);

    // Right 6 digits (digits 7-12) centered under right bars group
    const rightGroupStart = barsStartX + (50 * moduleWidth); // After left group + center guard
    const rightGroupWidth = 42 * moduleWidth; // 6 digits * 7 modules each
    const rightTextX = rightGroupStart + (rightGroupWidth / 2);
    ctx.fillText(digits.slice(7, 13), rightTextX, barHeight + 2);

    // Store metadata for ZPL export
    (canvas as any)._ean13_barHeight = barHeight;
    (canvas as any)._ean13_moduleWidth = moduleWidth;
    (canvas as any)._ean13_quietLeftModules = quietLeftModules;
    (canvas as any)._ean13_quietRightModules = quietRightModules;
    (canvas as any)._ean13_textHeight = textHeight;

    return canvas.toDataURL();
  };

  const addBarcode = async (barcodeData: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Normalize to a valid 13-digit EAN (compute/replace check digit)
      const normalize = (data: string) => {
        const ds = (data || "").replace(/\D/g, "");
        const base = ds.slice(0, 12).padEnd(12, "0");
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          const n = parseInt(base[i], 10);
          sum += (i % 2 === 0) ? n : n * 3; // positions from left: 0-based
        }
        const cd = (10 - (sum % 10)) % 10;
        return base + cd.toString();
      };
      const normalized = normalize(barcodeData);

      const barcodeImageUrl = await generateBarcodeImage(normalized);
      const img = await FabricImage.fromURL(barcodeImageUrl);
      const center = getLabelCenter();
      
      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: true,
      });

      (img as any).isBarcode = true;
      (img as any).barcodeData = barcodeData;
      (img as any).barcodeDataNormalized = normalized;
      (img as any).moduleWidth = 2; // dots
      (img as any).barHeight = 112; // dots (bars only, not text)


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
      
      // IMPORTANT: imageData here is the converted 1-bit black-and-white blob from ImageDialog
      // It has already been processed to pure black (0) or white (255) pixels
      // This ensures the ZPL ^GF command uses the exact preview image shown to the user
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
      
      // Calculate label dimensions in pixels
      const labelWidthPx = Math.round(labelWidth * (dpi / 25.4));
      const labelHeightPx = Math.round(labelHeight * (dpi / 25.4));
      
      // Calculate scale to fit image within label if it's too large
      let scale = 0.5; // Default scale
      const maxWidth = labelWidthPx * 0.9; // Leave 10% margin
      const maxHeight = labelHeightPx * 0.9;
      
      if (img.width && img.height) {
        const scaleToFitWidth = maxWidth / img.width;
        const scaleToFitHeight = maxHeight / img.height;
        
        // If image is larger than label, scale it down to fit
        if (img.width > maxWidth || img.height > maxHeight) {
          scale = Math.min(scaleToFitWidth, scaleToFitHeight);
          toast.info("Image scaled to fit label dimensions");
        }
      }
      
      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        lockScalingFlip: true,
        lockUniScaling: true, // Force proportional scaling
        objectCaching: false, // Prevent caching issues during movement
      });
      
      // Disable image smoothing for crisp 1-bit rendering
      (img as any).imageSmoothing = false;

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
      rotate180,
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
    setShowClearDialog(true);
  };

  const handleClearConfirm = () => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Remove all objects except label boundary
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if ((obj as any).name !== "labelBoundary") {
        canvas.remove(obj);
      }
    });

    setSelectedObject(null);
    setTextCounter(1);
    
    canvas.renderAll();
    toast.success("Label cleared");
  };

  const handleUploadZpl = async (file: File) => {
    try {
      const text = await file.text();
      const scene = parseZPL(text, dpi);
      setParsedScene(scene);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error parsing ZPL:', error);
      toast.error('Failed to parse ZPL file');
    }
  };

  const handleApplyImport = async (scene: ParsedScene) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Update label settings
    setLabelWidth(Math.round((scene.label.widthDots / scene.label.dpi) * 25.4));
    setLabelHeight(Math.round((scene.label.heightDots / scene.label.dpi) * 25.4));
    setDpi(scene.label.dpi);
    setRotate180(scene.label.rotate180);

    // Clear existing elements (keep label boundary)
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if ((obj as any).name !== "labelBoundary") {
        canvas.remove(obj);
      }
    });

    // Add imported elements with proper positioning (elements use printer dots)
    for (const element of scene.elements) {
      // Convert from printer dots to canvas pixels: 50px offset + element position
      const canvasX = 50 + element.x;
      const canvasY = 50 + element.y;

      switch (element.kind) {
        case 'text': {
          const text = new IText(element.data.text, {
            left: canvasX,
            top: canvasY,
            fontSize: element.data.fontSize,
            fontFamily: element.data.fontFamily,
            fill: '#000000',
            angle: element.data.angle || 0,
            originX: 'left',
            originY: 'top',
          });
          canvas.add(text);
          break;
        }

        case 'barcode': {
          // Create actual barcode using the app's barcode generation function
          try {
            const value = element.data.value;
            const barcodeImageUrl = await generateBarcodeImage(value);
            const img = await FabricImage.fromURL(barcodeImageUrl);
            
            img.set({
              left: canvasX,
              top: canvasY,
              originX: 'left',
              originY: 'top',
              scaleX: 1,
              scaleY: 1,
              lockScalingFlip: true,
              lockUniScaling: true,
            });

            (img as any).isBarcode = true;
            (img as any).barcodeData = value;
            (img as any).barcodeDataNormalized = value;
            (img as any).moduleWidth = element.data.moduleWidth || 2;
            (img as any).barHeight = element.data.height || 112;

            canvas.add(img);
          } catch (e) {
            console.error('Failed to create barcode:', e);
          }
          break;
        }

        case 'qr': {
          // Create QR code using the app's QR generator
          const data = element.data.value;
          const mag = element.data.magnification || 2;
          const level = element.data.errorCorrection || 'Q';
          
          try {
            const { url } = await generateQRCodeImage(data, mag, level);
            const img = await FabricImage.fromURL(url);
            img.set({
              left: canvasX,
              top: canvasY,
              originX: 'left',
              originY: 'top',
              scaleX: 1,
              scaleY: 1,
            });
            (img as any).isQr = true;
            (img as any).qrData = data;
            (img as any).qrMagnification = mag;
            (img as any).qrErrorCorrection = level;
            canvas.add(img);
          } catch (e) {
            console.error('Failed to create QR code:', e);
          }
          break;
        }

        case 'ellipse': {
          const ellipse = new Ellipse({
            left: canvasX + element.data.width / 2,
            top: canvasY + element.data.height / 2,
            rx: element.data.width / 2,
            ry: element.data.height / 2,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: element.data.thickness || 1,
            originX: 'center',
            originY: 'center',
          });
          canvas.add(ellipse);
          break;
        }

        case 'box': {
          const box = new Rect({
            left: canvasX,
            top: canvasY,
            originX: 'left',
            originY: 'top',
            width: element.data.width,
            height: element.data.height,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: element.data.thickness,
          });
          canvas.add(box);
          break;
        }

        case 'line': {
          const line = new Line(
            [canvasX, canvasY, canvasX + element.data.width, canvasY + element.data.height],
            {
              stroke: '#000000',
              strokeWidth: element.data.thickness,
            }
          );
          canvas.add(line);
          break;
        }

        case 'image': {
          // Decode ^GFA image data
          try {
            const { hexData, bytesPerRow, width, height } = element.data;
            
            // Decode hex string to binary
            const canvas2d = document.createElement('canvas');
            canvas2d.width = width;
            canvas2d.height = height;
            const ctx = canvas2d.getContext('2d');
            if (!ctx) break;
            
            // Create image data
            const imageData = ctx.createImageData(width, height);
            let hexIndex = 0;
            
            for (let y = 0; y < height; y++) {
              let rowBitIndex = 0;
              while (rowBitIndex < bytesPerRow * 8 && hexIndex < hexData.length) {
                // Read one byte (2 hex chars)
                const hexByte = hexData.substr(hexIndex, 2);
                hexIndex += 2;
                
                if (hexByte === '') break;
                
                const byte = parseInt(hexByte, 16);
                
                // Convert byte to 8 pixels
                for (let bit = 7; bit >= 0 && rowBitIndex < width; bit--) {
                  const pixelOn = (byte & (1 << bit)) !== 0;
                  const pixelIndex = (y * width + rowBitIndex) * 4;
                  
                  imageData.data[pixelIndex] = pixelOn ? 0 : 255;     // R
                  imageData.data[pixelIndex + 1] = pixelOn ? 0 : 255; // G
                  imageData.data[pixelIndex + 2] = pixelOn ? 0 : 255; // B
                  imageData.data[pixelIndex + 3] = 255;                // A
                  
                  rowBitIndex++;
                }
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            const dataUrl = canvas2d.toDataURL();
            
            const img = await FabricImage.fromURL(dataUrl);
            img.set({
              left: canvasX,
              top: canvasY,
              originX: 'left',
              originY: 'top',
            });
            (img as any).isImage = true;
            (img as any).zplImageData = `^GFA,${element.data.totalBytes},${element.data.totalBytes},${element.data.bytesPerRow},${hexData}^FS`;
            
            canvas.add(img);
          } catch (e) {
            console.error('Failed to decode image:', e);
          }
          break;
        }
      }
    }

    canvas.renderAll();
    setShowImportDialog(false);
    toast.success(`Imported ${scene.elements.length} element(s)`);
  };

  const handleClearAndExport = () => {
    handleExport(false);
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

  // Handle keyboard delete and Enter behavior while editing canvas text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const activeEl = document.activeElement as HTMLElement | null;

      // Detect typing in regular inputs or contenteditable
      const isTypingInInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable === true;

      // Detect Fabric IText editing on canvas
      const canvas = (window as any).fabricCanvas;
      const activeObj: any = canvas?.getActiveObject?.();
      const isEditingFabricText = activeObj?.type === "i-text" && activeObj?.isEditing;

      // Prevent new line in canvas text editing and save (exit editing)
      if (e.key === "Enter" && isEditingFabricText) {
        e.preventDefault();
        try {
          activeObj.exitEditing?.();
          canvas?.setActiveObject?.(activeObj);
          canvas?.requestRenderAll?.();
        } catch {}
        return;
      }

      // Only delete element if not typing in an input field nor editing canvas text
      if ((e.key === "Delete" || e.key === "Backspace") && selectedObject && !isTypingInInput && !isEditingFabricText) {
        if (e.key === "Backspace") {
          e.preventDefault();
        }
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObject]);

  // Helpers for QR rendering consistent with ZPL ^BQ
  const getDefaultQrMagnification = (d: number) => {
    if (d === 203) return 2;
    if (d === 300) return 3;
    if (d === 600) return 6;
    return Math.max(1, Math.round(d / 100));
  };

  // Generate a QR code image matching ZPL ^BQ sizing (module = magnification dots)
  const generateQRCodeImage = async (
    data: string,
    magnification: number,
    errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'Q'
  ): Promise<{ url: string; count: number; module: number }> => {
    const qr = QRCode(0, errorCorrection);
    qr.addData(data);
    qr.make();
    const count = qr.getModuleCount();
    const module = Math.max(1, Math.round(magnification));
    const quiet = 4; // modules (QR spec); ZPL prints with quiet zone

    const size = (count + quiet * 2) * module;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Draw modules
    // Disable smoothing when scaling the canvas image elsewhere
    (ctx as any).imageSmoothingEnabled = false;
    ctx.fillStyle = 'black';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((quiet + c) * module, (quiet + r) * module, module, module);
        }
      }
    }
    return { url: canvas.toDataURL(), count, module };
  };

  const addQrCode = async (
    data: string,
    options: { magnification: number; errorCorrection: 'L' | 'M' | 'Q' | 'H' }
  ) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;
    try {
      const mag = Math.max(1, Math.round(options.magnification || getDefaultQrMagnification(dpi)));
      const level = options.errorCorrection || 'Q';
      const { url, count, module } = await generateQRCodeImage(data, mag, level);
      const img = await FabricImage.fromURL(url);
      const center = getLabelCenter();
      img.set({ left: center.x, top: center.y, originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, lockUniScaling: true });
      (img as any).isQr = true;
      (img as any).qrData = data;
      (img as any).qrMagnification = mag;
      (img as any).qrErrorCorrection = level;
      (img as any).qrModuleCount = count;
      (img as any).qrModuleSize = module;
      (img as any).imageSmoothing = false;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      toast.success('QR code added');
    } catch (e) {
      console.error('Failed to add QR:', e);
      toast.error('Failed to generate QR code');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <SettingsPanel
        width={labelWidth}
        height={labelHeight}
        dpi={dpi}
        rotate180={rotate180}
        onWidthChange={setLabelWidth}
        onHeightChange={setLabelHeight}
        onDpiChange={setDpi}
        onRotate180Change={setRotate180}
        onExport={handleExport}
        onPrint={handlePrint}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar 
          onAddElement={addElement} 
          onClear={handleClear} 
          zoom={zoom} 
          onZoomChange={setZoom}
          onUploadZpl={handleUploadZpl}
        />
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
        <div className="fixed right-0 top-[140px] bottom-0 z-10">
          <PropertiesPanel selectedObject={selectedObject} />
        </div>
      </div>

      <TextFieldDialog
        open={showTextDialog}
        onClose={() => setShowTextDialog(false)}
        onConfirm={addTextField}
        usedTextFields={getUsedTextFields()}
      />

      <BarcodeDialog
        open={showBarcodeDialog}
        onClose={() => setShowBarcodeDialog(false)}
        onConfirm={addBarcode}
      />

      <QrDialog
        open={showQrDialog}
        onClose={() => setShowQrDialog(false)}
        defaultMagnification={getDefaultQrMagnification(dpi)}
        defaultErrorCorrection="Q"
        onConfirm={(data, opts) => {
          addQrCode(data, opts);
          setShowQrDialog(false);
        }}
      />

      <ImageDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onConfirm={addImage}
      />

      <ClearLabelDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        onExport={handleClearAndExport}
        onConfirm={handleClearConfirm}
      />

      <ZplImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        scene={parsedScene}
        onApply={handleApplyImport}
      />
    </div>
  );
};

export default Index;
