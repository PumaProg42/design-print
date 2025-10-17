import { useRef } from "react";
import { Type, Image, Barcode, Minus, Square, Circle, Trash2, ChevronRight, ZoomIn, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  onAddElement: (type: string) => void;
  onClear: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  onUploadZpl: (file: File) => void;
}

export const Toolbar = ({ onAddElement, onClear, zoom, onZoomChange, onUploadZpl }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadZpl(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };
  const tools = [
    { id: "text", icon: Type, label: "Text" },
    { id: "image", icon: Image, label: "Image" },
    { id: "barcode", icon: Barcode, label: "Barcode" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
  ];

  return (
    <div className="w-48 bg-toolbar border-r border-border shadow-lg flex flex-col py-6 gap-1 px-3">
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
        onClick={() => fileInputRef.current?.click()}
        className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
      >
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">Upload ZPL</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zpl,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="ghost"
        onClick={onClear}
        className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
        <span className="text-sm font-medium">Clear Label</span>
      </Button>

      <Separator className="my-3" />

      <div className="px-2 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="zoom" className="text-xs whitespace-nowrap">
            Zoom
          </Label>
        </div>
        <Slider
          id="zoom"
          value={[zoom]}
          onValueChange={(values) => onZoomChange(values[0])}
          min={0.1}
          max={3}
          step={0.1}
          className="mb-1"
        />
        <span className="text-xs font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
