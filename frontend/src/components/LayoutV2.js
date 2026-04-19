import React from 'react';
import SidebarV2 from './SidebarV2';

export default function LayoutV2({ children }) {
  return (
    <div className="flex min-h-screen bg-background selection:bg-indigo-500/30 relative">
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>
      
      {/* Sidebar with higher z-index to sit above the background */}
      <div className="relative z-10">
        <SidebarV2 />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 h-screen scroll-smooth">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
