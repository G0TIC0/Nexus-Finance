import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LogOut, LayoutDashboard, 
  Receipt, Target, BarChart3, Settings, Sparkles, Loader2
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const runEngines = async () => {
    setIsProcessing(true);
    try {
      await fetch("/api/engine/process-fixed-expenses", { method: "POST" });
      await fetch("/api/engine/generate-forecast", { method: "POST" });
      window.location.reload(); // Simple way to refresh data for now
    } catch (err) {
      console.error("Forecasting engine failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800 flex flex-col p-6 hidden lg:flex fixed h-full">
        <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-lg">N</div>
          <span className="font-extrabold text-xl tracking-tighter">Nexus Finance</span>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-1">
            <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" to="/" />
            <NavItem icon={<Receipt className="w-4 h-4" />} label="Transações" to="/transactions" />
            <NavItem icon={<Target className="w-4 h-4" />} label="Planejamento" to="/planning" />
            <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Previsões" to="/forecasts" />
            <NavItem icon={<Settings className="w-4 h-4" />} label="Configurações" to="/settings" />
          </ul>

          {/* --- Block 2.3: Generate Forecasts Button --- */}
          <div className="mt-8 px-2">
            <Button 
              size="sm" 
              onClick={runEngines}
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Gera Previsões
            </Button>
          </div>
        </nav>

        <div className="pt-6 border-t border-stone-100 dark:border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-slate-500 hover:text-rose-500 px-2" 
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto lg:ml-64">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-slate-400 text-sm">Bem-vindo de volta, {user?.name?.split(' ')[0]}.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-4 border-l border-stone-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-none">{user?.name}</p>
                <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Plano Enterprise</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function NavItem({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <li>
      <button 
        onClick={() => navigate(to)}
        aria-current={active ? "page" : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active 
            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
            : "text-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        {icon}
        {label}
      </button>
    </li>
  );
}
