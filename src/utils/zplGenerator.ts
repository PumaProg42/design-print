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

    const left = Math.round((obj.left || 0) * (dpi / 96));
    const top = Math.round((obj.top || 0) * (dpi / 96));

    if (obj.type === "i-text") {
      const textObj = obj as IText;
      const fontSize = Math.round((textObj.fontSize || 20) * (dpi / 72));
      const text = textObj.text || "";
      const fieldName = (textObj as any).fieldName || "";
      
      // Export with Field Names = actual text
      // Export with Values = placeholders (Text1-Text20)
      let content: string;
      if (fieldName.match(/^Text\d{1,2}$/)) {
        content = withValues ? `{${fieldName}}` : text;
      } else {
        content = text;
      }

      zpl += `^FO${left},${top}\n`;
      zpl += `^A0N,${fontSize},${fontSize}\n`;
      zpl += `^FD${content}^FS\n`;
    } else if (obj.type === "rect") {
      const rect = obj as Rect;
      const width = Math.round((rect.width || 0) * (rect.scaleX || 1) * (dpi / 96));
      const height = Math.round((rect.height || 0) * (rect.scaleY || 1) * (dpi / 96));
      const thickness = Math.round((rect.strokeWidth || 1) * (dpi / 96));

      zpl += `^FO${left},${top}\n`;
      zpl += `^GB${width},${height},${thickness}^FS\n`;
    } else if (obj.type === "line") {
      const line = obj as Line;
      const x2 = Math.round(((line.x2 || 0) - (line.x1 || 0)) * (dpi / 96));
      const y2 = Math.round(((line.y2 || 0) - (line.y1 || 0)) * (dpi / 96));
      const thickness = Math.round((line.strokeWidth || 1) * (dpi / 96));

      zpl += `^FO${left},${top}\n`;
      zpl += `^GB${x2},${y2},${thickness}^FS\n`;
    } else if (obj.type === "ellipse") {
      const ellipse = obj as Ellipse;
      const width = Math.round((ellipse.rx || 0) * 2 * (ellipse.scaleX || 1) * (dpi / 96));
      const height = Math.round((ellipse.ry || 0) * 2 * (ellipse.scaleY || 1) * (dpi / 96));
      const thickness = Math.round((ellipse.strokeWidth || 1) * (dpi / 96));

      zpl += `^FO${left},${top}\n`;
      zpl += `^GE${width},${height},${thickness},B^FS\n`;
    } else if ((obj as any).isBarcode) {
      const barcodeData = (obj as any).barcodeData || "";
      const moduleWidth = Math.round(((obj as any).moduleWidth || 2) * (dpi / 96));
      const height = Math.round((obj.height || 0) * (obj.scaleY || 1) * (dpi / 96));

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
