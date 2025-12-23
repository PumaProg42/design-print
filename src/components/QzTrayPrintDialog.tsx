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

// Check if printer supports ZPL
const isZplPrinter = (printerName: string): boolean => {
  const lowerName = printerName.toLowerCase();
  return ZPL_PRINTER_KEYWORDS.some(keyword => lowerName.includes(keyword));
};

// Determine effective print mode
const getEffectivePrintMode = (printerName: string, selectedMode: PrintMode): 'zpl' | 'image' => {
  if (selectedMode === 'zpl') return 'zpl';
  if (selectedMode === 'image') return 'image';
  // Auto mode - detect based on printer name
  return isZplPrinter(printerName) ? 'zpl' : 'image';
};

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
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [printMode, setPrintMode] = useState<PrintMode>('auto');
  const [copies, setCopies] = useState(1);
  const [rememberSettings, setRememberSettings] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup QZ Tray security (for free/unsigned version)
  const setupSecurity = useCallback(() => {
    qz.security.setCertificatePromise((resolve) => {
      resolve();
    });
    qz.security.setSignaturePromise(() => (resolve) => {
      resolve();
    });
  }, []);

  // Connect to QZ Tray
  const connectToQzTray = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      setupSecurity();
      
      // Check if already connected
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }

      await qz.websocket.connect({ retries: 3, delay: 1 });
      setIsConnected(true);
      setIsInstalled(true);

      // Get list of printers
      const foundPrinters = await qz.printers.find();
      setPrinters(foundPrinters);

      // Load saved settings
      const savedPrinter = localStorage.getItem(STORAGE_KEYS.SELECTED_PRINTER);
      const savedMode = localStorage.getItem(STORAGE_KEYS.PRINT_MODE) as PrintMode;
      const savedRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_SETTINGS);

      if (savedRemember !== null) {
        setRememberSettings(savedRemember === 'true');
      }

      if (savedPrinter && foundPrinters.includes(savedPrinter)) {
        setSelectedPrinter(savedPrinter);
      } else if (foundPrinters.length > 0) {
        // Try to get default printer
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

  // Disconnect from QZ Tray
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

  // Connect when dialog opens
  useEffect(() => {
    if (open) {
      connectToQzTray();
    } else {
      disconnectFromQzTray();
    }
  }, [open, connectToQzTray, disconnectFromQzTray]);

  // Handle printing
  const handlePrint = useCallback(async () => {
    if (!selectedPrinter) {
      toast.error("Izberite tiskalnik");
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      // Save settings if enabled
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
        // ZPL printing for Zebra, TSC, Honeywell, etc.
        const config = qz.configs.create(selectedPrinter);
        
        for (let i = 0; i < copies; i++) {
          await qz.print(config, [zplCode]);
        }
        
        toast.success(`Etiketa poslana na ${selectedPrinter} (ZPL)`);
      } else {
        // Image printing for HP, Epson, Canon, DYMO, etc.
        const config = qz.configs.create(selectedPrinter, {
          size: { width: labelWidth, height: labelHeight },
          units: 'mm',
          colorType: 'grayscale',
          interpolation: 'nearest-neighbor',
          scaleContent: true,
          rasterize: true
        });

        // Remove data URL prefix if present
        const base64Data = labelImageBase64.replace(/^data:image\/\w+;base64,/, '');

        const data = [{
          type: 'pixel' as const,
          format: 'image' as const,
          flavor: 'base64' as const,
          data: base64Data,
          options: {
            density: dpi
          }
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            QZ Tray Print
          </DialogTitle>
          <DialogDescription>
            Univerzalno tiskanje na vse tiskalnike
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Status */}
          {isConnecting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Povezovanje z QZ Tray...
            </div>
          )}

          {/* QZ Tray Not Installed */}
          {isInstalled === false && !isConnecting && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  QZ Tray ni nameščen
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Za tiskanje potrebujete QZ Tray. To je brezplačna aplikacija ki omogoča tiskanje iz browserja.
                </p>
                
                <div className="text-sm">
                  <p className="font-medium mb-2">Deluje z VSEMI tiskalniki:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Zebra, TSC, Honeywell (ZPL)</li>
                    <li>HP, Epson, Canon (slika)</li>
                    <li>Brother, DYMO in drugi</li>
                  </ul>
                </div>

                <div className="text-sm">
                  <p className="font-medium mb-2">Namestitev:</p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                    <li>Prenesite QZ Tray</li>
                    <li>Namestite aplikacijo</li>
                    <li>Osvežite to stran</li>
                  </ol>
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={() => window.open('https://qz.io/download/', '_blank')}
                >
                  <Download className="w-4 h-4" />
                  Prenesi QZ Tray
                </Button>
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={connectToQzTray}
                disabled={isConnecting}
              >
                <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
                Preveri znova
              </Button>
            </div>
          )}

          {/* QZ Tray Connected */}
          {isConnected && (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="ml-2 text-green-600">
                  QZ Tray je povezan
                </AlertDescription>
              </Alert>

              {/* Printer Selection */}
              <div className="space-y-2">
                <Label>Tiskalnik</Label>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izberite tiskalnik" />
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
                        <Tag className="w-3 h-3" />
                        ZPL tiskalnik (avtomatsko zaznano)
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3" />
                        Slikovni tiskalnik (avtomatsko zaznano)
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Print Mode */}
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

              {/* Copies */}
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

              {/* Remember Settings */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberSettings}
                  onCheckedChange={(checked) => setRememberSettings(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Zapomni si nastavitve
                </Label>
              </div>

              {/* Image Mode Warning */}
              {effectiveMode === 'image' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="ml-2 text-xs">
                    Način "Slika" deluje z vsemi tiskalniki, ampak kvaliteta črtnih kod je lahko slabša kot pri ZPL. Za najboljšo kvaliteto uporabite ZPL tiskalnik (Zebra, TSC...).
                  </AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
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
            <Button 
              onClick={handlePrint} 
              disabled={!selectedPrinter || isPrinting}
              className="gap-2"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tiskam...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
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
