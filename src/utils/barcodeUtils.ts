import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Barcode types supported by the system
 */
export type BarcodeType = 'QR' | 'EAN_8' | 'EAN_13' | 'CODE_128';

/**
 * Size (1-10) maps directly to:
 * - Linear barcodes: ^BY module width in dots
 * - QR codes: ^BQ magnification factor
 */
export const BARCODE_SIZE_MIN = 1;
export const BARCODE_SIZE_MAX = 10;
export const BARCODE_SIZE_DEFAULT = 2;
export const QR_SIZE_DEFAULT = 4;

/**
 * Linear barcode module counts (total modules in the barcode)
 */
export const EAN8_MODULES = 67;
export const EAN13_MODULES = 95;
// Code 128: start(11) + data(11*n) + check(11) + stop(13) = 35 + 11*n
export const getCode128Modules = (dataLength: number) => 35 + (11 * dataLength);

/**
 * QR code base module count (Version 1 = 21x21)
 */
export const QR_BASE_MODULES = 21;

/**
 * Calculate barcode width in dots from Size and barcode type
 * Width = modules * size (module width)
 */
export function calculateBarcodeWidthDots(type: BarcodeType, size: number, dataLength?: number): number {
  const clampedSize = Math.max(BARCODE_SIZE_MIN, Math.min(BARCODE_SIZE_MAX, size));
  
  switch (type) {
    case 'EAN_8':
      return EAN8_MODULES * clampedSize;
    case 'EAN_13':
      return EAN13_MODULES * clampedSize;
    case 'CODE_128':
      return getCode128Modules(dataLength || 6) * clampedSize;
    case 'QR':
      // QR: size is magnification, width = modules * magnification
      // Use estimated module count based on data
      const moduleCount = estimateQrModuleCount(dataLength || 10);
      return moduleCount * clampedSize;
    default:
      return 100;
  }
}

/**
 * Calculate QR size in dots from magnification
 */
export function calculateQrSizeDots(magnification: number, dataLength: number = 10): number {
  const clampedMag = Math.max(BARCODE_SIZE_MIN, Math.min(BARCODE_SIZE_MAX, magnification));
  const moduleCount = estimateQrModuleCount(dataLength);
  return moduleCount * clampedMag;
}

/**
 * Estimate QR module count based on data length
 */
export function estimateQrModuleCount(dataLength: number): number {
  // Version 1: 21 modules, Version 2: 25, Version 3: 29, etc.
  if (dataLength <= 10) return 21;
  if (dataLength <= 20) return 25;
  if (dataLength <= 40) return 29;
  if (dataLength <= 60) return 33;
  return 37;
}

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
  // Size (1-10): maps to ^BY module width or ^BQ magnification
  size: number;
  humanReadable?: boolean;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  // Deprecated - use size instead
  moduleWidthDots?: number;
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
 * Barcode rendering parameters - computed once and used for both canvas and ZPL
 */
export interface BarcodeRenderParams {
  type: BarcodeType;
  value: string;
  // Size (1-10): the primary control parameter
  size: number;
  // Computed dimensions in dots
  widthDots: number;
  heightDots: number;
  // QR-specific
  qrMagnification?: number;
  qrModuleCount?: number;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  // Linear barcode specific
  barWidthDots?: number;
  humanReadable?: boolean;
}

/**
 * Compute barcode rendering parameters from Size (1-10)
 * This is the single source of truth - compute once, use everywhere
 */
export function computeBarcodeParamsFromSize(
  type: BarcodeType,
  value: string,
  size: number,
  heightDots: number,
  options?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    humanReadable?: boolean;
  }
): BarcodeRenderParams {
  const clampedSize = Math.max(BARCODE_SIZE_MIN, Math.min(BARCODE_SIZE_MAX, Math.round(size)));
  
  if (type === 'QR') {
    // QR: size = magnification factor
    const moduleCount = estimateQrModuleCount(value.length);
    const widthDots = moduleCount * clampedSize;
    
    return {
      type,
      value,
      size: clampedSize,
      widthDots,
      heightDots: widthDots, // QR is square
      qrMagnification: clampedSize,
      qrModuleCount: moduleCount,
      qrErrorCorrection: options?.errorCorrection || 'M'
    };
  } else {
    // Linear barcode: size = module width in dots
    const widthDots = calculateBarcodeWidthDots(type, clampedSize, value.length);
    
    return {
      type,
      value,
      size: clampedSize,
      widthDots,
      heightDots,
      barWidthDots: clampedSize,
      humanReadable: options?.humanReadable !== false
    };
  }
}

