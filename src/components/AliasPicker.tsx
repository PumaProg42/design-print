import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListPlus, Upload, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AliasPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

const STORAGE_KEY = "aliasBuffer";

const DEFAULT_ALIASES = [
  "TEKST1", "TEKST2", "TEKST3", "TEKST4", "TEKST5",
  "NAZIV", "OPIS", "CENA", "KOLICINA", "DATUM",
  "SARZA", "LOT", "EAN", "SIFRA", "PROIZVAJALEC",
];

const loadBuffer = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    }
  } catch {}
  return DEFAULT_ALIASES;
};

const saveBuffer = (list: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

export const AliasPicker = ({ value, onChange, id, placeholder }: AliasPickerProps) => {
  const [open, setOpen] = useState(false);
  const [buffer, setBuffer] = useState<string[]>(loadBuffer);
  const [newAlias, setNewAlias] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    saveBuffer(buffer);
  }, [buffer]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const list = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (list.length === 0) {
        toast({ title: "Prazna datoteka", description: "V datoteki ni najdenih aliasov.", variant: "destructive" });
        return;
      }
      // Merge unique
      const merged = Array.from(new Set([...list, ...buffer]));
      setBuffer(merged);
      toast({ title: "Aliasi naloženi", description: `Naloženih ${list.length} aliasov v buffer.` });
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAdd = () => {
    const v = newAlias.trim();
    if (!v) return;
    if (!buffer.includes(v)) {
      setBuffer([v, ...buffer]);
    }
    setNewAlias("");
  };

  const handleRemove = (alias: string) => {
    setBuffer(buffer.filter((a) => a !== alias));
  };

  const pick = (alias: string) => {
    onChange(alias);
    setOpen(false);
  };

  return (
    <div className="flex gap-1 mt-1">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Izberi alias">
            <ListPlus className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-popover z-[200]" align="end">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Beri aliase (.txt)
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            <div className="flex gap-1">
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Nov alias..."
                className="h-8 text-sm"
              />
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleAdd}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-md">
              {buffer.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Buffer je prazen
                </div>
              ) : (
                buffer.map((alias) => (
                  <div
                    key={alias}
                    className="flex items-center justify-between px-2 py-1 hover:bg-accent group"
                  >
                    <button
                      type="button"
                      onClick={() => pick(alias)}
                      className="flex-1 text-left text-sm py-1"
                    >
                      {alias}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemove(alias)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};