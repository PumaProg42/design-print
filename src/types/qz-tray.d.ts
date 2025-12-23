declare module 'qz-tray' {
  interface QZ {
    websocket: {
      connect: (options?: { retries?: number; delay?: number }) => Promise<void>;
      disconnect: () => Promise<void>;
      isActive: () => boolean;
    };
    printers: {
      find: (query?: string) => Promise<string[]>;
      getDefault: () => Promise<string>;
    };
    configs: {
      create: (printer: string, options?: PrinterConfig) => object;
    };
    print: (config: object, data: (string | PrintData)[]) => Promise<void>;
    security: {
      setCertificatePromise: (callback: (resolve: (cert?: string) => void, reject?: (err: Error) => void) => void) => void;
      setSignaturePromise: (callback: (toSign: string) => (resolve: (sig?: string) => void, reject?: (err: Error) => void) => void) => void;
    };
  }

  interface PrinterConfig {
    size?: { width: number; height: number };
    units?: 'in' | 'mm' | 'cm';
    colorType?: 'color' | 'grayscale' | 'blackwhite';
    interpolation?: 'bicubic' | 'bilinear' | 'nearest-neighbor';
    scaleContent?: boolean;
    rasterize?: boolean;
  }

  interface PrintData {
    type: 'pixel' | 'raw';
    format: 'image' | 'html' | 'pdf' | 'command';
    flavor: 'base64' | 'file' | 'hex' | 'plain';
    data: string;
    options?: {
      density?: number;
      language?: string;
    };
  }

  const qz: QZ;
  export default qz;
}
