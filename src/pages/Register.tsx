import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [confirmError, setConfirmError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmError("As senhas não coincidem");
    } else {
      setConfirmError("");
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setConfirmError("As senhas não coincidem.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar conta";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-rose-500";
    if (passwordStrength === 2) return "bg-amber-500";
    if (passwordStrength === 3) return "bg-blue-500";
    return "bg-emerald-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return "Fraca";
    if (passwordStrength === 2) return "Média";
    if (passwordStrength === 3) return "Forte";
    return "Muito Forte";
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
            <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
            <CardDescription>
              Comece a organizar sua vida financeira hoje mesmo
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
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
                />
                {password && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Força da senha</span>
                      <span className={getStrengthColor().replace("bg-", "text-")}>{getStrengthText()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${getStrengthColor()}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
                />
                {confirmPassword && (
                  confirmError 
                    ? <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {confirmError}
                      </div>
                    : <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        As senhas coincidem
                      </div>
                )}
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" disabled={isLoading || !!confirmError}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Conta
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-center w-full text-slate-500">
              Já tem uma conta?{" "}
              <Link to="/login" className="font-bold text-slate-900 dark:text-slate-100 hover:underline transition-colors">
                Faça login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
