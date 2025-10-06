import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TextFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fieldName: string) => void;
}

export const TextFieldDialog = ({ open, onClose, onConfirm }: TextFieldDialogProps) => {
  const [selectedField, setSelectedField] = useState("Text1");

  const textFields = Array.from({ length: 20 }, (_, i) => `Text${i + 1}`);

  const handleConfirm = () => {
    onConfirm(selectedField);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Text Field</DialogTitle>
          <DialogDescription>
            Choose a predefined text field name. You can edit the content later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Text Field Name</Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {textFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Add Text Field</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
