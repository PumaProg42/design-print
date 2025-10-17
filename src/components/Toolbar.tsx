import { Type, Image, Barcode, Minus, Square, Circle, Trash2, ChevronRight, QrCode, Undo, Redo } from "lucide-react";
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
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar = ({ onAddElement, onClear, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) => {
  const tools = [
    { id: "text", icon: Type, label: "Text" },
    { id: "image", icon: Image, label: "Image" },
    { id: "barcode", icon: Barcode, label: "Barcode" },
    { id: "qr", icon: QrCode, label: "QR Code" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
  ];

  return (
    <div className="w-48 bg-toolbar border-r border-border shadow-lg flex flex-col py-6 gap-1 px-3">
      <div className="flex gap-2 mb-4 px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 h-9"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 h-9"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
      
      <Separator className="mb-3" />
      
      <h3 className="text-xs font-semibold mb-3 px-2 text-muted-foreground uppercase tracking-wider">Elements</h3>
      {tools.map((tool, index) => (
        <div key={tool.id}>
          <Button
            variant="ghost"
            onClick={() => onAddElement(tool.id)}
            className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
            aria-label={`Add ${tool.label}`}
          >
            <tool.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{tool.label}</span>
          </Button>
          {index === 2 && <Separator className="my-2" />}
        </div>
      ))}

      {/* Line tool with dropdown for horizontal/vertical */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
          >
            <Minus className="w-4 h-4" />
            <span className="text-sm font-medium flex-1 text-left">Line</span>
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
      
      <Separator className="my-3" />
      
      <h3 className="text-xs font-semibold mb-3 px-2 text-muted-foreground uppercase tracking-wider">Actions</h3>
      <Button
        variant="ghost"
        onClick={onClear}
        className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-sm font-medium">Clear Label</span>
      </Button>
    </div>
  );
};
