# Text Scaling & Positioning Guide

## Overview
This document explains the enhanced text scaling and positioning features that ensure 1:1 workspace-export parity.

## Features Implemented

### 1. Independent Text Scaling (Width & Height)
- **Two separate properties**: `fontWidth` and `fontHeight` 
- **ZPL mapping**: Exports as `^A0N,<fontWidth>,<fontHeight>`
- **Live sync**: Changes in properties panel immediately update canvas, and vice versa
- **Visual feedback**: Scaling percentage shown in properties panel

### 2. Resize Handles for Text
- **All handles enabled**: Corner handles (tl, tr, bl, br) and middle handles (mt, mb, ml, mr)
- **Independent scaling**: Drag side handles to scale width/height independently
- **Live updates**: `fontWidth`/`fontHeight` update in real-time during resize
- **Scale normalization**: After resize, `scaleX`/`scaleY` are reset to 1, and dimensions are stored in `fontWidth`/`fontHeight`

### 3. Draggable Positioning
- **Two-way binding**: Drag on canvas → properties update; edit properties → canvas updates
- **Center-based positioning**: All elements positioned by their center point for consistent rotation
- **Real-time updates**: Position updates instantly in properties panel during drag

### 4. Keyboard Controls
- **Arrow key nudging**: 
  - Arrow keys: Move 1 pixel
  - Shift + arrows: Move 10 pixels
  - Ctrl + arrows: Snap to 10-pixel grid
- **Delete key**: Remove selected element

### 5. 1:1 Workspace-Export Parity
- **Direct mapping**: Workspace units (printer dots) = Export units
- **No hidden scaling**: `scaleX` and `scaleY` are normalized to 1
- **True dimensions**: What you see on canvas exactly matches exported output
- **DPI-aware**: All dimensions calculated in printer dots based on DPI

## How to Use

### Resizing Text Elements
1. **Select a text element** - Click on any text field
2. **Drag resize handles**:
   - Corner handles: Resize both width and height proportionally
   - Side handles (left/right): Resize width only
   - Top/bottom handles: Resize height only
3. **View live updates**: Properties panel shows current `fontWidth` and `fontHeight` in dots
4. **See scaling percentage**: E.g., "150% × 200%" shows width and height scale

### Positioning Text Elements
1. **Drag to move**: Click and drag element to new position
2. **Use arrow keys**: 
   - Fine control: Arrow keys (1px steps)
   - Fast movement: Shift + arrows (10px steps)
   - Snap to grid: Ctrl + arrows (10px grid)
3. **Edit coordinates**: Type exact X/Y values in properties panel

### Properties Panel
Text elements show:
- **Type**: Fixed text or dynamic field (Text1, Text2, etc.)
- **X Position / Y Position**: In printer dots from label origin (0,0)
- **Rotation**: 0°, 90°, 180°, or 270°
- **Text Scaling**: 
  - Width (dots): First value in `^A0N,<width>,<height>`
  - Height (dots): Second value in `^A0N,<width>,<height>`
  - Percentage display: Shows scale relative to base font size
- **Text Content**: The actual text to display/print

## Technical Details

### Scale Normalization
After any resize operation:
```typescript
// Update fontWidth/fontHeight based on scale
textObj.fontWidth = Math.round(textObj.fontWidth * textObj.scaleX);
textObj.fontHeight = Math.round(textObj.fontHeight * textObj.scaleY);

// Reset scale to 1 (prevent compounding)
textObj.scaleX = 1;
textObj.scaleY = 1;
```

### ZPL Export Format
```zpl
^FO<x>,<y>
^A0<rotation>,<fontWidth>,<fontHeight>
^FD<text>^FS
```

Example:
- Canvas: Text at position (100, 50) with fontWidth=50, fontHeight=80
- Export: `^FO100,50^A0N,50,80^FDHello^FS`

### Position Mapping
- **Workspace**: Elements positioned relative to label boundary (200px offset)
- **Export**: Elements positioned relative to label origin (0,0)
- **Conversion**: `exportX = canvasX - boundaryLeft`, `exportY = canvasY - boundaryTop`

## Benefits

1. **True WYSIWYG**: What you see is exactly what gets printed
2. **Precise control**: Independent width/height scaling for custom text appearance
3. **Professional workflow**: Keyboard shortcuts, grid snapping, live feedback
4. **1:1 accuracy**: Zero discrepancy between workspace and printer output
5. **Flexible design**: Mix fixed-aspect and free-aspect text as needed

## Notes

- All dimensions are in **printer dots** (not points or pixels)
- DPI setting affects visual size on screen but not exported dot values
- Grid snapping uses 10-pixel increments (configurable)
- Undo/redo can be accessed via Edit History
