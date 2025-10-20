import JsBarcode from "jsbarcode";
import QRCode from "qrcode-generator";

interface CanvasPrintOptions {
  labelWidth: number; // mm
  labelHeight: number; // mm
  dpi: number;
  rotate180?: boolean;
}

export const renderLabelToCanvas = (fabricCanvas: any, options: CanvasPrintOptions): HTMLCanvasElement => {
  const { labelWidth, labelHeight, dpi, rotate180 } = options;
  
  // Calculate canvas size in pixels
  const widthPx = Math.round(labelWidth * (dpi / 25.4));
  const heightPx = Math.round(labelHeight * (dpi / 25.4));
  
  // Create output canvas
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  // Fill with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  
  // Apply rotation if needed
  if (rotate180) {
    ctx.translate(widthPx, heightPx);
    ctx.rotate(Math.PI);
  }
  
  // Get all objects from fabric canvas
  const objects = fabricCanvas.getObjects();
  
  // Calculate offset (fabric canvas has 200px margin)
  const offsetX = 200;
  const offsetY = 200;
  
  // Render each object
  objects.forEach((obj: any) => {
    if (obj.type === "rect" && obj.isLabelBoundary) return; // Skip label boundary
    
    ctx.save();
    
    const left = obj.left - offsetX;
    const top = obj.top - offsetY;
    
    if (obj.type === "i-text") {
      renderText(ctx, obj, left, top);
    } else if (obj.type === "image") {
      if (obj.barcodeData) {
        renderBarcode(ctx, obj, left, top, dpi);
      } else if (obj.qrData) {
        renderQRCode(ctx, obj, left, top);
      } else {
        renderImage(ctx, obj, left, top);
      }
    } else if (obj.type === "rect") {
      renderRect(ctx, obj, left, top);
    } else if (obj.type === "line") {
      renderLine(ctx, obj, left, top);
    } else if (obj.type === "ellipse") {
      renderEllipse(ctx, obj, left, top);
    }
    
    ctx.restore();
  });
  
  return canvas;
};

const renderText = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  const text = obj.text || "";
  const fontSize = obj.fontSize * obj.scaleY;
  const fontFamily = obj.fontFamily || "Arial";
  const fontWeight = obj.fontWeight || "normal";
  
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = obj.fill || "#000000";
  ctx.textAlign = obj.originX === "center" ? "center" : "left";
  ctx.textBaseline = obj.originY === "center" ? "middle" : "top";
  
  // Apply character spacing
  if (obj.charSpacing && obj.charSpacing > 0) {
    let currentX = left;
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], currentX, top);
      const charWidth = ctx.measureText(text[i]).width;
      currentX += charWidth + (obj.charSpacing * obj.scaleX / 1000);
    }
  } else {
    ctx.fillText(text, left, top);
  }
};

const renderBarcode = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number, dpi: number) => {
  const barcodeData = obj.barcodeData;
  if (!barcodeData) return;
  
  // Create temporary canvas for barcode
  const tempCanvas = document.createElement("canvas");
  
  // Calculate module width based on DPI to match ZPL output
  const moduleWidth = Math.round(2 * (dpi / 203)); // Scale from 203 DPI baseline
  
  try {
    JsBarcode(tempCanvas, barcodeData, {
      format: "EAN13",
      width: moduleWidth,
      height: Math.round(obj.height * obj.scaleY * 0.8), // Bar height
      displayValue: true,
      fontSize: Math.round(14 * (dpi / 203)),
      margin: 10,
      background: "#ffffff",
      lineColor: "#000000",
    });
    
    // Calculate position (centered origin)
    const drawLeft = obj.originX === "center" ? left - tempCanvas.width / 2 : left;
    const drawTop = obj.originY === "center" ? top - tempCanvas.height / 2 : top;
    
    ctx.drawImage(tempCanvas, drawLeft, drawTop);
  } catch (error) {
    console.error("Error rendering barcode:", error);
  }
};

