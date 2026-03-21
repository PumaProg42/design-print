import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Barcode types supported by the system
 */
export type BarcodeType = 'QR' | 'EAN_8' | 'EAN_13' | 'CODE_128' | 'DATAMATRIX';

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
    case 'DATAMATRIX':
      // DataMatrix: size is magnification, width = modules * magnification
      const dmModules = estimateDataMatrixModuleCount(dataLength || 10);
      return dmModules * clampedSize;
    default:
      return 100;
  }
}

/**
 * Calculate QR size in dots from magnification
 * Returns the ACTUAL size based on QR version determined by data
 */
export function calculateQrSizeDots(magnification: number, dataLength: number = 10): number {
  const clampedMag = Math.max(BARCODE_SIZE_MIN, Math.min(BARCODE_SIZE_MAX, magnification));
  const moduleCount = estimateQrModuleCount(dataLength);
  return moduleCount * clampedMag;
}

/**
 * Estimate QR module count based on data length
 * QR Version = (modules - 17) / 4
 * Version 1 = 21, Version 2 = 25, Version 3 = 29, etc.
 * 
 * Note: Actual module count is determined by qrcode-generator at render time.
 * This estimate is used for initial sizing only.
 */
export function estimateQrModuleCount(dataLength: number): number {
  // Conservative estimates based on error correction level M
  // Actual version depends on data content and EC level
  if (dataLength <= 14) return 21;  // Version 1
  if (dataLength <= 26) return 25;  // Version 2
  if (dataLength <= 42) return 29;  // Version 3
  if (dataLength <= 62) return 33;  // Version 4
  if (dataLength <= 84) return 37;  // Version 5
  if (dataLength <= 106) return 41; // Version 6
  return 45; // Version 7+
}

/**
 * Estimate DataMatrix module count based on data length
 * DataMatrix sizes: 10x10, 12x12, 14x14, 16x16, 18x18, 20x20, 22x22, 24x24, 26x26, etc.
 */
export function estimateDataMatrixModuleCount(dataLength: number): number {
  if (dataLength <= 3) return 10;
  if (dataLength <= 6) return 12;
  if (dataLength <= 10) return 14;
  if (dataLength <= 16) return 16;
  if (dataLength <= 25) return 18;
  if (dataLength <= 31) return 20;
  if (dataLength <= 43) return 22;
  if (dataLength <= 52) return 24;
  if (dataLength <= 64) return 26;
  return 32;
}

/**
 * Get actual QR module count by generating the QR code
 * This is the authoritative source - use for final dimension calculations
 */
