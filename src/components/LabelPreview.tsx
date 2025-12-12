import React, { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";

interface LabelPreviewProps {
  jsonData: any;
  labelWidth: number;
  labelHeight: number;
  dpi: number;
  previewWidth?: number;
}

export const LabelPreview = ({
  jsonData,
  labelWidth,
  labelHeight,
  dpi,
  previewWidth = 150,
}: LabelPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !jsonData) {
      setLoading(false);
      return;
    }

    const generatePreview = async () => {
      setLoading(true);
      
      // Calculate canvas dimensions in pixels
      const dotsPerMm = dpi / 25.4;
      const canvasWidth = Math.round(labelWidth * dotsPerMm);
      const canvasHeight = Math.round(labelHeight * dotsPerMm);

      // Create temporary fabric canvas
      const tempCanvas = new FabricCanvas(canvasRef.current!, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#ffffff",
        selection: false,
      });

      try {
        // Load the saved objects
        await tempCanvas.loadFromJSON(jsonData);
        tempCanvas.renderAll();

        // Convert to data URL
        const dataUrl = tempCanvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier: previewWidth / canvasWidth,
        });

        setImageUrl(dataUrl);
      } catch (error) {
        console.error("Error generating preview:", error);
      } finally {
        setLoading(false);
        tempCanvas.dispose();
      }
    };

    generatePreview();
  }, [jsonData, labelWidth, labelHeight, dpi, previewWidth]);

  // Calculate aspect ratio for preview container
  const aspectRatio = labelHeight / labelWidth;
  const previewHeight = previewWidth * aspectRatio;

  if (loading) {
    return (
      <div 
        className="bg-muted/50 rounded animate-pulse"
        style={{ width: previewWidth, height: previewHeight }}
      />
    );
  }

  if (!imageUrl) {
    return (
      <div 
        className="bg-muted/50 rounded flex items-center justify-center text-muted-foreground text-xs"
        style={{ width: previewWidth, height: previewHeight }}
      >
        Ni predogleda
      </div>
    );
  }

  return (
    <>
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Preview image */}
      <img
        src={imageUrl}
        alt="Predogled etikete"
        className="rounded border border-border shadow-sm"
        style={{ width: previewWidth, height: previewHeight, objectFit: "contain" }}
      />
    </>
  );
};