const renderQRCode = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  const qrData = obj.qrData;
  if (!qrData) return;
  
  const size = Math.round(Math.min(obj.width * obj.scaleX, obj.height * obj.scaleY));
  const moduleSize = Math.max(2, Math.round(size / 33)); // QR code modules
  
  const qr = QRCode(0, "M");
  qr.addData(qrData);
  qr.make();
  
  const moduleCount = qr.getModuleCount();
  const qrSize = moduleCount * moduleSize;
  
  // Calculate position (centered origin)
  const drawLeft = obj.originX === "center" ? left - qrSize / 2 : left;
  const drawTop = obj.originY === "center" ? top - qrSize / 2 : top;
  
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(drawLeft, drawTop, qrSize, qrSize);
  
  ctx.fillStyle = "#000000";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          drawLeft + col * moduleSize,
          drawTop + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
};

const renderImage = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  if (!obj._element) return;
  
  const width = obj.width * obj.scaleX;
  const height = obj.height * obj.scaleY;
  
  // Calculate position (centered origin)
  const drawLeft = obj.originX === "center" ? left - width / 2 : left;
  const drawTop = obj.originY === "center" ? top - height / 2 : top;
  
  ctx.drawImage(obj._element, drawLeft, drawTop, width, height);
};

const renderRect = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  const width = obj.width * obj.scaleX;
  const height = obj.height * obj.scaleY;
  
  // Calculate position (centered origin)
  const drawLeft = obj.originX === "center" ? left - width / 2 : left;
  const drawTop = obj.originY === "center" ? top - height / 2 : top;
  
  if (obj.fill && obj.fill !== "transparent") {
    ctx.fillStyle = obj.fill;
    ctx.fillRect(drawLeft, drawTop, width, height);
  }
  
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth || 1;
    ctx.strokeRect(drawLeft, drawTop, width, height);
  }
};

const renderLine = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  const x1 = obj.x1 * obj.scaleX;
  const y1 = obj.y1 * obj.scaleY;
  const x2 = obj.x2 * obj.scaleX;
  const y2 = obj.y2 * obj.scaleY;
  
  ctx.strokeStyle = obj.stroke || "#000000";
  ctx.lineWidth = obj.strokeWidth || 1;
  ctx.lineCap = obj.strokeLineCap || "butt";
  
  ctx.beginPath();
  ctx.moveTo(left + x1, top + y1);
  ctx.lineTo(left + x2, top + y2);
  ctx.stroke();
};

const renderEllipse = (ctx: CanvasRenderingContext2D, obj: any, left: number, top: number) => {
  const rx = obj.rx * obj.scaleX;
  const ry = obj.ry * obj.scaleY;
  
  ctx.beginPath();
  ctx.ellipse(left, top, rx, ry, 0, 0, 2 * Math.PI);
  
  if (obj.fill && obj.fill !== "transparent") {
    ctx.fillStyle = obj.fill;
    ctx.fill();
  }
  
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth || 1;
    ctx.stroke();
  }
};

export const openPrintWindow = (canvas: HTMLCanvasElement, labelWidth: number, labelHeight: number) => {
  const dataUrl = canvas.toDataURL("image/png");
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Failed to open print window. Please allow pop-ups.");
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Label</title>
        <style>
          @page {
            size: ${labelWidth}mm ${labelHeight}mm;
            margin: 0;
          }
          @media print {
            html, body {
              width: ${labelWidth}mm;
              height: ${labelHeight}mm;
              margin: 0;
              padding: 0;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f0f0f0;
          }
          .container {
            background: white;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          img {
            display: block;
            max-width: 100%;
            height: auto;
          }
          .no-print {
            text-align: center;
            margin-top: 20px;
          }
          @media print {
            .no-print {
              display: none;
            }
            .container {
              padding: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${dataUrl}" alt="Label" />
          <div class="no-print">
            <p>Click Print or press Ctrl+P</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
};
