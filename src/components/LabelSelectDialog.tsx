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
import { Loader2, FileText, Trash2, Calendar, Search, Copy, ArrowUpDown, Pencil, Check, X } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type SortOption = "name" | "date" | "size";
type SortDirection = "asc" | "desc";

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
  const [duplicating, setDuplicating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const { toast } = useToast();

  const filteredAndSortedLabels = useMemo(() => {
    let result = labels;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((label) => label.name.toLowerCase().includes(query));
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "sl");
          break;
        case "date":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "size":
          const sizeA = a.label_width * a.label_height;
          const sizeB = b.label_width * b.label_height;
          comparison = sizeA - sizeB;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [labels, searchQuery, sortBy, sortDirection]);

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
      setSortBy("date");
      setSortDirection("desc");
      setEditingId(null);
      setEditingName("");
    }
  }, [open]);

  const handleSelect = (label: Label) => {
    onSelectLabel(label);
    onOpenChange(false);
  };

  const handleDuplicate = async (label: Label) => {
    setDuplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Uporabnik ni prijavljen");

      const newName = `${label.name} (kopija)`;
      
      const { data, error } = await supabase
        .from("labels")
        .insert({
          name: newName,
          json_data: label.json_data,
          label_width: label.label_width,
          label_height: label.label_height,
          dpi: label.dpi,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Etiketa podvojena",
        description: `Ustvarjena je bila kopija: ${newName}`,
      });

      setLabels([data, ...labels]);
    } catch (error: any) {
      toast({
        title: "Napaka pri podvajanju",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection(option === "name" ? "asc" : "desc");
    }
  };

  const getSortLabel = () => {
    const sortLabels: Record<SortOption, string> = {
      name: "Ime",
      date: "Datum",
      size: "Velikost",
    };
    return `${sortLabels[sortBy]} ${sortDirection === "asc" ? "↑" : "↓"}`;
  };

  const startRename = (label: Label) => {
    setEditingId(label.id);
    setEditingName(label.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleRename = async () => {
    if (!editingId || !editingName.trim()) return;
    
    const trimmedName = editingName.trim();
    if (trimmedName.length > 100) {
      toast({
        title: "Ime predolgo",
        description: "Ime etikete ne sme presegati 100 znakov.",
        variant: "destructive",
      });
      return;
    }
    
    setRenaming(true);
    try {
      const { error } = await supabase
        .from("labels")
        .update({ name: trimmedName })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Etiketa preimenovana",
        description: `Novo ime: ${trimmedName}`,
      });

      setLabels(labels.map((l) => 
        l.id === editingId ? { ...l, name: trimmedName } : l
      ));
      setEditingId(null);
      setEditingName("");
    } catch (error: any) {
      toast({
        title: "Napaka pri preimenovanju",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRenaming(false);
    }
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

          {/* Search and Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Išči po imenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="shrink-0">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {getSortLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort("name")}>
                  Po imenu {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("date")}>
                  Po datumu {sortBy === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("size")}>
                  Po velikosti {sortBy === "size" && (sortDirection === "asc" ? "↑" : "↓")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          ) : filteredAndSortedLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ni etiket, ki ustrezajo iskanju</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredAndSortedLabels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                  >
                    {editingId === label.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8"
                          maxLength={100}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={handleRename}
                          disabled={renaming || !editingName.trim()}
                        >
                          {renaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={cancelRename}
                          disabled={renaming}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelect(label)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium">{label.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{label.label_width}×{label.label_height}mm</span>
                            <span>•</span>
                            <span>{label.dpi} DPI</span>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(label.updated_at)}</span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(label);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(label);
                            }}
                            disabled={duplicating}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
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
                      </>
                    )}
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
