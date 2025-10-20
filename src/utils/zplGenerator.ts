import { FabricObject, IText, Rect, Line, Ellipse, FabricImage } from "fabric";

interface ZPLGeneratorOptions {
  dpi: number;
  width: number;
  height: number;
  withValues: boolean;
  rotate180?: boolean;
}

export const generateZPL = (
  canvas: any,
  options: ZPLGeneratorOptions
): string => {
  const { dpi, width, height, withValues, rotate180 } = options;

  // ZPL Header with DPI comment for import detection
  let zpl = "^XA\n";
  zpl += `^FX DPI:${dpi}\n`; // Comment for DPI detection on import
  
  // Add rotation command if enabled
  if (rotate180) {
    zpl += "^POI\n";
  }
  
  zpl += `^PW${Math.round((width * dpi) / 25.4)}\n`; // Print width in dots
  zpl += `^LL${Math.round((height * dpi) / 25.4)}\n`; // Label length in dots

  const objects = canvas.getObjects();
  
  // Calculate boundary offset - elements are positioned relative to workspace padding
  const boundary = objects.find((o: any) => o.name === 'labelBoundary') as any;
  const boundaryLeft = boundary?.left ?? 200;
  const boundaryTop = boundary?.top ?? 200;

  objects.forEach((obj: FabricObject) => {
    // Skip the label boundary
    if ((obj as any).name === "labelBoundary") return;

    // Canvas shows elements with small coordinates relative to label
    // Subtract the boundary offset to get printer dot positions
    const left = Math.round((obj.left || 0) - boundaryLeft);
    const top = Math.round((obj.top || 0) - boundaryTop);

    if (obj.type === "i-text") {
      const textObj = obj as IText;
      // Font size is already at correct scale on canvas
      const fontSize = Math.round((textObj.fontSize || 20));
      const text = textObj.text || "";
      const fieldName = (textObj as any).fieldName || "";
      const rotation = Math.round(textObj.angle || 0);
      
      // Export with Field Names = actual visible text content (e.g., marko, mario)
      // Export with Values = Text Type names without braces (e.g., Text1, Text5)
      // Fixed text always exports actual content regardless of withValues
      const isFixedText = (textObj as any).isFixedText || false;
      let content: string;
      if (isFixedText) {
        // Fixed text always exports actual content
        content = text;
      } else if (fieldName && fieldName.match(/^Text\d{1,2}$/)) {
        // Dynamic text: Values = fieldName, Field Names = actual text
        content = withValues ? fieldName : text;
      } else {
        content = text;
      }

      // Handle rotation (0=N, 90=R, 180=I, 270=B)
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      // Effective font dimensions match the Properties panel exactly
      const effectiveFontWidth = (textObj as any)._scalingFontWidth ?? (textObj as any).fontWidth ?? Math.round(fontSize * (textObj.scaleX || 1));
      const effectiveFontHeight = (textObj as any)._scalingFontHeight ?? (textObj as any).fontHeight ?? Math.round(fontSize * (textObj.scaleY || 1));
      
      const scaleX = textObj.scaleX || 1;
      const scaleY = textObj.scaleY || 1;

      // Compute center-based coordinates for 1:1 mapping with workspace
      const center = (textObj as any).getCenterPoint
        ? (textObj as any).getCenterPoint()
        : {
            x: (textObj.left || 0) + (((textObj as any).getScaledWidth?.() as number) || ((textObj.width || 0) * (scaleX || 1))) / 2,
            y: (textObj.top || 0) + (((textObj as any).getScaledHeight?.() as number) || ((textObj.height || 0) * (scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      // Unrotated text dimensions
      const textWidth = Math.round((textObj.width || 0) * scaleX);
      const textHeight = Math.max(1, Math.round(effectiveFontHeight));

      // Baseline compensation (applies along text height axis)
      const baseOffset = Math.round(effectiveFontHeight * 0.15);

      // Convert center point to ^FO origin per ZPL orientation so printed text
      // remains centered exactly where it is in the workspace
      let adjustedLeft = cx;
      let adjustedTop = cy;

      if (rotationCode === "N") {
        adjustedLeft = cx - Math.round(textWidth / 2);
        adjustedTop = cy - Math.round(textHeight / 2) + baseOffset;
      } else if (rotationCode === "R") {
        // Width/height swap when rotated 90°
        adjustedLeft = cx - Math.round(textHeight / 2) + baseOffset; // baseline along X
        adjustedTop = cy - Math.round(textWidth / 2);
      } else if (rotationCode === "I") {
        adjustedLeft = cx - Math.round(textWidth / 2);
        adjustedTop = cy - Math.round(textHeight / 2) - baseOffset;
      } else if (rotationCode === "B") {
        adjustedLeft = cx - Math.round(textHeight / 2) - baseOffset; // baseline along -X
        adjustedTop = cy - Math.round(textWidth / 2);
      }

      zpl += `^FO${adjustedLeft},${adjustedTop}\n`;
      zpl += `^A0${rotationCode},${effectiveFontWidth},${effectiveFontHeight}\n`;
      zpl += `^FD${content}^FS\n`;
    } else if (obj.type === "rect") {
      const rect = obj as Rect;
      // Dimensions are already at printer DPI scale
      const width = Math.round((rect.width || 0) * (rect.scaleX || 1));
      const height = Math.round((rect.height || 0) * (rect.scaleY || 1));
      const thickness = Math.round((rect.strokeWidth || 1));

      // Convert center-based position to ^FO top-left
      const center = (rect as any).getCenterPoint ? (rect as any).getCenterPoint() : { x: (rect.left || 0), y: (rect.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(width / 2);
      const y = cy - Math.round(height / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GB${width},${height},${thickness}^FS\n`;
    } else if (obj.type === "line") {
      const line = obj as Line;
      // Use scaled dimensions for accurate ZPL mapping
      const widthScaled = Math.round(typeof (line as any).getScaledWidth === "function" ? (line as any).getScaledWidth() : Math.abs((line.x2 || 0) - (line.x1 || 0)) * (line.scaleX || 1));
      const heightScaled = Math.round(typeof (line as any).getScaledHeight === "function" ? (line as any).getScaledHeight() : Math.abs((line.y2 || 0) - (line.y1 || 0)) * (line.scaleY || 1));
      // Keep stroke width constant regardless of scaling
      const thickness = Math.max(1, Math.round(line.strokeWidth || 1));

      // Horizontal vs vertical line using ^GB
      const horizontal = widthScaled >= heightScaled;
      const gbWidth = horizontal ? widthScaled : thickness;
      const gbHeight = horizontal ? thickness : heightScaled;

      // Convert center-based position to ^FO top-left
      const center = (line as any).getCenterPoint ? (line as any).getCenterPoint() : { x: (line.left || 0), y: (line.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(gbWidth / 2);
      const y = cy - Math.round(gbHeight / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GB${gbWidth},${gbHeight},${thickness}^FS\n`;
    } else if (obj.type === "ellipse") {
      const ellipse = obj as Ellipse;
      // Ellipse dimensions are already at printer DPI scale
      const width = Math.round((ellipse.rx || 0) * 2 * (ellipse.scaleX || 1));
      const height = Math.round((ellipse.ry || 0) * 2 * (ellipse.scaleY || 1));
      const thickness = Math.round((ellipse.strokeWidth || 1));

      // Convert center-based position to ^FO top-left
      const center = (ellipse as any).getCenterPoint ? (ellipse as any).getCenterPoint() : { x: (ellipse.left || 0), y: (ellipse.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(width / 2);
      const y = cy - Math.round(height / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GE${width},${height},${thickness},B^FS\n`;
    } else if ((obj as any).isBarcode) {
      const barcodeData = (obj as any).barcodeDataNormalized || (obj as any).barcodeData || "";
      const rotation = Math.round(((obj as any).angle || 0));
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const moduleWidth = Math.round((obj as any).moduleWidth || 2);
      const moduleWidthEff = Math.max(1, Math.round(moduleWidth * ((obj as any).scaleX || 1)));
      const barHeight = Math.round((obj as any).barHeight || ((obj.height || 0))); // bars only
      const heightEff = Math.max(1, Math.round(barHeight * ((obj as any).scaleY || 1)));

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      // Compute top-left from center per orientation
      const halfW = Math.round(((rotationCode === "R" || rotationCode === "B") ? heightScaled : widthScaled) / 2);
      const halfH = Math.round(((rotationCode === "R" || rotationCode === "B") ? widthScaled : heightScaled) / 2);
      const bx = cx - halfW;
      const by = cy - halfH;

      zpl += `^FO${bx},${by}\n`;
      zpl += `^BY${moduleWidthEff}\n`;
      zpl += `^BE${rotationCode},${heightEff},Y,N\n`;
      zpl += `^FD${barcodeData}^FS\n`;
    } else if ((obj as any).isQr) {
      // QR Code: map 1:1 with ZPL ^BQ (Model 2). Orientation is fixed to N per Zebra docs.
      const data = (obj as any).qrData || "";
      const level = (obj as any).qrErrorCorrection || 'Q';
      const mag = Math.max(1, Math.round((obj as any).qrMagnification || 2));

      // Position from center like other elements
      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left || 0), y: (obj.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));
      const halfW = Math.round(widthScaled / 2);
      const halfH = Math.round(heightScaled / 2);
      const qx = cx - halfW;
      const qy = cy - halfH;

      zpl += `^FO${qx},${qy}\n`;
      // ^BQ format: ^BQa,b,c,d,e -> a fixed to N (orientation), b=model(2), c=magnification, d=error correction, e=mask(optional)
      zpl += `^BQN,2,${mag},${level}\n`;
      // Use automatic data input (A) in ^FD so Zebra chooses optimal mode; prefix with error level per spec examples
      zpl += `^FD${level}A,${data}^FS\n`;
    } else if ((obj as any).isImage && (obj as any).zplImageData) {
      const imageData = (obj as any).zplImageData;
      const rotation = Math.round(((obj as any).angle || 0));
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      const halfW = Math.round(((rotationCode === "R" || rotationCode === "B") ? heightScaled : widthScaled) / 2);
      const halfH = Math.round(((rotationCode === "R" || rotationCode === "B") ? widthScaled : heightScaled) / 2);
      const ix = cx - halfW;
      const iy = cy - halfH;

      // Apply orientation with ^FW for images
      zpl += `^FW${rotationCode}\n`;
      zpl += `^FO${ix},${iy}\n`;
      zpl += `${imageData}\n`;
      zpl += `^FWN\n`;
    }
  });

  // ZPL Footer
  zpl += "^XZ\n";

  return zpl;
};

export const downloadZPL = (zplCode: string, filename: string = "label.zpl") => {
  const blob = new Blob([zplCode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
