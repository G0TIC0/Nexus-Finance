import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, Target, BarChart3, Settings, Sparkles, Loader2
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const runEngines = async () => {
    setIsProcessing(true);
    try {
      const fixedRes = await fetch("/api/engine/process-fixed-expenses", { method: "POST" });
      const forecastRes = await fetch("/api/engine/generate-forecast", { method: "POST" });
      
      if (!fixedRes.ok || !forecastRes.ok) {
        console.error("Engine execution had errors");
      }
      // Emitir evento customizado para que o Dashboard possa re-buscar os dados
      window.dispatchEvent(new CustomEvent("nexus:engines-complete"));
    } catch (err) {
      console.error("Forecasting engine failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 lg:pb-0">
      {/* Sidebar (Desktop) */}
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
      </aside>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-stone-200 dark:border-slate-800 z-50 px-2 py-2">
        <ul className="flex items-center justify-between max-w-md mx-auto">
          <MobileNavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Início" to="/" />
          <MobileNavItem icon={<Receipt className="w-5 h-5" />} label="Trans." to="/transactions" />
          <MobileNavItem icon={<Target className="w-5 h-5" />} label="Plan." to="/planning" />
          <li className="flex flex-col items-center">
            <button 
              onClick={runEngines} 
              disabled={isProcessing}
              className="p-3 bg-emerald-600 rounded-full text-white shadow-lg active:scale-95 transition-transform -mt-8 border-4 border-stone-50 dark:border-slate-950"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          </li>
          <MobileNavItem icon={<BarChart3 className="w-5 h-5" />} label="Prev." to="/forecasts" />
          <MobileNavItem icon={<Settings className="w-5 h-5" />} label="Config." to="/settings" />
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 gap-6 sm:gap-8 overflow-y-auto lg:ml-64">
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

function MobileNavItem({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <li className="flex-1">
      <button 
        onClick={() => navigate(to)}
        className={`w-full flex flex-col items-center justify-center gap-0.5 py-1 ${
          active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
        }`}
      >
        {icon}
        <span className="text-[10px] font-bold tracking-tighter uppercase">{label}</span>
      </button>
    </li>
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
