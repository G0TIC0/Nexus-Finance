import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import { AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao entrar";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-900 dark:bg-slate-100 rounded-xl flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-xl">N</div>
            <span className="text-2xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-100">Nexus Finance</span>
          </div>
        </div>

        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 rounded-lg flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  className="bg-stone-50/50 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-slate-500">
              Não tem uma conta?{" "}
              <Link to="/register" className="font-bold text-slate-900 dark:text-slate-100 hover:underline transition-colors">
                Cadastre-se agora
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
