import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full flex bg-background text-foreground crt-overlay overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Terminal decorative top bar */}
        <div className="h-8 border-b border-border bg-sidebar flex items-center justify-between px-4 font-mono text-[10px] text-muted-foreground uppercase flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-none bg-primary animate-pulse"></span>
              SYS.ONLINE
            </span>
            <span>MEM: {Math.floor(Math.random() * 40 + 20)}%</span>
            <span>CPU: {Math.floor(Math.random() * 20 + 5)}%</span>
          </div>
          <div>CYBERED // SECURE LEARNING CONSOLE</div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8 relative z-0">
          <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
