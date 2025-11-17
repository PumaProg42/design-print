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
        // Adaptive crop for QR codes by detecting content bounds
        // Draw image to a temp canvas to analyze pixel densities
        const temp = document.createElement('canvas');
        temp.width = img.width;
        temp.height = img.height;
        const tctx = temp.getContext('2d');
        if (!tctx) {
          reject(new Error('Could not get temp canvas context'));
          return;
        }
        tctx.drawImage(img, 0, 0);
        const imageData = tctx.getImageData(0, 0, temp.width, temp.height);
        const { data, width, height } = imageData;

        const isDark = (idx: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return (r + g + b) < 600; // avg < 200 considered dark
        };

        const rowDensity = (y: number) => {
          let count = 0;
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (isDark(i)) count++;
          }
          return count / width;
        };

        const colDensity = (x: number) => {
          let count = 0;
          for (let y = 0; y < height; y++) {
            const i = (y * width + x) * 4;
            if (isDark(i)) count++;
          }
          return count / height;
        };

        const DENSITY_THRESHOLD = 0.12; // rows/cols above this are likely QR content
        const CONSECUTIVE = 3; // require consecutive rows/cols to avoid noise

        const findFromTop = () => {
          let run = 0;
          for (let y = 0; y < height; y++) {
            if (rowDensity(y) > DENSITY_THRESHOLD) {
              run++;
              if (run >= CONSECUTIVE) return y - CONSECUTIVE + 1;
            } else run = 0;
          }
          return Math.floor(height * 0.06); // fallback
        };
        const findFromBottom = () => {
          let run = 0;
          for (let y = height - 1; y >= 0; y--) {
            if (rowDensity(y) > DENSITY_THRESHOLD) {
              run++;
              if (run >= CONSECUTIVE) {
                // Add extra padding to ensure footer text is excluded
                return Math.min(height - 1, y + CONSECUTIVE + 15);
              }
            } else run = 0;
          }
          return Math.floor(height * (1 - 0.14)); // fallback near QR bottom above footer
        };
        const findFromLeft = () => {
          let run = 0;
          for (let x = 0; x < width; x++) {
            if (colDensity(x) > DENSITY_THRESHOLD) {
              run++;
              if (run >= CONSECUTIVE) return x - CONSECUTIVE + 1;
            } else run = 0;
          }
          return Math.floor(width * 0.21); // fallback
        };
        const findFromRight = () => {
          let run = 0;
          for (let x = width - 1; x >= 0; x--) {
            if (colDensity(x) > DENSITY_THRESHOLD) {
              run++;
              if (run >= CONSECUTIVE) return x + CONSECUTIVE - 1;
            } else run = 0;
          }
          return Math.floor(width * (1 - 0.21)); // fallback
        };

        let left = findFromLeft();
        let right = findFromRight();
        let top = findFromTop();
        let bottom = findFromBottom();

        // Clamp bounds and fallback if detection failed
        left = Math.max(0, left);
        top = Math.max(0, top);
        right = Math.min(width - 1, right);
        bottom = Math.min(height - 1, bottom);

        if (right - left < 10 || bottom - top < 10) {
          // Conservative fallback to safe percentage crop
          const l = Math.floor(width * 0.21);
          const t = Math.floor(height * 0.06);
          const b = Math.floor(height * 0.14);
          left = l;
          top = t;
          right = width - l - 1;
          bottom = height - b - 1;
        }

        const croppedWidth = Math.max(1, right - left + 1);
        const croppedHeight = Math.max(1, bottom - top + 1);

        // Set canvas to cropped size
        canvas.width = croppedWidth;
        canvas.height = croppedHeight;

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw detected QR area
        ctx.drawImage(
          img,
          left, top, croppedWidth, croppedHeight, // Source
          0, 0, croppedWidth, croppedHeight // Destination
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