export async function getActualQrModuleCount(value: string, errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'): Promise<number> {
  const QRCodeGen = (await import('qrcode-generator')).default;
  const qr = QRCodeGen(0, errorCorrection);
  qr.addData(value);
  qr.make();
  return qr.getModuleCount();
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
 * Input: 7 or 8 digits. If 8, validates the check digit.
 * Returns: 8-digit EAN-8 string with valid check digit
 */
export function calculateEAN8Checksum(digits: string): string {
  const cleaned = digits.replace(/\D/g, '');
  
  // Handle various lengths gracefully
  if (cleaned.length < 7) {
    // Pad with zeros to 7 digits
    const padded = cleaned.padEnd(7, '0');
    return padded + computeEAN8Check(padded);
  }
  
  if (cleaned.length === 7) {
    return cleaned + computeEAN8Check(cleaned);
  }
  
  if (cleaned.length === 8) {
    // Return as-is (trust user input or recalculate)
    const base = cleaned.slice(0, 7);
    return base + computeEAN8Check(base);
  }
  
  // Too long - truncate to 7 and calculate check
  const base = cleaned.slice(0, 7);
  return base + computeEAN8Check(base);
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
 * Input: 12 or 13 digits. If 13, recalculates check digit.
 * Returns: 13-digit EAN-13 string with valid check digit
 */
export function calculateEAN13Checksum(digits: string): string {
  const cleaned = digits.replace(/\D/g, '');
  
  // Handle various lengths gracefully
  if (cleaned.length < 12) {
    // Pad with zeros to 12 digits
    const padded = cleaned.padEnd(12, '0');
    return padded + computeEAN13Check(padded);
  }
  
  if (cleaned.length === 12) {
    return cleaned + computeEAN13Check(cleaned);
  }
  
  if (cleaned.length === 13) {
    // Recalculate check digit from first 12
    const base = cleaned.slice(0, 12);
    return base + computeEAN13Check(base);
  }
  
  // Too long - truncate to 12 and calculate check
  const base = cleaned.slice(0, 12);
  return base + computeEAN13Check(base);
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
  heightDots: number; // Total height including text for canvas
  barHeightDots: number; // Bar-only height for ZPL
  // QR-specific
  qrMagnification?: number;
  qrModuleCount?: number;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  // Linear barcode specific
  barWidthDots?: number;
  humanReadable?: boolean;
  textHeightDots?: number; // Height of human-readable text area
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
    actualQrModuleCount?: number; // Pass actual count if known
  }
): BarcodeRenderParams {
  const clampedSize = Math.max(BARCODE_SIZE_MIN, Math.min(BARCODE_SIZE_MAX, Math.round(size)));
  
  if (type === 'QR') {
    // QR: size = magnification factor
    // Use actual module count if provided, otherwise estimate
    const moduleCount = options?.actualQrModuleCount || estimateQrModuleCount(value.length);
    const widthDots = moduleCount * clampedSize;
    
    return {
      type,
      value,
      size: clampedSize,
      widthDots,
      heightDots: widthDots, // QR is square, no text
      barHeightDots: widthDots, // Same as heightDots for QR
      qrMagnification: clampedSize,
      qrModuleCount: moduleCount,
      qrErrorCorrection: options?.errorCorrection || 'M'
    };
  } else if (type === 'DATAMATRIX') {
    // DataMatrix: size = magnification factor, always square
    const moduleCount = options?.actualQrModuleCount || estimateDataMatrixModuleCount(value.length);
    const widthDots = moduleCount * clampedSize;
    
    return {
      type,
      value,
      size: clampedSize,
      widthDots,
      heightDots: widthDots, // DataMatrix is square
      barHeightDots: widthDots,
      qrMagnification: clampedSize,
      qrModuleCount: moduleCount,
    };
  } else {
    // Linear barcode: size = module width in dots
    const widthDots = calculateBarcodeWidthDots(type, clampedSize, value.length);
    const showText = options?.humanReadable !== false;
    // Text height is approximately 18 dots (standard ZPL text height)
    const textHeightDots = showText ? 18 : 0;
    // Total height = bar height + text height
    const totalHeightDots = heightDots + textHeightDots;
    
    return {
      type,
      value,
      size: clampedSize,
      widthDots,
      heightDots: totalHeightDots, // Total including text for canvas positioning
      barHeightDots: heightDots, // Bar-only for ZPL commands
      barWidthDots: clampedSize,
      humanReadable: showText,
      textHeightDots: textHeightDots
    };
  }
}

/**
 * Async version that calculates actual QR module count
 */
export async function computeBarcodeParamsFromSizeAsync(
  type: BarcodeType,
  value: string,
  size: number,
  heightDots: number,
  options?: {
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    humanReadable?: boolean;
  }
): Promise<BarcodeRenderParams> {
  if (type === 'QR') {
    const actualModuleCount = await getActualQrModuleCount(value, options?.errorCorrection || 'M');
    return computeBarcodeParamsFromSize(type, value, size, heightDots, {
      ...options,
      actualQrModuleCount: actualModuleCount
    });
  }
  return computeBarcodeParamsFromSize(type, value, size, heightDots, options);
}
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
    // Use barHeightDots (bar-only) since preview generator adds text height internally
    return generateLinearBarcodePreviewWithBarWidth(
      params.type,
      params.value,
      params.barWidthDots!,
      params.barHeightDots!, // Bar-only height, text is added by the preview generator
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
 * Generate QR code preview with EXACT ZPL-matching magnification
 * Each module is rendered at exactly magnification x magnification pixels
 * No anti-aliasing, no smoothing - pixel-perfect 1:1 with ZPL ^BQ output
 */
async function generateQRPreviewWithMagnification(
  value: string,
  magnification: number,
  moduleCount: number,
  errorCorrection: 'L' | 'M' | 'Q' | 'H',
  pixelsPerDot: { x: number; y: number }
): Promise<string> {
  try {
    // Use qrcode-generator for precise module matrix access
    const QRCodeGen = (await import('qrcode-generator')).default;
    
    // Create QR code - type 0 = auto version
    const qr = QRCodeGen(0, errorCorrection);
    qr.addData(value);
    qr.make();
    
    // Get actual module count from generated QR
    const actualModuleCount = qr.getModuleCount();
    
    // Each module = magnification dots, convert to pixels
    const moduleWidthPx = Math.round(magnification * pixelsPerDot.x);
    const moduleHeightPx = Math.round(magnification * pixelsPerDot.y);
    
    // Total QR size in pixels
    const qrWidthPx = actualModuleCount * moduleWidthPx;
    const qrHeightPx = actualModuleCount * moduleHeightPx;
    
    // Create canvas at exact dimensions
    const canvas = document.createElement('canvas');
    canvas.width = qrWidthPx;
    canvas.height = qrHeightPx;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Disable ALL smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, qrWidthPx, qrHeightPx);
    
    // Draw each module as a sharp rectangle
    ctx.fillStyle = '#000000';
    for (let row = 0; row < actualModuleCount; row++) {
      for (let col = 0; col < actualModuleCount; col++) {
        if (qr.isDark(row, col)) {
          // Draw module at exact pixel position
          const x = col * moduleWidthPx;
          const y = row * moduleHeightPx;
          ctx.fillRect(x, y, moduleWidthPx, moduleHeightPx);
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate linear barcode preview with EXACT ZPL-matching bar widths
 * Each narrow bar = barWidthDots pixels, wide bar = barWidthDots * ratio pixels
 * Renders pixel-perfect 1:1 with ZPL ^BY output
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
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Disable smoothing
      ctx.imageSmoothingEnabled = false;
      
      // Get the encoding pattern
      const encoding = getBarcodeEncoding(type, value);
      
      // Calculate dimensions in pixels
      const moduleWidthPx = Math.round(barWidthDots * pixelsPerDot.x);
      const heightPx = Math.round(heightDots * pixelsPerDot.y);
      const textHeightPx = displayValue ? Math.round(18 * pixelsPerDot.y) : 0;
      
      // Total width from module count
      const totalWidthPx = encoding.length * moduleWidthPx;
      const totalHeightPx = heightPx + textHeightPx;
      
      canvas.width = totalWidthPx;
      canvas.height = totalHeightPx;
      
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, totalWidthPx, totalHeightPx);
      
      // Draw bars - each '1' is a black module, '0' is white
      ctx.fillStyle = '#000000';
      let x = 0;
      for (let i = 0; i < encoding.length; i++) {
        if (encoding[i] === '1') {
          ctx.fillRect(x, 0, moduleWidthPx, heightPx);
        }
        x += moduleWidthPx;
      }
      
      // Draw human-readable text if enabled
      if (displayValue) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const fontSize = Math.max(10, Math.round(14 * pixelsPerDot.y));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(value, totalWidthPx / 2, heightPx + 2);
      }
      
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Barcode generation failed:', error);
      reject(error);
    }
  });
}

