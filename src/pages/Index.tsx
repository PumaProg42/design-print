import { useState, useEffect, useCallback, useMemo } from "react";
import { FabricObject, IText, Textbox, Rect, Line, Ellipse, FabricImage, Group } from "fabric";
import * as fabric from "fabric";
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
import { RectangleTypeDialog } from "@/components/RectangleTypeDialog";
import { CreateTableDialog } from "@/components/CreateTableDialog";
import { CellActionDialog } from "@/components/CellActionDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateBarcode } from "@/utils/labelaryApi";

const Index = () => {
  const [labelWidth, setLabelWidth] = useState(100); // mm
  const [labelHeight, setLabelHeight] = useState(50); // mm
  const [dpi, setDpi] = useState(203);
  const [zoom, setZoom] = useState(1);
  const [rotate180, setRotate180] = useState(false);
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
  const [showRectangleTypeDialog, setShowRectangleTypeDialog] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showCellActionDialog, setShowCellActionDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ table: any; row: number; col: number } | null>(null);
  const [selectedTableCells, setSelectedTableCells] = useState<{
    table: any;
    type: 'cell' | 'row' | 'column';
    row?: number;
    col?: number;
  } | null>(null);

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
    } else if (type === "table") {
      setShowCreateTableDialog(true);
      return;
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

  const createTable = useCallback((rows: number, columns: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const center = getLabelCenter();
    const cellWidth = Math.round(80 * (dpi / 203));
    const cellHeight = Math.round(40 * (dpi / 203));
    const strokeWidth = Math.round(2 * (dpi / 203));
    
    const tableWidth = cellWidth * columns;
    const tableHeight = cellHeight * rows;

    // Create all elements first
    const elements: FabricObject[] = [];

    // Create outer border
    const outerRect = new Rect({
      left: -tableWidth / 2,
      top: -tableHeight / 2,
      width: tableWidth,
      height: tableHeight,
      fill: null,
      stroke: "#000",
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
    });
    elements.push(outerRect);

    // Create grid lines - Vertical lines
    for (let i = 1; i < columns; i++) {
      const x = -tableWidth / 2 + i * cellWidth;
      const line = new Line(
        [x, -tableHeight / 2, x, tableHeight / 2],
        {
          stroke: "#000",
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      elements.push(line);
    }

    // Horizontal lines
    for (let i = 1; i < rows; i++) {
      const y = -tableHeight / 2 + i * cellHeight;
      const line = new Line(
        [-tableWidth / 2, y, tableWidth / 2, y],
        {
          stroke: "#000",
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      elements.push(line);
    }

    // Create table group
    const tableGroup = new Group(elements, {
      left: center.x,
      top: center.y,
      originX: "center",
      originY: "center",
      lockRotation: true,
    }) as any;

    // Store table metadata
    tableGroup.isTable = true;
    tableGroup.customId = `table_${Date.now()}`;
    tableGroup.tableRows = rows;
    tableGroup.tableColumns = columns;
    tableGroup.tableCellWidth = cellWidth;
    tableGroup.tableCellHeight = cellHeight;
    tableGroup.tableCells = {};

    canvas.add(tableGroup);
    canvas.setActiveObject(tableGroup);
    canvas.renderAll();
    
    toast.success(`Table created: ${rows}×${columns}`);
  }, [dpi, getLabelCenter]);

  const rebuildTable = useCallback((table: any) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const cellWidth = table.tableCellWidth;
    const cellHeight = table.tableCellHeight;
    const strokeWidth = Math.round(2 * (dpi / 203));
    const tableWidth = cellWidth * table.tableColumns;
    const tableHeight = cellHeight * table.tableRows;

    // Get current table position and properties
    const tableLeft = table.left || 0;
    const tableTop = table.top || 0;
    const tableScaleX = table.scaleX || 1;
    const tableScaleY = table.scaleY || 1;
    const tableAngle = table.angle || 0;
    const customId = table.customId;

    // Remove old table
    canvas.remove(table);

    // Create new elements
    const elements: FabricObject[] = [];

    // Recreate outer border
    const outerRect = new Rect({
      left: -tableWidth / 2,
      top: -tableHeight / 2,
      width: tableWidth,
      height: tableHeight,
      fill: null,
      stroke: "#000",
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
    });
    elements.push(outerRect);

    // Recreate vertical lines
    for (let i = 1; i < table.tableColumns; i++) {
      const x = -tableWidth / 2 + i * cellWidth;
      const line = new Line(
        [x, -tableHeight / 2, x, tableHeight / 2],
        {
          stroke: "#000",
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      elements.push(line);
    }

    // Recreate horizontal lines
    for (let i = 1; i < table.tableRows; i++) {
      const y = -tableHeight / 2 + i * cellHeight;
      const line = new Line(
        [-tableWidth / 2, y, tableWidth / 2, y],
        {
          stroke: "#000",
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        }
      );
      elements.push(line);
    }

    // Re-add all text objects with updated positions
    if (table.tableCells) {
      Object.values(table.tableCells).forEach((cell: any) => {
        if (cell && cell.textObject) {
          const cellX = -tableWidth / 2 + cell.col * cellWidth + cellWidth / 2;
          const cellY = -tableHeight / 2 + cell.row * cellHeight + cellHeight / 2;
          cell.textObject.set({
            left: cellX,
            top: cellY,
          });
          elements.push(cell.textObject);
        }
      });
    }

    // Create new table group
    const newTable = new Group(elements, {
      left: tableLeft,
      top: tableTop,
      originX: "center",
      originY: "center",
      scaleX: tableScaleX,
      scaleY: tableScaleY,
      angle: tableAngle,
      lockRotation: true,
    }) as any;

    // Restore metadata
    newTable.isTable = true;
    newTable.tableRows = table.tableRows;
    newTable.tableColumns = table.tableColumns;
    newTable.tableCellWidth = cellWidth;
    newTable.tableCellHeight = cellHeight;
    newTable.tableCells = table.tableCells || {};
    if (customId) {
      newTable.customId = customId;
    }

    canvas.add(newTable);
    canvas.setActiveObject(newTable);
    canvas.renderAll();
  }, [dpi]);

  const addTextToCell = useCallback((table: any, row: number, col: number, textType: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const cellId = `${row}-${col}`;
    let cellWidth = table.tableCellWidth;
    let cellHeight = table.tableCellHeight;
    
    // Calculate cell position relative to table center
    let tableWidth = cellWidth * table.tableColumns;
    let tableHeight = cellHeight * table.tableRows;
    let cellX = -tableWidth / 2 + col * cellWidth + cellWidth / 2;
    let cellY = -tableHeight / 2 + row * cellHeight + cellHeight / 2;

    // Remove existing text in this cell if any
    if (table.tableCells[cellId]?.textObject) {
      const existingText = table.tableCells[cellId].textObject;
      const items = table._objects || [];
      const index = items.indexOf(existingText);
      if (index > -1) {
        items.splice(index, 1);
      }
    }

    // Start with a reasonable font size
    let fontSize = Math.min(Math.round(cellHeight * 0.6), Math.round(20 * (dpi / 72)));
    
    const textField = new IText(textType, {
      left: cellX,
      top: cellY,
      originX: "center",
      originY: "center",
      fontSize,
      fill: "#000",
      fontFamily: "'Swiss 721 Bold Condensed', 'Roboto Condensed', Oswald, 'Arial Narrow', sans-serif",
      fontWeight: 700,
      charSpacing: 27,
      lineHeight: 1,
      selectable: false,
      evented: false,
      perPixelTargetFind: false,
      targetFindTolerance: 5,
    }) as any;

    // Check if text fits in cell
    const textWidth = (textField.width || 0) * textField.scaleX;
    const textHeight = (textField.height || 0) * textField.scaleY;
    const padding = 8;

    let needsResize = false;
    
    // If text doesn't fit, expand the cell (and thus the column/row)
    if (textWidth + padding * 2 > cellWidth) {
      cellWidth = textWidth + padding * 2;
      table.tableCellWidth = cellWidth;
      needsResize = true;
    }
    
    if (textHeight + padding * 2 > cellHeight) {
      cellHeight = textHeight + padding * 2;
      table.tableCellHeight = cellHeight;
      needsResize = true;
    }

    if (needsResize) {
      // Recalculate positions with new cell sizes
      tableWidth = cellWidth * table.tableColumns;
      tableHeight = cellHeight * table.tableRows;
      cellX = -tableWidth / 2 + col * cellWidth + cellWidth / 2;
      cellY = -tableHeight / 2 + row * cellHeight + cellHeight / 2;
      textField.set({ left: cellX, top: cellY });
      
      toast.info("Table expanded to fit text");
    }

    textField.fieldName = textType;
    textField.textInstanceName = `${textType}_cell_${cellId}`;

    // Store cell data
    table.tableCells[cellId] = {
      row,
      col,
      textType,
      textObject: textField,
    };

    // Add to group's objects array
    if (!table._objects) {
      table._objects = [];
    }
    table._objects.push(textField);
    
    // Rebuild table to update all cell positions if resized
    if (needsResize) {
      rebuildTable(table);
    } else {
      canvas.renderAll();
    }
    
    toast.success(`Text added to cell (${row + 1}, ${col + 1})`);
  }, [dpi, rebuildTable]);

  const deleteTableRow = useCallback((table: any, row: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas || table.tableRows <= 1) {
      toast.error("Cannot delete the last row");
      return;
    }

    // Remove all text objects in this row from the group
    for (let col = 0; col < table.tableColumns; col++) {
      const cellId = `${row}-${col}`;
      if (table.tableCells[cellId]?.textObject) {
        const textObj = table.tableCells[cellId].textObject;
        const items = table._objects || [];
        const index = items.indexOf(textObj);
        if (index > -1) {
          items.splice(index, 1);
        }
        delete table.tableCells[cellId];
      }
    }

    // Shift rows below up
    const newCells: any = {};
    Object.keys(table.tableCells).forEach((key) => {
      const [r, c] = key.split('-').map(Number);
      if (r < row) {
        newCells[key] = table.tableCells[key];
      } else if (r > row) {
        const newKey = `${r - 1}-${c}`;
        const cell = table.tableCells[key];
        cell.row = r - 1;
        newCells[newKey] = cell;
      }
    });
    table.tableCells = newCells;
    table.tableRows--;

    // Recreate table visual structure
    rebuildTable(table);
    toast.success("Row deleted");
  }, [rebuildTable]);

  const deleteTableColumn = useCallback((table: any, col: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas || table.tableColumns <= 1) {
      toast.error("Cannot delete the last column");
      return;
    }

    // Remove all text objects in this column from the group
    for (let row = 0; row < table.tableRows; row++) {
      const cellId = `${row}-${col}`;
      if (table.tableCells[cellId]?.textObject) {
        const textObj = table.tableCells[cellId].textObject;
        const items = table._objects || [];
        const index = items.indexOf(textObj);
        if (index > -1) {
          items.splice(index, 1);
        }
        delete table.tableCells[cellId];
      }
    }

    // Shift columns right to left
    const newCells: any = {};
    Object.keys(table.tableCells).forEach((key) => {
      const [r, c] = key.split('-').map(Number);
      if (c < col) {
        newCells[key] = table.tableCells[key];
      } else if (c > col) {
        const newKey = `${r}-${c - 1}`;
        const cell = table.tableCells[key];
        cell.col = c - 1;
        newCells[newKey] = cell;
      }
    });
    table.tableCells = newCells;
    table.tableColumns--;

    // Recreate table visual structure
    rebuildTable(table);
    toast.success("Column deleted");
  }, [rebuildTable]);

  const addTableRow = useCallback((table: any, afterRow: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas || table.tableRows >= 10) {
      toast.error("Maximum 10 rows allowed");
      return;
    }

    // Shift rows below down
    const newCells: any = {};
    Object.keys(table.tableCells).forEach((key) => {
      const [r, c] = key.split('-').map(Number);
      if (r <= afterRow) {
        newCells[key] = table.tableCells[key];
      } else {
        const newKey = `${r + 1}-${c}`;
        const cell = table.tableCells[key];
        cell.row = r + 1;
        newCells[newKey] = cell;
      }
    });
    table.tableCells = newCells;
    table.tableRows++;

    // Recreate table visual structure
    rebuildTable(table);
    canvas.renderAll();
    toast.success("Row added");
  }, [rebuildTable]);

  const addTableColumn = useCallback((table: any, afterCol: number) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas || table.tableColumns >= 10) {
      toast.error("Maximum 10 columns allowed");
      return;
    }

    // Shift columns right
    const newCells: any = {};
    Object.keys(table.tableCells).forEach((key) => {
      const [r, c] = key.split('-').map(Number);
      if (c <= afterCol) {
        newCells[key] = table.tableCells[key];
      } else {
        const newKey = `${r}-${c + 1}`;
        const cell = table.tableCells[key];
        cell.col = c + 1;
        newCells[newKey] = cell;
      }
    });
    table.tableCells = newCells;
    table.tableColumns++;

    // Recreate table visual structure
    rebuildTable(table);
    canvas.renderAll();
    toast.success("Column added");
  }, [rebuildTable]);

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

  const addCode = useCallback(async (data: string) => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Generate barcode image using Labelary API
      const { imageDataUrl, zpl } = await generateBarcode(
        selectedCodeType as any,
        data,
        selectedCodeType === "qrcode" ? 5 : 3, // QR at 5, others at 3
        50 // height (ydim) for linear barcodes - reduced by 50% again
      );

      // Create Fabric image
      const img = await FabricImage.fromURL(imageDataUrl);
      const center = getLabelCenter();

      img.set({
        left: center.x,
        top: center.y,
        originX: "center",
        originY: "center",
        scaleX: 1,
        scaleY: 1,
        lockScalingFlip: true,
        lockUniScaling: false,
      });

      // Convert PNG to ZPL graphic (like IMAGE element)
      const imgWidth = img.width || 0;
      const imgHeight = img.height || 0;
      const { zpl: zplGraphic } = await convertImageToZplGFA(
        imageDataUrl,
        dpi,
        imgWidth,
        imgHeight
      );

      // Store metadata (treat as image for export)
      (img as any).isCode = true;
      (img as any).codeType = selectedCodeType;
      (img as any).codeData = data;
      (img as any).imageSource = imageDataUrl; // Store PNG for regeneration
      (img as any).zplImageData = zplGraphic; // Store ZPL graphic command

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

  const updateCodeData = useCallback(async (newData: string) => {
    if (!editingCodeObject) return;

    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    try {
      // Generate new barcode image
      const { imageDataUrl, zpl } = await generateBarcode(
        editingCodeObject.codeType as any,
        newData,
        editingCodeObject.codeType === "qrcode" ? 5 : 3, // QR at 5, others at 3
        50 // height (ydim) for linear barcodes - reduced by 50% again
      );

      // Store current object properties
      const currentLeft = editingCodeObject.left;
      const currentTop = editingCodeObject.top;
      const currentScaleX = editingCodeObject.scaleX;
      const currentScaleY = editingCodeObject.scaleY;
      const currentAngle = editingCodeObject.angle;

      // Remove old code
      canvas.remove(editingCodeObject);

      // Create new code image
      const img = await FabricImage.fromURL(imageDataUrl);
      
      img.set({
        left: currentLeft,
        top: currentTop,
        originX: "center",
        originY: "center",
        scaleX: currentScaleX,
        scaleY: currentScaleY,
        angle: currentAngle,
        lockScalingFlip: true,
        lockUniScaling: false,
      });

      // Convert PNG to ZPL graphic (like IMAGE element)
      const imgWidth = img.width || 0;
      const imgHeight = img.height || 0;
      const scaledWidth = Math.round(imgWidth * currentScaleX);
      const scaledHeight = Math.round(imgHeight * currentScaleY);
      const { zpl: zplGraphic } = await convertImageToZplGFA(
        imageDataUrl,
        dpi,
        scaledWidth,
        scaledHeight
      );

      // Store metadata (treat as image for export)
      (img as any).isCode = true;
      (img as any).codeType = editingCodeObject.codeType;
      (img as any).codeData = newData;
      (img as any).imageSource = imageDataUrl; // Store PNG for regeneration
      (img as any).zplImageData = zplGraphic; // Store ZPL graphic command

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

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

  const handleExport = useCallback((withValues: boolean) => {
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
  }, [dpi, labelWidth, labelHeight, rotate180]);

  const handlePrint = useCallback(() => {
    // Check if user wants to skip the warning
    const hideWarning = localStorage.getItem("hidePrintWarning") === "true";
    
    if (!hideWarning) {
      setShowPrintWarning(true);
      return;
    }

    executePrint();
  }, []);

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
      // Generate ZPL code using current settings
      const zplCode = generateZPL(canvas, {
        dpi,
        width: labelWidth,
        height: labelHeight,
        withValues: true,
        rotate180,
      });

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
    // Check if user wants to skip the warning
    const hideWarning = localStorage.getItem("hideHighQualityPrintWarning") === "true";
    
    if (!hideWarning) {
      setShowHighQualityPrintWarning(true);
      return;
    }

    executeZplPdfPrint();
  }, [executeZplPdfPrint]);

  const getZplForPrinting = useCallback(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return "";
    
    return generateZPL(canvas, {
      dpi,
      width: labelWidth,
      height: labelHeight,
      withValues: false,
      rotate180,
    });
  }, [dpi, labelWidth, labelHeight, rotate180]);

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
    if (activeObject && (activeObject as any).name !== "labelBoundary") {
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

    // Check if we're adding text to a cell
    if (selectedCell) {
      const { table, row, col } = selectedCell;
      
      // Get field name based on category
      let fieldName = "";
      if (category === "Date & Time" || category === "Nutrition & Energy Values" || category === "Weight & Price" || category === "Multiline Text") {
        const nextFieldName = getNextAvailableFieldName(category, canvas);
        if (!nextFieldName) {
          toast.error(`All ${category} fields are already used on this label.`);
          setSelectedCell(null);
          return;
        }
        fieldName = nextFieldName;
      } else {
        fieldName = category;
      }
      
      addTextToCell(table, row, col, fieldName);
      setSelectedCell(null);
      setShowCellActionDialog(false);
      return;
    }

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
    
    textField.lockScalingX = false;
    textField.lockScalingY = false;

    canvas.add(textField);
    canvas.setActiveObject(textField);
    setSelectedObject(textField as unknown as FabricObject);
    canvas.renderAll();
    
    setTextCounter(textCounter + 1);
  }, [dpi, getLabelCenter, textCounter, getNextAvailableFieldName, selectedCell, addTextToCell]);

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
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error parsing ZPL:', error);
      toast.error('Failed to parse ZPL file');
    }
  }, [dpi]);

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
          // Create text with base properties to measure dimensions
          const fontWidth = element.data.fontWidth || element.data.fontSize;
          const fontHeight = element.data.fontHeight || element.data.fontSize;
          
          const text = new IText(element.data.text, {
            fontSize: element.data.fontSize,
            fontFamily: element.data.fontFamily,
            fontWeight: element.data.fontWeight || 700,
            charSpacing: element.data.charSpacing || 27,
            fill: '#000000',
            angle: 0,
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            perPixelTargetFind: false, // Full bounding box is clickable
            targetFindTolerance: 5, // Easier click detection
          }) as any;

          // Store fontWidth and fontHeight properties
          text.fontWidth = fontWidth;
          text.fontHeight = fontHeight;
          
          // Ensure text is scalable
          text.lockScalingX = false;
          text.lockScalingY = false;

          // Measure dimensions similar to export logic
          const scaleX = (text.scaleX || 1);
          const scaleY = (text.scaleY || 1);
          const textWidth = Math.round((text.width || 0) * scaleX);
          const textHeight = Math.max(1, Math.round(fontHeight));
          const baseOffset = Math.round(fontHeight * 0.15);

          // Reverse export mapping to get center from ^FO position
          const rotation = element.data.rotation || 'N';
          let cx = element.x; // in printer dots
          let cy = element.y;

          if (rotation === 'N') {
            cx = element.x + Math.round(textWidth / 2);
            cy = element.y + Math.round(textHeight / 2) - baseOffset;
          } else if (rotation === 'R') {
            cx = element.x + Math.round(textHeight / 2) - baseOffset;
            cy = element.y + Math.round(textWidth / 2);
          } else if (rotation === 'I') {
            cx = element.x + Math.round(textWidth / 2);
            cy = element.y + Math.round(textHeight / 2) + baseOffset;
          } else if (rotation === 'B') {
            cx = element.x + Math.round(textHeight / 2) + baseOffset;
            cy = element.y + Math.round(textWidth / 2);
          }

          // Place by center with workspace offset and apply angle
          text.set({
            originX: 'center',
            originY: 'center',
            left: 200 + cx,
            top: 200 + cy,
            angle: element.data.angle || 0,
          });

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
          // Create actual barcode using the app's barcode generation function
          try {
            const value = element.data.value;
            const moduleWidth = element.data.moduleWidth || 2;
            const barHeight = element.data.height || 112;
            // Calculate text height proportional to module width (for proper scaling)
            const textHeight = Math.max(10, Math.round(moduleWidth * 9));
            const barcodeImageUrl = await generateBarcodeImage(value, { moduleWidth, barHeight, textHeight });
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

            // Apply orientation rotation
            const orient = element.data.orientation || 'N';
            let angle = 0;
            if (orient === 'R') angle = 90;
            else if (orient === 'I') angle = 180;
            else if (orient === 'B') angle = 270;
            img.set({ angle });

            (img as any).isBarcode = true;
            (img as any).barcodeData = value;
            (img as any).barcodeDataNormalized = value;
            (img as any).moduleWidth = moduleWidth;
            (img as any).barHeight = barHeight;
            (img as any).textHeight = textHeight;

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
          const ellipse = new Ellipse({
            left: canvasX + element.data.width / 2,
            top: canvasY + element.data.height / 2,
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
          const box = new Rect({
            left: canvasX + element.data.width / 2,
            top: canvasY + element.data.height / 2,
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
          
          let line;
          if (isHorizontal) {
            // Horizontal line
            line = new Line(
              [0, 0, lineData.width, 0],
              {
                stroke: '#000000',
                strokeWidth: lineData.thickness,
                selectable: true,
                left: canvasX + lineData.width / 2,
                top: canvasY + lineData.thickness / 2,
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
                left: canvasX + lineData.thickness / 2,
                top: canvasY + lineData.height / 2,
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
  }, [selectedObject, handleDelete]);

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
        onWidthChange={setLabelWidth}
        onHeightChange={setLabelHeight}
        onDpiChange={setDpi}
        onRotate180Change={setRotate180}
        onExport={handleExport}
        onPrint={handlePrint}
        onZplPdfPrint={handleZplPdfPrint}
        onShowPrintOptions={() => setShowPrintOptionsDialog(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbar 
          onAddElement={addElement} 
          onClear={handleClear} 
          zoom={zoom} 
          onZoomChange={setZoom}
          onUploadZpl={handleUploadZpl}
          onOpenTextCategory={() => setShowTextCategoryDialog(true)}
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
            onTableCellClick={(table: any, row: number, col: number, modifierKey?: 'row' | 'column') => {
              if (modifierKey === 'row') {
                setSelectedTableCells({ table, type: 'row', row });
                setSelectedCell({ table, row, col });
              } else if (modifierKey === 'column') {
                setSelectedTableCells({ table, type: 'column', col });
                setSelectedCell({ table, row, col });
              } else {
                setSelectedTableCells({ table, type: 'cell', row, col });
                setSelectedCell({ table, row, col });
              }
            }}
            onTableCellDoubleClick={(table: any, row: number, col: number) => {
              setSelectedCell({ table, row, col });
              setShowTextCategoryDialog(true);
            }}
            onTableCellContextMenu={(table: any, row: number, col: number) => {
              setSelectedCell({ table, row, col });
              setSelectedTableCells({ table, type: 'cell', row, col });
              setShowCellActionDialog(true);
            }}
            onAddRowToTable={(table: any, afterRow?: number) => {
              addTableRow(table, afterRow ?? table.tableRows - 1);
            }}
            onAddColumnToTable={(table: any, afterCol?: number) => {
              addTableColumn(table, afterCol ?? table.tableColumns - 1);
            }}
            selectedTableCells={selectedTableCells}
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
        onPrintOnPort={() => setShowPrintOnPortDialog(true)}
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

      <CreateTableDialog
        open={showCreateTableDialog}
        onClose={() => setShowCreateTableDialog(false)}
        onCreate={createTable}
      />

      <CellActionDialog
        open={showCellActionDialog}
        onClose={() => {
          setShowCellActionDialog(false);
          setSelectedCell(null);
          setSelectedTableCells(null);
        }}
        onAddText={() => {
          setShowCellActionDialog(false);
          setShowTextCategoryDialog(true);
        }}
        onDeleteText={() => {
          if (selectedCell) {
            const { table, row, col } = selectedCell;
            const cellId = `${row}-${col}`;
            
            if (table.tableCells[cellId]?.textObject) {
              const textObj = table.tableCells[cellId].textObject;
              const items = table._objects || [];
              const index = items.indexOf(textObj);
              if (index > -1) {
                items.splice(index, 1);
              }
              delete table.tableCells[cellId];
              
              const canvas = (window as any).fabricCanvas;
              canvas?.renderAll();
              toast.success("Text deleted from cell");
            }
            
            setShowCellActionDialog(false);
            setSelectedCell(null);
            setSelectedTableCells(null);
          }
        }}
        onDeleteRow={() => {
          if (selectedTableCells?.type === 'row' && selectedTableCells.row !== undefined && selectedTableCells.table) {
            deleteTableRow(selectedTableCells.table, selectedTableCells.row);
            setShowCellActionDialog(false);
            setSelectedCell(null);
            setSelectedTableCells(null);
          }
        }}
        onDeleteColumn={() => {
          if (selectedTableCells?.type === 'column' && selectedTableCells.col !== undefined && selectedTableCells.table) {
            deleteTableColumn(selectedTableCells.table, selectedTableCells.col);
            setShowCellActionDialog(false);
            setSelectedCell(null);
            setSelectedTableCells(null);
          }
        }}
        cellPosition={selectedCell ? { row: selectedCell.row, col: selectedCell.col } : undefined}
        showRowActions={selectedTableCells?.type === 'row'}
        showColumnActions={selectedTableCells?.type === 'column'}
        showCellActions={selectedTableCells?.type === 'cell' || !selectedTableCells}
      />
    </div>
  );
};

export default Index;
