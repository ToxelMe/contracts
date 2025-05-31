import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  price: number;
}

interface PixelCanvasProps {
  onPixelClick: (pixel: Pixel) => void;
  pixels: Pixel[][];
  selectedPixel: Pixel | null;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({ onPixelClick, pixels, selectedPixel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const GRID_SIZE = 100;
  const PIXEL_SIZE = 8;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();
    
    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw pixels
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const pixel = pixels[x][y];
        
        // Draw pixel
        ctx.fillStyle = pixel.color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        
        // Draw border for selected pixel
        if (selectedPixel && selectedPixel.x === x && selectedPixel.y === y) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
        
        // Draw grid lines (only when zoomed in)
        if (scale > 2) {
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.5 / scale;
          ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    ctx.restore();
  }, [pixels, selectedPixel, scale, offset]);

  const getPixelFromMouse = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (clientX - rect.left - offset.x) / scale;
    const mouseY = (clientY - rect.top - offset.y) / scale;
    
    const pixelX = Math.floor(mouseX / PIXEL_SIZE);
    const pixelY = Math.floor(mouseY / PIXEL_SIZE);
    
    if (pixelX >= 0 && pixelX < GRID_SIZE && pixelY >= 0 && pixelY < GRID_SIZE) {
      return pixels[pixelX][pixelY];
    }
    
    return null;
  }, [pixels, scale, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      const pixel = getPixelFromMouse(e.clientX, e.clientY);
      if (pixel) {
        onPixelClick(pixel);
      }
    } else if (e.button === 1 || e.button === 2) { // Middle or right click for panning
      e.preventDefault();
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(20, scale * zoomFactor));
    
    // Zoom towards mouse position
    const scaleChange = newScale / scale;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleChange,
      y: mouseY - (mouseY - prev.y) * scaleChange
    }));
    
    setScale(newScale);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(20, scale * 1.2);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, scale * 0.8);
    setScale(newScale);
  };

  const centerView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2 - (GRID_SIZE * PIXEL_SIZE * scale) / 2;
    const centerY = canvas.height / 2 - (GRID_SIZE * PIXEL_SIZE * scale) / 2;
    
    setOffset({ x: centerX, y: centerY });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (canvas && container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      centerView();
    }
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gray-100">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={centerView}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Center"
        >
          <Move size={20} />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-white rounded-lg shadow-lg text-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
