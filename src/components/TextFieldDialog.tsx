import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TextFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fieldName: string, isFixed?: boolean) => void;
  usedTextFields: string[];
}

export const TextFieldDialog = ({ open, onClose, onConfirm, usedTextFields }: TextFieldDialogProps) => {
  const [selectedField, setSelectedField] = useState("Text1");
  const [textType, setTextType] = useState<"dynamic" | "fixed">("dynamic");

  const textFields = Array.from({ length: 20 }, (_, i) => `Text${i + 1}`);
  
  // Find the first available text field when dialog opens
  const getFirstAvailable = () => {
    return textFields.find(field => !usedTextFields.includes(field)) || "Text1";
  };

  const handleConfirm = () => {
    onConfirm(selectedField, textType === "fixed");
    onClose();
  };
  
  // Update selected field when dialog opens or used fields change
  useEffect(() => {
    if (open) {
      setSelectedField(getFirstAvailable());
      setTextType("dynamic");
    }
  }, [open, usedTextFields]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Text Field</DialogTitle>
          <DialogDescription>
            Choose between dynamic text (exports as placeholder) or fixed text (exports actual content).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Text Type</Label>
            <RadioGroup value={textType} onValueChange={(value) => setTextType(value as "dynamic" | "fixed")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dynamic" id="dynamic" />
                <Label htmlFor="dynamic" className="font-normal cursor-pointer">
                  Dynamic Text (Text1, Text2, ...) - exports as placeholder
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal cursor-pointer">
                  Fixed Text - exports actual content
                </Label>
              </div>
            </RadioGroup>
          </div>

          {textType === "dynamic" && (
            <div className="space-y-2">
              <Label>Text Field Name</Label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {textFields.map((field) => (
                    <SelectItem 
                      key={field} 
                      value={field}
                      disabled={usedTextFields.includes(field)}
                    >
                      {field} {usedTextFields.includes(field) ? "(In use)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
