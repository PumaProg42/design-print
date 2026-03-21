import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Barcode, Grid3X3 } from "lucide-react";

const categories = [
  { id: "qrcode", label: "QR Code", icon: QrCode },
  { id: "datamatrix", label: "DataMatrix", icon: Grid3X3 },
  { id: "ean8", label: "EAN-8", icon: Barcode },
  { id: "ean13", label: "EAN-13", icon: Barcode },
  { id: "code128", label: "Code 128", icon: Barcode },
];

interface CodeCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export const CodeCategoryDialog = ({ open, onClose, onSelectCategory }: CodeCategoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Code Type</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant="outline"
                className="h-24 flex flex-col gap-2 hover:bg-accent"
                onClick={() => {
                  onSelectCategory(category.id);
                  onClose();
                }}
              >
                <Icon className="h-8 w-8" />
                <span className="text-sm font-medium">{category.label}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
