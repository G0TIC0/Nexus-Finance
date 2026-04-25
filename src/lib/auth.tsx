import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  preferences?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function parseJsonResponse(res: Response) {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }
    const text = await res.text();
    console.error("Non-JSON response:", text);
    throw new Error("Erro no servidor: Resposta inválida");
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return parseJsonResponse(res);
      })
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {
        // Silently fail as this is expected for unauthenticated users
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const updateProfile = async (updateData: { name?: string; avatarUrl?: string }) => {
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
