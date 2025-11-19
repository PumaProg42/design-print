import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Download } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface LabelTemplate {
  id: string;
  name: string;
  canvasState: string;
  width: number;
  height: number;
  dpi: number;
  rotate180: boolean;
  createdAt: string;
}

interface LoadTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (template: LabelTemplate) => void;
}

export const LoadTemplateDialog = ({
  open,
  onClose,
  onLoad,
}: LoadTemplateDialogProps) => {
  const [templates, setTemplates] = useState<LabelTemplate[]>(() => {
    const saved = localStorage.getItem("labelTemplates");
    return saved ? JSON.parse(saved) : [];
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!templateToDelete) return;
    
    const updated = templates.filter((t) => t.id !== templateToDelete);
    setTemplates(updated);
    localStorage.setItem("labelTemplates", JSON.stringify(updated));
    setDeleteConfirmOpen(false);
    setTemplateToDelete(null);
  };

  const handleLoad = (template: LabelTemplate) => {
    onLoad(template);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Label Template</DialogTitle>
            <DialogDescription>
              Select a saved template to load
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved templates yet. Save your first template!
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.width}mm × {template.height}mm • {template.dpi} DPI
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saved: {formatDate(template.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoad(template)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Load
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
