import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 p-4 font-sans">
      <Card className="w-full max-w-md border border-stone-200 dark:border-slate-800 shadow-xl">
        <CardHeader className="space-y-1 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/login" className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-lg">N</div>
            <span className="font-extrabold text-xl tracking-tighter">Nexus Finance</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Recuperar senha</CardTitle>
          <p className="text-slate-500 text-sm">Insira seu e-mail para receber as instruções de recuperação.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-stone-200 dark:border-slate-800 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p className="font-medium">{success}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-bold h-11 transition-all"
              disabled={loading}
            >
              {loading ? "Processando..." : "Enviar instruções"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
