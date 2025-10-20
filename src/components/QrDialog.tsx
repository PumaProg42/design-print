import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QrDialogProps {
  open: boolean;
  onClose: () => void;
  defaultMagnification: number;
  defaultErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  onConfirm: (data: string, options: { magnification: number; errorCorrection: 'L' | 'M' | 'Q' | 'H' }) => void;
}

export const QrDialog = ({ open, onClose, defaultMagnification, defaultErrorCorrection = 'Q', onConfirm }: QrDialogProps) => {
  const [data, setData] = useState("");
  const [magnification, setMagnification] = useState<number>(defaultMagnification);
  const [level, setLevel] = useState<'L'|'M'|'Q'|'H'>(defaultErrorCorrection);

  const handleSubmit = () => {
    const mag = Math.max(1, Math.min(100, Number(magnification) || defaultMagnification));
    if (!data.trim()) return;
    onConfirm(data, { magnification: mag, errorCorrection: level });
    setData("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="qr-data">Data</Label>
            <Input
              id="qr-data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Enter QR data"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qr-mag">Magnification (dots/module)</Label>
              <Input
                id="qr-mag"
                type="number"
                min={1}
                max={100}
                value={magnification}
                onChange={(e) => setMagnification(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Error correction</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100] max-h-60" position="popper" sideOffset={5}>
                  <SelectItem value="L">L (high density)</SelectItem>
                  <SelectItem value="M">M (standard)</SelectItem>
                  <SelectItem value="Q">Q (high reliability)</SelectItem>
                  <SelectItem value="H">H (ultra high reliability)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add QR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};