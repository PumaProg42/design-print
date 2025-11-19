import { FabricObject, IText, Textbox, Rect, Line, Ellipse, FabricImage } from "fabric";
import { buildBarcodeZpl, type BarcodeElementData, mmToDots, estimateQrMagnificationSync } from "@/utils/barcodeUtils";

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

      // Calculate text block width accounting for character spacing
      const charSpacing = (textObj as any).charSpacing || 0;
      const textLength = text.length;
      // Add character spacing to width calculation: base width + (charCount * spacing)
      const baseWidth = Math.round((textObj.width || 0) * scaleX);
      const textWidth = Math.round(baseWidth + (textLength * charSpacing));
      const textHeight = Math.round((textObj.height || 0) * scaleY);
      
      // Use center point like rectangles for 1:1 positioning
      const center = (textObj as any).getCenterPoint ? (textObj as any).getCenterPoint() : { x: (textObj.left || 0), y: (textObj.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const topLeftX = cx - Math.round(textWidth / 2);
      // Add baseline offset for ZPL font rendering (approx 15% of font height)
      const baselineOffset = Math.round(exportFontHeight * 0.15);
      const topLeftY = cy - Math.round(textHeight / 2) + baselineOffset;

      // Get horizontal alignment (default to center)
      const textAlign = (textObj as any).textAlign || 'center';
      let alignment = 'C';
      if (textAlign === 'left') alignment = 'L';
      else if (textAlign === 'right') alignment = 'R';

      zpl += `^FO${topLeftX},${topLeftY}\n`;
      zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
      zpl += `^FB${textWidth},1,0,${alignment},0\n`;
      // Add line separator for centered text to prevent layout issues
      const textContent = alignment === 'C' ? `${content}\\&` : content;
      zpl += `^FD${textContent}^FS\n`;
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

      // Calculate text block width accounting for character spacing
      const charSpacing = (textBox as any).charSpacing || 0;
      const textLength = text.length;
      // Add character spacing to width calculation: base width + (charCount * spacing)
      const baseWidth = Math.round((textBox.width || 0) * scaleX);
      const textWidth = Math.round(baseWidth + (textLength * charSpacing));
      const textHeight = Math.round((textBox.height || 0) * scaleY);
      
      // Use center point like rectangles for 1:1 positioning
      const center = (textBox as any).getCenterPoint ? (textBox as any).getCenterPoint() : { x: (textBox.left || 0), y: (textBox.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const topLeftX = cx - Math.round(textWidth / 2);
      // Add baseline offset for ZPL font rendering (approx 15% of font height)
      const baselineOffset = Math.round(exportFontHeight * 0.15);
      const topLeftY = cy - Math.round(textHeight / 2) + baselineOffset;

      // Get horizontal alignment (default to center)
      const textAlign = (textBox as any).textAlign || 'center';
      let alignment = 'C';
      if (textAlign === 'left') alignment = 'L';
      else if (textAlign === 'right') alignment = 'R';

      if (isMultilineText) {
        const lines = content.split('\n');
        const maxLines = lines.length;
        const lineSpacing = 0;
        
        const zplText = content.replace(/\n/g, '\\&');
        
        zpl += `^FO${topLeftX},${topLeftY}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        zpl += `^FB${textWidth},${maxLines},${lineSpacing},${alignment},0\n`;
        zpl += `^FD${zplText}^FS\n`;
      } else {
        zpl += `^FO${topLeftX},${topLeftY}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        zpl += `^FB${textWidth},1,0,${alignment},0\n`;
        // Add line separator for centered text to prevent layout issues
        const textContent = alignment === 'C' ? `${content}\\&` : content;
        zpl += `^FD${textContent}^FS\n`;
      }
    } else if (obj.type === "rect") {
      const rect = obj as Rect;
      const innerWidth = Math.round(((rect.width || 0) * (rect.scaleX || 1)));
      const innerHeight = Math.round(((rect.height || 0) * (rect.scaleY || 1)));
      // Effective stroke equals visual stroke on canvas (strokeUniform=true)
      const thickness = Math.max(1, Math.round(rect.strokeUniform ? (rect.strokeWidth || 1) : (rect.strokeWidth || 1) * (((rect.scaleX || 1) + (rect.scaleY || 1)) / 2)));

      // ZPL ^GB width/height are outer dimensions. Fabric width/height are inner (stroke splits half out/half in)
      const outerWidth = Math.max(1, innerWidth + thickness);
      const outerHeight = Math.max(1, innerHeight + thickness);

      const center = (rect as any).getCenterPoint ? (rect as any).getCenterPoint() : { x: (rect.left || 0), y: (rect.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(outerWidth / 2);
      const y = cy - Math.round(outerHeight / 2);

      zpl += `^FO${x},${y}` + "\n";
      zpl += `^GB${outerWidth},${outerHeight},${thickness}^FS` + "\n";
    } else if (obj.type === "line") {
      const line = obj as Line;
      const thickness = Math.max(1, Math.round(line.strokeUniform ? (line.strokeWidth || 1) : (line.strokeWidth || 1) * (((line.scaleX || 1) + (line.scaleY || 1)) / 2)));

      // Determine core length along each axis (without stroke)
      const coreW = Math.round(Math.abs((line.x2 || 0) - (line.x1 || 0)) * (line.scaleX || 1));
      const coreH = Math.round(Math.abs((line.y2 || 0) - (line.y1 || 0)) * (line.scaleY || 1));

      const horizontal = coreW >= coreH;
      const gbWidth = horizontal ? Math.max(1, coreW + thickness) : thickness;
      const gbHeight = horizontal ? thickness : Math.max(1, coreH + thickness);

      const center = (line as any).getCenterPoint ? (line as any).getCenterPoint() : { x: (line.left || 0), y: (line.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(gbWidth / 2);
      const y = cy - Math.round(gbHeight / 2);

      zpl += `^FO${x},${y}` + "\n";
      zpl += `^GB${gbWidth},${gbHeight},${thickness}^FS` + "\n";
    } else if (obj.type === "ellipse") {
      const ellipse = obj as Ellipse;
      const innerW = Math.round((ellipse.rx || 0) * 2 * (ellipse.scaleX || 1));
      const innerH = Math.round((ellipse.ry || 0) * 2 * (ellipse.scaleY || 1));
      const thickness = Math.max(1, Math.round(ellipse.strokeUniform ? (ellipse.strokeWidth || 1) : (ellipse.strokeWidth || 1) * (((ellipse.scaleX || 1) + (ellipse.scaleY || 1)) / 2)));

      const outerW = Math.max(1, innerW + thickness);
      const outerH = Math.max(1, innerH + thickness);

      const center = (ellipse as any).getCenterPoint ? (ellipse as any).getCenterPoint() : { x: (ellipse.left || 0), y: (ellipse.top || 0) };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const x = cx - Math.round(outerW / 2);
      const y = cy - Math.round(outerH / 2);

      zpl += `^FO${x},${y}` + "\n";
      zpl += `^GE${outerW},${outerH},${thickness},B^FS` + "\n";
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
      // BARCODE - use stored params for 1:1 accuracy when available
      const storedParams = (obj as any).barcodeParams;
      
      // Calculate center position
      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { 
        x: (obj.left||0)+(((obj as any).getScaledWidth?.() as number)||((obj.width||0)*((obj as any).scaleX||1)))/2, 
        y: (obj.top||0)+(((obj as any).getScaledHeight?.() as number)||((obj.height||0)*((obj as any).scaleY||1)))/2 
      };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      
      if (storedParams) {
        // Use pre-computed parameters for exact 1:1 match
        const barcodeElement: BarcodeElementData = {
          type: storedParams.type,
          value: storedParams.value,
          x: cx - Math.round(storedParams.widthDots / 2),
          y: cy - Math.round(storedParams.heightDots / 2),
          width: storedParams.widthDots,
          height: storedParams.heightDots,
          rotation: Math.round(obj.angle || 0),
          humanReadable: storedParams.humanReadable,
          qrMagnification: storedParams.qrMagnification,
          qrErrorCorrection: storedParams.qrErrorCorrection,
          moduleWidthDots: storedParams.barWidthDots
        };
        zpl += buildBarcodeZpl(barcodeElement);
      } else {
        // Fallback: estimate from object dimensions (legacy barcodes without stored params)
        const codeType = (obj as any).codeType;
        const codeData = (obj as any).codeData || "";
        const barcodeTypeMap: Record<string, 'QR' | 'EAN_8' | 'EAN_13' | 'CODE_128'> = {
          'qrcode': 'QR', 'ean8': 'EAN_8', 'ean13': 'EAN_13', 'code128': 'CODE_128'
        };
        const barcodeType = barcodeTypeMap[codeType];
        
        if (!barcodeType) {
          console.warn(`Unknown barcode type: ${codeType}`);
          return;
        }
        
        const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
        const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));
        const qrMag = barcodeType === 'QR' ? estimateQrMagnificationSync(widthScaled, codeData) : undefined;
        
        const barcodeElement: BarcodeElementData = {
          type: barcodeType,
          value: codeData,
          x: cx - Math.round(widthScaled / 2),
          y: cy - Math.round(heightScaled / 2),
          width: widthScaled,
          height: heightScaled,
          rotation: Math.round(obj.angle || 0),
          humanReadable: (obj as any).humanReadable !== false,
          qrErrorCorrection: (obj as any).qrErrorCorrection || 'M',
          qrMagnification: qrMag
        };
        zpl += buildBarcodeZpl(barcodeElement);
      }
    } else if ((obj as any).isImage && (obj as any).zplImageData) {
      // Normal IMAGE with rotation support
      const imageObj = obj as FabricImage;
      const rotation = Math.round(obj.angle || 0);
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      // Get the original image element for rotation processing
      const imgElement = imageObj.getElement() as HTMLImageElement | HTMLCanvasElement | undefined;
      if (!imgElement) return;

      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      // Render at scaled size
      const tmp = document.createElement('canvas');
      tmp.width = widthScaled;
      tmp.height = heightScaled;
      const ctx = tmp.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, widthScaled, heightScaled);
      ctx.drawImage(imgElement, 0, 0, widthScaled, heightScaled);

      // Get the image data
      let imageData = ctx.getImageData(0, 0, widthScaled, heightScaled);
      let finalWidth = widthScaled;
      let finalHeight = heightScaled;

      // Rotate image data if needed
      if (rotationCode !== "N") {
        const rotatedCanvas = document.createElement('canvas');
        const rotatedCtx = rotatedCanvas.getContext('2d');
        if (!rotatedCtx) return;

        if (rotationCode === "R" || rotationCode === "B") {
          // 90° or 270° - swap dimensions
          rotatedCanvas.width = heightScaled;
          rotatedCanvas.height = widthScaled;
        } else {
          // 180° - same dimensions
          rotatedCanvas.width = widthScaled;
          rotatedCanvas.height = heightScaled;
        }

        rotatedCtx.imageSmoothingEnabled = false;
        rotatedCtx.fillStyle = 'white';
        rotatedCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

        // Apply rotation transformation
        rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        if (rotationCode === "R") {
          rotatedCtx.rotate(Math.PI / 2); // 90° clockwise
        } else if (rotationCode === "I") {
          rotatedCtx.rotate(Math.PI); // 180°
        } else if (rotationCode === "B") {
          rotatedCtx.rotate(-Math.PI / 2); // 270° or 90° counter-clockwise
        }
        rotatedCtx.translate(-widthScaled / 2, -heightScaled / 2);
        rotatedCtx.drawImage(tmp, 0, 0);

        imageData = rotatedCtx.getImageData(0, 0, rotatedCanvas.width, rotatedCanvas.height);
        finalWidth = rotatedCanvas.width;
        finalHeight = rotatedCanvas.height;
      }

      // Build ^GFA data from rotated pixels (1-bit)
      const pixels = imageData.data;
      const threshold = 128;
      const bytesPerRow = Math.ceil(finalWidth / 8);
      const hexData: string[] = [];

      for (let y = 0; y < finalHeight; y++) {
        let rowByteStr = '';
        for (let x = 0; x < bytesPerRow; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const px = x * 8 + bit;
            if (px < finalWidth) {
              const idx = (y * finalWidth + px) * 4;
              const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
              // ZPL ^GFA expects 1-bits as BLACK dots
              if (gray < threshold) byte |= (1 << (7 - bit));
            }
          }
          rowByteStr += byte.toString(16).toUpperCase().padStart(2, '0');
        }
        hexData.push(rowByteStr);
      }

      const totalBytes = bytesPerRow * finalHeight;
      const gfa = `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData.join('')}^FS`;

      // Position using center with rotation consideration
      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+widthScaled/2, y: (obj.top||0)+heightScaled/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);
      const ix = cx - Math.round(finalWidth / 2);
      const iy = cy - Math.round(finalHeight / 2);

      zpl += `^FO${ix},${iy}\n`;
      zpl += `${gfa}\n`;
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