/**
 * Get barcode binary encoding pattern
 * Returns string of '0' and '1' representing bar/space modules
 */
function getBarcodeEncoding(type: BarcodeType, value: string): string {
  switch (type) {
    case 'EAN_8':
      return encodeEAN8(value);
    case 'EAN_13':
      return encodeEAN13(value);
    case 'CODE_128':
      return encodeCode128(value);
    default:
      throw new Error(`Unsupported barcode type: ${type}`);
  }
}

/**
 * EAN-8 encoding tables and logic
 */
const EAN_L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

function encodeEAN8(value: string): string {
  const digits = calculateEAN8Checksum(value);
  
  let encoding = '101'; // Start guard
  
  // First 4 digits use L encoding
  for (let i = 0; i < 4; i++) {
    encoding += EAN_L_CODES[parseInt(digits[i])];
  }
  
  encoding += '01010'; // Center guard
  
  // Last 4 digits use R encoding
  for (let i = 4; i < 8; i++) {
    encoding += EAN_R_CODES[parseInt(digits[i])];
  }
  
  encoding += '101'; // End guard
  
  return encoding;
}

/**
 * EAN-13 encoding tables and logic
 */
const EAN_G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function encodeEAN13(value: string): string {
  const digits = calculateEAN13Checksum(value);
  
  const firstDigit = parseInt(digits[0]);
  const parityPattern = EAN13_PARITY[firstDigit];
  
  let encoding = '101'; // Start guard
  
  // Digits 2-7 (indices 1-6) use L or G based on parity
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 1]);
    if (parityPattern[i] === 'L') {
      encoding += EAN_L_CODES[digit];
    } else {
      encoding += EAN_G_CODES[digit];
    }
  }
  
  encoding += '01010'; // Center guard
  
  // Digits 8-13 (indices 7-12) use R encoding
  for (let i = 7; i < 13; i++) {
    encoding += EAN_R_CODES[parseInt(digits[i])];
  }
  
  encoding += '101'; // End guard
  
  return encoding;
}

/**
 * Code 128 encoding
 */
const CODE128_START_B = '11010010000';
const CODE128_STOP = '1100011101011';
const CODE128_PATTERNS: string[] = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100'
];

