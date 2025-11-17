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
 */
async function generateQRPreview(
  value: string,
  sizePx: number,
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: errorCorrection,
      width: sizePx,
      margin: 1,
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

      JsBarcode(canvas, validatedValue, {
        format,
        width: Math.max(1, Math.floor(widthPx / 95)), // Approximate module width
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
  const { x, y, value, height, rotation, humanReadable } = element;
  
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
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^B8${rotationCode},${barHeight},${printInterpretation}\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-13 using ^BE command
 */
function buildEan13Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable } = element;
  
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
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BE${rotationCode},${barHeight},${printInterpretation}\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for Code 128 using ^BC command
 */
function buildCode128Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable } = element;
  
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
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
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

/**
 * Estimate QR magnification from desired size in dots
 * QR codes are square, so we use width
 */
export function estimateQrMagnification(widthDots: number, value: string): number {
  // Estimate module count based on data length (rough approximation)
  // QR version 1 = 21x21, version 2 = 25x25, etc.
  let estimatedModules = 21;
  if (value.length > 10) estimatedModules = 25;
  if (value.length > 20) estimatedModules = 29;
  if (value.length > 40) estimatedModules = 33;
  
  // magnification = widthDots / (modules + quiet zone)
  // Add ~8 dots for quiet zone (4 modules on each side)
  const mag = Math.round(widthDots / (estimatedModules + 8));
  return Math.max(1, Math.min(10, mag));
}
