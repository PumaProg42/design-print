export interface ParsedLabel {
  widthDots: number;
  heightDots: number;
  rotate180: boolean;
  labelHome: { x: number; y: number };
  dpi: number;
}

export interface ParsedElement {
  id: string;
  kind: 'text' | 'barcode' | 'qr' | 'box' | 'line' | 'ellipse' | 'image' | 'raw';
  x: number;
  y: number;
  data?: any;
  raw?: string;
}

export interface ParsedScene {
  label: ParsedLabel;
  elements: ParsedElement[];
  warnings: string[];
  stats: {
    textCount: number;
    barcodeCount: number;
    shapeCount: number;
    imageCount: number;
    rawCount: number;
  };
}

export function parseZPL(text: string, defaultDpi: number = 203): ParsedScene {
  const scene: ParsedScene = {
    label: {
      widthDots: 0,
      heightDots: 0,
      rotate180: false,
      labelHome: { x: 0, y: 0 },
      dpi: defaultDpi,
    },
    elements: [],
    warnings: [],
    stats: {
      textCount: 0,
      barcodeCount: 0,
      shapeCount: 0,
      imageCount: 0,
      rawCount: 0,
    },
  };

  // Remove whitespace but keep structure for better parsing
  const cleanText = text.replace(/\s+/g, '');
  
  // Try to detect DPI from comment (^FX DPI:xxx)
  const dpiMatch = text.match(/\^FX\s*DPI:(\d+)/i);
  if (dpiMatch) {
    scene.label.dpi = parseInt(dpiMatch[1]);
  }
  
  // Extract label width
  const pwMatch = cleanText.match(/\^PW(\d+)/);
  if (pwMatch) {
    scene.label.widthDots = parseInt(pwMatch[1]);
  }

  // Extract label length/height
  const llMatch = cleanText.match(/\^LL(\d+)/);
  if (llMatch) {
    scene.label.heightDots = parseInt(llMatch[1]);
  }

  // Check for 180° rotation
  if (cleanText.includes('^POI')) {
    scene.label.rotate180 = true;
  }

  // Extract label home offset
  const lhMatch = cleanText.match(/\^LH(-?\d+),(-?\d+)/);
  if (lhMatch) {
    scene.label.labelHome.x = parseInt(lhMatch[1]);
    scene.label.labelHome.y = parseInt(lhMatch[2]);
  }

  // Parse fields (everything between ^FO and ^FS or next ^FO)
  const fieldRegex = /\^FO(-?\d+),(-?\d+)(.*?)(?=\^FO|\^XZ|$)/g;
  let fieldMatch;
  let elementId = 0;

  while ((fieldMatch = fieldRegex.exec(cleanText)) !== null) {
    const x = parseInt(fieldMatch[1]) + scene.label.labelHome.x;
    const y = parseInt(fieldMatch[2]) + scene.label.labelHome.y;
    const content = fieldMatch[3];

    // Try to parse as text (^A0N or ^A0R,width,height format)
    // Handle both direct ^FD and ^FB (field block) before ^FD
    const textMatch = content.match(/\^A0([NRIB])?,?(\d+)?,?(\d+)?(\^FB(\d+),\d+,\d+,([LCR]),\d+)?\^FD([^\^]*)/);
    if (textMatch) {
      const rotation = textMatch[1] || 'N';
      const fontHeight = textMatch[2] ? parseInt(textMatch[2]) : 30;
      const fontWidth = textMatch[3] ? parseInt(textMatch[3]) : fontHeight;
      const textBlockWidth = textMatch[5] ? parseInt(textMatch[5]) : null; // Width from ^FB command
      const alignment = textMatch[6] || 'C'; // Alignment from ^FB (L, C, R)
      const text = textMatch[7].replace(/\^FS$/, '').replace(/\\&$/, ''); // Remove ^FS and trailing \&
      
      // Convert rotation code to angle
      let angle = 0;
      if (rotation === 'R') angle = 90;
      else if (rotation === 'I') angle = 180;
      else if (rotation === 'B') angle = 270;
      
      // Convert alignment code to text alignment
      let textAlign = 'center';
      if (alignment === 'L') textAlign = 'left';
      else if (alignment === 'R') textAlign = 'right';

      // Use the same font as the workspace
      const fontFamily = "'Swiss 721 Bold Condensed', 'Roboto Condensed', Oswald, 'Arial Narrow', sans-serif";

      scene.elements.push({
        id: `text_${elementId++}`,
        kind: 'text',
        x,
        y,
        data: {
          text,
          fontSize: fontWidth, // Base font size
          fontWidth, // Exported width
          fontHeight, // Exported height
          textBlockWidth, // Width from ^FB
          textAlign, // Horizontal alignment
          fontFamily,
          fontWeight: 700,
          charSpacing: 27,
          rotation,
          angle,
        },
      });
      scene.stats.textCount++;
      continue;
    }

    // Try to parse as EAN/UPC barcode (^BY + ^BE - what we use in the app)
    // Format: ^BY{moduleWidth},2,{barHeight}^BE{orientation},{barHeight},{printInterpretation}^FD{value}
    const beMatch = content.match(/\^BY(\d+),\d+,\d+\^BE([NRIB]),(\d+),([YN])\^FD([^\^]*)/);
    if (beMatch) {
      const moduleWidth = parseInt(beMatch[1]);
      const orientation = beMatch[2];
      const height = parseInt(beMatch[3]);
      const value = beMatch[5].replace(/\^FS$/, '');
      
      scene.elements.push({
        id: `barcode_${elementId++}`,
        kind: 'barcode',
        x,
        y,
        data: {
          value,
          type: 'ean',
          height,
          moduleWidth,
          orientation,
        },
      });
      scene.stats.barcodeCount++;
      continue;
    }

    // Try to parse as Code 128 barcode
    const bc128Match = content.match(/\^BC[,\d]*\^FD([^\^]*)/);
    if (bc128Match) {
      const heightMatch = content.match(/\^BC[,\d]*?,(\d+)/);
      scene.elements.push({
        id: `barcode_${elementId++}`,
        kind: 'barcode',
        x,
        y,
        data: {
          value: bc128Match[1].replace(/\^FS$/, ''),
          type: 'code128',
          height: heightMatch ? parseInt(heightMatch[1]) : 100,
        },
      });
      scene.stats.barcodeCount++;
      continue;
    }

    // Try to parse as Code 39 barcode
    const b39Match = content.match(/\^B3[,\d]*\^FD([^\^]*)/);
    if (b39Match) {
      const heightMatch = content.match(/\^B3[,\d]*?,(\d+)/);
      scene.elements.push({
        id: `barcode_${elementId++}`,
        kind: 'barcode',
        x,
        y,
        data: {
          value: b39Match[1].replace(/\^FS$/, ''),
          type: 'code39',
          height: heightMatch ? parseInt(heightMatch[1]) : 100,
        },
      });
      scene.stats.barcodeCount++;
      continue;
    }

    // Try to parse as QR code (^BQ)
    const qrMatch = content.match(/\^BQ([NRIB]),2,(\d+),([LMQH])\^FD[LMQH]A,([^\^]*)/);
    if (qrMatch) {
      const magnification = parseInt(qrMatch[2]);
      const errorCorrection = qrMatch[3] as 'L' | 'M' | 'Q' | 'H';
      const data = qrMatch[4].replace(/\^FS$/, '');
      scene.elements.push({
        id: `qr_${elementId++}`,
        kind: 'qr',
        x,
        y,
        data: {
          value: data,
          magnification,
          errorCorrection,
        },
      });
      scene.stats.barcodeCount++;
      continue;
    }

    // Try to parse as ellipse (^GE)
    const geMatch = content.match(/\^GE(\d+),(\d+),(\d+),([B])?/);
    if (geMatch) {
      const width = parseInt(geMatch[1]);
      const height = parseInt(geMatch[2]);
      const thickness = parseInt(geMatch[3]);
      
      scene.elements.push({
        id: `ellipse_${elementId++}`,
        kind: 'ellipse',
        x,
        y,
        data: {
          width,
          height,
          thickness,
        },
      });
      scene.stats.shapeCount++;
      continue;
    }

    // Try to parse as box/line (^GB)
    const gbMatch = content.match(/\^GB(\d+),(\d+),(\d+)/);
    if (gbMatch) {
      const width = parseInt(gbMatch[1]);
      const height = parseInt(gbMatch[2]);
      const thickness = parseInt(gbMatch[3]);
      
      // Detect line: either width or height equals thickness (horizontal or vertical line)
      const isLine = (width <= thickness) || (height <= thickness);
      
      scene.elements.push({
        id: `shape_${elementId++}`,
        kind: isLine ? 'line' : 'box',
        x,
        y,
        data: {
          width,
          height,
          thickness,
        },
      });
      scene.stats.shapeCount++;
      continue;
    }

    // Try to parse as image (^GFA)
    const gfaMatch = content.match(/\^GFA,(\d+),(\d+),(\d+),(.+?)(?=\^FS|$)/);
    if (gfaMatch) {
      const totalBytes = parseInt(gfaMatch[1]);
      const bytesPerRow = parseInt(gfaMatch[3]);
      const hexData = gfaMatch[4];
      
      scene.elements.push({
        id: `image_${elementId++}`,
        kind: 'image',
        x,
        y,
        data: {
          totalBytes,
          bytesPerRow,
          hexData,
          width: bytesPerRow * 8,
          height: Math.floor(totalBytes / bytesPerRow),
        },
      });
      scene.stats.imageCount++;
      continue;
    }

    // Unknown/raw element
    scene.elements.push({
      id: `raw_${elementId++}`,
      kind: 'raw',
      x,
      y,
      raw: content,
    });
    scene.stats.rawCount++;
  }

  // Generate warnings
  if (!scene.label.widthDots || !scene.label.heightDots) {
    scene.warnings.push('Label dimensions (^PW/^LL) not found or incomplete');
  }

  if (scene.stats.rawCount > 0) {
    scene.warnings.push(`${scene.stats.rawCount} unsupported command(s) found`);
  }

  return scene;
}
