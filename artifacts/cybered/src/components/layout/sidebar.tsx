import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Terminal, Database, BookOpen, PenTool, Users, LayoutDashboard, Shield, LogOut, AlertCircle, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/curriculum", label: "Curriculum", icon: Database },
  { href: "/search", label: "Search", icon: BookOpen },
  { href: "/tests", label: "Test Console", icon: PenTool },
  { href: "/learning-hub", label: "Learning Hub", icon: Activity },
  { href: "/security", label: "Security", icon: Shield },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col h-full font-mono text-sm relative">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <Terminal className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-bold text-foreground uppercase tracking-widest leading-none">CyberEd</h1>
          <span className="text-[10px] text-primary uppercase opacity-70">Sys.Console.v1</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-2 px-3">Navigation</div>
        
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex items-center gap-3 px-3 py-2 transition-colors uppercase tracking-wider",
            location.startsWith(item.href) 
              ? "bg-primary/10 text-primary border-l-2 border-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
          )}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {user?.role === "admin" && (
          <>
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mt-6 mb-2 px-3">System Admin</div>
            <Link href="/admin" className={cn(
              "flex items-center gap-3 px-3 py-2 transition-colors uppercase tracking-wider",
              location.startsWith("/admin") 
                ? "bg-primary/10 text-primary border-l-2 border-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
            )}>
              <Users className="h-4 w-4" />
              Users
            </Link>
          </>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 bg-primary/20 flex items-center justify-center border border-primary/50 text-primary uppercase font-bold relative">
            {user?.username?.[0] || "?"}
            {!user?.emailVerifiedAt && (
              <span className="absolute -top-1 -right-1">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="truncate text-xs font-bold text-foreground uppercase">{user?.username}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{user?.role}</span>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/30"
        >
          <LogOut className="h-3 w-3" />
          Disconnect
        </button>
      </div>
    </div>
  );
}
