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

  let zpl = "^XA\n";
  zpl += `^FX DPI:${dpi}\n`;
  
  if (rotate180) {
    zpl += "^POI\n";
  }
  
  zpl += `^PW${Math.round((width * dpi) / 25.4)}\n`;
  zpl += `^LL${Math.round((height * dpi) / 25.4)}\n`;

  const objects = canvas.getObjects();
  
  const boundary = objects.find((o: any) => o.name === 'labelBoundary') as any;
  const boundaryLeft = boundary?.left ?? 200;
  const boundaryTop = boundary?.top ?? 200;

  objects.forEach((obj: FabricObject) => {
    if ((obj as any).name === "labelBoundary") return;

    const left = Math.round((obj.left || 0) - boundaryLeft);
    const top = Math.round((obj.top || 0) - boundaryTop);

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
      const textboxObj = obj as Textbox;
      const fontSize = Math.round((textboxObj.fontSize || 20));
      const text = textboxObj.text || "";
      const fieldName = (textboxObj as any).fieldName || "";
      const rotation = Math.round(textboxObj.angle || 0);

      const isFixedText = (textboxObj as any).isFixedText || false;
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

      const exportFontWidth = Math.round(fontSize * (textboxObj.scaleX || 1));
      const exportFontHeight = Math.round(fontSize * (textboxObj.scaleY || 1));
      
      const scaleX = textboxObj.scaleX || 1;
      const scaleY = textboxObj.scaleY || 1;

      const center = (textboxObj as any).getCenterPoint
        ? (textboxObj as any).getCenterPoint()
        : {
            x: (textboxObj.left || 0) + (((textboxObj as any).getScaledWidth?.() as number) || ((textboxObj.width || 0) * (scaleX || 1))) / 2,
            y: (textboxObj.top || 0) + (((textboxObj as any).getScaledHeight?.() as number) || ((textboxObj.height || 0) * (scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const textWidth = Math.round((textboxObj.width || 0) * scaleX);
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
    } else if (obj.type === "rect") {
      const rectObj = obj as Rect;
      const rectWidth = Math.round((rectObj.width || 0) * (rectObj.scaleX || 1));
      const rectHeight = Math.round((rectObj.height || 0) * (rectObj.scaleY || 1));
      const rotation = Math.round(rectObj.angle || 0);

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const center = (rectObj as any).getCenterPoint
        ? (rectObj as any).getCenterPoint()
        : {
            x: (rectObj.left || 0) + (((rectObj as any).getScaledWidth?.() as number) || ((rectObj.width || 0) * ((rectObj as any).scaleX || 1))) / 2,
            y: (rectObj.top || 0) + (((rectObj as any).getScaledHeight?.() as number) || ((rectObj.height || 0) * ((rectObj as any).scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const halfW = Math.round(rectWidth / 2);
      const halfH = Math.round(rectHeight / 2);
      const rx = cx - halfW;
      const ry = cy - halfH;

      zpl += `^FO${rx},${ry}\n`;
      zpl += `^GB${rectWidth},${rectHeight},4^FS\n`;
    } else if (obj.type === "line") {
      const lineObj = obj as Line;
      const x1 = Math.round((lineObj.x1 || 0));
      const y1 = Math.round((lineObj.y1 || 0));
      const x2 = Math.round((lineObj.x2 || 0));
      const y2 = Math.round((lineObj.y2 || 0));
      const lineWidth = Math.round(lineObj.strokeWidth || 1);
      const rotation = Math.round(lineObj.angle || 0);

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const centerX = (lineObj.left || 0) + (x2 - x1) / 2;
      const centerY = (lineObj.top || 0) + (y2 - y1) / 2;

      const cx = Math.round(centerX - boundaryLeft);
      const cy = Math.round(centerY - boundaryTop);

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lineLength = Math.round(Math.sqrt(dx * dx + dy * dy));

      const lx = cx - Math.round(lineLength / 2);
      const ly = cy - Math.round(lineWidth / 2);

      zpl += `^FO${lx},${ly}\n`;
      zpl += `^GB${lineLength},${lineWidth},4^FS\n`;
    } else if (obj.type === "ellipse") {
      const ellipseObj = obj as Ellipse;
      const rx = Math.round((ellipseObj.rx || 0) * (ellipseObj.scaleX || 1));
      const ry = Math.round((ellipseObj.ry || 0) * (ellipseObj.scaleY || 1));
      const rotation = Math.round(ellipseObj.angle || 0);

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const center = (ellipseObj as any).getCenterPoint
        ? (ellipseObj as any).getCenterPoint()
        : {
            x: (ellipseObj.left || 0) + (((ellipseObj as any).getScaledWidth?.() as number) || ((ellipseObj.width || 0) * ((ellipseObj as any).scaleX || 1))) / 2,
            y: (ellipseObj.top || 0) + (((ellipseObj as any).getScaledHeight?.() as number) || ((ellipseObj.height || 0) * ((ellipseObj as any).scaleY || 1))) / 2,
          };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const ex = cx - rx;
      const ey = cy - ry;

      zpl += `^FO${ex},${ey}\n`;
      zpl += `^GE${rx * 2},${ry * 2},4^FS\n`;
    } else if ((obj as any).isBarcode) {
      const barcodeData = (obj as any).barcodeData || "";
      const barcodeType = (obj as any).barcodeType || "128";
      const moduleWidth = (obj as any).moduleWidth || 2;
      const height = (obj as any).height || 100;
      const rotation = Math.round(obj.angle || 0);

      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      const moduleWidthEff = Math.max(1, Math.min(10, moduleWidth));
      const heightEff = Math.max(10, Math.min(999, height));

      const center = (obj as any).getCenterPoint
        ? (obj as any).getCenterPoint()
        : {
            x: (obj.left || 0) + (((obj as any).getScaledWidth?.() as number) || ((obj.width || 0) * ((obj as any).scaleX || 1))) / 2,
            y: (obj.top || 0) + (((obj as any).getScaledHeight?.() as number) || ((obj.height || 0) * ((obj as any).scaleY || 1))) / 2,
          };
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
    } else if ((obj as any).isCode || (obj as any).isImage) {
      // CODE and IMAGE - dynamically generate ZPL at current scale
      const imageObj = obj as FabricImage;
      const imgElement = imageObj.getElement() as HTMLImageElement;
      
      if (!imgElement) return;

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = widthScaled;
      tempCanvas.height = heightScaled;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, widthScaled, heightScaled);
      ctx.drawImage(imgElement, 0, 0, widthScaled, heightScaled);
      
      const imageData = ctx.getImageData(0, 0, widthScaled, heightScaled);
      const pixels = imageData.data;
      const threshold = 128;
      
      const bytesPerRow = Math.ceil(widthScaled / 8);
      const hexData: string[] = [];
      
      for (let y = 0; y < heightScaled; y++) {
        let rowBytes = '';
        for (let x = 0; x < bytesPerRow; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const pixelX = x * 8 + bit;
            if (pixelX < widthScaled) {
              const pixelIndex = (y * widthScaled + pixelX) * 4;
              const gray = pixels[pixelIndex] * 0.299 + pixels[pixelIndex + 1] * 0.587 + pixels[pixelIndex + 2] * 0.114;
              if (gray >= threshold) {
                byte |= (1 << (7 - bit));
              }
            } else {
              byte |= (1 << (7 - bit));
            }
          }
          rowBytes += byte.toString(16).toUpperCase().padStart(2, '0');
        }
        hexData.push(rowBytes);
      }
      
      const totalBytes = bytesPerRow * heightScaled;
      const zplImageData = `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData.join('')}^FS`;

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+widthScaled/2, y: (obj.top||0)+heightScaled/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const halfW = Math.round(widthScaled / 2);
      const halfH = Math.round(heightScaled / 2);
      const ix = cx - halfW;
      const iy = cy - halfH;

      zpl += `^FO${ix},${iy}\n`;
      zpl += `${zplImageData}\n`;
    } else if ((obj as any).isQr) {
      // QR Code: map 1:1 with ZPL ^BQ (Model 2). Orientation is fixed to N per Zebra docs.
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
      // ^BQ format: ^BQa,b,c,d,e -> a fixed to N (orientation), b=model(2), c=magnification, d=error correction, e=mask(optional)
      zpl += `^BQN,2,${mag},${level}\n`;
      // Use automatic data input (A) in ^FD so Zebra chooses optimal mode; prefix with error level per spec examples
      zpl += `^FD${level}A,${data}^FS\n`;
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
