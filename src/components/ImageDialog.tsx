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

interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageData: Blob | string) => void;
}

export const ImageDialog = ({ open, onClose, onConfirm }: ImageDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Convert to black and white
      const bwBlob = await convertToBlackAndWhite(selectedFile);
      setConvertedBlob(bwBlob);
      
      // Create preview URL
      const url = URL.createObjectURL(bwBlob);
      setPreviewUrl(url);
    }
  };

  const convertToBlackAndWhite = async (imageFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for conversion
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data and convert to black and white
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const threshold = 128;

        for (let i = 0; i < pixels.length; i += 4) {
          // Convert to grayscale using luminosity formula
          const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          
          // Apply 1-bit threshold: pure black or pure white
          const bw = gray < threshold ? 0 : 255;
          pixels[i] = bw;     // R
          pixels[i + 1] = bw; // G
          pixels[i + 2] = bw; // B
          // pixels[i + 3] is alpha, keep unchanged
        }

        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert image to blob"));
          }
        }, "image/png");
      };
      
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const handleUseImage = () => {
    if (convertedBlob) {
      // CRITICAL: Pass the converted 1-bit black-and-white blob
      // This is the exact image shown in the preview above
      // This will be used for both canvas display AND ZPL generation
      onConfirm(convertedBlob);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setConvertedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!previewUrl ? (
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
                <p className="text-sm text-muted-foreground mt-2">
                  Converting to black and white...
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Black & White Preview:</p>
                <div className="flex justify-center bg-white border rounded p-2">
                  <img 
                    src={previewUrl} 
                    alt="Black and white preview" 
                    className="max-w-full max-h-[300px] object-contain"
                  />
                </div>
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Original: {file.name}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {previewUrl && (
            <Button onClick={handleUseImage}>
              Use Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
