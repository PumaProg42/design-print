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
import { Settings, Download, Printer } from "lucide-react";
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
}: SettingsPanelProps) => {
  return (
    <div className="bg-panel border-b border-border p-4">
      <div className="flex items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport(false)}>
            <Download className="w-4 h-4 mr-2" />
            Export (Fields)
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export (Values)
          </Button>
          <Button variant="default" size="sm" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
};
