import React, { useState, useEffect } from 'react';
import Terminal from '@/components/Terminal';
import TerminalHeader from '@/components/TerminalHeader';
import CyberPanel from '@/components/CyberPanel';
import QuotePanel from '@/components/QuotePanel';

const Index = () => {
  // Start closed so landing view emphasizes Terminal; open automatically on desktop
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  useEffect(()=>{
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  },[]);
  const toggleSidebar = () => setSidebarOpen(o=>!o);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TerminalHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/70 backdrop-blur-sm md:hidden z-20 animate-in fade-in"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}
        {/* Sidebar */}
        <div
          className={`p-4 md:p-5 flex flex-col overflow-y-auto z-30 transition-all duration-300 ease-out
            /* Mobile modal styles */
            fixed md:static left-1/2 md:left-auto top-24 md:top-auto -translate-x-1/2 md:translate-x-0
            w-[min(90%,22rem)] md:w-96 max-h-[70vh] md:max-h-none md:h-full
            rounded-xl md:rounded-none border border-border/70 md:border-r md:border-border bg-card/70 md:bg-card/40
            shadow-2xl md:shadow-none supports-[backdrop-filter]:backdrop-blur-sm
            ${sidebarOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
            md:opacity-100 md:scale-100 md:pointer-events-auto
          `}
          role="complementary"
          aria-label="Cyber panel"
          // aria-hidden dynamically handled by CSS visibility; no direct window access to avoid SSR issues
        >
          <CyberPanel />
          <div className="mt-4">
            <QuotePanel />
          </div>
        </div>
        {/* Main Terminal */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <div className="flex-1 min-h-0">
            <Terminal />
          </div>
          {/* Mobile floating toggle removed per request */}
        </div>
      </div>
    </div>
  );
};

export default Index;