/**
 * Legacy function - compute params from width (for backward compatibility)
 */
export async function computeBarcodeParams(
  type: BarcodeType,
  value: string,
  widthDots: number,
  heightDots: number,
  options?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    humanReadable?: boolean;
  }
): Promise<BarcodeRenderParams> {
  if (type === 'QR') {
    // Estimate size from width
    const moduleCount = estimateQrModuleCount(value.length);
    const size = Math.max(1, Math.min(10, Math.round(widthDots / moduleCount)));
    return computeBarcodeParamsFromSize(type, value, size, heightDots, options);
  } else {
    // Estimate size from width and modules
    let modules: number;
    switch (type) {
      case 'EAN_8': modules = EAN8_MODULES; break;
      case 'EAN_13': modules = EAN13_MODULES; break;
      case 'CODE_128': modules = getCode128Modules(value.length); break;
      default: modules = 95;
    }
    const size = Math.max(1, Math.min(10, Math.round(widthDots / modules)));
    return computeBarcodeParamsFromSize(type, value, size, heightDots, options);
  }
}

/**
 * Generate barcode preview from Size-based parameters
 */
export async function generateBarcodePreviewFromSize(
  type: BarcodeType,
  value: string,
  size: number,
  heightDots: number,
  dpi: number,
  options?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    humanReadable?: boolean;
  }
): Promise<{ dataUrl: string; params: BarcodeRenderParams }> {
  const params = computeBarcodeParamsFromSize(type, value, size, heightDots, options);
  
  // For canvas rendering, we render at 1:1 dots
  // The canvas pixel = 1 dot
  const dataUrl = await generateBarcodePreviewFromParams(params, { x: 1, y: 1 });
  
  return { dataUrl, params };
}

/**
 * Generate barcode preview using pre-computed parameters
 */
export async function generateBarcodePreviewFromParams(
  params: BarcodeRenderParams,
  pixelsPerDot: { x: number; y: number }
): Promise<string> {
  if (params.type === 'QR') {
    return generateQRPreviewWithMagnification(
      params.value,
      params.qrMagnification!,
      params.qrModuleCount!,
      params.qrErrorCorrection!,
      pixelsPerDot
    );
  } else {
    return generateLinearBarcodePreviewWithBarWidth(
      params.type,
      params.value,
      params.barWidthDots!,
      params.heightDots,
      params.humanReadable !== false,
      pixelsPerDot
    );
  }
}

/**
 * Legacy function for backward compatibility
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
  const pixelsPerDot = { x: 1, y: 1 };
  
  if (type === 'QR') {
    const moduleCount = estimateQrModuleCount(value.length);
    const magnification = Math.max(1, Math.min(10, Math.floor(widthPx / moduleCount)));
    return generateQRPreviewWithMagnification(
      value,
      magnification,
      moduleCount,
      options?.errorCorrection || 'M',
      pixelsPerDot
    );
  } else {
    const barWidth = computeBarWidth(widthPx, type);
    return generateLinearBarcodePreviewWithBarWidth(
      type,
      value,
      barWidth,
      heightPx,
      options?.displayValue !== false,
      pixelsPerDot
    );
  }
}

/**
 * Generate QR code preview with explicit magnification
 */
