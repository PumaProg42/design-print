export interface BarcodeResponse {
  imageDataUrl: string;
  zpl: string;
}

const API_BASE = "https://api.labelary.com/v1/barcodes";

export async function generateBarcode(
  type: "qrcode" | "ean8" | "ean13" | "code128",
  data: string,
  scale: number = 2,
  height: number = 50
): Promise<BarcodeResponse> {
  // Build query parameters for GET request
  const params = new URLSearchParams({
    type: type === "qrcode" ? "qr" : type, // API uses 'qr' not 'qrcode'
    data: data,
    xdim: scale.toString(), // Module width (bar width)
  });

  // Add height for linear barcodes (not QR)
  if (type !== "qrcode") {
    params.append("ydim", height.toString()); // Module height (bar height)
  }

  // Use GET request with query parameters
  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Labelary API error: ${response.status} - ${errorText}`);
  }

  // Get the PNG image as blob
  const blob = await response.blob();
  
  // Crop the Labelary footer before using the image
  const imageDataUrl = await cropLabelaryFooter(blob, type);

  // Generate ZPL command for the barcode
  const zpl = generateZPLCommand(type, data, height);

  return {
    imageDataUrl,
    zpl,
  };
}

async function cropLabelaryFooter(blob: Blob, type: "qrcode" | "ean8" | "ean13" | "code128"): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      if (type === "qrcode") {
        // QR codes: crop 25% from left/right, 8% from top, 14% from bottom
        const horizontalCropPercent = 0.25;
        const topCropPercent = 0.08;
        const bottomCropPercent = 0.14;
        
        const horizontalCrop = Math.floor(img.width * horizontalCropPercent);
        const topCrop = Math.floor(img.height * topCropPercent);
        const bottomCrop = Math.floor(img.height * bottomCropPercent);
        
        const croppedWidth = img.width - (horizontalCrop * 2);
        const croppedHeight = img.height - topCrop - bottomCrop;
        
        // Set canvas to cropped size
        canvas.width = croppedWidth;
        canvas.height = croppedHeight;
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the center part (QR code without borders and footer)
        ctx.drawImage(
          img,
          horizontalCrop, topCrop, croppedWidth, croppedHeight, // Source: center portion
          0, 0, croppedWidth, croppedHeight  // Destination: fill canvas
        );
      } else {
        // Linear barcodes: crop only 18% from bottom
        const cropPercentage = 0.18;
        const footerHeight = Math.floor(img.height * cropPercentage);
        const croppedHeight = img.height - footerHeight;
        
        // Set canvas to cropped size
        canvas.width = img.width;
        canvas.height = croppedHeight;
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw only the top part (barcode without footer)
        ctx.drawImage(
          img,
          0, 0, img.width, croppedHeight, // Source: top portion only
          0, 0, img.width, croppedHeight  // Destination: fill canvas
        );
      }
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

function generateZPLCommand(
  type: "qrcode" | "ean8" | "ean13" | "code128",
  data: string,
  height: number
): string {
  switch (type) {
    case "qrcode":
      // ^BQN,2,10
      // ^FDLA,{content}^FS
      return `^BQN,2,10\n^FDLA,${data}^FS`;
      
    case "ean8":
      // ^BE,N,{height},{print_interpretation},{print_check_digit}
      return `^BEN,${height},Y,N`;
      
    case "ean13":
      // ^BEN,{height},Y,N
      return `^BEN,${height},Y,N`;
      
    case "code128":
      // ^BCN,{height},Y,N,N
      return `^BCN,${height},Y,N,N`;
      
    default:
      return "";
  }
}
