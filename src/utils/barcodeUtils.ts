import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Barcode types supported by the system
 */
export type BarcodeType = 'QR' | 'EAN_8' | 'EAN_13' | 'CODE_128';

/**
 * Shared barcode element data model
 */
export interface BarcodeElementData {
  type: BarcodeType;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  humanReadable?: boolean;
  moduleWidthDots?: number;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  qrMagnification?: number;
}

/**
 * Calculate EAN-8 checksum digit
 */
export function calculateEAN8Checksum(digits: string): string {
  const cleaned = digits.replace(/\D/g, '');
  
  if (cleaned.length !== 7 && cleaned.length !== 8) {
    throw new Error('EAN-8 must have 7 or 8 digits');
  }
  
  if (cleaned.length === 8) {
    // Validate existing checksum
    const base = cleaned.slice(0, 7);
    const provided = cleaned[7];
    const calculated = computeEAN8Check(base);
    if (provided !== calculated) {
      throw new Error('Invalid EAN-8 checksum');
    }
    return cleaned;
  }
  
  // Calculate and append checksum
  return cleaned + computeEAN8Check(cleaned);
}

function computeEAN8Check(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const weight = (i % 2 === 0) ? 3 : 1;
    sum += parseInt(digits[i]) * weight;
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Calculate EAN-13 checksum digit
 */
export function calculateEAN13Checksum(digits: string): string {
  const cleaned = digits.replace(/\D/g, '');
  
  if (cleaned.length !== 12 && cleaned.length !== 13) {
    throw new Error('EAN-13 must have 12 or 13 digits');
  }
  
  if (cleaned.length === 13) {
    // Validate existing checksum
    const base = cleaned.slice(0, 12);
    const provided = cleaned[12];
    const calculated = computeEAN13Check(base);
    if (provided !== calculated) {
      throw new Error('Invalid EAN-13 checksum');
    }
    return cleaned;
  }
  
  // Calculate and append checksum
  return cleaned + computeEAN13Check(cleaned);
}

function computeEAN13Check(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = (i % 2 === 0) ? 1 : 3;
    sum += parseInt(digits[i]) * weight;
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Validate Code 128 data
 */
export function validateCode128(value: string): boolean {
  // Code 128 supports all ASCII characters 0-127
  return value.length > 0 && value.split('').every(c => c.charCodeAt(0) <= 127);
}

/**
 * Generate barcode preview as data URL for canvas rendering
 */
export async function generateBarcodePreview(
  type: BarcodeType,
  value: string,
  widthPx: number,
  heightPx: number,
  options?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    displayValue?: boolean;
  }
): Promise<string> {
  if (type === 'QR') {
    return generateQRPreview(value, widthPx, options?.errorCorrection || 'M');
  } else {
    return generateLinearBarcodePreview(type, value, widthPx, heightPx, options?.displayValue !== false);
  }
}

/**
 * Generate QR code preview using qrcode library
 * Uses magnification-based sizing to match ZPL output
 */
async function generateQRPreview(
  value: string,
  sizePx: number,
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
): Promise<string> {
  try {
    // First, generate QR to determine actual module count
    const tempCanvas = document.createElement('canvas');
    await QRCode.toCanvas(tempCanvas, value, {
      errorCorrectionLevel: errorCorrection,
      margin: 0
    });
    const moduleCount = tempCanvas.width; // QR codes are square
    
    // Compute magnification (module size in pixels/dots)
    const magnification = Math.max(1, Math.min(10, Math.floor(sizePx / moduleCount)));
    
    // Actual render size should match magnification * modules
    const actualSize = moduleCount * magnification;
    
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: errorCorrection,
      width: actualSize,
      margin: 0, // No margin for accurate sizing
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate linear barcode preview using jsbarcode
 * Uses the same bar width computation as ZPL export for 1:1 matching
 */
function generateLinearBarcodePreview(
  type: BarcodeType,
  value: string,
  widthPx: number,
  heightPx: number,
  displayValue: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      let format: string;
      let validatedValue = value;

      if (type === 'EAN_8') {
        format = 'EAN8';
        validatedValue = calculateEAN8Checksum(value);
      } else if (type === 'EAN_13') {
        format = 'EAN13';
        validatedValue = calculateEAN13Checksum(value);
      } else if (type === 'CODE_128') {
        format = 'CODE128';
        if (!validateCode128(value)) {
          throw new Error('Invalid Code 128 data');
        }
      } else {
        throw new Error(`Unsupported barcode type: ${type}`);
      }

      // Compute bar width using the same logic as ZPL export
      const barWidth = computeBarWidth(widthPx, type);

      JsBarcode(canvas, validatedValue, {
        format,
        width: barWidth, // Use computed bar width for 1:1 matching
        height: heightPx,
        displayValue,
        margin: 0,
        background: '#FFFFFF',
        lineColor: '#000000'
      });

      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Barcode generation failed:', error);
      reject(error);
    }
  });
}

/**
 * Build ZPL for barcode element
 */
