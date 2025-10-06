export const convertImageToZplGFA = async (
  imageData: Blob | string,
  dpi: number
): Promise<{ zpl: string; widthPx: number; heightPx: number }> => {
  // Load image
  const img = await loadImageFromData(imageData);
  
  // Create canvas and scale to DPI
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Scale image to target DPI (assuming source is 96 DPI)
  const scale = dpi / 96;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Get image data and convert to monochrome
  const imageDataObj = ctx.getImageData(0, 0, width, height);
  const pixels = imageDataObj.data;
  
  // Convert to monochrome using threshold
  const threshold = 128;
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bytesPerRow; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        if (pixelX < width) {
          const idx = (y * width + pixelX) * 4;
          // Convert to grayscale
          const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
          // Apply threshold (1 = black, 0 = white in ZPL)
          if (gray < threshold) {
            byte |= 1 << (7 - bit);
          }
        }
      }
      bitmap.push(byte);
    }
  }

  // Convert to hex string
  const hexData = bitmap.map(b => b.toString(16).padStart(2, "0").toUpperCase()).join("");
  
  // Generate ZPL ^GFA command
  const totalBytes = bitmap.length;
  const zpl = `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}`;

  return { zpl, widthPx: width, heightPx: height };
};

const loadImageFromData = (data: Blob | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    if (typeof data === "string") {
      img.src = data;
    } else {
      img.src = URL.createObjectURL(data);
    }
  });
};

export const calculateEAN13Checksum = (digits: string): string => {
  if (digits.length !== 12 || !/^\d{12}$/.test(digits)) {
    throw new Error("EAN-13 requires exactly 12 digits");
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return digits + checksum;
};
