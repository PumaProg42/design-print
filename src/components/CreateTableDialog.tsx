import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CreateTableDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (rows: number, columns: number) => void;
}

export const CreateTableDialog = ({ open, onClose, onCreate }: CreateTableDialogProps) => {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [error, setError] = useState("");

  const handleCreate = () => {
    // Validate
    if (rows < 1 || rows > 10) {
      setError("Rows must be between 1 and 10");
      return;
    }
    if (columns < 1 || columns > 10) {
      setError("Columns must be between 1 and 10");
      return;
    }
    
    setError("");
    onCreate(rows, columns);
    onClose();
    
    // Reset for next time
    setRows(3);
    setColumns(3);
  };

  const handleRowsChange = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    setRows(Math.min(10, Math.max(1, num)));
    setError("");
  };

  const handleColumnsChange = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    setColumns(Math.min(10, Math.max(1, num)));
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rows">Rows (1-10)</Label>
            <Input
              id="rows"
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(e) => handleRowsChange(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="columns">Columns (1-10)</Label>
            <Input
              id="columns"
              type="number"
              min={1}
              max={10}
              value={columns}
              onChange={(e) => handleColumnsChange(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
