import { FabricObject, IText, Rect, Line, Ellipse, FabricImage } from "fabric";

interface ZPLGeneratorOptions {
  dpi: number;
  width: number;
  height: number;
  withValues: boolean;
}

export const generateZPL = (
  canvas: any,
  options: ZPLGeneratorOptions
): string => {
  const { dpi, width, height, withValues } = options;

  // ZPL Header
  let zpl = "^XA\n";
  zpl += `^PW${Math.round((width * dpi) / 25.4)}\n`; // Print width in dots
  zpl += `^LL${Math.round((height * dpi) / 25.4)}\n`; // Label length in dots

  const objects = canvas.getObjects();

  objects.forEach((obj: FabricObject) => {
    // Skip the label boundary
    if ((obj as any).name === "labelBoundary") return;

    // Canvas shows elements scaled to DPI. Convert canvas pixels to printer dots.
    // Canvas boundary is at (50, 50), so subtract that first, then the canvas
    // positions are already in "printer dots" equivalent
    const left = Math.round((obj.left || 0) - 50);
    const top = Math.round((obj.top || 0) - 50);

    if (obj.type === "i-text") {
      const textObj = obj as IText;
      // Font size is already at correct scale on canvas
      const fontSize = Math.round((textObj.fontSize || 20));
      const text = textObj.text || "";
      const fieldName = (textObj as any).fieldName || "";
      const rotation = Math.round(textObj.angle || 0);
      
      // Export with Field Names = actual text
      // Export with Values = placeholders (Text1-Text20)
      let content: string;
      if (fieldName.match(/^Text\d{1,2}$/)) {
        content = withValues ? `{${fieldName}}` : text;
      } else {
        content = text;
      }

      // Handle rotation (0=N, 90=R, 180=I, 270=B)
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      zpl += `^FO${left},${top}\n`;
      zpl += `^A0${rotationCode},${fontSize},${fontSize}\n`;
      zpl += `^FD${content}^FS\n`;
    } else if (obj.type === "rect") {
      const rect = obj as Rect;
      // Dimensions are already at printer DPI scale
      const width = Math.round((rect.width || 0) * (rect.scaleX || 1));
      const height = Math.round((rect.height || 0) * (rect.scaleY || 1));
      const thickness = Math.round((rect.strokeWidth || 1));

      zpl += `^FO${left},${top}\n`;
      zpl += `^GB${width},${height},${thickness}^FS\n`;
    } else if (obj.type === "line") {
      const line = obj as Line;
      // Calculate line width and height
      const lineWidth = Math.round(Math.abs((line.x2 || 0) - (line.x1 || 0)));
      const lineHeight = Math.round(Math.abs((line.y2 || 0) - (line.y1 || 0)));
      const thickness = Math.round((line.strokeWidth || 1));

      // For horizontal lines, use width; for vertical lines, use height
      const gbWidth = lineWidth > 0 ? lineWidth : thickness;
      const gbHeight = lineHeight > 0 ? lineHeight : thickness;

      zpl += `^FO${left},${top}\n`;
      zpl += `^GB${gbWidth},${gbHeight},${thickness}^FS\n`;
    } else if (obj.type === "ellipse") {
      const ellipse = obj as Ellipse;
      // Ellipse dimensions are already at printer DPI scale
      const width = Math.round((ellipse.rx || 0) * 2 * (ellipse.scaleX || 1));
      const height = Math.round((ellipse.ry || 0) * 2 * (ellipse.scaleY || 1));
      const thickness = Math.round((ellipse.strokeWidth || 1));

      zpl += `^FO${left},${top}\n`;
      zpl += `^GE${width},${height},${thickness},B^FS\n`;
    } else if ((obj as any).isBarcode) {
      const barcodeData = (obj as any).barcodeData || "";
      // Barcode dimensions are already at printer DPI scale
      const moduleWidth = Math.round((obj as any).moduleWidth || 2);
      const height = Math.round((obj.height || 0) * (obj.scaleY || 1));

      zpl += `^FO${left},${top}\n`;
      zpl += `^BY${moduleWidth}\n`;
      zpl += `^BEN,${height},Y,N\n`;
      zpl += `^FD${barcodeData}^FS\n`;
    } else if ((obj as any).isImage && (obj as any).zplImageData) {
      const imageData = (obj as any).zplImageData;
      zpl += `^FO${left},${top}\n`;
      zpl += `${imageData}\n`;
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
