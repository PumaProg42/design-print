import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Printer, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Tag,
  Image as ImageIcon,
  Info
} from "lucide-react";
import { toast } from "sonner";
import qz from "qz-tray";

interface QzTrayPrintDialogProps {
  open: boolean;
  onClose: () => void;
  zplCode: string;
  labelImageBase64: string;
  labelWidth: number;
  labelHeight: number;
  dpi: number;
}

type PrintMode = 'auto' | 'zpl' | 'image';

const STORAGE_KEYS = {
  SELECTED_PRINTER: 'qz-tray-selected-printer',
  PRINT_MODE: 'qz-tray-print-mode',
  REMEMBER_SETTINGS: 'qz-tray-remember-settings'
};

// ZPL-compatible printer keywords
const ZPL_PRINTER_KEYWORDS = [
  'zebra', 'zd', 'gk', 'gc', 'gt', 'gx', 'zt', 'zq', 'zp', 'lp2844', 'tlp',
  'tsc', 'honeywell', 'intermec', 'datamax', 'sato', 'citizen'
];

// Digital certificate for QZ Tray (self-signed, valid for 10 years)
const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDWzCCAkOgAwIBAgIUX3M+9EOxSqy+cjfZMx7Dl1wKQ1swDQYJKoZIhvcNAQEL
BQAwPTEXMBUGA1UEAwwOTGFiZWwgRGVzaWduZXIxFTATBgNVBAoMDFlvdXIgQ29t
cGFueTELMAkGA1UEBhMCU0kwHhcNMjUxMjIzMTA1NDIzWhcNMzUxMjIxMTA1NDIz
WjA9MRcwFQYDVQQDDA5MYWJlbCBEZXNpZ25lcjEVMBMGA1UECgwMWW91ciBDb21w
YW55MQswCQYDVQQGEwJTSTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
ALVYqxXfaDZ0AYizuua3F0KsyKokajQ4j54KO3ZaGoRNNsFkWFOc/Zdj6svt9BeH
hKiY//rWcziWD8wQjlWTLTcgU+qG3tdB1YRj1poYgD2ZptJ+tjFRGQccicni5LYY
Q+X/+UoS5AqHtDrH65MJcNM6llNZzHbxpOULb8T1vbl63fFMm7sfE8iAqnKTAbIs
8oqtEXpkm4EcVKGkDeS/3TegPsSkXC+sqHoHVSB2w13FxwwigERhsJQc0X75LYF4
ki0Q1Euc02N+zNR59xjs4QJcHdMGtxZf2q/BlFhpbqwfexyCeuvcEPnZJHfaO6Uz
NEvqR8Q9RSre3XTkv2pfDl0CAwEAAaNTMFEwHQYDVR0OBBYEFJxzYGS+HXJXqTJG
4eYh04qucLJfMB8GA1UdIwQYMBaAFJxzYGS+HXJXqTJG4eYh04qucLJfMA8GA1Ud
EwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAKRZ+7ezjFLn/MzUYDDusoOh
L/3yvHjnjDOw4fIycrZ97lYAXs6oL8JHTOz19lzs1QFTFVEm4bZY/puiKhSoF1E1
10WeTd/sTRnzFdfGSBoul9LYqpXPShI47VhqH+2Jp/4/U9QXo1s30IMfOIX4XnBF
QUBZ3L7jo2oXa9wWDN364raSyYFxTgJ2ZrTmt5U+oKB7yIBuEcazDE29pcFMS2Id
x403tz/s4pSNcZmUh2ai9527iKziNcNlXRjJyqEzMEL58w2bPLmv8Z4RUTdRkAq9
qZwPVshgmNv912GBRPmqKv04uLYgcBstaakGKwOCFm0pEgdyH7JJ/l/FbMyg8gQ=
-----END CERTIFICATE-----`;

// Private key for signing (RSA PKCS#8)
const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC1WKsV32g2dAGI
s7rmtxdCrMiqJGo0OI+eCjt2WhqETTbBZFhTnP2XY+rL7fQXh4SomP/61nM4lg/M
EI5Vky03IFPqht7XQdWEY9aaGIA9mabSfrYxURkHHInJ4uS2GEPl//lKEuQKh7Q6
x+uTCXDTOpZTWcx28aTlC2/E9b25et3xTJu7HxPIgKpykwGyLPKKrRF6ZJuBHFSh
pA3kv903oD7EpFwvrKh6B1UgdsNdxccMIoBEYbCUHNF++S2BeJItENRLnNNjfszU
efcY7OECXB3TBrcWX9qvwZRYaW6sH3scgnrr3BD52SR32julMzRL6kfEPUUq3t10
5L9qXw5dAgMBAAECgf9CjdQU0/v+IdF/LzZYmUWy79Fmg+R+wwVw5SILFfQoM1Wu
9x5zdSg3UDFr5bl+/NuirXYafX8Tout2opRqXuHMPKmuenhug3f/2kHSgAV3Sh65
OeJ67HH5JqgyxjDZ0JDL8nlThZ+MpeAjKK3wLTuOwD5eroM2VplGavlzcguC49x3
CH7eq8VzINuVnJF6W6XZVR8rM2+rjhsBWvjWIM8C0kWW/JFFgl6m0Mqx7bf+iRIY
318uW9A0a4aN4ZGcrs1cz4UyaXYOYiOrSz9rce2g7AIPhJBBMSEyHYNY7LmBpk1n
X0RYs+apjE914rWugCC5bch0z/c0g/AZjt0tnqkCgYEA409Tonx5wqJcbvO5U4PG
7eNXag2SclIT4QFsZRx3wUJuAA3a8XesAbQWXJXCAnhh5SV9vXZFQuO/lfLl+phd
rJdWhcOltP/ZD9v5w2jSfdcEtxEaxskqW6WsngfeXaCF43MHq1i9bi6tkWMtxO/K
9eSq1pgVgz28pS/++5LKa1UCgYEAzDwzoijZuJIM6Gq+w+wkanpPUZOpCnowjLAQ
+cU7R8QcW329EFaGjuepFWwYihofUw8MXxIQ8iVfQyXZ7Z65R1uhq0O9LwEWyM/q
gcOy+ffaIcAfOKBG4tYnLpadACLEJSEJLaB7TKZ6zyTv+B+lgEUy2KEoQxwoUfH3
1ibh5ukCgYAktM+looIrCvrwM81Oji4Whiq8hnqKmXR6VjeB0GoKPEb1HUeozJFr
KQCfbNOKgJQWY8p9SNcAaTSr6zB2GhquXzXqneBpbRNJO1WG16t+BLXPNiTjyuJb
MFLCpjSjW+OjChVH9ymH3GPM4X4nmi1lLcrkomR+7/5BkpGTYG3tjQKBgHsawoi5
FNsi9bLWPNx9p0mjJdJnLdpJ4p+6tNDI6L2OYQVo2iBR91OGIa3u9S+xJTZ8eJmJ
mztJ+YzQ8PZA2S9A9Ub1UsBVaLVsVc8X9fakRhBX7LnGKlQqf32efU4Kpq42poCh
HhEKvDXF7vthn/GcRFS9dzZUb51NO3UTBNGZAoGBAKgMwtaWzwZubcxQNlqWa2rT
9EaMNYOvxHcG3f/HPQHQ4mI8JnDPASnbrsHTqRoZzyztwl480S3hgbi6cH4x3KDq
YAKlhwcoudmqBr6dnRKcJb0ADK1CDNCNST98Zp2PCT8EVpu7wbJ0lZhjjELmGkLY
Gsq3XUc9uCQcoinr280v
-----END PRIVATE KEY-----`;

