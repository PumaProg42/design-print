import { Type, Calendar, Image, Barcode, Minus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarProps {
  onAddElement: (type: string) => void;
}

export const Toolbar = ({ onAddElement }: ToolbarProps) => {
  const tools = [
    { id: "text", icon: Type, label: "Add Text" },
    { id: "date", icon: Calendar, label: "Add Date" },
    { id: "image", icon: Image, label: "Add Image" },
    { id: "barcode", icon: Barcode, label: "Add Barcode" },
    { id: "line", icon: Minus, label: "Add Line" },
    { id: "rectangle", icon: Square, label: "Add Rectangle" },
  ];

  return (
    <TooltipProvider>
      <div className="w-16 bg-toolbar border-r border-border flex flex-col items-center py-4 gap-2">
        {tools.map((tool, index) => (
          <div key={tool.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAddElement(tool.id)}
                  className="w-12 h-12 hover:bg-secondary hover:text-primary"
                >
                  <tool.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
            {index === 3 && <Separator className="my-2" />}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
};
