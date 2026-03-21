import { FabricObject, IText, Textbox, Rect, Line, Ellipse, FabricImage } from "fabric";
import { buildBarcodeZpl, type BarcodeElementData, mmToDots, estimateQrMagnificationSync, computeBarWidth, BARCODE_SIZE_DEFAULT, QR_SIZE_DEFAULT } from "@/utils/barcodeUtils";

interface ZPLGeneratorOptions {
  dpi: number;
  width: number;
  height: number;
  withValues: boolean;
  rotate180?: boolean;
}

// Get ZPL FO position using bounding rect and rotation adjustment
const getFoForZpl = (obj: any, boundaryLeft: number, boundaryTop: number) => {
  const rect = obj.getBoundingRect(true);
  let x = rect.left - boundaryLeft;
  let y = rect.top - boundaryTop;

  const w = (obj.width || 0) * (obj.scaleX || 1);
  const h = (obj.height || 0) * (obj.scaleY || 1);
  
  // Y offset constant: font height + font height * 0.08 = height * 1.08 (only for 90/270)
  const fontHeight = (obj.fontSize || 0) * (obj.scaleY || 1);
  const yOffset = fontHeight + fontHeight * 0.08;

  switch (Math.round(obj.angle || 0) % 360) {
    case 0:
      break;

    case 90:
      y -= h;
      y += yOffset;
      break;

    case 180:
      x -= w;
      y -= h;
      break;

    case 270:
      // ^A0B - text flows upward from FO
      // Shift down by text width (vertical extent) and add font height offset
      y += rect.width;
      x -= fontHeight;
      break;
  }

  return {
    x: Math.round(x),
    y: Math.round(y)
  };
};

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

      // Get canvas text box dimensions - use element's stored width if available, otherwise visual width
      // Priority: widthDots property > (width * scaleX) > getScaledWidth()
      const storedWidthDots = (textObj as any).widthDots;
      const canvasTextWidth = storedWidthDots != null 
        ? Math.round(storedWidthDots)
        : Math.round((textObj.width || 0) * scaleX);
      const textHeight = Math.round(((textObj as any).getScaledHeight?.() as number) || ((textObj.height || 0) * scaleY));
      
      // Label dimensions in dots
      const labelWidthDots = Math.round((width * dpi) / 25.4);
      const labelHeightDots = Math.round((height * dpi) / 25.4);
      
      // Get FO position using bounding rect + rotation adjustment
      const foPos = getFoForZpl(textObj, boundaryLeft, boundaryTop);
      let xDots = foPos.x;
      let yDots = foPos.y;

      // Get horizontal alignment - this ONLY affects text rendering inside ^FB, NOT the FO position
      const textAlign = (textObj as any).textAlign || 'center';
      let alignment = 'C';
      if (textAlign === 'left') alignment = 'L';
      else if (textAlign === 'right') alignment = 'R';
      
      // Clamp to ensure non-negative FO
      if (xDots < 0) xDots = 0;
      if (yDots < 0) yDots = 0;
      
      // Clamp bottom edge
      if (yDots + textHeight > labelHeightDots) {
        yDots = labelHeightDots - textHeight;
        if (yDots < 0) yDots = 0;
      }

      zpl += `^FO${xDots},${yDots}\n`;
      zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
      
      // Fixed texts (i-text): no ^FB, just ^FD directly
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

      const isTekstiBox = (textBox as any).isTekstiBox || false;
      
      const scaleX = textBox.scaleX || 1;
      const scaleY = textBox.scaleY || 1;

      // For Teksti elements, use stored fontWidth/fontHeight; for others use fontSize * scale
      const exportFontWidth = isTekstiBox && (textBox as any).fontWidth
        ? Math.round((textBox as any).fontWidth)
        : Math.round(fontSize * scaleX);
      const exportFontHeight = isTekstiBox && (textBox as any).fontHeight
        ? Math.round((textBox as any).fontHeight)
        : Math.round(fontSize * scaleY);

      // For Teksti, use textbox width (bounding box) directly; for others use stored/scaled width
      const canvasTextWidth = isTekstiBox
        ? Math.round((textBox.width || 0) * scaleX)
        : ((textBox as any).widthDots != null 
          ? Math.round((textBox as any).widthDots)
          : Math.round((textBox.width || 0) * scaleX));
      const textHeight = Math.round(((textBox as any).getScaledHeight?.() as number) || ((textBox.height || 0) * scaleY));
      
      // Label dimensions in dots
      const labelWidthDots = Math.round((width * dpi) / 25.4);
      const labelHeightDots = Math.round((height * dpi) / 25.4);
      
      // Get FO position using bounding rect + rotation adjustment
      const foPos = getFoForZpl(textBox, boundaryLeft, boundaryTop);
      let xDots = foPos.x;
      let yDots = foPos.y;

      // Get horizontal alignment - only affects rendering inside ^FB, NOT FO position
      const textAlign = (textBox as any).textAlign || 'center';
      let alignment = 'C';
      if (textAlign === 'left') alignment = 'L';
      else if (textAlign === 'right') alignment = 'R';

      if (isMultilineText) {
        // Use textbox's actual rendered line count (includes wrapped lines, not just \n)
        const actualLineCount = (textBox as any)._textLines?.length || content.split('\n').length;
        // Add some buffer lines to ensure all text fits (text wrapping can vary)
        const maxLines = Math.max(actualLineCount, content.split('\n').length) + 2;
        const lineSpacing = 0;
        
        // Clamp to label bounds
        if (xDots < 0) xDots = 0;
        if (yDots < 0) yDots = 0;
        if (yDots + textHeight > labelHeightDots) {
          yDots = labelHeightDots - textHeight;
          if (yDots < 0) yDots = 0;
        }
        
        const zplText = content.replace(/\n/g, '\\&');
        
        // For 90°/270° rotation, FB "width" runs along the Y axis
        const isRotated90or270_tb = rotationCode === 'R' || rotationCode === 'B';
        
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        
        if (alignment === 'R') {
          zpl += `^FD${zplText}^FS\n`;
        } else if (alignment === 'L') {
          let fbWidth: number;
          if (rotationCode === 'R') {
            fbWidth = Math.max(1, labelHeightDots - yDots);
          } else if (rotationCode === 'B') {
            fbWidth = Math.max(1, labelHeightDots - yDots);
          } else {
            fbWidth = Math.max(1, labelWidthDots - xDots);
          }
          zpl += `^FB${fbWidth},${maxLines},${lineSpacing},L,0\n`;
          zpl += `^FD${zplText}^FS\n`;
        } else {
          const elementDim = isRotated90or270_tb ? textHeight : canvasTextWidth;
          const fbWidth = Math.max(1, Math.round(elementDim * 0.98));
          zpl += `^FB${fbWidth},${maxLines},${lineSpacing},C,0\n`;
          zpl += `^FD${zplText}^FS\n`;
        }
      } else {
        // Teksti elements: use ^FB with bounding box width for alignment
        
        const isRotated90or270_tb2 = rotationCode === 'R' || rotationCode === 'B';
        
        // For Teksti, FB width = textbox bounding box width (the frame the user sized)
        const tekstiBoxWidth = isTekstiBox
          ? Math.round((textBox.width || 0) * scaleX)
          : canvasTextWidth;
        
        // For Teksti at 90°, compensate for Fabric.js _fontSizeMult (1.13) internal padding
        if (isTekstiBox && rotationCode === 'R') {
          const fontSizeMultOffset = Math.round(exportFontHeight * 0.13);
          xDots -= fontSizeMultOffset;
        }
        
        // For Teksti at 180°, getFoForZpl subtracts full bounding box width (x -= w)
        // which makes X negative/zero. For ^FB we need the original X position.
        if (isTekstiBox && rotationCode === 'I') {
          // Restore X: add back what getFoForZpl subtracted (obj width * scaleX)
          const objWidth = Math.round((textBox.width || 0) * scaleX);
          xDots += objWidth;
          // Y: half font height too far up
          const halfFontHeight = Math.round(exportFontHeight * 0.5);
          yDots += halfFontHeight;
        }
        
        // For Teksti at 270°, compensate for ^FB origin differences
        if (isTekstiBox && rotationCode === 'B') {
          const rect270 = textBox.getBoundingRect(true);
          const objWidth = Math.round((textBox.width || 0) * scaleX);
          const objHeight = Math.round((textBox.height || 0) * scaleY);
          console.log('[ZPL 270° DEBUG] rect.width:', rect270.width, 'rect.height:', rect270.height, 
            'obj.width*scaleX:', objWidth, 'obj.height*scaleY:', objHeight,
            'exportFontHeight:', exportFontHeight, 'exportFontWidth:', exportFontWidth,
            'BEFORE xDots:', xDots, 'yDots:', yDots,
            'rect.left:', rect270.left, 'rect.top:', rect270.top,
            'boundaryLeft:', boundaryLeft, 'boundaryTop:', boundaryTop);
          // X: shift right by one font height (fontSize)
          xDots += exportFontHeight;
          // Y: no correction for now - testing baseline
          console.log('[ZPL 270° DEBUG] AFTER xDots:', xDots, 'yDots:', yDots);
        }
        
        // Clamp to label bounds AFTER rotation corrections
        if (xDots < 0) xDots = 0;
        if (yDots < 0) yDots = 0;
        if (yDots + textHeight > labelHeightDots) {
          yDots = labelHeightDots - textHeight;
          if (yDots < 0) yDots = 0;
        }
        
        zpl += `^FO${xDots},${yDots}\n`;
        zpl += `^A0${rotationCode},${exportFontHeight},${exportFontWidth}\n`;
        
        // Teksti: always use ^FB with bounding box dimension for proper alignment
        let fbWidth: number;
        if (isRotated90or270_tb2) {
          // Rotated 90/270: FB width should use textbox's original width (the user-sized frame)
          fbWidth = Math.max(1, tekstiBoxWidth);
        } else {
          fbWidth = Math.max(1, tekstiBoxWidth);
        }
        zpl += `^FB${fbWidth},1,0,${alignment},0\n`;
        zpl += `^FD${content}^FS\n`;
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
      // Legacy barcode handling (EAN-13 via ^BE)
      const barcodeData = (obj as any).barcodeDataNormalized || (obj as any).barcodeData || "";
      
      const rotation = Math.round(obj.angle || 0);
      
      let rotationCode = "N";
      if (rotation >= 45 && rotation < 135) rotationCode = "R";
      else if (rotation >= 135 && rotation < 225) rotationCode = "I";
      else if (rotation >= 225 && rotation < 315) rotationCode = "B";

      // Get scaled dimensions
      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      // Calculate module width from element width (EAN-13 has 95 modules)
      const moduleWidth = Math.max(1, Math.min(10, Math.round(widthScaled / 95)));

      const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+widthScaled/2, y: (obj.top||0)+heightScaled/2 };
      const cx = Math.round(center.x - boundaryLeft);
      const cy = Math.round(center.y - boundaryTop);

      const halfW = Math.round(((rotationCode === "R" || rotationCode === "B") ? heightScaled : widthScaled) / 2);
      const halfH = Math.round(((rotationCode === "R" || rotationCode === "B") ? widthScaled : heightScaled) / 2);
      const bx = cx - halfW;
      const by = cy - halfH;

      zpl += `^FO${bx},${by}\n`;
      zpl += `^BY${moduleWidth}\n`;
      zpl += `^BE${rotationCode},${heightScaled},Y,N\n`;
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
      
      // Handle rotation - for 90/270 degrees, width and height are swapped visually
      const rotation = Math.round(obj.angle || 0) % 360;
      const isRotated90or270 = rotation === 90 || rotation === 270;
      
      if (storedParams) {
        // Use pre-computed parameters for exact 1:1 match
        // Use barHeightDots (bars only) for positioning, not heightDots (which includes text)
        // For rotated barcodes, swap width/height for position calculation
        const halfW = isRotated90or270 
          ? Math.round(storedParams.barHeightDots / 2) 
          : Math.round(storedParams.widthDots / 2);
        const halfH = isRotated90or270 
          ? Math.round(storedParams.widthDots / 2) 
          : Math.round(storedParams.barHeightDots / 2);
        
        const barcodeElement: BarcodeElementData = {
          type: storedParams.type,
          value: storedParams.value,
          x: cx - halfW,
          y: cy - halfH,
          width: storedParams.widthDots,
          height: storedParams.barHeightDots, // Use bar-only height for ZPL commands
          rotation: rotation,
          size: storedParams.size || (storedParams.qrMagnification || storedParams.barWidthDots || BARCODE_SIZE_DEFAULT),
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
        
        // For rotated barcodes, swap width/height for position calculation
        const halfW = isRotated90or270 ? Math.round(heightScaled / 2) : Math.round(widthScaled / 2);
        const halfH = isRotated90or270 ? Math.round(widthScaled / 2) : Math.round(heightScaled / 2);
        
        // Estimate size from width
        const estimatedSize = barcodeType === 'QR' 
          ? estimateQrMagnificationSync(widthScaled, codeData) 
          : computeBarWidth(widthScaled, barcodeType);
        
        const barcodeElement: BarcodeElementData = {
          type: barcodeType,
          value: codeData,
          x: cx - halfW,
          y: cy - halfH,
          width: widthScaled,
          height: heightScaled,
          rotation: rotation,
          size: (obj as any).codeSize || estimatedSize,
          humanReadable: (obj as any).humanReadable !== false,
          qrErrorCorrection: (obj as any).qrErrorCorrection || 'M',
          qrMagnification: barcodeType === 'QR' ? estimatedSize : undefined
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

      // Check if this is a placeholder image or fixed image
      const isFixedImage = (obj as any).isFixedImage !== false; // Default to true for backward compatibility
      const imageFieldName = (obj as any).imageFieldName || "";

      // Calculate scaled dimensions first (needed for both placeholder and fixed)
      const widthScaled = Math.round(typeof (obj as any).getScaledWidth === "function" ? (obj as any).getScaledWidth() : (obj.width || 0) * ((obj as any).scaleX || 1));
      const heightScaled = Math.round(typeof (obj as any).getScaledHeight === "function" ? (obj as any).getScaledHeight() : (obj.height || 0) * ((obj as any).scaleY || 1));

      // If it's a placeholder image and we're exporting with placeholders, output the placeholder
      // withValues = true means "export with placeholder names" (like Text1, Image1)
      // withValues = false means "export with actual current values"
      if (!isFixedImage && imageFieldName && withValues) {
        // Position using center with rotation consideration
        let finalWidth = widthScaled;
        let finalHeight = heightScaled;
        if (rotationCode === "R" || rotationCode === "B") {
          finalWidth = heightScaled;
          finalHeight = widthScaled;
        }
        
        const center = (obj as any).getCenterPoint ? (obj as any).getCenterPoint() : { x: (obj.left||0)+widthScaled/2, y: (obj.top||0)+heightScaled/2 };
        const cx = Math.round(center.x - boundaryLeft);
        const cy = Math.round(center.y - boundaryTop);
        const ix = cx - Math.round(finalWidth / 2);
        const iy = cy - Math.round(finalHeight / 2);

        // Output placeholder with ^FO for position, then ^FX comment with name and dimensions
        zpl += `^FO${ix},${iy}\n`;
        zpl += `^FX IMAGE_PLACEHOLDER: ${imageFieldName}, ${finalWidth}, ${finalHeight}^FS\n`;
        return;
      }

      // Get the original image element for rotation processing (only needed for fixed images)
      const imgElement = imageObj.getElement() as HTMLImageElement | HTMLCanvasElement | undefined;
      if (!imgElement) return;

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
