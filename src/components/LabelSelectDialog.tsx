import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Trash2, Calendar, Search, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { LabelPreview } from "./LabelPreview";

interface Label {
  id: string;
  name: string;
  json_data: any;
  label_width: number;
  label_height: number;
  dpi: number;
  created_at: string;
  updated_at: string;
}

interface LabelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLabel: (label: Label) => void;
}

export const LabelSelectDialog = ({
  open,
  onOpenChange,
  onSelectLabel,
}: LabelSelectDialogProps) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewLabel, setPreviewLabel] = useState<Label | null>(null);
  const { toast } = useToast();

  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter((label) => label.name.toLowerCase().includes(query));
  }, [labels, searchQuery]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setLabels(data || []);
    } catch (error: any) {
      toast({
        title: "Napaka pri nalaganju etiket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLabels();
      setSearchQuery("");
      setPreviewLabel(null);
    }
  }, [open]);

  const handleSelect = (label: Label) => {
    onSelectLabel(label);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("labels")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Etiketa izbrisana",
        description: "Etiketa je bila uspešno izbrisana.",
      });

      setLabels(labels.filter((l) => l.id !== deleteId));
    } catch (error: any) {
      toast({
        title: "Napaka pri brisanju",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Izberi etiketo</DialogTitle>
            <DialogDescription>
              Izberi shranjeno etiketo za nalaganje
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Išči po imenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : labels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ni shranjenih etiket</p>
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ni etiket, ki ustrezajo iskanju</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredLabels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                  >
                    <HoverCard openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button
                          onClick={() => handleSelect(label)}
                          className="flex-1 text-left flex items-center gap-3"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div>
                            <div className="font-medium">{label.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                              <span>{label.label_width}×{label.label_height}mm</span>
                              <span>•</span>
                              <span>{label.dpi} DPI</span>
                              <span>•</span>
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(label.updated_at)}</span>
                            </div>
                          </div>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent side="left" className="w-auto p-2" sideOffset={10}>
                        <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
                          Predogled
                        </div>
                        <LabelPreview
                          jsonData={label.json_data}
                          labelWidth={label.label_width}
                          labelHeight={label.label_height}
                          dpi={label.dpi}
                          previewWidth={180}
                        />
                      </HoverCardContent>
                    </HoverCard>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(label.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši etiketo?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcija je nepovratna. Etiketa bo trajno izbrisana iz baze.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