export function buildBarcodeZpl(element: BarcodeElementData): string {
  switch (element.type) {
    case 'QR':
      return buildQrZpl(element);
    case 'EAN_8':
      return buildEan8Zpl(element);
    case 'EAN_13':
      return buildEan13Zpl(element);
    case 'CODE_128':
      return buildCode128Zpl(element);
    default:
      throw new Error(`Unsupported barcode type: ${element.type}`);
  }
}

/**
 * Build ZPL for QR Code using ^BQ command
 */
function buildQrZpl(element: BarcodeElementData): string {
  const { x, y, value, rotation, qrMagnification, qrErrorCorrection } = element;
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  // Error correction level (default Q)
  const ecLevel = qrErrorCorrection || 'Q';
  
  // Magnification (1-10, default derived from size)
  const mag = Math.max(1, Math.min(10, Math.round(qrMagnification || 5)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BQ${rotationCode},2,${mag}\n`;
  zpl += `^FD${ecLevel}A,${value}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-8 using ^B8 command
 */
function buildEan8Zpl(element: BarcodeElementData): string {
  const { x, y, value, width, height, rotation, humanReadable, moduleWidthDots } = element;
  
  // Validate and normalize
  const data = calculateEAN8Checksum(value);
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Compute bar width from element width
  const barWidth = moduleWidthDots || computeBarWidth(width, 'EAN_8');
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${barWidth},2,${barHeight}\n`; // Set bar width and height
  zpl += `^B8${rotationCode},${barHeight},${printInterpretation}\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-13 using ^BE command
 */
function buildEan13Zpl(element: BarcodeElementData): string {
  const { x, y, value, width, height, rotation, humanReadable, moduleWidthDots } = element;
  
  // Validate and normalize
  const data = calculateEAN13Checksum(value);
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Compute bar width from element width
  const barWidth = moduleWidthDots || computeBarWidth(width, 'EAN_13');
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${barWidth},2,${barHeight}\n`; // Set bar width and height
  zpl += `^BE${rotationCode},${barHeight},${printInterpretation}\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for Code 128 using ^BC command
 */
function buildCode128Zpl(element: BarcodeElementData): string {
  const { x, y, value, width, height, rotation, humanReadable, moduleWidthDots } = element;
  
  if (!validateCode128(value)) {
    throw new Error('Invalid Code 128 data');
  }
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Compute bar width from element width
  const barWidth = moduleWidthDots || computeBarWidth(width, 'CODE_128');
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${barWidth},2,${barHeight}\n`; // Set bar width and height
  zpl += `^BC${rotationCode},${barHeight},${printInterpretation},N,N\n`;
  zpl += `^FD${value}^FS\n`;
  
  return zpl;
}

/**
 * Convert mm to dots based on DPI
 */
export function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Convert dots to mm based on DPI
 */
export function dotsToMm(dots: number, dpi: number): number {
  return (dots * 25.4) / dpi;
}

// Linear barcode module counts
const EAN8_MODULES = 67;
const EAN13_MODULES = 95;
const CODE128_AVG_MODULES = 100; // Approximate average for typical data

/**
 * Compute bar width for linear barcodes from element width
 */
export function computeBarWidth(widthDots: number, type: BarcodeType): number {
  let modules: number;
  
  switch (type) {
    case 'EAN_8':
      modules = EAN8_MODULES;
      break;
    case 'EAN_13':
      modules = EAN13_MODULES;
      break;
    case 'CODE_128':
      modules = CODE128_AVG_MODULES;
      break;
    default:
      modules = 95; // fallback
  }
  
  const rawBarWidth = widthDots / modules;
  return Math.max(1, Math.min(10, Math.round(rawBarWidth)));
}

/**
 * Get actual QR code module count for a given value and error correction level
 */
async function getQrModuleCount(value: string, errorCorrection: 'L' | 'M' | 'Q' | 'H'): Promise<number> {
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: errorCorrection,
      margin: 0
    });
    // QR codes are square, so width = height in modules
    // The canvas size equals the module count (with margin 0)
    return canvas.width;
  } catch (error) {
    // Fallback estimation based on data length
    if (value.length <= 10) return 21;
    if (value.length <= 20) return 25;
    if (value.length <= 40) return 29;
    return 33;
  }
}

/**
 * Estimate QR magnification from desired size in dots
 * Uses actual QR module count for accurate sizing
 */
export async function estimateQrMagnification(
  widthDots: number, 
  value: string, 
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'
): Promise<number> {
  const moduleCount = await getQrModuleCount(value, errorCorrection);
  
  // magnification = widthDots / moduleCount
  // The qrcode library already includes margin, so use raw module count
  const mag = Math.floor(widthDots / moduleCount);
  return Math.max(1, Math.min(10, mag));
}

/**
 * Synchronous version for quick estimation (uses data length approximation)
 */
export function estimateQrMagnificationSync(widthDots: number, value: string): number {
  // Estimate module count based on data length (rough approximation)
  let estimatedModules = 21;
  if (value.length > 10) estimatedModules = 25;
  if (value.length > 20) estimatedModules = 29;
  if (value.length > 40) estimatedModules = 33;
  
  const mag = Math.floor(widthDots / estimatedModules);
  return Math.max(1, Math.min(10, mag));
}
