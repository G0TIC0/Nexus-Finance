import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "next-themes";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Planning from "@/pages/Planning";
import Forecasts from "@/pages/Forecasts";
import Settings from "@/pages/Settings";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              }
            />
            <Route
              path="/planning"
              element={
                <PrivateRoute>
                  <Planning />
                </PrivateRoute>
              }
            />
            <Route
              path="/forecasts"
              element={
                <PrivateRoute>
                  <Forecasts />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
