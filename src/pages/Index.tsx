import { useState, useEffect, useCallback, useMemo } from "react";
import { FabricObject, IText, Textbox, Rect, Line, Ellipse, FabricImage } from "fabric";
import { Toolbar } from "@/components/Toolbar";
import { LabelCanvas } from "@/components/LabelCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TextFieldDialog } from "@/components/TextFieldDialog";
import { BarcodeDialog } from "@/components/BarcodeDialog";
import { ImageDialog } from "@/components/ImageDialog";
import { ClearLabelDialog } from "@/components/ClearLabelDialog";
import { ZplImportDialog } from "@/components/ZplImportDialog";
import { PrinterSelectionDialog } from "@/components/PrinterSelectionDialog";
import { PrintFallbackDialog } from "@/components/PrintFallbackDialog";
import { WebUsbPrinterDialog } from "@/components/WebUsbPrinterDialog";
import { NetworkPrinterDialog } from "@/components/NetworkPrinterDialog";
import { PrintWarningDialog } from "@/components/PrintWarningDialog";
import { HighQualityPrintDialog } from "@/components/HighQualityPrintDialog";
import { PrintOptionsDialog } from "@/components/PrintOptionsDialog";
import { PrintOnPortDialog } from "@/components/PrintOnPortDialog";
import { generateZPL, downloadZPL } from "@/utils/zplGenerator";
import { convertImageToZplGFA } from "@/utils/imageToZpl";
import { parseZPL, ParsedScene } from "@/utils/zplParser";
import { toast } from "sonner";
import QRCode from "qrcode-generator";
import { QrDialog } from "@/components/QrDialog";
import { TextCategoryDialog } from "@/components/TextCategoryDialog";
import { CodeCategoryDialog } from "@/components/CodeCategoryDialog";
import { CodeDataDialog } from "@/components/CodeDataDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  generateBarcodePreview, 
  calculateEAN13Checksum, 
  calculateEAN8Checksum, 
  estimateQrMagnification,
  computeBarcodeParamsFromSize,
  computeBarcodeParamsFromSizeAsync,
  generateBarcodePreviewFromParams,
  type BarcodeType,
  type BarcodeRenderParams,
  BARCODE_SIZE_DEFAULT,
  QR_SIZE_DEFAULT
} from "@/utils/barcodeUtils";
import { CoordinateConverter } from "@/utils/coordinateUtils";
import { LabelNameRequiredDialog } from "@/components/LabelNameRequiredDialog";