function encodeCode128(value: string): string {
  // Use Code 128B for general ASCII
  let encoding = CODE128_START_B;
  let checksum = 104; // Start B value
  
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    let codeValue: number;
    
    if (charCode >= 32 && charCode <= 126) {
      codeValue = charCode - 32;
    } else {
      codeValue = 0; // Default to space for unsupported chars
    }
    
    encoding += CODE128_PATTERNS[codeValue];
    checksum += codeValue * (i + 1);
  }
  
  // Add checksum character
  const checksumValue = checksum % 103;
  encoding += CODE128_PATTERNS[checksumValue];
  
  // Add stop pattern
  encoding += CODE128_STOP;
  
  return encoding;
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
    case 'DATAMATRIX':
      return buildDataMatrixZpl(element);
    default:
      throw new Error(`Unsupported barcode type: ${element.type}`);
  }
}

/**
 * Build ZPL for QR Code using ^BQ command
 * ^BQa,b,c where a=orientation, b=model(2), c=magnification (Size)
 * FD format: ^FDMM,A{data} where A = automatic mode selection
 */
function buildQrZpl(element: BarcodeElementData): string {
  const { x, y, value, rotation, size, qrErrorCorrection } = element;
  
  // Map rotation to ZPL orientation
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  // Map error correction to ZPL level letter
  const ecMap: Record<string, string> = { 'L': 'L', 'M': 'M', 'Q': 'Q', 'H': 'H' };
  const ecLevel = ecMap[qrErrorCorrection || 'M'] || 'M';
  
  // Size directly maps to magnification (1-10)
  const magnification = Math.max(1, Math.min(10, Math.round(size)));
  
  let zpl = `^FO${Math.round(x)},${Math.round(y)}\n`;
  zpl += `^BQ${rotationCode},2,${magnification}\n`;
  // ZPL QR data format: ^FDMM,A{data} where A = automatic character mode selection
  // The 'A' prefix tells ZPL to auto-select the encoding mode (alphanumeric, numeric, etc.)
  zpl += `^FDMM,A${value}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-8 using ^B8 command
 * ^BY{size} sets module width directly from Size property
 */
function buildEan8Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  // Validate and normalize data - EAN-8 must be exactly 7 or 8 digits
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 8) {
    // Use only first 7 digits and recalculate checksum
    const base = cleaned.slice(0, 7).padEnd(7, '0');
    var data = calculateEAN8Checksum(base);
  } else {
    var data = calculateEAN8Checksum(cleaned);
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
  
  let adjustedX = x;
  let adjustedY = y;

  // 3) Končni FO
  let zpl = `^FO${Math.round(adjustedX)},${Math.round(adjustedY)}\n`;
  zpl += `^BY${moduleWidth}\n`;
  zpl += `^B8${rotationCode},${barHeight},${printInterpretation},N\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for EAN-13 using ^BE command
 */
function buildEan13Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  // Validate and normalize data - EAN-13 must be exactly 12 or 13 digits
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 12 || cleaned.length > 13) {
    // Use only first 12 digits and recalculate checksum
    const base = cleaned.slice(0, 12).padEnd(12, '0');
    var data = calculateEAN13Checksum(base);
  } else {
    var data = calculateEAN13Checksum(cleaned);
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
  
  let adjustedX = x;
  let adjustedY = y;

  // 3) Končni FO
  let zpl = `^FO${Math.round(adjustedX)},${Math.round(adjustedY)}\n`;
  zpl += `^BY${moduleWidth}\n`;
  zpl += `^BE${rotationCode},${barHeight},${printInterpretation},N\n`;
  zpl += `^FD${data}^FS\n`;
  
  return zpl;
}

/**
 * Build ZPL for Code 128 using ^BC command
 */
function buildCode128Zpl(element: BarcodeElementData): string {
  const { x, y, value, height, rotation, humanReadable, size } = element;
  
  // Use value as-is for Code 128 (supports full ASCII)
  const data = value || '';
  
  let rotationCode = 'N';
  const rot = Math.round(rotation || 0);
  if (rot >= 45 && rot < 135) rotationCode = 'R';
  else if (rot >= 135 && rot < 225) rotationCode = 'I';
  else if (rot >= 225 && rot < 315) rotationCode = 'B';
  
  const barHeight = Math.max(10, Math.round(height));
  const printInterpretation = humanReadable !== false ? 'Y' : 'N';
  
  // Size (1-10) maps directly to ^BY module width
  const moduleWidth = Math.max(1, Math.min(10, Math.round(size)));
  
  let adjustedX = x;
  let adjustedY = y;

  // 3) Končni FO
  let zpl = `^FO${Math.round(adjustedX)},${Math.round(adjustedY)}\n`;
  zpl += `^BY${moduleWidth}\n`;
  zpl += `^BC${rotationCode},${barHeight},${printInterpretation},N,N\n`;
  zpl += `^FD${data}^FS\n`;
  
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
