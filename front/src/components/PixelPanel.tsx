import React, { useState } from 'react';
import { X, Palette, User, DollarSign, ShoppingCart } from 'lucide-react';

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  price: number;
}

interface PixelPanelProps {
  pixel: Pixel | null;
  onClose: () => void;
  onBuyPixel: (pixel: Pixel, color: string) => void;
  isOpen: boolean;
}

const COLORS = [
  '#022b7a',
  '#710461',
  '#a02c5d',
  '#ec0e47',
  '#ee6c3b',
  '#fcbf54',
  '#abd96d',
  '#14c285',
  '#077353',
  '#055459',
  '#26294a',
  '#1a1334',
  '#f8f9fa' // gentle white shade
];

export const PixelPanel: React.FC<PixelPanelProps> = ({ 
  pixel, 
  onClose, 
  onBuyPixel, 
  isOpen 
}) => {
  const [selectedColor, setSelectedColor] = useState(pixel?.color || '#FF0000');

  if (!pixel || !isOpen) return null;

  const handleBuy = () => {
    onBuyPixel(pixel, selectedColor);
  };

  const isOwned = pixel.owner !== 'Available';

  return (
    <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } z-50`}>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Toxel ({pixel.x}, {pixel.y})</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current pixel display */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: pixel.color }}
            />
            <div>
              <p className="text-sm text-gray-600">Current color</p>
              <p className="font-mono text-sm">{pixel.color}</p>
            </div>
          </div>
        </div>

        {/* Owner info */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Owner</span>
          </div>
          <p className={`text-sm ${isOwned ? 'text-blue-600' : 'text-green-600'}`}>
            {pixel.owner}
          </p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Painting price</span>
          </div>
          <p className="text-lg font-bold text-green-600">{pixel.price} FLOW</p>
        </div>

        {/* Color picker */}
        <div className="mb-6 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Color selection</span>
          </div>
          
          {/* Selected color preview */}
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded border-2 border-gray-300"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="font-mono text-sm">{selectedColor}</span>
          </div>

          {/* Color grid */}
          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                  selectedColor === color 
                    ? 'border-gray-800 ring-2 ring-blue-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Buy button */}
        <button
          onClick={handleBuy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <ShoppingCart size={18} />
          Buy for {pixel.price} FLOW
        </button>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-3 text-center">
          When purchasing, the pixel will be recolored to the selected color
        </p>
      </div>
    </div>
  );
};
