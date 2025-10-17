export const convertImageToZplGFA = async (
  imageData: Blob | string,
  dpi: number,
  targetWidthDots?: number,
  targetHeightDots?: number
): Promise<{ zpl: string; widthPx: number; heightPx: number }> => {
  // IMPORTANT: imageData is the 1-bit black-and-white converted image from ImageDialog
  // It contains only pure black (0) or white (255) pixels after threshold conversion
  // This function encodes this exact image into ZPL ^GF format
  const img = await loadImageFromData(imageData);
  
  // Create canvas and scale to DPI or to target dimensions
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Preserve original 1-bit pixels by default; only scale when explicit target size is provided
  let width = targetWidthDots ?? img.width;
  let height = targetHeightDots ?? img.height;

  // If only one target dimension is provided, preserve aspect ratio
  if (targetWidthDots && !targetHeightDots) {
    const aspect = img.height / img.width;
    height = Math.round(width * aspect);
  } else if (!targetWidthDots && targetHeightDots) {
    const aspect = img.width / img.height;
    width = Math.round(height * aspect);
  }
  
  canvas.width = width;
  canvas.height = height;
  // Ensure nearest-neighbor scaling to keep 1-bit edges crisp
  ;(ctx as any).imageSmoothingEnabled = false;
  ;(ctx as any).mozImageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  // STEP 1: Get image data from canvas
  const imageDataObj = ctx.getImageData(0, 0, width, height);
  const pixels = imageDataObj.data;
  
  // STEP 2: Encode the 1-bit black-and-white image to bitmap
  // The image is ALREADY converted to pure black (0,0,0) or white (255,255,255) from ImageDialog
  // We just need to read the pixel values and encode them - NO threshold conversion needed
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bytesPerRow; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        if (pixelX < width) {
          const idx = (y * width + pixelX) * 4;
          
          // Read the pixel value from the red channel (already 0 or 255 in 1-bit source)
          const value = pixels[idx];
          
          // Dark pixel (value < 128) -> print black (bit 1)
          if (value < 128) {
            byte |= 1 << (7 - bit);
          }
          // White pixels (>=128) -> leave 0
        }
      }
      bitmap.push(byte);
    }
  }

  // STEP 3: Convert 1-bit bitmap to hexadecimal string
  const hexData = bitmap.map(b => b.toString(16).padStart(2, "0").toUpperCase()).join("");
  
  // STEP 4: Generate ZPL ^GFA command with the encoded bitmap
  // Format: ^GFA,<total_bytes>,<total_bytes>,<bytes_per_row>,<hex_data>
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
