import React, { useEffect, useRef, useState } from 'react';
import BackgroundAudio from './BackgroundAudio';

const TITLES = [
  'Software Developer',
  'Script kiddie',
  'Student Google Developer Lead'
];

interface HeaderProps { onToggleSidebar?: () => void; sidebarOpen?: boolean }

const TerminalHeader: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [mode, setMode] = useState<'typing' | 'erasing'>('typing');
  const holdRef = useRef<number>();
  const timeoutRef = useRef<number>();

  const typingSpeed = 55;
  const erasingSpeed = 35;
  const holdDuration = 1400;

  useEffect(()=>{
    const phrase = TITLES[index];
    if (mode === 'typing') {
      if (display.length < phrase.length) {
        timeoutRef.current = window.setTimeout(()=> setDisplay(phrase.slice(0, display.length + 1)), typingSpeed);
      } else {
        holdRef.current = window.setTimeout(()=> setMode('erasing'), holdDuration);
      }
    } else { // erasing
      if (display.length > 0) {
        timeoutRef.current = window.setTimeout(()=> setDisplay(display.slice(0, -1)), erasingSpeed);
      } else {
        setIndex(i => (i + 1) % TITLES.length);
        setMode('typing');
      }
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); if (holdRef.current) clearTimeout(holdRef.current); };
  }, [display, mode, index]);

  useEffect(()=>{ // reset display when index changes
    if (display === '' && mode === 'typing') {
      // ensure start fresh
    }
  }, [index]);

  return (
    <div className="border-b border-border/60 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-card/70 via-background/40 to-card/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden mt-0.5 h-9 w-9 rounded-lg border border-border/70 hover:border-primary/60 bg-background/60 hover:bg-background/80 backdrop-blur-sm active:scale-[.95] transition relative shadow-sm group"
              aria-label={sidebarOpen ? 'Close side panel' : 'Open side panel'}
              aria-expanded={sidebarOpen}
            >
              {/* Hamburger / close icon */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="relative w-5 h-4 flex flex-col items-center justify-between">
                  <span className={`h-0.5 w-full rounded-full bg-card-foreground transition-transform duration-300 ${sidebarOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
                  <span className={`h-0.5 w-full rounded-full bg-card-foreground transition-opacity duration-300 ${sidebarOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`h-0.5 w-full rounded-full bg-card-foreground transition-transform duration-300 ${sidebarOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
                </span>
              </span>
              <span className="sr-only">{sidebarOpen ? 'Close navigation' : 'Open navigation'}</span>
              {/* Focus ring */}
              <span className="pointer-events-none absolute inset-0 rounded-lg ring-0 group-focus-visible:ring-2 ring-primary/60"></span>
            </button>
          )}
          <div className="flex flex-col truncate">
            <h1 className="text-primary font-bold text-lg sm:text-xl tracking-wide leading-tight truncate">Geoffrey Diapz</h1>
            <div className="text-card-foreground/90 text-xs sm:text-sm font-mono relative mt-1 min-h-[1.1rem] sm:min-h-[1.2rem] flex items-center">
              <span className="truncate max-w-[60vw] sm:max-w-none">{display}</span>
              <span className="inline-block w-2 h-4 sm:h-4 bg-card-foreground ml-1 animate-pulse rounded-[2px]" />
            </div>
          </div>
        </div>
        <div className="flex items-center pt-0.5 shrink-0">
          <BackgroundAudio />
        </div>
      </div>
    </div>
  );
};

export default TerminalHeader;