const Index = () => {
  const [labelWidth, setLabelWidth] = useState(100); // mm
  const [labelHeight, setLabelHeight] = useState(50); // mm
  const [dpi, setDpi] = useState(203);
  const [zoom, setZoom] = useState(1);
  const [rotate180, setRotate180] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [showLabelNameRequired, setShowLabelNameRequired] = useState(false);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [showBarcodeEditDialog, setShowBarcodeEditDialog] = useState(false);
  const [editingBarcodeObject, setEditingBarcodeObject] = useState<any>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [showFallbackDialog, setShowFallbackDialog] = useState(false);
  const [showWebUsbDialog, setShowWebUsbDialog] = useState(false);
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [showHighQualityPrintWarning, setShowHighQualityPrintWarning] = useState(false);
  const [showPrintOptionsDialog, setShowPrintOptionsDialog] = useState(false);
  const [showPrintOnPortDialog, setShowPrintOnPortDialog] = useState(false);
  const [showTextCategoryDialog, setShowTextCategoryDialog] = useState(false);
  const [showCodeCategoryDialog, setShowCodeCategoryDialog] = useState(false);
  const [showCodeDataDialog, setShowCodeDataDialog] = useState(false);
  const [showCodeEditDialog, setShowCodeEditDialog] = useState(false);
  const [selectedCodeType, setSelectedCodeType] = useState<string>("");
  const [editingCodeObject, setEditingCodeObject] = useState<any>(null);
  const [parsedScene, setParsedScene] = useState<ParsedScene | null>(null);
  const [printZplCode, setPrintZplCode] = useState("");
  const [textCounter, setTextCounter] = useState(1);
  const [typeChangeCounter, setTypeChangeCounter] = useState(0);

  // Helper to get label center in canvas coordinates - Memoized
  const getLabelCenter = useCallback(() => {
    const labelWidthPx = Math.round(labelWidth * (dpi / 25.4));
    const labelHeightPx = Math.round(labelHeight * (dpi / 25.4));
    return {
      x: 200 + labelWidthPx / 2,
      y: 200 + labelHeightPx / 2,
    };
  }, [labelWidth, labelHeight, dpi]);

  const addElement = useCallback((type: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    if (type === "text") {
      setShowTextDialog(true);
      return;
    }

    if (type === "fixed-text") {
      // Directly add fixed text without dialog
      const scaledFontSize = Math.round(20 * (dpi / 72));
      const center = getLabelCenter();
      const textInstanceName = `Text ${textCounter}`;

      const textField = new IText("Text", {
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
        textAlign: 'center',
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: false,
        perPixelTargetFind: false, // Full bounding box is clickable
        targetFindTolerance: 5, // Easier click detection
      }) as any;

      textField.fieldName = "";
      textField.isFixedText = true;
      textField.textInstanceName = textInstanceName;
      textField.fontWidth = scaledFontSize;
      textField.fontHeight = scaledFontSize;
      
      // Ensure text is scalable
      textField.lockScalingX = false;
      textField.lockScalingY = false;

      canvas.add(textField);
      canvas.setActiveObject(textField);
      setSelectedObject(textField as unknown as FabricObject);
      canvas.renderAll();
      
      setTextCounter(textCounter + 1);
      return;
    }

    if (type === "barcode") {
      setShowBarcodeDialog(true);
      return;
    }

    if (type === "code") {
      setShowCodeCategoryDialog(true);
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
        fill: null,
        stroke: "#000",
        strokeWidth: scaledStroke,
        perPixelTargetFind: true,
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
        fill: null,
        stroke: "#000",
        strokeWidth: scaledStroke,
        perPixelTargetFind: true,
        lockRotation: true,
      });
      canvas.add(ellipse);
      canvas.setActiveObject(ellipse);
    }

    canvas.renderAll();
  }, [dpi, textCounter, getLabelCenter]);

  const addTextField = useCallback((fieldName: string, isFixed?: boolean) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // Scale font size to printer DPI (20pt at 72 DPI baseline)
    const scaledFontSize = Math.round(20 * (dpi / 72));
    const center = getLabelCenter();
    const textInstanceName = `Text ${textCounter}`;

    const displayText = isFixed ? "Fixed Text" : fieldName;
    const textField = new IText(displayText, {
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
      textAlign: 'center',
      scaleX: 1,
      scaleY: 1,
      lockScalingFlip: true,
      lockUniScaling: false,
      perPixelTargetFind: false, // Full bounding box is clickable
      targetFindTolerance: 5, // Easier click detection
    }) as any;

    // Store the field name and instance name for ZPL export and display
    textField.fieldName = isFixed ? "" : fieldName;
    textField.isFixedText = isFixed || false;
    textField.textInstanceName = textInstanceName;
    textField.fontWidth = scaledFontSize;
    textField.fontHeight = scaledFontSize;
    textField.textAlign = 'left'; // Default horizontal alignment
    
    // Ensure text is scalable
    textField.lockScalingX = false;
    textField.lockScalingY = false;

    canvas.add(textField);
    canvas.setActiveObject(textField);
    setSelectedObject(textField as unknown as FabricObject);
    canvas.renderAll();
    
    setTextCounter(textCounter + 1);
  }, [dpi, textCounter, getLabelCenter]);
  
  // Get all used text field names from canvas (only dynamic fields) - Memoized
  const getUsedTextFields = useCallback((): string[] => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return [];
    
    const usedFields: string[] = [];
    canvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'i-text' && obj.fieldName && !obj.isFixedText) {
        usedFields.push(obj.fieldName);
      }
    });
    return usedFields;
  }, []);

  // Generate true EAN-13 barcode matching ZPL ^BE output exactly - Memoized
  const generateBarcodeImage = useCallback(async (
    normalizedData: string,
    opts: { moduleWidth?: number; barHeight?: number; quietLeftModules?: number; quietRightModules?: number; textHeight?: number } = {}
  ): Promise<string> => {
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
    const moduleWidth = Math.max(1, Math.round(opts.moduleWidth ?? 2)); // dots (matches ^BY2 default)
    const barHeight = Math.max(1, Math.round(opts.barHeight ?? 112)); // dots (bars only, not including text)
    const symbolModules = 95; // modules for bars region
    const quietLeftModules = Math.max(0, Math.round(opts.quietLeftModules ?? 10));
    const quietRightModules = Math.max(0, Math.round(opts.quietRightModules ?? 10));
    const textHeight = Math.max(0, Math.round(opts.textHeight ?? 18)); // dots for human-readable text below bars

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
  }, []);

  const addBarcode = useCallback(async (barcodeData: string) => {
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
  }, [generateBarcodeImage, getLabelCenter]);

  const handleBarcodeDoubleClick = useCallback((barcodeObj: any) => {
    setEditingBarcodeObject(barcodeObj);
    setShowBarcodeEditDialog(true);
  }, []);

  const updateBarcodeData = useCallback(async (newBarcode: string) => {
    if (!editingBarcodeObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Normalize the new barcode data
      const normalize = (data: string) => {
        const ds = (data || "").replace(/\D/g, "");
        const base = ds.slice(0, 12).padEnd(12, "0");
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          const n = parseInt(base[i], 10);
          sum += (i % 2 === 0) ? n : n * 3;
        }
        const cd = (10 - (sum % 10)) % 10;
        return base + cd.toString();
      };
      const normalized = normalize(newBarcode);

      // Generate new barcode image
      const barcodeImageUrl = await generateBarcodeImage(normalized);
      
      // Store current object properties
      const currentLeft = editingBarcodeObject.left;
      const currentTop = editingBarcodeObject.top;
      const currentScaleX = editingBarcodeObject.scaleX;
      const currentScaleY = editingBarcodeObject.scaleY;
      const currentAngle = editingBarcodeObject.angle;
      
      // Remove old barcode
      canvas.remove(editingBarcodeObject);
      
      // Create new barcode image with updated data
      const img = await FabricImage.fromURL(barcodeImageUrl);
      img.set({
        left: currentLeft,
        top: currentTop,
        originX: "center",
        originY: "center",
        scaleX: currentScaleX,
        scaleY: currentScaleY,
        angle: currentAngle,
        lockScalingFlip: true,
        lockUniScaling: true,
      });

      (img as any).isBarcode = true;
      (img as any).barcodeData = newBarcode;
      (img as any).barcodeDataNormalized = normalized;
      (img as any).moduleWidth = 2;
      (img as any).barHeight = 112;

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      
      toast.success("Barcode updated");
      setEditingBarcodeObject(null);
      setShowBarcodeEditDialog(false);
    } catch (error) {
      console.error("Failed to update barcode:", error);
      toast.error("Failed to update barcode");
    }
  }, [editingBarcodeObject, generateBarcodeImage]);

  const handleCodeCategorySelect = useCallback((categoryId: string) => {
    setSelectedCodeType(categoryId);
    setShowCodeDataDialog(true);
  }, []);

  const addCode = useCallback(async (data: string, size: number, heightDots: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Map selectedCodeType to BarcodeType
      const barcodeType: BarcodeType = 
        selectedCodeType === "qrcode" ? "QR" :
        selectedCodeType === "ean8" ? "EAN_8" :
        selectedCodeType === "ean13" ? "EAN_13" :
        selectedCodeType === "code128" ? "CODE_128" : "CODE_128";

      const isQR = selectedCodeType === "qrcode";
      
      // Compute barcode parameters from Size (1-10) - use async for accurate QR module count
      const params = await computeBarcodeParamsFromSizeAsync(
        barcodeType,
        data,
        size,
        heightDots,
        { 
          errorCorrection: 'M',
          humanReadable: true 
        }
      );
      
      // Generate preview using exact same parameters (1:1 dots to pixels)
      const imageDataUrl = await generateBarcodePreviewFromParams(params, { x: 1, y: 1 });

      // Create Fabric image
      const img = await FabricImage.fromURL(imageDataUrl);
      const center = getLabelCenter();

      // Image is already sized correctly in dots, no scaling needed
      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: isQR, // QR stays square
        lockScalingX: !isQR, // Lock horizontal scaling for linear barcodes
      });

      // Store metadata for ZPL generation
      (img as any).isCode = true;
      (img as any).codeType = selectedCodeType;
      (img as any).codeData = data;
      (img as any).codeSize = size; // Store Size (1-10) directly
      (img as any).codeHeight = heightDots;
      (img as any).humanReadable = params.humanReadable;
      (img as any).barcodeParams = params; // Store computed params
      
      if (isQR) {
        (img as any).isQr = true;
        (img as any).qrData = data;
        (img as any).qrErrorCorrection = params.qrErrorCorrection;
        (img as any).qrMagnification = params.qrMagnification;
      }

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      
      const typeLabel = selectedCodeType === "qrcode" ? "QR Code" :
                       selectedCodeType === "ean8" ? "EAN-8" :
                       selectedCodeType === "ean13" ? "EAN-13" :
                       selectedCodeType === "code128" ? "Code 128" : "Code";
      toast.success(`${typeLabel} added`);
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Failed to generate code");
    }
  }, [selectedCodeType, getLabelCenter]);

  const handleCodeDoubleClick = useCallback((codeObj: any) => {
    setEditingCodeObject(codeObj);
    setSelectedCodeType(codeObj.codeType);
    setShowCodeEditDialog(true);
  }, []);

  const updateCodeData = useCallback(async (newData: string, newSize: number, newHeightDots: number) => {
    if (!editingCodeObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Map codeType to BarcodeType
      const barcodeType: BarcodeType = 
        editingCodeObject.codeType === "qrcode" ? "QR" :
        editingCodeObject.codeType === "ean8" ? "EAN_8" :
        editingCodeObject.codeType === "ean13" ? "EAN_13" :
        editingCodeObject.codeType === "code128" ? "CODE_128" : "CODE_128";

      const isQR = editingCodeObject.codeType === "qrcode";
      
      // Recompute barcode params with new data and size - use async for accurate QR module count
      const params = await computeBarcodeParamsFromSizeAsync(
        barcodeType,
        newData,
        newSize,
        newHeightDots,
        { 
          errorCorrection: editingCodeObject.qrErrorCorrection || 'M',
          humanReadable: true 
        }
      );
      
      // Generate new preview using exact same parameters
      const imageDataUrl = await generateBarcodePreviewFromParams(params, { x: 1, y: 1 });

      // Store all current properties before update
      const currentLeft = editingCodeObject.left;
      const currentTop = editingCodeObject.top;
      const currentAngle = editingCodeObject.angle;
      const currentOriginX = editingCodeObject.originX;
      const currentOriginY = editingCodeObject.originY;
      
      // Load new image element
      const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      // Update the existing Fabric object's image source
      editingCodeObject.setElement(imgElement);
      editingCodeObject.set({
        left: currentLeft,
        top: currentTop,
        originX: currentOriginX || "center",
        originY: currentOriginY || "center",
        scaleX: 1,
        scaleY: 1,
        angle: currentAngle || 0,
        lockScalingFlip: true,
        lockUniScaling: isQR,
        lockScalingX: !isQR, // Lock horizontal scaling for linear barcodes
        dirty: true,
      });

      // Update metadata for ZPL generation
      (editingCodeObject as any).isCode = true;
      (editingCodeObject as any).codeType = editingCodeObject.codeType;
      (editingCodeObject as any).codeData = newData;
      (editingCodeObject as any).codeSize = newSize;
      (editingCodeObject as any).codeHeight = newHeightDots;
      (editingCodeObject as any).humanReadable = params.humanReadable;
      (editingCodeObject as any).barcodeParams = params;
      
      if (isQR) {
        (editingCodeObject as any).isQr = true;
        (editingCodeObject as any).qrData = newData;
        (editingCodeObject as any).qrErrorCorrection = params.qrErrorCorrection;
        (editingCodeObject as any).qrMagnification = params.qrMagnification;
      }

      // Re-select the updated object and re-render
      canvas.setActiveObject(editingCodeObject);
      canvas.requestRenderAll();

      toast.success("Code updated");
      setEditingCodeObject(null);
      setShowCodeEditDialog(false);
    } catch (error) {
      console.error("Failed to update code:", error);
      toast.error("Failed to update code");
    }
  }, [editingCodeObject]);

  const addImage = useCallback(async (imageData: Blob | string) => {
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
  }, [dpi, labelWidth, labelHeight, getLabelCenter]);

  // Single source of truth for ZPL generation with field names
  const getCurrentLabelZplWithFieldNames = useCallback((): string => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return "";

    return generateZPL(canvas, {
      dpi,
      width: labelWidth,
      height: labelHeight,
      withValues: false, // Always use field names for consistency
      rotate180,
    });
  }, [dpi, labelWidth, labelHeight, rotate180]);

  const handleExport = useCallback((withValues: boolean) => {
    if (!labelName.trim()) {
      setShowLabelNameRequired(true);
      return;
    }

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    // For field names export, use the single source of truth
    // For values export, generate with values
    const zplCode = withValues
      ? generateZPL(canvas, { dpi, width: labelWidth, height: labelHeight, withValues: true, rotate180 })
      : getCurrentLabelZplWithFieldNames();

    const timestamp = new Date().toISOString().replace(/:/g, '');
    const sanitizedLabelName = labelName.trim().replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
    const filename = `${sanitizedLabelName}-${timestamp}.zpl`;
    downloadZPL(zplCode, filename);
    toast.success(`ZPL code exported as ${filename}`);
  }, [labelName, dpi, labelWidth, labelHeight, rotate180, getCurrentLabelZplWithFieldNames]);

  const handlePrint = useCallback(() => {
    if (!labelName.trim()) {
      setShowLabelNameRequired(true);
      return;
    }

    // Check if user wants to skip the warning
    const hideWarning = localStorage.getItem("hidePrintWarning") === "true";
    
    if (!hideWarning) {
      setShowPrintWarning(true);
      return;
    }

    executePrint();
  }, [labelName]);

  const executePrint = useCallback(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Ensure latest render
      canvas.requestRenderAll?.();

      // Calculate label dimensions in pixels at 600 DPI for high-quality print
      const targetPrintDPI = 600;
      const labelWidthPx = Math.round((labelWidth / 25.4) * targetPrintDPI);
      const labelHeightPx = Math.round((labelHeight / 25.4) * targetPrintDPI);

      // Find the label boundary to get exact crop coordinates
      const labelBoundary = canvas.getObjects().find((obj: any) => obj.name === "labelBoundary") as any;
      if (!labelBoundary) {
        toast.error("Label boundary not found");
        return;
      }

      // Temporarily reset viewport to avoid zoom/pan affecting export
      const prevVpt = (canvas.viewportTransform && Array.isArray(canvas.viewportTransform))
        ? [...(canvas.viewportTransform as number[])]
        : null;
      const prevZoom = typeof canvas.getZoom === 'function' ? canvas.getZoom() : 1;
      if (typeof canvas.setViewportTransform === 'function') {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      }
      if (typeof canvas.setZoom === 'function') {
        canvas.setZoom(1);
      }
      canvas.requestRenderAll?.();

      // Crop region equals label boundary rect
      const br = {
        left: (labelBoundary as any).left,
        top: (labelBoundary as any).top,
        width: (labelBoundary as any).width,
        height: (labelBoundary as any).height,
      } as { left: number; top: number; width: number; height: number };

      // Export the label area via Fabric's renderer to avoid retina/transform issues
      const exportMultiplier = Math.max(1, Math.round(labelWidthPx / Math.max(1, br.width)));
      const dataUrlFromFabric = (canvas as any).toDataURL({
        format: 'png',
        left: br.left,
        top: br.top,
        width: br.width,
        height: br.height,
        multiplier: exportMultiplier,
      });

      // Restore previous viewport
      if (prevVpt && typeof canvas.setViewportTransform === 'function') {
        canvas.setViewportTransform(prevVpt as any);
      }
      if (typeof canvas.setZoom === 'function') {
        canvas.setZoom(prevZoom);
      }
      canvas.requestRenderAll?.();

      // Prepare a temp canvas for monochrome conversion
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = labelWidthPx;
      tempCanvas.height = labelHeightPx;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        toast.error("Failed to create canvas context");
        return;
      }
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, labelWidthPx, labelHeightPx);

      const imgEl = new Image();
      imgEl.onload = () => {
        // Draw exported region scaled exactly to label pixel size
        tempCtx.drawImage(imgEl, 0, 0, labelWidthPx, labelHeightPx);

        // Apply 180° rotation if enabled
        if (rotate180) {
          const rotatedCanvas = document.createElement("canvas");
          rotatedCanvas.width = labelWidthPx;
          rotatedCanvas.height = labelHeightPx;
          const rotatedCtx = rotatedCanvas.getContext("2d");
          if (!rotatedCtx) {
            toast.error("Failed to create rotation context");
            return;
          }
          rotatedCtx.imageSmoothingEnabled = false;
          rotatedCtx.translate(labelWidthPx / 2, labelHeightPx / 2);
          rotatedCtx.rotate(Math.PI);
          rotatedCtx.drawImage(tempCanvas, -labelWidthPx / 2, -labelHeightPx / 2);
          tempCtx.clearRect(0, 0, labelWidthPx, labelHeightPx);
          tempCtx.drawImage(rotatedCanvas, 0, 0);
        }

        // Convert to pure black and white (monochrome) with threshold
        const imageData = tempCtx.getImageData(0, 0, labelWidthPx, labelHeightPx);
        const data = imageData.data;
        const threshold = 128; // Sharp threshold for crisp black/white
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          const bw = gray < threshold ? 0 : 255;
          data[i] = bw;
          data[i + 1] = bw;
          data[i + 2] = bw;
          data[i + 3] = 255;
        }
        tempCtx.putImageData(imageData, 0, 0);

      const dataUrl = tempCanvas.toDataURL("image/png");

      // Print in a dedicated hidden iframe for maximum reliability
      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
        visibility: "hidden",
      } as any);
      document.body.appendChild(iframe);

      const html = `<!doctype html><html><head><meta charset="utf-8" />
        <title>Label Print</title>
        <style>
          @page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; }
          body { display: grid; place-items: center; background: white; }
          img#print { 
            display: block;
            width: ${labelWidth}mm; 
            height: auto; 
            image-rendering: pixelated; 
            image-rendering: crisp-edges;
            page-break-before: avoid;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; }
            header, footer { display: none !important; }
          }
        </style>
      </head>
      <body>
        <img id="print" alt="label" src="${dataUrl}" />
      </body></html>`;

      const idoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!idoc) {
        toast.error("Print iframe not available");
        document.body.removeChild(iframe);
        return;
      }
      idoc.open();
      idoc.write(html);
      idoc.close();

      const onReady = () => {
        const win = iframe.contentWindow as Window;
        // Delay slightly to ensure layout is settled
        setTimeout(() => {
          win.focus();
          win.print();
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 500);
        }, 100);
      };

      const imgEl2 = idoc.getElementById("print") as HTMLImageElement | null;
      if (imgEl2) {
        if (imgEl2.complete) onReady();
        else imgEl2.onload = onReady;
      } else {
        // Fallback: attempt to print after short delay
        setTimeout(onReady, 200);
      }

      };
      imgEl.src = dataUrlFromFabric;
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to prepare print");
    }
  }, [dpi, labelWidth, labelHeight, rotate180]);

  const executeZplPdfPrint = useCallback(async () => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Use the same ZPL as "Export with Field Names" for consistency
      const zplCode = getCurrentLabelZplWithFieldNames();

      // Convert dimensions for Labelary API
      const widthInches = (labelWidth / 25.4).toFixed(2);
      const heightInches = (labelHeight / 25.4).toFixed(2);
      const dpmm = Math.round(dpi / 25.4);

      // Build Labelary API URL
      const apiUrl = `https://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${widthInches}x${heightInches}/0/`;

      toast.info("Generating ZPL document...");

      // Call Labelary API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Accept": "application/pdf",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: zplCode,
      });

      if (!response.ok) {
        throw new Error(`Labelary API error: ${response.status} ${response.statusText}`);
      }

      // Get PDF as Blob
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Create invisible iframe to trigger print dialog
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = pdfUrl;
      
      iframe.onload = () => {
        try {
          // Small delay to ensure the internal PDF viewer fully initializes
          setTimeout(() => {
            const cw = iframe.contentWindow as (Window & typeof globalThis) | null;
            if (!cw) throw new Error("PDF iframe not ready");

            // Prepare cleanup only AFTER printing (more reliable in Chrome/Edge)
            const cleanup = () => {
              try { document.body.removeChild(iframe); } catch {}
              try { URL.revokeObjectURL(pdfUrl); } catch {}
            };

            // Prefer onafterprint when available
            try {
              (cw as any).onafterprint = () => {
                // Give the browser a moment to close the dialog and finish
                setTimeout(cleanup, 500);
                (cw as any).onafterprint = null;
              };
            } catch {}

            // Fallback: detect end of print via matchMedia if supported
            const mql = (cw as any).matchMedia?.("print");
            if (mql && typeof mql.addEventListener === "function") {
              const handler = (e: MediaQueryListEvent) => {
                if (!e.matches) {
                  mql.removeEventListener("change", handler);
                  setTimeout(cleanup, 500);
                }
              };
              mql.addEventListener("change", handler);
            } else {
              // Last resort: long timeout to avoid premature close
              setTimeout(cleanup, 120000);
            }

            cw.focus();
            cw.print();
            toast.success("ZPL generated! Print dialog opened.");
          }, 250);
        } catch (error) {
          console.error("Print dialog error:", error);
          toast.error("Could not open print dialog");
          try { document.body.removeChild(iframe); } catch {}
          try { URL.revokeObjectURL(pdfUrl); } catch {}
        }
      };
      
      document.body.appendChild(iframe);
    } catch (error) {
      console.error("Failed to generate PDF from ZPL:", error);
      toast.error("Could not generate ZPL. Label is empty.");
    }
  }, [dpi, labelWidth, labelHeight, rotate180]);

  const handleZplPdfPrint = useCallback(() => {
    if (!labelName.trim()) {
      setShowLabelNameRequired(true);
      return;
    }

    // Check if user wants to skip the warning
    const hideWarning = localStorage.getItem("hideHighQualityPrintWarning") === "true";
    
    if (!hideWarning) {
      setShowHighQualityPrintWarning(true);
      return;
    }

    executeZplPdfPrint();
  }, [labelName, executeZplPdfPrint, getCurrentLabelZplWithFieldNames]);

  // Use the single source of truth for Print on Port
  const getZplForPrinting = useCallback(() => {
    return getCurrentLabelZplWithFieldNames();
  }, [getCurrentLabelZplWithFieldNames]);

  const handlePrintOnPort = useCallback(() => {
    if (!labelName.trim()) {
      setShowLabelNameRequired(true);
      return;
    }
    setShowPrintOnPortDialog(true);
  }, [labelName]);

  const handleDownloadZpl = useCallback(() => {
    downloadZPL(printZplCode, "label-print.zpl");
    toast.success("ZPL file downloaded");
  }, [printZplCode]);

  const handleVisualPrint = useCallback(() => {
    // Open browser print dialog with visual preview
    window.print();
  }, []);

  const handleDelete = useCallback(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || (activeObject as any).name === "labelBoundary") return;
    
    // Handle multi-selection
    if (activeObject.type === 'activeSelection') {
      const objects = (activeObject as any).getObjects?.();
      if (objects) {
        objects.forEach((obj: any) => {
          if (obj.name !== 'labelBoundary') {
            canvas.remove(obj);
          }
        });
        canvas.discardActiveObject();
        canvas.renderAll();
        setSelectedObject(null);
        toast.success(`Deleted ${objects.length} elements`);
      }
    } else {
      // Single object deletion
      canvas.remove(activeObject);
      canvas.renderAll();
      setSelectedObject(null);
      toast.success("Element deleted");
    }
  }, []);

  const handleClear = useCallback(() => {
    setShowClearDialog(true);
  }, []);

  // Helper function to get the next available field name for a category
  const getNextAvailableFieldName = useCallback((category: string, canvas: any): string | null => {
    // Define allowed field names per category
    let allowedFields: string[] = [];
    
    if (category === "Date & Time") {
      allowedFields = ["Date_Text1", "Date_Text2", "Date_Text3", "Date_Text4", "Date_Text5", "Date_Text6", "Clock"];
    } else if (category === "Nutrition & Energy Values") {
      allowedFields = Array.from({ length: 30 }, (_, i) => `Text_EV${i + 1}`);
    } else if (category === "Weight & Price") {
      allowedFields = Array.from({ length: 20 }, (_, i) => `Text_WP${i + 1}`);
    } else if (category === "Multiline Text") {
      allowedFields = Array.from({ length: 5 }, (_, i) => `text_ml${i + 1}`);
    } else {
      // Fixed Text doesn't use auto-assignment
      return null;
    }
    
    // Get all used field names for this category
    const usedFields = new Set<string>();
    canvas.getObjects().forEach((obj: any) => {
      if ((obj.type === "i-text" || obj.type === "textbox") && obj.textCategory === category && obj.fieldName) {
        usedFields.add(obj.fieldName);
      }
    });
    
    // Find first available field name
    for (const fieldName of allowedFields) {
      if (!usedFields.has(fieldName)) {
        return fieldName;
      }
    }
    
    return null; // All fields are used
  }, []);

  const handleTextCategorySelect = useCallback((category: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const scaledFontSize = Math.round(20 * (dpi / 72));
    const center = getLabelCenter();
    const textInstanceName = `Text ${textCounter}`;

    // For special categories, get the next available field name
    let textContent = category;
    let fieldName = "";
    let isFixedText = true;
    
    if (category === "Date & Time" || category === "Nutrition & Energy Values" || category === "Weight & Price" || category === "Multiline Text") {
      const nextFieldName = getNextAvailableFieldName(category, canvas);
      
      if (!nextFieldName) {
        // All fields are used, show error
        toast.error(`All ${category} fields are already used on this label.`);
        return;
      }
      
      textContent = nextFieldName;
      fieldName = nextFieldName;
      isFixedText = false;
    }

    // For Multiline Text, use Textbox instead of IText
    let textField: any;
    if (category === "Multiline Text") {
      // Calculate initial textbox dimensions (approx 4x the font height for wrapping)
      const initialWidth = Math.round(scaledFontSize * 10);
      const initialHeight = Math.round(scaledFontSize * 4);
      
      textField = new Textbox(textContent, {
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
        textAlign: 'center',
        width: initialWidth,
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: false,
        perPixelTargetFind: false, // Full bounding box is clickable
        targetFindTolerance: 5, // Easier click detection
      }) as any;
      
      textField.isMultilineText = true;
    } else {
      textField = new IText(textContent, {
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
        textAlign: 'center',
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: false,
        perPixelTargetFind: false, // Full bounding box is clickable
        targetFindTolerance: 5, // Easier click detection
      }) as any;
    }

    textField.fieldName = fieldName;
    textField.isFixedText = isFixedText;
    textField.textInstanceName = textInstanceName;
    textField.fontWidth = scaledFontSize;
    textField.fontHeight = scaledFontSize;
    textField.textCategory = category; // Store the category
    textField.textAlign = 'left'; // Default horizontal alignment
    
    textField.lockScalingX = false;
    textField.lockScalingY = false;

    canvas.add(textField);
    canvas.setActiveObject(textField);
    setSelectedObject(textField as unknown as FabricObject);
    canvas.renderAll();
    
    setTextCounter(textCounter + 1);
  }, [dpi, getLabelCenter, textCounter, getNextAvailableFieldName]);

  const handleClearConfirm = useCallback(() => {
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
  }, []);

  const handleUploadZpl = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const scene = parseZPL(text, dpi);
      setParsedScene(scene);
      
      // Extract label name from filename
      // Remove .zpl extension and any timestamp portion
      const filename = file.name.replace(/\.zpl$/i, '');
      // Look for pattern: NAME-2025... or NAME-timestamp and extract NAME
      const labelNameMatch = filename.match(/^(.+?)(?:-\d{4}|$)/);
      const extractedLabelName = labelNameMatch ? labelNameMatch[1] : filename;
      
      // Set the label name (keep original case and format)
      setLabelName(extractedLabelName);
      
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error parsing ZPL:', error);
      toast.error('Failed to parse ZPL file');
    }
  }, [dpi]);

  // JSON Export Handler
  const handleDownloadJson = useCallback(async () => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    if (!labelName.trim()) {
      setShowLabelNameRequired(true);
      return;
    }

    try {
      // Collect all canvas objects (exclude label boundary)
      const objects = canvas.getObjects().filter((obj: any) => obj.name !== 'labelBoundary');
      
      // Serialize each object
      const serializedElements = await Promise.all(objects.map(async (obj: any) => {
        const element: any = {
          type: obj.type,
          left: obj.left,
          top: obj.top,
          width: obj.width,
          height: obj.height,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          originX: obj.originX,
          originY: obj.originY,
        };

        // Handle specific object types
        if (obj.type === 'i-text' || obj.type === 'textbox') {
          element.text = obj.text;
          element.fontSize = obj.fontSize;
          element.fontFamily = obj.fontFamily;
          element.fontWeight = obj.fontWeight;
          element.charSpacing = obj.charSpacing;
          element.lineHeight = obj.lineHeight;
          element.textAlign = obj.textAlign;
          element.fill = obj.fill;
          element.fieldName = obj.fieldName || '';
          element.isFixedText = obj.isFixedText || false;
          element.textInstanceName = obj.textInstanceName || '';
          element.fontWidth = obj.fontWidth;
          element.fontHeight = obj.fontHeight;
          element.textCategory = obj.textCategory || '';
          element.isMultilineText = obj.isMultilineText || false;
        } else if (obj.type === 'rect') {
          element.fill = obj.fill;
          element.stroke = obj.stroke;
          element.strokeWidth = obj.strokeWidth;
        } else if (obj.type === 'line') {
          element.x1 = obj.x1;
          element.y1 = obj.y1;
          element.x2 = obj.x2;
          element.y2 = obj.y2;
          element.stroke = obj.stroke;
          element.strokeWidth = obj.strokeWidth;
        } else if (obj.type === 'ellipse') {
          element.rx = obj.rx;
          element.ry = obj.ry;
          element.fill = obj.fill;
          element.stroke = obj.stroke;
          element.strokeWidth = obj.strokeWidth;
        } else if (obj.type === 'image') {
          // Check if it's a barcode, QR code, or regular image
          if (obj.isCode) {
            element.isCode = true;
            element.codeType = obj.codeType;
            element.codeData = obj.codeData;
            element.humanReadable = obj.humanReadable;
            element.barcodeParams = obj.barcodeParams;
          } else if (obj.isQr) {
            element.isQr = true;
            element.qrData = obj.qrData;
            element.qrMagnification = obj.qrMagnification;
            element.qrErrorCorrection = obj.qrErrorCorrection;
          } else if (obj.isBarcode) {
            element.isBarcode = true;
            element.barcodeData = obj.barcodeData;
            element.barcodeDataNormalized = obj.barcodeDataNormalized;
            element.moduleWidth = obj.moduleWidth;
            element.barHeight = obj.barHeight;
            element.textHeight = obj.textHeight;
          } else {
            // Regular image - convert to base64
            element.isImage = true;
            const imgElement = obj.getElement();
            if (imgElement) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = imgElement.naturalWidth || imgElement.width;
              tempCanvas.height = imgElement.naturalHeight || imgElement.height;
              const ctx = tempCanvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(imgElement, 0, 0);
                element.imageData = tempCanvas.toDataURL('image/png');
              }
            }
            // Store ZPL data if available
            element.zplImageData = obj.zplImageData;
          }
        }

        return element;
      }));

      // Create the complete label state
      const labelData = {
        version: '1.0',
        labelName: labelName,
        labelWidth: labelWidth,
        labelHeight: labelHeight,
        dpi: dpi,
        rotate180: rotate180,
        zoom: 1, // Always save with default zoom
        elements: serializedElements,
        exportedAt: new Date().toISOString(),
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(labelData, null, 2);
      
      // Trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${labelName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Label saved to your computer');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Failed to export label');
    }
  }, [labelName, labelWidth, labelHeight, dpi, rotate180]);

  // JSON Import Handler
  const handleUploadJson = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const labelData = JSON.parse(text);

      // Validate JSON structure
      if (!labelData.labelName || !labelData.elements || !Array.isArray(labelData.elements)) {
        toast.error('Invalid label file format');
        return;
      }

      const canvas = (window as any).fabricCanvas;
      if (!canvas) return;

      // Update label settings
      setLabelName(labelData.labelName);
      setLabelWidth(labelData.labelWidth);
      setLabelHeight(labelData.labelHeight);
      setDpi(labelData.dpi);
      setRotate180(labelData.rotate180 || false);
      setZoom(1); // Reset to default zoom

      // Clear existing elements (keep label boundary)
      const objects = canvas.getObjects();
      objects.forEach((obj: FabricObject) => {
        if ((obj as any).name !== "labelBoundary") {
          canvas.remove(obj);
        }
      });

      // Recreate all elements
      for (const element of labelData.elements) {
        if (element.type === 'i-text') {
          const text = new IText(element.text, {
            left: element.left,
            top: element.top,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            charSpacing: element.charSpacing,
            lineHeight: element.lineHeight,
            textAlign: element.textAlign,
            fill: element.fill,
            originX: element.originX,
            originY: element.originY,
            angle: element.angle,
            scaleX: element.scaleX,
            scaleY: element.scaleY,
          }) as any;

          text.fieldName = element.fieldName || '';
          text.isFixedText = element.isFixedText || false;
          text.textInstanceName = element.textInstanceName || '';
          text.fontWidth = element.fontWidth ?? element.fontSize;
          text.fontHeight = element.fontHeight ?? element.fontSize;
          text.textCategory = element.textCategory || '';
          text.lockScalingX = false;
          text.lockScalingY = false;

          canvas.add(text);
        } else if (element.type === 'textbox') {
          const textbox = new Textbox(element.text, {
            left: element.left,
            top: element.top,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            charSpacing: element.charSpacing,
            lineHeight: element.lineHeight,
            textAlign: element.textAlign,
            fill: element.fill,
            originX: element.originX,
            originY: element.originY,
            angle: element.angle,
            scaleX: element.scaleX,
            scaleY: element.scaleY,
            width: element.width,
          }) as any;

          textbox.fieldName = element.fieldName || '';
          textbox.isFixedText = element.isFixedText || false;
          textbox.textInstanceName = element.textInstanceName || '';
          textbox.fontWidth = element.fontWidth ?? element.fontSize;
          textbox.fontHeight = element.fontHeight ?? element.fontSize;
          textbox.textCategory = element.textCategory || '';
          textbox.isMultilineText = element.isMultilineText || false;
          textbox.lockScalingX = false;
          textbox.lockScalingY = false;

          canvas.add(textbox);
        } else if (element.type === 'rect') {
          const rect = new Rect({
            left: element.left,
            top: element.top,
            width: element.width,
            height: element.height,
            fill: element.fill,
            stroke: element.stroke,
            strokeWidth: element.strokeWidth,
            originX: element.originX,
            originY: element.originY,
            angle: element.angle,
            scaleX: element.scaleX,
            scaleY: element.scaleY,
          });
          canvas.add(rect);
        } else if (element.type === 'line') {
          const line = new Line([element.x1, element.y1, element.x2, element.y2], {
            left: element.left,
            top: element.top,
            stroke: element.stroke,
            strokeWidth: element.strokeWidth,
            originX: element.originX,
            originY: element.originY,
            angle: element.angle,
          });
          canvas.add(line);
        } else if (element.type === 'ellipse') {
          const ellipse = new Ellipse({
            left: element.left,
            top: element.top,
            rx: element.rx,
            ry: element.ry,
            fill: element.fill,
            stroke: element.stroke,
            strokeWidth: element.strokeWidth,
            originX: element.originX,
            originY: element.originY,
            angle: element.angle,
            scaleX: element.scaleX,
            scaleY: element.scaleY,
          });
          canvas.add(ellipse);
        } else if (element.type === 'image') {
          // Recreate barcode, QR code, or regular image
          if (element.isCode) {
            // Recreate barcode using stored parameters for exact restoration
            let barcodeImageUrl: string;
            
            if (element.barcodeParams) {
              // Use stored barcode params to regenerate exactly
              const pixelsPerDot = { x: 1, y: 1 }; // Will be scaled by scaleX/scaleY
              barcodeImageUrl = await generateBarcodePreviewFromParams(element.barcodeParams, pixelsPerDot);
            } else {
              // Fallback to default parameters
              barcodeImageUrl = await generateBarcodePreview(
                element.codeType,
                element.codeData,
                2,
                112
              );
            }
            
            const img = await FabricImage.fromURL(barcodeImageUrl);
            img.set({
              left: element.left,
              top: element.top,
              originX: element.originX,
              originY: element.originY,
              angle: element.angle,
              scaleX: element.scaleX,
              scaleY: element.scaleY,
              lockScalingFlip: true,
              lockUniScaling: element.codeType === 'qrcode',
            });
            (img as any).isCode = true;
            (img as any).codeType = element.codeType;
            (img as any).codeData = element.codeData;
            (img as any).humanReadable = element.humanReadable;
            (img as any).barcodeParams = element.barcodeParams;
            
            if (element.codeType === 'qrcode') {
              (img as any).isQr = true;
              (img as any).qrData = element.codeData;
              (img as any).qrErrorCorrection = element.qrErrorCorrection;
              (img as any).qrMagnification = element.qrMagnification;
            }
            
            canvas.add(img);
          } else if (element.isQr) {
            // Recreate QR code
            const { url } = await generateQRCodeImage(
              element.qrData,
              element.qrMagnification || 2,
              element.qrErrorCorrection || 'M'
            );
            const img = await FabricImage.fromURL(url);
            img.set({
              left: element.left,
              top: element.top,
              originX: element.originX,
              originY: element.originY,
              angle: element.angle,
              scaleX: element.scaleX,
              scaleY: element.scaleY,
              lockScalingFlip: true,
              lockUniScaling: true,
            });
            (img as any).isQr = true;
            (img as any).qrData = element.qrData;
            (img as any).qrMagnification = element.qrMagnification;
            (img as any).qrErrorCorrection = element.qrErrorCorrection;
            canvas.add(img);
          } else if (element.isBarcode) {
            // Legacy barcode format (EAN-13 only)
            const barcodeImageUrl = await generateBarcodePreview(
              'EAN_13',
              element.barcodeDataNormalized || element.barcodeData,
              element.moduleWidth || 2,
              element.barHeight || 112
            );
            const img = await FabricImage.fromURL(barcodeImageUrl);
            img.set({
              left: element.left,
              top: element.top,
              originX: element.originX,
              originY: element.originY,
              angle: element.angle,
              scaleX: element.scaleX,
              scaleY: element.scaleY,
              lockScalingFlip: true,
            });
            (img as any).isBarcode = true;
            (img as any).barcodeData = element.barcodeData;
            (img as any).barcodeDataNormalized = element.barcodeDataNormalized;
            (img as any).moduleWidth = element.moduleWidth;
            (img as any).barHeight = element.barHeight;
            (img as any).textHeight = element.textHeight;
            canvas.add(img);
          } else if (element.isImage && element.imageData) {
            // Regular image from base64
            const img = await FabricImage.fromURL(element.imageData);
            img.set({
              left: element.left,
              top: element.top,
              originX: element.originX,
              originY: element.originY,
              angle: element.angle,
              scaleX: element.scaleX,
              scaleY: element.scaleY,
              lockScalingFlip: true,
              lockUniScaling: true,
              objectCaching: false,
            });
            (img as any).imageSmoothing = false;
            (img as any).isImage = true;
            (img as any).zplImageData = element.zplImageData;
            (img as any).imageSource = element.imageData;
            canvas.add(img);
          }
        }
      }

      canvas.renderAll();
      setSelectedObject(null);
      toast.success('Label restored successfully');
    } catch (error) {
      console.error('Error importing JSON:', error);
      toast.error('Failed to import label file');
    }
  }, []);

  const handleApplyImport = useCallback(async (scene: ParsedScene) => {
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
      // Convert from printer dots to canvas pixels: workspace offset + element position
      const canvasX = 200 + element.x;
      const canvasY = 200 + element.y;

      switch (element.kind) {
        case 'text': {
          // Parse dimensions from ZPL export
          const fontWidth = element.data.fontWidth || element.data.fontSize;
          const fontHeight = element.data.fontHeight || element.data.fontSize;
          const textBlockWidth = element.data.textBlockWidth;
          
          // In ZPL export: ^A0[rotation],[exportFontHeight],[exportFontWidth]
          // where exportFontHeight = fontSize * scaleY, exportFontWidth = fontSize * scaleX
          // We reverse this: use fontHeight as base fontSize and calculate scales
          const baseFontSize = fontHeight;
          const scaleX = fontWidth / fontHeight;
          const scaleY = 1;
          
          // Create temporary text to measure actual dimensions
          const tempText = new IText(element.data.text, {
            fontSize: baseFontSize,
            fontFamily: element.data.fontFamily,
            fontWeight: element.data.fontWeight || 700,
            charSpacing: element.data.charSpacing || 27,
            scaleX: scaleX,
            scaleY: scaleY,
          }) as any;
          
          // Get the actual rendered dimensions
          const textWidth = textBlockWidth || Math.round((tempText.width || 0) * scaleX);
          const textHeight = Math.round(fontHeight);
          
          // Reverse the export position calculation
          // Export did: topLeftX = cx - textWidth/2, topLeftY = cy - textHeight/2 + baselineOffset
          // So: cx = topLeftX + textWidth/2, cy = topLeftY + textHeight/2 - baselineOffset
          const baselineOffset = Math.round(fontHeight * 0.15);
          const cx = element.x + Math.round(textWidth / 2);
          const cy = element.y + Math.round(textHeight / 2) - baselineOffset;
          
          // Convert to canvas coordinates (add workspace offset)
          const canvasX = 200 + cx;
          const canvasY = 200 + cy;
          
          const text = new IText(element.data.text, {
            fontSize: baseFontSize,
            fontFamily: element.data.fontFamily,
            fontWeight: element.data.fontWeight || 700,
            charSpacing: element.data.charSpacing || 27,
            fill: '#000000',
            textAlign: element.data.textAlign || 'center',
            originX: 'center',
            originY: 'center',
            left: canvasX,
            top: canvasY,
            angle: element.data.angle || 0,
            scaleX: scaleX,
            scaleY: scaleY,
            perPixelTargetFind: false,
            targetFindTolerance: 5,
          }) as any;

          // Store fontWidth and fontHeight properties for re-export
          text.fontWidth = fontWidth;
          text.fontHeight = fontHeight;
          
          // Ensure text is scalable
          text.lockScalingX = false;
          text.lockScalingY = false;

          // Determine if this is a dynamic text field (Text1, Text2, etc.) or fixed text
          const textContent = element.data.text;
          const isDynamicField = /^Text\d{1,2}$/.test(textContent);
          
          if (isDynamicField) {
            text.fieldName = textContent;
            text.isFixedText = false;
          } else {
            text.fieldName = "";
            text.isFixedText = true;
          }

          canvas.add(text);
          break;
        }

        case 'barcode': {
          // Create barcode using proper barcode generation for all types
          try {
            const value = element.data.value;
            const moduleWidth = element.data.moduleWidth || 2;
            const barHeight = element.data.height || 112;
            const orientation = element.data.orientation || 'N';
            const parsedType = element.data.type;
            
            // Map parsed type to BarcodeType
            let barcodeType: BarcodeType;
            let normalizedValue = value;
            
            if (parsedType === 'ean' || parsedType === 'ean13') {
              barcodeType = 'EAN_13';
              normalizedValue = calculateEAN13Checksum(value);
            } else if (parsedType === 'ean8') {
              barcodeType = 'EAN_8';
              normalizedValue = calculateEAN8Checksum(value);
            } else if (parsedType === 'code128') {
              barcodeType = 'CODE_128';
            } else if (parsedType === 'code39') {
              // Code 39 not supported yet, skip
              console.warn('Code 39 barcodes not yet supported for import, skipping');
              break;
            } else {
              // Default to EAN_13
              barcodeType = 'EAN_13';
              normalizedValue = calculateEAN13Checksum(value);
            }
            
            // Generate barcode preview using the universal function
            const barcodeImageUrl = await generateBarcodePreview(
              barcodeType,
              normalizedValue,
              moduleWidth,
              barHeight
            );
            const img = await FabricImage.fromURL(barcodeImageUrl);
            
            // Get actual image dimensions (these are pre-rotation dimensions)
            const imgWidth = img.width || 0;
            const imgHeight = img.height || 0;
            
            // Map orientation to angle
            let angle = 0;
            if (orientation === 'R') angle = 90;
            else if (orientation === 'I') angle = 180;
            else if (orientation === 'B') angle = 270;
            
            // During export, for rotated barcodes, dimensions are swapped in position calculation:
            // halfW = (rotated ? heightScaled : widthScaled) / 2
            // halfH = (rotated ? widthScaled : heightScaled) / 2
            // bx = cx - halfW, by = cy - halfH
            // 
            // To reverse: cx = bx + halfW, cy = by + halfH
            // Where halfW and halfH use the same swap logic as export
            let halfW, halfH;
            if (orientation === 'R' || orientation === 'B') {
              // Swapped: halfW uses height, halfH uses width
              halfW = Math.round(imgHeight / 2);
              halfH = Math.round(imgWidth / 2);
            } else {
              // Normal: halfW uses width, halfH uses height
              halfW = Math.round(imgWidth / 2);
              halfH = Math.round(imgHeight / 2);
            }
            
            const cx = element.x + halfW;
            const cy = element.y + halfH;
            
            img.set({
              left: 200 + cx,
              top: 200 + cy,
              originX: 'center',
              originY: 'center',
              angle: angle,
              scaleX: 1,
              scaleY: 1,
              lockScalingFlip: true,
              lockUniScaling: true,
            });

            // Store barcode metadata
            (img as any).isCode = true;
            (img as any).codeType = barcodeType;
            (img as any).codeData = normalizedValue;

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
            
            // Get QR dimensions
            const qrWidth = img.width || 0;
            const qrHeight = img.height || 0;
            
            // ZPL export: x = cx - width/2, y = cy - height/2
            // Calculate center from top-left position
            const cx = element.x + qrWidth / 2;
            const cy = element.y + qrHeight / 2;
            
            img.set({
              left: 200 + cx,
              top: 200 + cy,
              originX: 'center',
              originY: 'center',
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
          // ZPL export: x = cx - outerW/2, y = cy - outerH/2
          // So: cx = x + outerW/2, cy = y + outerH/2
          const cx = element.x + element.data.width / 2;
          const cy = element.y + element.data.height / 2;
          
          const ellipse = new Ellipse({
            left: 200 + cx,
            top: 200 + cy,
            rx: element.data.width / 2,
            ry: element.data.height / 2,
            fill: null,
            stroke: '#000000',
            strokeWidth: element.data.thickness || 1,
            originX: 'center',
            originY: 'center',
            perPixelTargetFind: true,
          });
          canvas.add(ellipse);
          break;
        }

        case 'box': {
          // ZPL export: x = cx - outerWidth/2, y = cy - outerHeight/2
          // So: cx = x + outerWidth/2, cy = y + outerHeight/2
          const cx = element.x + element.data.width / 2;
          const cy = element.y + element.data.height / 2;
          
          const box = new Rect({
            left: 200 + cx,
            top: 200 + cy,
            originX: 'center',
            originY: 'center',
            width: element.data.width,
            height: element.data.height,
            fill: null,
            stroke: '#000000',
            strokeWidth: element.data.thickness,
            perPixelTargetFind: true,
          });
          canvas.add(box);
          break;
        }

        case 'line': {
          const lineData = element.data;
          // Determine if horizontal or vertical based on dimensions
          const isHorizontal = lineData.width > lineData.thickness;
          
          // ZPL export: x = cx - gbWidth/2, y = cy - gbHeight/2
          // Calculate center from top-left position
          const cx = element.x + (isHorizontal ? lineData.width / 2 : lineData.thickness / 2);
          const cy = element.y + (isHorizontal ? lineData.thickness / 2 : lineData.height / 2);
          
          let line;
          if (isHorizontal) {
            // Horizontal line
            line = new Line(
              [0, 0, lineData.width, 0],
              {
                stroke: '#000000',
                strokeWidth: lineData.thickness,
                selectable: true,
                left: 200 + cx,
                top: 200 + cy,
                originX: 'center',
                originY: 'center',
              }
            );
          } else {
            // Vertical line
            line = new Line(
              [0, 0, 0, lineData.height],
              {
                stroke: '#000000',
                strokeWidth: lineData.thickness,
                selectable: true,
                left: 200 + cx,
                top: 200 + cy,
                originX: 'center',
                originY: 'center',
              }
            );
          }
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
  }, [generateBarcodeImage]);

  const handleClearAndExport = useCallback(() => {
    handleExport(false);
  }, [handleExport]);

  // Auto-adjust zoom to fit label based on size and DPI
  useEffect(() => {
    // Calculate label dimensions in pixels
    const labelWidthPx = Math.round(labelWidth * (dpi / 25.4));
    const labelHeightPx = Math.round(labelHeight * (dpi / 25.4));
    
    // Calculate ruler size (scales with DPI)
    const dpiScale = dpi / 203;
    const rulerSize = Math.max(20, Math.round(20 * dpiScale));
    
    // Total dimensions including rulers and workspace padding (200px on each side)
    const totalWidth = 200 + rulerSize + labelWidthPx + rulerSize + 200;
    const totalHeight = 200 + rulerSize + labelHeightPx + rulerSize + 200;
    
    // Get available viewport size (approximate - accounting for toolbars and panels)
    const viewportWidth = window.innerWidth - 192 - 350; // minus toolbar (192px) and properties panel (350px)
    const viewportHeight = window.innerHeight - 100; // minus settings panel (~100px)
    
    // Calculate zoom to fit with slightly tighter margin (95% of available space for closer view)
    const zoomToFitWidth = (viewportWidth * 0.95) / totalWidth;
    const zoomToFitHeight = (viewportHeight * 0.95) / totalHeight;
    
    // Use the smaller zoom to ensure everything fits
    const optimalZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 3); // Max zoom of 3
    const clampedZoom = Math.max(0.1, optimalZoom); // Min zoom of 0.1
    
    // Round to nearest 5% step (0.05 increments) for cleaner values
    const roundedZoom = Math.round(clampedZoom * 20) / 20;
    
    setZoom(roundedZoom);
  }, [dpi, labelWidth, labelHeight]);

  // Handle Enter behavior while editing canvas text (deletion handled inside LabelCanvas)
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helpers for QR rendering consistent with ZPL ^BQ - Memoized
  const getDefaultQrMagnification = useCallback((d: number) => {
    if (d === 203) return 2;
    if (d === 300) return 3;
    if (d === 600) return 6;
    return Math.max(1, Math.round(d / 100));
  }, []);

  // Generate a QR code image matching ZPL ^BQ sizing (module = magnification dots) - Memoized
  const generateQRCodeImage = useCallback(async (
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
  }, []);

  const addQrCode = useCallback(async (
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
  }, [dpi, getDefaultQrMagnification, generateQRCodeImage, getLabelCenter]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <SettingsPanel
        width={labelWidth}
        height={labelHeight}
        dpi={dpi}
        rotate180={rotate180}
        labelName={labelName}
        onLabelNameChange={setLabelName}
        onWidthChange={setLabelWidth}
        onHeightChange={setLabelHeight}
        onDpiChange={setDpi}
        onRotate180Change={setRotate180}
        onExport={handleExport}
        onPrint={handlePrint}
        onZplPdfPrint={handleZplPdfPrint}
        onShowPrintOptions={() => setShowPrintOptionsDialog(true)}
        onDownloadJson={handleDownloadJson}
        onUploadJson={handleUploadJson}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar 
          onAddElement={addElement} 
          onClear={handleClear} 
          zoom={zoom} 
          onZoomChange={setZoom}
          onOpenTextCategory={() => setShowTextCategoryDialog(true)}
          onExport={handleExport}
        />
        <div className="flex-1 relative mr-72">
          <LabelCanvas
            width={labelWidth}
            height={labelHeight}
            dpi={dpi}
            zoom={zoom}
            onZoomChange={setZoom}
            onSelectionChange={setSelectedObject}
            textCounter={textCounter}
            onIncrementTextCounter={() => setTextCounter(textCounter + 1)}
            onBarcodeDoubleClick={handleBarcodeDoubleClick}
            onCodeDoubleClick={handleCodeDoubleClick}
          />
        </div>
        <div className="fixed right-0 top-[140px] bottom-0 z-10">
          <PropertiesPanel 
            selectedObject={selectedObject} 
            onTypeChange={() => setTypeChangeCounter(prev => prev + 1)}
          />
        </div>
      </div>

      <CodeCategoryDialog
        open={showCodeCategoryDialog}
        onClose={() => setShowCodeCategoryDialog(false)}
        onSelectCategory={handleCodeCategorySelect}
      />

      <CodeDataDialog
        open={showCodeDataDialog}
        onClose={() => setShowCodeDataDialog(false)}
        onConfirm={addCode}
        codeType={selectedCodeType}
        dpi={dpi}
      />

      <CodeDataDialog
        open={showCodeEditDialog}
        onClose={() => {
          setShowCodeEditDialog(false);
          setEditingCodeObject(null);
        }}
        onConfirm={updateCodeData}
        codeType={editingCodeObject?.codeType || ""}
        initialValue={editingCodeObject?.codeData}
        initialSize={editingCodeObject?.codeSize || editingCodeObject?.barcodeParams?.size}
        initialHeight={editingCodeObject?.codeHeight || editingCodeObject?.barcodeParams?.heightDots}
        dpi={dpi}
      />

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

      <BarcodeDialog
        open={showBarcodeEditDialog}
        onClose={() => {
          setShowBarcodeEditDialog(false);
          setEditingBarcodeObject(null);
        }}
        onConfirm={updateBarcodeData}
        initialValue={editingBarcodeObject?.barcodeData || editingBarcodeObject?.barcodeDataNormalized}
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

      <NetworkPrinterDialog
        open={showNetworkDialog}
        onClose={() => setShowNetworkDialog(false)}
        zplCode={printZplCode}
      />

      <WebUsbPrinterDialog
        open={showWebUsbDialog}
        onClose={() => setShowWebUsbDialog(false)}
        zplCode={printZplCode}
      />

      <PrinterSelectionDialog
        open={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onPrint={(printer) => {
          console.log("Printed to:", printer.name);
        }}
        zplCode={printZplCode}
      />

      <PrintWarningDialog
        open={showPrintWarning}
        onOpenChange={setShowPrintWarning}
        onConfirm={executePrint}
      />

      <HighQualityPrintDialog
        open={showHighQualityPrintWarning}
        onOpenChange={setShowHighQualityPrintWarning}
        onConfirm={executeZplPdfPrint}
        labelWidth={labelWidth}
        labelHeight={labelHeight}
      />

      <PrintOptionsDialog
        open={showPrintOptionsDialog}
        onClose={() => setShowPrintOptionsDialog(false)}
        onPrintWindowsMac={handleZplPdfPrint}
        onPrintOnPort={handlePrintOnPort}
      />

      <PrintOnPortDialog
        open={showPrintOnPortDialog}
        onClose={() => setShowPrintOnPortDialog(false)}
        onGetZpl={getZplForPrinting}
      />

      <PrintFallbackDialog
        open={showFallbackDialog}
        onClose={() => setShowFallbackDialog(false)}
        onDownloadZpl={handleDownloadZpl}
        onVisualPrint={handleVisualPrint}
      />

      <TextCategoryDialog
        open={showTextCategoryDialog}
        onClose={() => setShowTextCategoryDialog(false)}
        onSelectCategory={handleTextCategorySelect}
      />

      <LabelNameRequiredDialog
        open={showLabelNameRequired}
        onOpenChange={setShowLabelNameRequired}
      />
    </div>
  );
};

export default Index;
