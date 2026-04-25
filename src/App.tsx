import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "next-themes";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Planning from "@/pages/Planning";
import Forecasts from "@/pages/Forecasts";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/forecasts" element={<Forecasts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
