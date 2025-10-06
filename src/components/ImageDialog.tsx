import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageData: Blob | string) => void;
}

export const ImageDialog = ({ open, onClose, onConfirm }: ImageDialogProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleConfirmUpload = () => {
    if (file) {
      onConfirm(file);
      setFile(null);
      onClose();
    }
  };

  const handleConfirmUrl = async () => {
    if (imageUrl) {
      try {
        // Fetch the image and convert to blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        onConfirm(blob);
        setImageUrl("");
        onClose();
      } catch (error) {
        console.error("Failed to load image from URL:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="url">From URL</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-4">
            <div>
              <Label htmlFor="image-file">Select Image File</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-1"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {file.name}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirmUpload} disabled={!file}>
                Add Image
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirmUrl} disabled={!imageUrl}>
                Add Image
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
