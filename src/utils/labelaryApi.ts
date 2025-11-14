export interface BarcodeRequest {
  data: string;
  scale: number;
  height?: number;
  mode?: string;
}

export interface BarcodeResponse {
  imageDataUrl: string;
  zpl: string;
}

const API_BASE = "https://api.labelary.com/v1/barcodes";

export async function generateBarcode(
  type: "qrcode" | "ean8" | "ean13" | "code128",
  data: string,
  scale: number = 2,
  height: number = 25
): Promise<BarcodeResponse> {
  const payload: BarcodeRequest = {
    data,
    scale,
    mode: "normal"
  };

  // Only add height for linear barcodes (not QR)
  if (type !== "qrcode") {
    payload.height = height;
  }

  const response = await fetch(`${API_BASE}/${type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Labelary API error: ${response.status} - ${errorText}`);
  }

  // Get the PNG image as blob
  const blob = await response.blob();
  const imageDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  // Generate ZPL command for the barcode
  const zpl = generateZPLCommand(type, data, height);

  return {
    imageDataUrl,
    zpl,
  };
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
