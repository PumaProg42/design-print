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
import { Settings, Download, Printer, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SettingsPanelProps {
  width: number;
  height: number;
  dpi: number;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onDpiChange: (value: number) => void;
  onExport: (withValues: boolean) => void;
  onPrint: () => void;
  onClear: () => void;
}

export const SettingsPanel = ({
  width,
  height,
  dpi,
  onWidthChange,
  onHeightChange,
  onDpiChange,
  onExport,
  onPrint,
  onClear,
}: SettingsPanelProps) => {
  return (
    <div className="bg-panel border-b border-border">
      <div className="px-4 py-2 border-b border-border">
        <h1 className="text-lg font-bold">Label Designer Perko</h1>
      </div>
      <div className="flex items-center justify-between gap-4 p-4">
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
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport(false)} className="hover:bg-primary hover:text-primary-foreground">
              <Download className="w-4 h-4 mr-2" />
              Export with Field Names
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport(true)} className="hover:bg-primary hover:text-primary-foreground">
              <Download className="w-4 h-4 mr-2" />
              Export with Values
            </Button>
            <Button variant="default" size="sm" onClick={onPrint} className="hover:bg-primary/90">
              <Printer className="w-4 h-4 mr-2" />
              Print Label
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
