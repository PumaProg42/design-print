import { Type, Clock, Leaf, Scale, AlignLeft, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TextCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
}

const categories = [
  { id: "Fixed Text", label: "Fixed Text", icon: Type, disabled: false },
  { id: "Teksti", label: "Teksti", icon: FileText, disabled: false },
  { id: "Date & Time", label: "Date & Time", icon: Clock, disabled: true },
  { id: "Nutrition & Energy Values", label: "Nutrition & Energy Values", icon: Leaf, disabled: true },
  { id: "Weight & Price", label: "Weight & Price", icon: Scale, disabled: true },
  { id: "Multiline Text", label: "Multiline Text", icon: AlignLeft, disabled: true },
];

export const TextCategoryDialog = ({
  open,
  onClose,
  onSelectCategory,
}: TextCategoryDialogProps) => {
  const handleCategoryClick = (category: string) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Text Type</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          {/* First row: 3 items */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.slice(0, 3).map((category) => (
              <button
                key={category.id}
                onClick={() => !category.disabled && handleCategoryClick(category.id)}
                disabled={category.disabled}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all duration-200 group ${
                  category.disabled
                    ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                    : 'border-border bg-card hover:bg-accent hover:border-primary cursor-pointer'
                }`}
              >
                <category.icon className={`w-12 h-12 transition-colors ${category.disabled ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className="text-sm font-medium text-center">{category.label}</span>
                {category.disabled && <span className="text-xs text-muted-foreground">Coming soon</span>}
              </button>
            ))}
          </div>
          
          {/* Second row: 3 items */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.slice(3).map((category) => (
              <button
                key={category.id}
                onClick={() => !category.disabled && handleCategoryClick(category.id)}
                disabled={category.disabled}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all duration-200 group ${
                  category.disabled
                    ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                    : 'border-border bg-card hover:bg-accent hover:border-primary cursor-pointer'
                }`}
              >
                <category.icon className={`w-12 h-12 transition-colors ${category.disabled ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className="text-sm font-medium text-center">{category.label}</span>
                {category.disabled && <span className="text-xs text-muted-foreground">Coming soon</span>}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
