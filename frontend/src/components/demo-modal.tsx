"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_IMAGES = [
  {
    src: "/demo1.png",
    alt: "DocExplorer Dashboard",
    description: "Manage all your PDF documents in one central, intuitive dashboard."
  },
  {
    src: "/demo2.png",
    alt: "Document Chat Interface",
    description: "Instantly chat with your document using a side-by-side PDF viewer and AI assistant."
  },
  {
    src: "/demo3.png",
    alt: "Multi-Document Comparison",
    description: "Select multiple documents and have the AI compare them seamlessly."
  }
];

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to first slide when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === DEMO_IMAGES.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? DEMO_IMAGES.length - 1 : prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <h2 className="text-xl font-bold tracking-tight">Live Project Demo</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-background hover:bg-muted border border-border rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slider Content */}
        <div className="relative flex-1 flex items-center justify-center bg-black/5 dark:bg-black/20 p-4 sm:p-8 overflow-hidden min-h-[300px] sm:min-h-[500px]">
          
          {/* Main Image */}
          <div className="relative w-full h-full max-w-4xl max-h-[60vh] aspect-video rounded-xl overflow-hidden shadow-xl border border-border/50 bg-background transition-opacity duration-300">
            {/* Using regular img tag for simplicity with absolute paths, Next/Image could also be used */}
            <img 
              src={DEMO_IMAGES[currentIndex].src} 
              alt={DEMO_IMAGES[currentIndex].alt}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Navigation Controls */}
          <button 
            onClick={handlePrev}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 bg-background/80 hover:bg-background border border-border rounded-full shadow-lg transition-all hover:scale-110 z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handleNext}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 bg-background/80 hover:bg-background border border-border rounded-full shadow-lg transition-all hover:scale-110 z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Footer / Description */}
        <div className="p-6 bg-card border-t border-border flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold mb-2">{DEMO_IMAGES[currentIndex].alt}</h3>
          <p className="text-muted-foreground text-center max-w-2xl">
            {DEMO_IMAGES[currentIndex].description}
          </p>
          
          {/* Dots Indicator */}
          <div className="flex gap-2 mt-6">
            {DEMO_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentIndex ? "bg-primary w-8" : "bg-primary/20 hover:bg-primary/40"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
