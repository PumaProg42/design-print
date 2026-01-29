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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Printer, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Tag,
  Image as ImageIcon,
  Info,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import qz from "qz-tray";
import {
  connectQZFromUserAction,
  disconnectQZ,
  findPrinters,
  getDefaultPrinter,
  testNetworkPrinter,
  printToNetworkPrinter,
  printZplToLocalPrinter,
  printImageToLocalPrinter,
  isQZConnected,
} from "@/lib/qzClient";

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

type PrinterMode = 'local' | 'network';

const STORAGE_KEYS = {
  SELECTED_PRINTER: 'qz-tray-selected-printer',
  PRINT_MODE: 'qz-tray-print-mode',
  REMEMBER_SETTINGS: 'qz-tray-remember-settings',
  PRINTER_MODE: 'qz-tray-printer-mode',
  NETWORK_IP: 'qz-tray-network-ip',
  NETWORK_PORT: 'qz-tray-network-port',
  NETWORK_IP_HISTORY: 'qz-tray-network-ip-history'
};

const MAX_IP_HISTORY = 5;

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
  const [isNotDetected, setIsNotDetected] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printMode, setPrintMode] = useState<PrintMode>('auto');
  const [copies, setCopies] = useState(1);
  const [rememberSettings, setRememberSettings] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Network printer state
  const [printerMode, setPrinterMode] = useState<PrinterMode>('local');
  const [networkIp, setNetworkIp] = useState("");
  const [networkPort, setNetworkPort] = useState("9100");
  const [ipHistory, setIpHistory] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);

  // URL for QZ Tray download
  const QZ_TRAY_DOWNLOAD_URL = 'https://github.com/PumaProg42/Label-Print-Setup/releases/download/label-designer/LabelDesigner-Print-Setup.zip';

  // Load IP history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.NETWORK_IP_HISTORY);
    if (savedHistory) {
      try {
        setIpHistory(JSON.parse(savedHistory));
      } catch {
        setIpHistory([]);
      }
    }
  }, []);

  // Save IP to history
  const saveIpToHistory = useCallback((ip: string, port: string) => {
    const fullAddress = `${ip}:${port}`;
    setIpHistory(prev => {
      const filtered = prev.filter(item => item !== fullAddress);
      const newHistory = [fullAddress, ...filtered].slice(0, MAX_IP_HISTORY);
      localStorage.setItem(STORAGE_KEYS.NETWORK_IP_HISTORY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Test network connection using centralized client
  const testNetworkConnection = useCallback(async () => {
    if (!networkIp.trim()) {
      toast.error("Vnesite IP naslov");
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const port = parseInt(networkPort) || 9100;
      
      // Use centralized function - ensures QZ is connected with security first
      await testNetworkPrinter(networkIp, port, 5000);
      
      setConnectionTestResult('success');
      toast.success(`Povezava na ${networkIp}:${port} uspešna!`);
      
      // Save to history on successful connection
      saveIpToHistory(networkIp, networkPort);
    } catch (err: any) {
      console.error("Connection test error:", err);
      setConnectionTestResult('error');
      toast.error(`Povezava neuspešna: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  }, [networkIp, networkPort, saveIpToHistory]);

  // Select IP from history
  const selectFromHistory = useCallback((address: string) => {
    const [ip, port] = address.split(':');
    setNetworkIp(ip);
    setNetworkPort(port || '9100');
    setConnectionTestResult(null);
  }, []);

  // Remove IP from history
  const removeFromHistory = useCallback((address: string) => {
    setIpHistory(prev => {
      const newHistory = prev.filter(item => item !== address);
      localStorage.setItem(STORAGE_KEYS.NETWORK_IP_HISTORY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Connect to QZ Tray - MUST be called from user click only
  const connectToQzTray = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsNotDetected(false);

    try {
      // CRITICAL: This is called from button click - enables "Remember" checkbox
      await connectQZFromUserAction();
      
      setIsConnected(true);
      setIsNotDetected(false);

      // Find printers
      const foundPrinters = await findPrinters();
      setPrinters(foundPrinters);

      const savedPrinter = localStorage.getItem(STORAGE_KEYS.SELECTED_PRINTER);
      const savedMode = localStorage.getItem(STORAGE_KEYS.PRINT_MODE) as PrintMode;
      const savedRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_SETTINGS);
      const savedPrinterMode = localStorage.getItem(STORAGE_KEYS.PRINTER_MODE) as PrinterMode;
      const savedNetworkIp = localStorage.getItem(STORAGE_KEYS.NETWORK_IP);
      const savedNetworkPort = localStorage.getItem(STORAGE_KEYS.NETWORK_PORT);

      if (savedRemember !== null) {
        setRememberSettings(savedRemember === 'true');
      }

      if (savedPrinterMode) {
        setPrinterMode(savedPrinterMode);
      }

      if (savedNetworkIp) {
        setNetworkIp(savedNetworkIp);
      }

      if (savedNetworkPort) {
        setNetworkPort(savedNetworkPort);
      }

      if (savedPrinter && foundPrinters.includes(savedPrinter)) {
        setSelectedPrinter(savedPrinter);
      } else if (foundPrinters.length > 0) {
        try {
          const defaultPrinter = await getDefaultPrinter();
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
      setIsNotDetected(true);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectFromQzTray = useCallback(async () => {
    await disconnectQZ();
    setIsConnected(false);
  }, []);

  // Check connection status when dialog opens
  // If already connected from previous user gesture, load printers
  useEffect(() => {
    if (open) {
      const connected = isQZConnected();
      setIsConnected(connected);
      
      if (connected) {
        // Connection was established from previous user gesture - safe to load printers
        qz.printers.find()
          .then(foundPrinters => {
            setPrinters(foundPrinters);
            // Restore saved printer selection
            const savedPrinter = localStorage.getItem(STORAGE_KEYS.SELECTED_PRINTER);
            if (savedPrinter && foundPrinters.includes(savedPrinter)) {
              setSelectedPrinter(savedPrinter);
            } else if (foundPrinters.length > 0) {
              setSelectedPrinter(foundPrinters[0]);
            }
          })
          .catch(err => {
            console.error("Failed to load printers:", err);
            // Connection may have been lost
            setIsConnected(false);
          });
      } else {
        setIsNotDetected(false);
        setPrinters([]);
      }
    }
  }, [open]);

  const handlePrint = useCallback(async () => {
    // For network mode, validate IP address
    if (printerMode === 'network') {
      if (!networkIp.trim()) {
        toast.error("Vnesite IP naslov tiskalnika");
        return;
      }
    } else if (!selectedPrinter) {
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
        localStorage.setItem(STORAGE_KEYS.PRINTER_MODE, printerMode);
        localStorage.setItem(STORAGE_KEYS.NETWORK_IP, networkIp);
        localStorage.setItem(STORAGE_KEYS.NETWORK_PORT, networkPort);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_PRINTER);
        localStorage.removeItem(STORAGE_KEYS.PRINT_MODE);
        localStorage.removeItem(STORAGE_KEYS.PRINTER_MODE);
        localStorage.removeItem(STORAGE_KEYS.NETWORK_IP);
        localStorage.removeItem(STORAGE_KEYS.NETWORK_PORT);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_SETTINGS, 'false');
      }

      if (printerMode === 'network') {
        // Network printing using centralized function
        const port = parseInt(networkPort) || 9100;
        await printToNetworkPrinter(networkIp, port, zplCode, copies);
        toast.success(`Etiketa poslana na ${networkIp}:${port}`);
      } else {
        // Local printer
        const effectiveMode = getEffectivePrintMode(selectedPrinter, printMode);

        if (effectiveMode === 'zpl') {
          await printZplToLocalPrinter(selectedPrinter, zplCode, copies);
          toast.success(`Etiketa poslana na ${selectedPrinter} (ZPL)`);
        } else {
          await printImageToLocalPrinter(
            selectedPrinter, 
            labelImageBase64, 
            labelWidth, 
            labelHeight, 
            dpi, 
            copies
          );
          toast.success(`Etiketa poslana na ${selectedPrinter} (slika)`);
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Print error:", err);
      
      if (err.message?.includes('not found')) {
        toast.error('Tiskalnik ni najden. Preverite da je vklopljen.');
      } else if (err.message?.includes('offline')) {
        toast.error('Tiskalnik je offline. Preverite povezavo.');
      } else if (err.message?.includes('ECONNREFUSED') || err.message?.includes('timeout')) {
        toast.error('Ni mogoče povezati na mrežni tiskalnik. Preverite IP naslov in port.');
      } else {
        toast.error(`Napaka pri tiskanju: ${err.message}`);
      }
      setError(err.message);
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, printMode, copies, zplCode, labelImageBase64, labelWidth, labelHeight, dpi, rememberSettings, onClose, printerMode, networkIp, networkPort]);

  const effectiveMode = selectedPrinter ? getEffectivePrintMode(selectedPrinter, printMode) : null;
  const isZplDetected = selectedPrinter ? isZplPrinter(selectedPrinter) : false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print on Port
          </DialogTitle>
          <DialogDescription>
            Univerzalno tiskanje na vse tiskalnike
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Not connected - show connect button */}
          {!isConnected && !isConnecting && !isNotDetected && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Printer className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Povežite tiskalnik</h3>
                <p className="text-sm text-muted-foreground">
                  Kliknite spodnji gumb za povezavo s tiskalnikom. Ob prvem zagonu potrdite zaupanje v pojavnem oknu.
                </p>
              </div>

              <Button onClick={connectToQzTray} className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                Poveži tiskalnik
              </Button>
            </div>
          )}

          {isConnecting && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Povezovanje...</span>
            </div>
          )}

          {isNotDetected && !isConnecting && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">Manjka tiskalni program</h3>
                <p className="text-sm text-muted-foreground">
                  Za direktno tiskanje na port potrebujete namestiti pomožni program, ki omogoča komunikacijo med brskalnikom in tiskalnikom.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => window.open(QZ_TRAY_DOWNLOAD_URL, '_blank')} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Prenesi in namesti
                </Button>
                <Button variant="secondary" onClick={connectToQzTray} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Poskusi znova
                </Button>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Povezava vzpostavljena
                </AlertDescription>
              </Alert>

              {/* Printer mode selection */}
              <div className="space-y-2">
                <Label>Način povezave</Label>
                <RadioGroup 
                  value={printerMode} 
                  onValueChange={(v) => setPrinterMode(v as PrinterMode)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="local" id="local" />
                    <Label htmlFor="local" className="cursor-pointer flex items-center gap-1">
                      <Printer className="h-4 w-4" />
                      Lokalni tiskalnik
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="network" id="network" />
                    <Label htmlFor="network" className="cursor-pointer flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      IP naslov
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Local printer selection */}
              {printerMode === 'local' && (
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
              )}

              {/* Network printer IP input */}
              {printerMode === 'network' && (
                <div className="space-y-3">
                  {/* IP History */}
                  {ipHistory.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Nedavni naslovi</Label>
                      <div className="flex flex-wrap gap-1">
                        {ipHistory.map((address) => (
                          <div 
                            key={address} 
                            className="group flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-muted/80"
                            onClick={() => selectFromHistory(address)}
                          >
                            <Globe className="h-3 w-3" />
                            <span>{address}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromHistory(address);
                              }}
                              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>IP naslov tiskalnika</Label>
                    <Input
                      placeholder="npr. 192.168.1.100"
                      value={networkIp}
                      onChange={(e) => {
                        setNetworkIp(e.target.value);
                        setConnectionTestResult(null);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port (privzeto 9100)</Label>
                    <Input
                      placeholder="9100"
                      value={networkPort}
                      onChange={(e) => {
                        setNetworkPort(e.target.value);
                        setConnectionTestResult(null);
                      }}
                    />
                  </div>

                  {/* Test connection button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testNetworkConnection}
                    disabled={isTestingConnection || !networkIp.trim()}
                    className="w-full"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testiram povezavo...
                      </>
                    ) : connectionTestResult === 'success' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        Povezava uspešna
                      </>
                    ) : connectionTestResult === 'error' ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                        Testiraj znova
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Testiraj povezavo
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Mrežno tiskanje pošlje ZPL kodo direktno na tiskalnik preko IP naslova.
                  </p>
                </div>
              )}

              {/* Print mode selection - only for local printers */}
              {printerMode === 'local' && (
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
              )}

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

              {effectiveMode === 'image' && printerMode === 'local' && (
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
            <Button 
              onClick={handlePrint} 
              disabled={isPrinting || (printerMode === 'local' && !selectedPrinter) || (printerMode === 'network' && !networkIp.trim())}
            >
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