async function generateQRPreviewWithMagnification(
  value: string,
  magnification: number,
  moduleCount: number,
  errorCorrection: 'L' | 'M' | 'Q' | 'H',
  pixelsPerDot: { x: number; y: number }
): Promise<string> {
  try {
    const moduleWidthPx = magnification * pixelsPerDot.x;
    const moduleHeightPx = magnification * pixelsPerDot.y;
    const qrWidthPx = moduleCount * moduleWidthPx;
    const qrHeightPx = moduleCount * moduleHeightPx;
    
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: errorCorrection,
      width: Math.round(qrWidthPx),
      margin: 0,
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
 * Generate linear barcode preview with explicit bar width
 */
function generateLinearBarcodePreviewWithBarWidth(
  type: BarcodeType,
  value: string,
  barWidthDots: number,
  heightDots: number,
  displayValue: boolean,
  pixelsPerDot: { x: number; y: number }
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

      const barWidthPx = barWidthDots * pixelsPerDot.x;
      const heightPx = heightDots * pixelsPerDot.y;

      JsBarcode(canvas, validatedValue, {
        format,
        width: barWidthPx,
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
 * Build ZPL for barcode element using Size-based parameters
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
 * ^BQa,b,c where a=orientation, b=model(2), c=magnification (Size)
 */
function buildQrZpl(element: BarcodeElementData): string {
  const { x, y, value, rotation, size, qrErrorCorrection } = element;
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  // Size directly maps to magnification (1-10)
  const magnification = Math.max(1, Math.min(10, Math.round(size)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BQ${rotationCode},2,${magnification}\n`;
  // ZPL QR data format: ^FDMM,data where first char after MM is data
  zpl += `^FDMM,${value}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-8 using ^B8 command
 * ^BY{size} sets module width directly from Size property
 */
function buildEan8Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  const data = calculateEAN8Checksum(value);
  
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Size (1-10) maps directly to ^BY module width
  const moduleWidth = Math.max(1, Math.min(10, Math.round(size)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${moduleWidth},2,${barHeight}\n`;
  zpl += `^B8${rotationCode},${barHeight},${printInterpretation},N\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-13 using ^BE command
 */
function buildEan13Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  const data = calculateEAN13Checksum(value);
  
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Size (1-10) maps directly to ^BY module width
  const moduleWidth = Math.max(1, Math.min(10, Math.round(size)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${moduleWidth},2,${barHeight}\n`;
  zpl += `^BE${rotationCode},${barHeight},${printInterpretation},N\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for Code 128 using ^BC command
 */
function buildCode128Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  if (!validateCode128(value)) {
    throw new Error('Invalid Code 128 data');
  }
  
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Size (1-10) maps directly to ^BY module width
  const moduleWidth = Math.max(1, Math.min(10, Math.round(size)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BY${moduleWidth},2,${barHeight}\n`;
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
 * Compute bar width for linear barcodes from element width (legacy)
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
      modules = 100; // Approximate average
      break;
    default:
      modules = 95;
  }
  
  const rawBarWidth = widthDots / modules;
  return Math.max(1, Math.min(10, Math.round(rawBarWidth)));
}

/**
 * Estimate QR magnification from desired size in dots (legacy)
 */
export async function estimateQrMagnification(
  widthDots: number, 
  value: string, 
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'
): Promise<number> {
  const moduleCount = estimateQrModuleCount(value.length);
  const mag = Math.floor(widthDots / moduleCount);
  return Math.max(1, Math.min(10, mag));
}

/**
 * Synchronous version for quick estimation
 */
export function estimateQrMagnificationSync(widthDots: number, value: string): number {
  const estimatedModules = estimateQrModuleCount(value.length);
  const mag = Math.floor(widthDots / estimatedModules);
  return Math.max(1, Math.min(10, mag));
}

/**
 * Validate barcode data based on type
 */
export function validateBarcodeData(type: BarcodeType, value: string): { valid: boolean; error?: string } {
  switch (type) {
    case 'QR':
      if (!value.trim()) {
        return { valid: false, error: 'QR code data cannot be empty' };
      }
      return { valid: true };
      
    case 'EAN_8':
      const cleaned8 = value.replace(/\D/g, '');
      if (cleaned8.length !== 7 && cleaned8.length !== 8) {
        return { valid: false, error: 'EAN-8 must be 7 or 8 digits' };
      }
      return { valid: true };
      
    case 'EAN_13':
      const cleaned13 = value.replace(/\D/g, '');
      if (cleaned13.length !== 12 && cleaned13.length !== 13) {
        return { valid: false, error: 'EAN-13 must be 12 or 13 digits' };
      }
      return { valid: true };
      
    case 'CODE_128':
      if (!value.trim()) {
        return { valid: false, error: 'Code 128 data cannot be empty' };
      }
      if (!validateCode128(value)) {
        return { valid: false, error: 'Code 128 must contain only ASCII characters' };
      }
      return { valid: true };
      
    default:
      return { valid: false, error: 'Unknown barcode type' };
  }
}
