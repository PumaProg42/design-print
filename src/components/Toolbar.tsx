import { Type, Image, Barcode, Minus, Square, Circle, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  onAddElement: (type: string) => void;
  onClear: () => void;
}

export const Toolbar = ({ onAddElement, onClear }: ToolbarProps) => {
  const tools = [
    { id: "text", icon: Type, label: "Text" },
    { id: "image", icon: Image, label: "Image" },
    { id: "barcode", icon: Barcode, label: "Barcode" },
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

      {/* Line tool with dropdown for horizontal/vertical */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 hover:bg-primary hover:text-primary-foreground"
          >
            <Minus className="w-4 h-4" />
            <span className="text-sm flex-1 text-left">Line</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuItem onClick={() => onAddElement("line-horizontal")}>
            <Minus className="w-4 h-4 mr-2" />
            Horizontal Line
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddElement("line-vertical")}>
            <Minus className="w-4 h-4 mr-2 rotate-90" />
            Vertical Line
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Separator className="my-2" />
      
      <h3 className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Actions</h3>
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
