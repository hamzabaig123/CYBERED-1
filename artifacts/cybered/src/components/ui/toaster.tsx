import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner 
      theme="dark" 
      className="toaster group" 
      toastOptions={{ 
        classNames: { 
          toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-primary group-[.toaster]:shadow-lg font-mono rounded-none border border-l-4 border-l-primary", 
          description: "group-[.toast]:text-muted-foreground", 
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground", 
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground" 
        } 
      }} 
    />
  );
}
