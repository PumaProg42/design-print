import { FabricObject, IText, Textbox, Rect, Line, Ellipse, FabricImage } from "fabric";

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
  zpl += `^FX DPI:${dpi}\n`;
  
  // Add rotation command if enabled
  if (rotate180) {
    zpl += "^POI\n";
  }
  
  zpl += `^PW${Math.round((width * dpi) / 25.4)}\n`;
  zpl += `^LL${Math.round((height * dpi) / 25.4)}\n`;

  const objects = canvas.getObjects();
  
  // Calculate boundary offset - elements are positioned relative to workspace padding
  const boundary = objects.find((o: any) => o.name === 'labelBoundary') as any;
  const boundaryLeft = boundary?.left ?? 200;
  const boundaryTop = boundary?.top ?? 200;

  objects.forEach((obj: FabricObject) => {
    // Skip the label boundary
    if ((obj as any).name === "labelBoundary") return;

    if (obj.type === "i-text") {
      const textObj = obj as IText;
      const fontSize = Math.round((textObj.fontSize || 20));
      const text = textObj.text || "";
      const fieldName = (textObj as any).fieldName || "";
      const rotation = Math.round(textObj.angle || 0);
      
      const isFixedText = (textObj as any).isFixedText || false;
      let content: string;
      if (isFixedText) {
        content = text;
      } else if (fieldName) {
        content = withValues ? fieldName : text;
      } else {
        content = text;
      }

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const exportFontWidth = Math.round(fontSize * (textObj.scaleX || 1));
      const exportFontHeight = Math.round(fontSize * (textObj.scaleY || 1));
      
      const scaleX = textObj.scaleX || 1;
      const scaleY = textObj.scaleY || 1;

      const center = (textObj as any).getCenterPoint
        ? (textObj as any).getCenterPoint()
        : {
            x: (textObj.left || 0) + (((textObj as any).getScaledWidth?.() as number) || ((textObj.width || 0) * (scaleX || 1))) / 2,
            y: (textObj.top || 0) + (((textObj as any).getScaledHeight?.() as number) || ((textObj.height || 0) * (scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const textWidth = Math.round((textObj.width || 0) * scaleX);
      const textHeight = Math.max(1, Math.round(exportFontHeight));

      const baseOffset = Math.round(exportFontHeight * 0.15);
      
      let x = cx;
      let y = cy;

      if (rotationCode === "N") {
        x = cx - Math.round(textWidth / 2);
        y = cy - Math.round(textHeight / 2) + baseOffset;
      } else if (rotationCode === "R") {
        x = cx - Math.round(textHeight / 2);
        y = cy - Math.round(textWidth / 2) - baseOffset;
      } else if (rotationCode === "I") {
        x = cx - Math.round(textWidth / 2);
        y = cy - Math.round(textHeight / 2) - baseOffset;
      } else if (rotationCode === "B") {
        x = cx - Math.round(textHeight / 2);
        y = cy - Math.round(textWidth / 2) + baseOffset;
      }

      zpl += `^FO${x},${y}\n`;
      zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
      zpl += `^FD${content}^FS\n`;
    } else if (obj.type === "textbox") {
      const textBox = obj as Textbox;
      const fontSize = Math.round((textBox.fontSize || 20));
      const text = textBox.text || "";
      const fieldName = (textBox as any).fieldName || "";
      const rotation = Math.round(textBox.angle || 0);
      
      const isFixedText = (textBox as any).isFixedText || false;
      const isMultilineText = (textBox as any).isMultilineText || false;
      
      let content: string;
      if (isFixedText) {
        content = text;
      } else if (fieldName) {
        content = withValues ? fieldName : text;
      } else {
        content = text;
      }

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const exportFontWidth = Math.round(fontSize * (textBox.scaleX || 1));
      const exportFontHeight = Math.round(fontSize * (textBox.scaleY || 1));
      
      const scaleX = textBox.scaleX || 1;
      const scaleY = textBox.scaleY || 1;

      const center = (textBox as any).getCenterPoint
        ? (textBox as any).getCenterPoint()
        : {
            x: (textBox.left || 0) + (((textBox as any).getScaledWidth?.() as number) || ((textBox.width || 0) * (scaleX || 1))) / 2,
            y: (textBox.top || 0) + (((textBox as any).getScaledHeight?.() as number) || ((textBox.height || 0) * (scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const textWidth = Math.round((textBox.width || 0) * scaleX);
      const textHeight = Math.max(1, Math.round(exportFontHeight));

      const baseOffset = Math.round(exportFontHeight * 0.15);
      
      let x = cx;
      let y = cy;

      if (rotationCode === "N") {
        x = cx - Math.round(textWidth / 2);
        y = cy - Math.round(textHeight / 2) + baseOffset;
      } else if (rotationCode === "R") {
        x = cx - Math.round(textHeight / 2);
        y = cy - Math.round(textWidth / 2) - baseOffset;
      } else if (rotationCode === "I") {
        x = cx - Math.round(textWidth / 2);
        y = cy - Math.round(textHeight / 2) - baseOffset;
      } else if (rotationCode === "B") {
        x = cx - Math.round(textHeight / 2);
        y = cy - Math.round(textWidth / 2) + baseOffset;
      }

      if (isMultilineText) {
        const lines = content.split('\n');
        const maxLines = lines.length;
        const lineSpacing = 0;
        const boxWidthInDots = textWidth;
        
        const textAlign = (textBox as any).textAlign || 'left';
        let alignment = 'L';
        if (textAlign === 'center') alignment = 'C';
        else if (textAlign === 'right') alignment = 'R';
        
        const zplText = content.replace(/\n/g, '\\&');
        
        zpl += `^FO${x},${y}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        zpl += `^FB${boxWidthInDots},${maxLines},${lineSpacing},${alignment},0\n`;
        zpl += `^FD${zplText}^FS\n`;
      } else {
        zpl += `^FO${x},${y}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        zpl += `^FD${content}^FS\n`;
      }
    } else if (obj.type === "rect") {
      const rect = obj as Rect;
      const width = Math.round((rect.width || 0) * (rect.scaleX || 1));
      const height = Math.round((rect.height || 0) * (rect.scaleY || 1));
      const thickness = Math.round((rect.strokeWidth || 1));

      const center = (rect as any).getCenterPoint ? (rect as any).getCenterPoint() : { x: (rect.left || 0), y: (rect.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(width / 2);
      const y = cy - Math.round(height / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GB${width},${height},${thickness}^FS\n`;
    } else if (obj.type === "line") {
      const line = obj as Line;
      const widthScaled = Math.round(typeof (line as any).getScaledWidth === "function" ? (line as any).getScaledWidth() : Math.abs((line.x2 || 0) - (line.x1 || 0)) * (line.scaleX || 1));
      const heightScaled = Math.round(typeof (line as any).getScaledHeight === "function" ? (line as any).getScaledHeight() : Math.abs((line.y2 || 0) - (line.y1 || 0)) * (line.scaleY || 1));
      const thickness = Math.max(1, Math.round(line.strokeWidth || 1));

      const horizontal = widthScaled >= heightScaled;
      const gbWidth = horizontal ? widthScaled : thickness;
      const gbHeight = horizontal ? thickness : heightScaled;

      const center = (line as any).getCenterPoint ? (line as any).getCenterPoint() : { x: (line.left || 0), y: (line.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(gbWidth / 2);
      const y = cy - Math.round(gbHeight / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GB${gbWidth},${gbHeight},${thickness}^FS\n`;
    } else if (obj.type === "ellipse") {
      const ellipse = obj as Ellipse;
      const width = Math.round((ellipse.rx || 0) * 2 * (ellipse.scaleX || 1));
      const height = Math.round((ellipse.ry || 0) * 2 * (ellipse.scaleY || 1));
      const thickness = Math.round((ellipse.strokeWidth || 1));

      const center = (ellipse as any).getCenterPoint ? (ellipse as any).getCenterPoint() : { x: (ellipse.left || 0), y: (ellipse.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(width / 2);
      const y = cy - Math.round(height / 2);

      zpl += `^FO${x},${y}\n`;
      zpl += `^GE${width},${height},${thickness},B^FS\n`;
    } else if ((obj as any).isBarcode) {
      const barcodeData = (obj as any).barcodeDataNormalized || (obj as any).barcodeData || "";
      
      const rotation = Math.round(obj.angle || 0);
      
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const moduleWidth = Math.round((obj as any).moduleWidth || 2);
      const moduleWidthEff = Math.max(1, Math.round(moduleWidth * ((obj as any).scaleX || 1)));
      const barHeight = Math.round((obj as any).barHeight || ((obj.height || 0)));
      const heightEff = Math.max(1, Math.round(barHeight * ((obj as any).scaleY || 1)));

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      const halfW = Math.round(((rotationCode === "R" || rotationCode === "B") ? heightScaled : widthScaled) / 2);
      const halfH = Math.round(((rotationCode === "R" || rotationCode === "B") ? widthScaled : heightScaled) / 2);
      const bx = cx - halfW;
      const by = cy - halfH;

      zpl += `^FO${bx},${by}\n`;
      zpl += `^BY${moduleWidthEff}\n`;
      zpl += `^BE${rotationCode},${heightEff},Y,N\n`;
      zpl += `^FD${barcodeData}^FS\n`;
    } else if ((obj as any).isCode) {
      // CODE object - export as dynamically generated image at current scale (no ^B* commands)
      const imageObj = obj as FabricImage;
      const imgElement = imageObj.getElement() as HTMLImageElement | HTMLCanvasElement | undefined;
      if (!imgElement) return;

      const widthScaled = Math.max(1, Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1)));
      const heightScaled = Math.max(1, Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1)));

      // Render at scaled size to preserve crispness
      const tmp = document.createElement('canvas');
      tmp.width = widthScaled;
      tmp.height = heightScaled;
      const ctx = tmp.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, widthScaled, heightScaled);
      ctx.drawImage(imgElement, 0, 0, widthScaled, heightScaled);

      // Build ^GFA data from current pixels (1-bit)
      const imageData = ctx.getImageData(0, 0, widthScaled, heightScaled);
      const pixels = imageData.data;
      const threshold = 128;
      const bytesPerRow = Math.ceil(widthScaled / 8);
      const hexData: string[] = [];

      for (let y = 0; y < heightScaled; y++) {
        let rowByteStr = '';
        for (let x = 0; x < bytesPerRow; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const px = x * 8 + bit;
            if (px < widthScaled) {
              const idx = (y * widthScaled + px) * 4;
              const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
              if (gray >= threshold) byte |= (1 << (7 - bit)); // 1=white
            } else {
              byte |= (1 << (7 - bit)); // pad white
            }
          }
          rowByteStr += byte.toString(16).toUpperCase().padStart(2, '0');
        }
        hexData.push(rowByteStr);
      }

      const totalBytes = bytesPerRow * heightScaled;
      const gfa = `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData.join('')}^FS`;

      // Position using center like other elements
      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+widthScaled/2, y: (obj.top||0)+heightScaled/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const ix = cx - Math.round(widthScaled / 2);
      const iy = cy - Math.round(heightScaled / 2);

      zpl += `^FO${ix},${iy}\n`;
      zpl += `${gfa}\n`;
    } else if ((obj as any).isQr) {
      // QR Code export via ^BQ (kept as-is)
      const data = (obj as any).qrData || "";
      const level = (obj as any).qrErrorCorrection || 'Q';
      const mag = Math.max(1, Math.round((obj as any).qrMagnification || 2));

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      const halfW = Math.round(widthScaled / 2);
      const halfH = Math.round(heightScaled / 2);
      const qx = cx - halfW;
      const qy = cy - halfH;

      zpl += `^FO${qx},${qy}\n`;
      zpl += `^BQN,2,${mag},${level}\n`;
      zpl += `^FD${level}A,${data}^FS\n`;
    } else if ((obj as any).isImage && (obj as any).zplImageData) {
      // Keep IMAGE behavior unchanged
      const imageData = (obj as any).zplImageData;

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      const ix = cx - Math.round(widthScaled / 2);
      const iy = cy - Math.round(heightScaled / 2);

      zpl += `^FO${ix},${iy}\n`;
      zpl += `${imageData}\n`;
    }
  });

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
