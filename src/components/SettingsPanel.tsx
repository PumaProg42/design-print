import React from "react";
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
import { Settings, Save, Printer, FolderOpen, Loader2, LogOut, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { TrialCountdown } from "@/components/TrialCountdown";
import { useAuth } from "@/hooks/useAuth";

interface SettingsPanelProps {
  width: number;
  height: number;
  dpi: number;
  rotate180: boolean;
  labelName: string;
  onLabelNameChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onDpiChange: (value: number) => void;
  onRotate180Change: (value: boolean) => void;
  onExport: (withValues: boolean) => void;
  onPrint: () => void;
  onZplPdfPrint: () => void;
  onShowPrintOptions: () => void;
  onSaveToDb: () => void;
  onLoadFromDb: () => void;
  isSaving?: boolean;
}

export const SettingsPanel = ({
  width,
  height,
  dpi,
  rotate180,
  labelName,
  onLabelNameChange,
  onWidthChange,
  onHeightChange,
  onDpiChange,
  onRotate180Change,
  onExport,
  onPrint,
  onZplPdfPrint,
  onShowPrintOptions,
  onSaveToDb,
  onLoadFromDb,
  isSaving = false,
}: SettingsPanelProps) => {
  const { user, signOut } = useAuth();

  return (
    <div className="bg-panel border-b border-border shadow-md">
      <div className="px-6 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Label Designer PTI <span className="text-sm font-normal text-muted-foreground ml-2">V:3.0.3 ID:{__BUILD_ID__}</span></h1>
        <div className="flex items-center gap-4">
          <TrialCountdown />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="max-w-[200px] truncate" title={user?.email || ""}>
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Odjava
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Label Settings</span>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <Label htmlFor="labelName" className="text-xs whitespace-nowrap">
              Label Name
            </Label>
            <Input
              id="labelName"
              type="text"
              value={labelName}
              onChange={(e) => onLabelNameChange(e.target.value)}
              placeholder="Enter label name"
              className="w-48 h-8"
            />
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
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSaveToDb} 
            disabled={isSaving}
            className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLoadFromDb} 
            className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load
          </Button>
          <Button variant="default" size="sm" onClick={onShowPrintOptions} className="bg-gradient-primary transition-all hover:shadow-lg hover:scale-105">
            <Printer className="w-4 h-4 mr-2" />
            PRINT
          </Button>
        </div>
      </div>
    </div>
  );
};
