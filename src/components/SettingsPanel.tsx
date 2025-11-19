import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Download, Printer, FileCode2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import perkoLogo from "@/assets/perko-logo.png";

interface SettingsPanelProps {
  width: number;
  height: number;
  dpi: number;
  rotate180: boolean;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onDpiChange: (value: number) => void;
  onRotate180Change: (value: boolean) => void;
  onExport: (withValues: boolean) => void;
  onPrint: () => void;
  onZplPdfPrint: () => void;
  onShowPrintOptions: () => void;
}

export const SettingsPanel = ({
  width,
  height,
  dpi,
  rotate180,
  onWidthChange,
  onHeightChange,
  onDpiChange,
  onRotate180Change,
  onExport,
  onPrint,
  onZplPdfPrint,
  onShowPrintOptions,
}: SettingsPanelProps) => {
  return (
    <div className="border-b shadow-md" style={{ backgroundColor: '#f8f8f8', borderBottom: '1px solid #e2e2e2' }}>
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        {/* Logo and Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('https://www.perko-tehtnice.si/', '_blank')}
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Visit Perko Tehtnice website"
          >
            <img src={perkoLogo} alt="Perko Tehtnice Logo" className="h-8" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-foreground">Label Designer</span>
            <span className="text-muted-foreground">—</span>
            <span className="font-normal text-muted-foreground">Powered by Perko Tehtnice</span>
          </div>
        </div>

        {/* Control Group */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ border: '1px solid #e5e5e5' }}>
          <div className="flex items-center gap-2">
            <Label htmlFor="width" className="text-xs whitespace-nowrap">
              Width (mm)
            </Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => onWidthChange(parseFloat(e.target.value))}
              className="w-20 h-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="height" className="text-xs whitespace-nowrap">
              Height (mm)
            </Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => onHeightChange(parseFloat(e.target.value))}
              className="w-20 h-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="dpi" className="text-xs">
              DPI
            </Label>
            <Select value={dpi.toString()} onValueChange={(v) => onDpiChange(parseInt(v))}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]" position="popper" sideOffset={5}>
                <SelectItem value="203">203 DPI</SelectItem>
                <SelectItem value="300">300 DPI</SelectItem>
                <SelectItem value="600">600 DPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <Checkbox
              id="rotate180"
              checked={rotate180}
              onCheckedChange={(checked) => onRotate180Change(checked === true)}
            />
            <Label htmlFor="rotate180" className="text-xs whitespace-nowrap cursor-pointer">
              Rotate 180°
            </Label>
          </div>
        </div>

        {/* Action Buttons - Right Aligned */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => onExport(false)} className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md">
            <Download className="w-4 h-4 mr-2" />
            Export with Field Names
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport(true)} className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md">
            <Download className="w-4 h-4 mr-2" />
            Export with Values
          </Button>
          <Button variant="default" size="sm" onClick={onShowPrintOptions} className="bg-gradient-primary transition-all hover:shadow-lg">
            <Printer className="w-4 h-4 mr-2" />
            PRINT
          </Button>
        </div>
      </div>
      
      {/* Helper text */}
      <div className="px-6 pb-3">
        <p className="text-xs text-muted-foreground">
          Field Names = actual visible text. Values = placeholders (Text1, Text2, etc.) for external systems.
        </p>
      </div>
    </div>
  );
};
