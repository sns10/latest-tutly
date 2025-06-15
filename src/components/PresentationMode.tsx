
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SmartboardButton } from '@/components/ui/smartboard-button';
import { Monitor, Minimize2, Maximize2, Settings, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentationContextType {
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  textSize: 'normal' | 'large' | 'extra-large';
  setTextSize: (size: 'normal' | 'large' | 'extra-large') => void;
}

const PresentationContext = createContext<PresentationContextType | null>(null);

export const usePresentationMode = () => {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error('usePresentationMode must be used within PresentationProvider');
  }
  return context;
};

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'extra-large'>('normal');

  const togglePresentationMode = () => {
    setIsPresentationMode(!isPresentationMode);
  };

  const toggleHighContrast = () => {
    setIsHighContrast(!isHighContrast);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        togglePresentationMode();
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        toggleHighContrast();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Apply theme classes to body
  useEffect(() => {
    const body = document.body;
    if (isHighContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    body.classList.remove('text-normal', 'text-large', 'text-extra-large');
    body.classList.add(`text-${textSize}`);
  }, [isHighContrast, textSize]);

  return (
    <PresentationContext.Provider
      value={{
        isPresentationMode,
        togglePresentationMode,
        isHighContrast,
        toggleHighContrast,
        textSize,
        setTextSize,
      }}
    >
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          isPresentationMode && "fixed inset-0 z-50 bg-background",
          isHighContrast && "high-contrast-theme"
        )}
      >
        {children}
        <PresentationControls />
      </div>
    </PresentationContext.Provider>
  );
}

function PresentationControls() {
  const { 
    isPresentationMode, 
    togglePresentationMode, 
    isHighContrast, 
    toggleHighContrast,
    textSize,
    setTextSize 
  } = usePresentationMode();

  return (
    <div className={cn(
      "fixed bottom-4 right-4 flex gap-2 z-50 transition-opacity",
      isPresentationMode ? "opacity-20 hover:opacity-100" : "opacity-100"
    )}>
      <SmartboardButton
        variant="outline"
        size="icon"
        onClick={togglePresentationMode}
        className="bg-background/90 backdrop-blur-sm"
      >
        {isPresentationMode ? <Minimize2 /> : <Maximize2 />}
      </SmartboardButton>
      
      <SmartboardButton
        variant={isHighContrast ? "default" : "outline"}
        size="icon"
        onClick={toggleHighContrast}
        className="bg-background/90 backdrop-blur-sm"
      >
        <Monitor />
      </SmartboardButton>

      <div className="flex bg-background/90 backdrop-blur-sm rounded-xl border-2 border-input">
        {(['normal', 'large', 'extra-large'] as const).map((size) => (
          <SmartboardButton
            key={size}
            variant={textSize === size ? "default" : "ghost"}
            size="sm"
            onClick={() => setTextSize(size)}
            className="rounded-none first:rounded-l-lg last:rounded-r-lg border-none"
          >
            {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
          </SmartboardButton>
        ))}
      </div>
    </div>
  );
}