// Check if printer supports ZPL
const isZplPrinter = (printerName: string): boolean => {
  const lowerName = printerName.toLowerCase();
  return ZPL_PRINTER_KEYWORDS.some(keyword => lowerName.includes(keyword));
};

// Determine effective print mode
const getEffectivePrintMode = (printerName: string, selectedMode: PrintMode): 'zpl' | 'image' => {
  if (selectedMode === 'zpl') return 'zpl';
  if (selectedMode === 'image') return 'image';
  return isZplPrinter(printerName) ? 'zpl' : 'image';
};

// Sign data using Web Crypto API
async function signData(toSign: string): Promise<string> {
  try {
    const pemContents = QZ_PRIVATE_KEY
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSign);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
    
    const signatureArray = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < signatureArray.length; i++) {
      binary += String.fromCharCode(signatureArray[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Error signing data:', err);
    throw err;
  }
}

export const QzTrayPrintDialog = ({
  open,
  onClose,
  zplCode,
  labelImageBase64,
  labelWidth,
  labelHeight,
  dpi,
}: QzTrayPrintDialogProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printMode, setPrintMode] = useState<PrintMode>('auto');
  const [copies, setCopies] = useState(1);
  const [rememberSettings, setRememberSettings] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupSecurity = useCallback(() => {
    qz.security.setCertificatePromise((resolve) => {
      resolve(QZ_CERTIFICATE);
    });
    
    qz.security.setSignaturePromise((toSign) => {
      return async (resolve, reject) => {
        try {
          const signature = await signData(toSign);
          resolve(signature);
        } catch (err) {
          console.error('Signing error:', err);
          resolve(undefined);
        }
      };
    });
  }, []);

  const connectToQzTray = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      setupSecurity();
      
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }

      await qz.websocket.connect({ retries: 3, delay: 1 });
      setIsConnected(true);
      setIsInstalled(true);

      const foundPrinters = await qz.printers.find();
      setPrinters(foundPrinters);

      const savedPrinter = localStorage.getItem(STORAGE_KEYS.SELECTED_PRINTER);
      const savedMode = localStorage.getItem(STORAGE_KEYS.PRINT_MODE) as PrintMode;
      const savedRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_SETTINGS);

      if (savedRemember !== null) {
        setRememberSettings(savedRemember === 'true');
      }

      if (savedPrinter && foundPrinters.includes(savedPrinter)) {
        setSelectedPrinter(savedPrinter);
      } else if (foundPrinters.length > 0) {
        try {
          const defaultPrinter = await qz.printers.getDefault();
          if (foundPrinters.includes(defaultPrinter)) {
            setSelectedPrinter(defaultPrinter);
          } else {
            setSelectedPrinter(foundPrinters[0]);
          }
        } catch {
          setSelectedPrinter(foundPrinters[0]);
        }
      }

      if (savedMode) {
        setPrintMode(savedMode);
      }

    } catch (err: any) {
      console.error("QZ Tray connection error:", err);
      setIsConnected(false);
      
      if (err.message?.includes('Unable to establish') || 
          err.message?.includes('ECONNREFUSED') ||
          err.message?.includes('WebSocket')) {
        setIsInstalled(false);
        setError('QZ Tray ni nameščen ali ne teče.');
      } else {
        setError(`Napaka pri povezovanju: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [setupSecurity]);

  const disconnectFromQzTray = useCallback(async () => {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch (err) {
      console.error("Error disconnecting from QZ Tray:", err);
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (open) {
      connectToQzTray();
    } else {
      disconnectFromQzTray();
    }
  }, [open, connectToQzTray, disconnectFromQzTray]);

  const handlePrint = useCallback(async () => {
    if (!selectedPrinter) {
      toast.error("Izberite tiskalnik");
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      if (rememberSettings) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_PRINTER, selectedPrinter);
        localStorage.setItem(STORAGE_KEYS.PRINT_MODE, printMode);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_SETTINGS, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_PRINTER);
        localStorage.removeItem(STORAGE_KEYS.PRINT_MODE);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_SETTINGS, 'false');
      }

      const effectiveMode = getEffectivePrintMode(selectedPrinter, printMode);

      if (effectiveMode === 'zpl') {
        const config = qz.configs.create(selectedPrinter);
        
        for (let i = 0; i < copies; i++) {
          await qz.print(config, [zplCode]);
        }
        
        toast.success(`Etiketa poslana na ${selectedPrinter} (ZPL)`);
      } else {
        const config = qz.configs.create(selectedPrinter, {
          size: { width: labelWidth, height: labelHeight },
          units: 'mm',
          colorType: 'grayscale',
          interpolation: 'nearest-neighbor',
          scaleContent: true,
          rasterize: true
        });

        const base64Data = labelImageBase64.replace(/^data:image\/\w+;base64,/, '');

        const data = [{
          type: 'pixel' as const,
          format: 'image' as const,
          flavor: 'base64' as const,
          data: base64Data,
          options: { density: dpi }
        }];

        for (let i = 0; i < copies; i++) {
          await qz.print(config, data);
        }

        toast.success(`Etiketa poslana na ${selectedPrinter} (slika)`);
      }

      onClose();
    } catch (err: any) {
      console.error("Print error:", err);
      
      if (err.message?.includes('not found')) {
        toast.error('Tiskalnik ni najden. Preverite da je vklopljen.');
      } else if (err.message?.includes('offline')) {
        toast.error('Tiskalnik je offline. Preverite povezavo.');
      } else {
        toast.error(`Napaka pri tiskanju: ${err.message}`);
      }
      setError(err.message);
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, printMode, copies, zplCode, labelImageBase64, labelWidth, labelHeight, dpi, rememberSettings, onClose]);

  const effectiveMode = selectedPrinter ? getEffectivePrintMode(selectedPrinter, printMode) : null;
  const isZplDetected = selectedPrinter ? isZplPrinter(selectedPrinter) : false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            QZ Tray Print
          </DialogTitle>
          <DialogDescription>
            Univerzalno tiskanje na vse tiskalnike
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isConnecting && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Povezovanje z QZ Tray...</span>
            </div>
          )}

          {isInstalled === false && !isConnecting && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  QZ Tray ni nameščen
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Za tiskanje potrebujete QZ Tray. To je brezplačna aplikacija ki omogoča tiskanje iz browserja.
                </p>
                
                <div>
                  <p className="text-sm font-medium">Deluje z VSEMI tiskalniki:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                    <li>Zebra, TSC, Honeywell (ZPL)</li>
                    <li>HP, Epson, Canon (slika)</li>
                    <li>Brother, DYMO in drugi</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium">Namestitev:</p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside mt-1">
                    <li>Prenesite QZ Tray</li>
                    <li>Namestite aplikacijo</li>
                    <li>Osvežite to stran</li>
                  </ol>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => window.open('https://qz.io/download/', '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Prenesi QZ Tray
                </Button>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={connectToQzTray}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Preveri znova
              </Button>
            </div>
          )}

          {isConnected && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  QZ Tray je povezan
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Tiskalnik</Label>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izberite tiskalnik..." />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((printer) => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPrinter && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {isZplDetected ? (
                      <>
                        <Tag className="h-3 w-3" />
                        ZPL tiskalnik (avtomatsko zaznano)
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        Slikovni tiskalnik (avtomatsko zaznano)
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Način tiskanja</Label>
                <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Avtomatsko (priporočeno)</SelectItem>
                    <SelectItem value="zpl">ZPL (Zebra, TSC, Honeywell...)</SelectItem>
                    <SelectItem value="image">Slika (HP, Epson, Canon, DYMO...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Število kopij</Label>
                <Select value={copies.toString()} onValueChange={(v) => setCopies(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberSettings}
                  onCheckedChange={(checked) => setRememberSettings(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Zapomni si nastavitve
                </Label>
              </div>

              {effectiveMode === 'image' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Način "Slika" deluje z vsemi tiskalniki, ampak kvaliteta črtnih kod je lahko slabša kot pri ZPL. Za najboljšo kvaliteto uporabite ZPL tiskalnik (Zebra, TSC...).
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          {isConnected && (
            <Button onClick={handlePrint} disabled={isPrinting || !selectedPrinter}>
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tiskam...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Natisni
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
