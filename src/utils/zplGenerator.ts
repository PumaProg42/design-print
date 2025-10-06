import { FabricObject, IText, Rect, Line } from "fabric";

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
      
      // Check if it's a field placeholder (Text1-Text20)
      const fieldMatch = text.match(/^(Text\d{1,2})$/);
      const content = withValues ? text : (fieldMatch ? `{${text}}` : text);

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
