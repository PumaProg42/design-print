import { Type, Image, Barcode, Minus, Square, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ToolbarProps {
  onAddElement: (type: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export const Toolbar = ({ onAddElement, onDelete, onClear }: ToolbarProps) => {
  const tools = [
    { id: "text", icon: Type, label: "Text" },
    { id: "image", icon: Image, label: "Image" },
    { id: "barcode", icon: Barcode, label: "Barcode" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
  ];

  return (
    <div className="w-48 bg-toolbar border-r border-border flex flex-col py-4 gap-1 px-2">
      <h3 className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Elements</h3>
      {tools.map((tool, index) => (
        <div key={tool.id}>
          <Button
            variant="ghost"
            onClick={() => onAddElement(tool.id)}
            className="w-full justify-start gap-2 h-9 hover:bg-primary hover:text-primary-foreground"
            aria-label={`Add ${tool.label}`}
          >
            <tool.icon className="w-4 h-4" />
            <span className="text-sm">{tool.label}</span>
          </Button>
          {index === 2 && <Separator className="my-2" />}
        </div>
      ))}
      
      <Separator className="my-2" />
      
      <h3 className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Actions</h3>
      <Button
        variant="ghost"
        onClick={onDelete}
        className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-sm">Delete Selected</span>
      </Button>
      <Button
        variant="ghost"
        onClick={onClear}
        className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-sm">Clear Label</span>
      </Button>
    </div>
  );
};
