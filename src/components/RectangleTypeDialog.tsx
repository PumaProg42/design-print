import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Square, Table } from "lucide-react";

interface RectangleTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: "rectangle" | "table") => void;
}

export const RectangleTypeDialog = ({ open, onClose, onSelectType }: RectangleTypeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Type</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-16 text-base hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              onSelectType("rectangle");
              onClose();
            }}
          >
            <Square className="w-6 h-6" />
            <span>Rectangle</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-16 text-base hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              onSelectType("table");
              onClose();
            }}
          >
            <Table className="w-6 h-6" />
            <span>Table</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
