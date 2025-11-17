import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Type, Plus, Minus } from "lucide-react";

interface CellActionDialogProps {
  open: boolean;
  onClose: () => void;
  onAddText: () => void;
  onAddRow?: () => void;
  onDeleteRow?: () => void;
  onAddColumn?: () => void;
  onDeleteColumn?: () => void;
  cellPosition?: { row: number; col: number };
  showRowActions?: boolean;
  showColumnActions?: boolean;
}

export const CellActionDialog = ({ 
  open, 
  onClose, 
  onAddText,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  showRowActions = false,
  showColumnActions = false,
}: CellActionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cell Actions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              onAddText();
              onClose();
            }}
          >
            <Type className="w-5 h-5" />
            <span>Add Text</span>
          </Button>
          
          {showRowActions && (
            <>
              <div className="border-t my-2" />
              <p className="text-sm text-muted-foreground px-2">Row Actions</p>
              {onAddRow && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    onAddRow();
                    onClose();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Row Below</span>
                </Button>
              )}
              {onDeleteRow && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    onDeleteRow();
                    onClose();
                  }}
                >
                  <Minus className="w-4 h-4" />
                  <span>Delete Row</span>
                </Button>
              )}
            </>
          )}
          
          {showColumnActions && (
            <>
              <div className="border-t my-2" />
              <p className="text-sm text-muted-foreground px-2">Column Actions</p>
              {onAddColumn && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    onAddColumn();
                    onClose();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Column Right</span>
                </Button>
              )}
              {onDeleteColumn && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    onDeleteColumn();
                    onClose();
                  }}
                >
                  <Minus className="w-4 h-4" />
                  <span>Delete Column</span>
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
