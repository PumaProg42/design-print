import * as React from "react";
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
  const [labelName, setLabelName] = React.useState("");

  return (
    <div className="shadow-md" style={{ backgroundColor: '#D9ECFF' }}>
      <div className="flex items-center justify-between gap-6 px-6 py-4 relative">
        {/* Left Side: Control Group in White Container */}
        <div className="flex flex-col gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="width" className="text-xs whitespace-nowrap text-gray-700">
                Width (mm)
              </Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => onWidthChange(parseFloat(e.target.value))}
                className="w-20 h-8 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="height" className="text-xs whitespace-nowrap text-gray-700">
                Height (mm)
              </Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => onHeightChange(parseFloat(e.target.value))}
                className="w-20 h-8 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="dpi" className="text-xs text-gray-700">
                DPI
              </Label>
              <Select value={dpi.toString()} onValueChange={(v) => onDpiChange(parseInt(v))}>
                <SelectTrigger className="w-24 h-8 bg-white">
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
              <Label htmlFor="rotate180" className="text-xs whitespace-nowrap cursor-pointer text-gray-700">
                Rotate 180°
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="labelName" className="text-xs whitespace-nowrap text-gray-700">
              Label Name
            </Label>
            <Input
              id="labelName"
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="Enter label name..."
              className="flex-1 h-8 bg-white"
            />
          </div>
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            onClick={() => window.open('https://www.perko-tehtnice.si/', '_blank')}
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Visit Perko Tehtnice website"
          >
            <img src={perkoLogo} alt="Perko Tehtnice Logo" className="h-18" />
          </button>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExport(false)} 
            className="bg-white text-gray-800 border-gray-300 hover:bg-gray-50 transition-all rounded-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Export with Field Names
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExport(true)} 
            className="bg-white text-gray-800 border-gray-300 hover:bg-gray-50 transition-all rounded-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Export with Values
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={onShowPrintOptions} 
            className="bg-white text-[#1E73BE] hover:bg-gray-50 transition-all font-semibold rounded-md border border-gray-300"
          >
            <Printer className="w-4 h-4 mr-2" />
            PRINT
          </Button>
        </div>
      </div>
    </div>
  );
};
