import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Download, Printer, Trash2, ZoomIn } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

interface SettingsPanelProps {
  width: number;
  height: number;
  dpi: number;
  zoom: number;
  rotate180: boolean;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onDpiChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  onRotate180Change: (value: boolean) => void;
  onExport: (withValues: boolean) => void;
  onPrint: () => void;
  onClear: () => void;
}

export const SettingsPanel = ({
  width,
  height,
  dpi,
  zoom,
  rotate180,
  onWidthChange,
  onHeightChange,
  onDpiChange,
  onZoomChange,
  onRotate180Change,
  onExport,
  onPrint,
  onClear,
}: SettingsPanelProps) => {
  return (
    <div className="bg-panel border-b border-border shadow-md">
      <div className="px-6 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Label Designer Perko</h1>
      </div>
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Label Settings</span>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-3">
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
                <SelectContent>
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

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2 min-w-[200px]">
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="zoom" className="text-xs whitespace-nowrap">
                Zoom
              </Label>
              <Slider
                id="zoom"
                value={[zoom]}
                onValueChange={(values) => onZoomChange(values[0])}
                min={0.1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-12 text-right">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport(false)} className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105">
              <Download className="w-4 h-4 mr-2" />
              Export with Field Names
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport(true)} className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105">
              <Download className="w-4 h-4 mr-2" />
              Export with Values
            </Button>
            <Button variant="default" size="sm" onClick={onPrint} className="bg-gradient-primary transition-all hover:shadow-lg hover:scale-105">
              <Printer className="w-4 h-4 mr-2" />
              Print Label
            </Button>
            <Button variant="outline" size="sm" onClick={onClear} className="transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-md hover:scale-105">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Label
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Field Names = actual visible text. Values = placeholders (Text1, Text2, etc.) for external systems.
          </p>
        </div>
      </div>
    </div>
  );
};
