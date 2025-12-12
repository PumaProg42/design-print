import { Type, Image, Barcode, Minus, Square, Circle, Trash2, ChevronRight, ZoomIn, Download, LogOut, User } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

interface ToolbarProps {
  onAddElement: (type: string) => void;
  onClear: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  onOpenTextCategory: () => void;
  onExport: (withValues: boolean) => void;
}

export const Toolbar = ({ onAddElement, onClear, zoom, onZoomChange, onOpenTextCategory, onExport }: ToolbarProps) => {
  const { user, signOut } = useAuth();
  
  const tools = [
    { id: "image", icon: Image, label: "Image" },
    { id: "code", icon: Barcode, label: "Barcode" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
  ];

  return (
    <div className="w-48 bg-toolbar border-r border-border shadow-lg flex flex-col py-6 gap-1 px-3">
      {/* User info */}
      <div className="px-2 mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="w-3 h-3" />
          <span className="truncate" title={user?.email || ""}>
            {user?.email}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-3 h-3" />
          Odjava
        </Button>
      </div>
      
      <h3 className="text-xs font-semibold mb-3 px-2 text-muted-foreground uppercase tracking-wider">Elements</h3>
      
      {/* Text tool - opens category dialog */}
      <Button
        variant="ghost"
        onClick={onOpenTextCategory}
        className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
      >
        <Type className="w-4 h-4" />
        <span className="text-sm font-medium">Text</span>
      </Button>

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
          {index === 1 && <Separator className="my-2" />}
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
        <DropdownMenuContent side="right" align="start" className="w-48 bg-background z-50">
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 hover:bg-primary hover:text-primary-foreground transition-all hover:shadow-sm hover:translate-x-0.5 rounded-lg"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium flex-1 text-left">Export ZPL</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48 bg-background z-50">
          <DropdownMenuItem onClick={() => onExport(true)}>
            Placeholders
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport(false)}>
            Fixed Values
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          step={0.05}
          className="mb-1"
        />
        <span className="text-xs font-mono text-muted-foreground">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
