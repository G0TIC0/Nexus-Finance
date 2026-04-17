import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Sparkles, History, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Forecast {
  id: string;
  monthsAhead: number;
  projectedBalance: string; // JSON string
  confidence: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
}

export default function Forecasts() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchForecasts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/forecasts");
      if (res.ok) {
        setForecasts(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch forecasts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  return (
    <DashboardLayout title="Previsões Inteligentes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Analysis */}
          <Card className="lg:col-span-2 border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-stone-50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base font-semibold">Análise de Tendência</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Analisando histórico financeiro...</p>
                </div>
              ) : forecasts.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <Info className="w-12 h-12 mx-auto text-slate-200" />
                  <div>
                    <h3 className="text-sm font-bold">Nenhuma previsão gerada</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Use o botão "Inteligência Nexus" no Dashboard para gerar sua primeira análise preditiva.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-stone-50 dark:divide-slate-800">
                  {forecasts.map((f, idx) => {
                    const balances = JSON.parse(f.projectedBalance) as number[];
                    return (
                      <div key={f.id} className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-stone-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                              #{forecasts.length - idx}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Gerado em {new Date(f.createdAt).toLocaleDateString('pt-BR')}</p>
                              <h4 className="text-sm font-bold">Projeção para {f.monthsAhead} meses</h4>
                            </div>
                          </div>
                          <Badge className={`${
                            f.confidence === "HIGH" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            f.confidence === "MEDIUM" ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-rose-50 text-rose-600 border-rose-100"
                          } text-[10px] font-bold uppercase tracking-wider`}>
                            Confiança: {f.confidence}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {balances.map((val, i) => (
                            <div key={i} className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Mês {i + 1}</p>
                              <p className="text-sm font-bold tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Saúde Financeira</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-stone-50 dark:bg-slate-900 rounded-lg border border-stone-100 dark:border-slate-800">
                  <p className="text-sm font-bold mb-1 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Insight de Previsão
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {forecasts.length > 0 
                      ? "Com base no seu histórico atual, recomendamos manter uma reserva extra para o Mês 2 da projeção."
                      : "Gere previsões para que nosso motor de IA possa fornecer insights sobre seu futuro financeiro."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  <CardTitle className="text-base font-semibold">Dicas de Consumo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-slate-500 font-medium">Revise seus gastos fixos mensais para aumentar sua capacidade de poupança.</p>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-slate-500 font-medium">As projeções de Baixa Confiança indicam alta volatilidade nos seus gastos recentes.</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
