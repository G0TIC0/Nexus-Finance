import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from "recharts";
import { 
  Info, Sparkles, AlertCircle, Loader2
} from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "REALIZED" | "PROJECTED";
  competenceDate: string;
  category?: { name: string; color: string; icon: string };
}

interface ForecastResult {
  forecastId: string;
  projectedBalances: number[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("Falha ao carregar transações");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão";
      setFetchError(message);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const runEngines = async () => {
    setIsProcessing(true);
    setEngineError(null);
    try {
      const fixedRes = await fetch("/api/engine/process-fixed-expenses", { method: "POST" });
      if (!fixedRes.ok) {
        const err = await fixedRes.json();
        throw new Error(err.error ?? "Erro ao processar gastos fixos");
      }

      const forecastRes = await fetch("/api/engine/generate-forecast", { method: "POST" });
      if (!forecastRes.ok) {
        const err = await forecastRes.json();
        throw new Error(err.error ?? "Erro ao gerar previsão");
      }

      const result = await forecastRes.json();
      setForecast(result.data);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setEngineError(message);
      console.error({ action: "runEngines", error: message });
    } finally {
      setIsProcessing(false);
    }
  };

  // KPI Calculations
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const realizedIncome = safeTransactions
    .filter(t => t.type === "INCOME" && t.status === "REALIZED")
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const realizedExpense = safeTransactions
    .filter(t => t.type === "EXPENSE" && t.status === "REALIZED")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentBalance = realizedIncome - realizedExpense;
  
  const burnRate = realizedExpense / 30;

  // --- Block 3.3: Real Chart Data ---
  const chartData = useMemo(() => {
    const months: Record<string, { name: string; Realizado: number; Projetado: number }> = {};
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase();
      months[key] = { name: label, Realizado: 0, Projetado: 0 };
    }

    safeTransactions.forEach((t) => {
      const d = new Date(t.competenceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!months[key]) return;
      const val = Number(t.amount);
      if (t.type === "EXPENSE") {
        if (t.status === "REALIZED") months[key].Realizado += val;
        else months[key].Projetado += val;
      } else if (t.type === "INCOME" && t.status === "REALIZED") {
        // Optional: show income in chart too? Spec says "Fluxo de Caixa", usually shows both or net.
        // But the original chart had "Realizado" and "Projetado" as bars.
      }
    });

    return Object.values(months);
  }, [safeTransactions]);

  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    safeTransactions
      .filter((t) => t.type === "EXPENSE" && t.status === "REALIZED")
      .forEach((t) => {
        const cat = t.category?.name ?? "Outros";
        byCategory[cat] = (byCategory[cat] ?? 0) + Number(t.amount);
      });
    const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [safeTransactions]);

  const COLORS = ["#0f172a", "#10b981", "#fbbf24", "#f43f5e", "#94a3b8"];

  return (
    <DashboardLayout title="Visão Geral">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-end -mt-4 mb-2">
          <div className="flex items-center gap-4">
            {engineError && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in slide-in-from-right-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {engineError}
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runEngines} 
              disabled={isProcessing}
              className="hidden md:flex items-center gap-2 border-stone-200 dark:border-slate-800"
              aria-label="Executar inteligência Nexus"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Inteligência Nexus
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <KPICard 
                title="Saldo Atual" 
                value={currentBalance} 
                description="+12,4% vs mês anterior"
                trend="up"
                tooltip="Total disponível em todas as contas"
              />
              <KPICard 
                title="Burn Rate Mensal" 
                value={burnRate} 
                description="+2,1% acima da meta"
                trend="down"
                unit="/dia"
                tooltip="Média de gastos diários"
              />
              <KPICard 
                title="Economia do Mês" 
                value={realizedIncome - realizedExpense} 
                description="82% do planejado"
                trend="up"
                tooltip="Receitas - Despesas realizadas"
              />
              <KPICard 
                title="Próximos Vencimentos" 
                value={safeTransactions.filter(t => t.status === "PROJECTED").reduce((acc, t) => acc + Number(t.amount), 0)} 
                description={`${safeTransactions.filter(t => t.status === "PROJECTED").length} pendências críticas`}
                trend="neutral"
                tooltip="Contas fixas provisionadas"
              />
            </>
          )}
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-stone-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-base font-semibold">Fluxo de Caixa (6 meses)</CardTitle>
              </div>
              {forecast && (
                <Badge className={`${
                  forecast.confidence === "HIGH" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  forecast.confidence === "MEDIUM" ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-rose-50 text-rose-600 border-rose-100"
                } text-[10px] font-bold uppercase tracking-wider`}>
                  Confiança: {forecast.confidence === "HIGH" ? "ALTA" : forecast.confidence === "MEDIUM" ? "MÉDIA" : "BAIXA"}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="h-[250px]">
              {isLoading ? (
                <div className="w-full h-full bg-stone-50 dark:bg-slate-800/50 animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="Realizado" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="Projetado" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={32} opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-6 flex gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-slate-900" /> Realizado
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-amber-400 opacity-50" /> Projetado
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-8">
              <CardTitle className="text-base font-semibold">Composição de Gastos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="h-[160px]">
                {isLoading ? (
                  <div className="w-32 h-32 mx-auto bg-stone-50 dark:bg-slate-800/50 animate-pulse rounded-full" />
                ) : pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                    Sem dados de gastos realizados
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value}%</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-stone-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  Dica de IA: {pieData.length > 0 ? `Seus gastos com ${pieData[0].name} representam a maior fatia do seu orçamento.` : "Gere previsões para receber dicas personalizadas."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Transações Recentes</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
              Ver todas →
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-stone-100 dark:border-slate-800">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Descrição</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Categoria</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Data</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><div className="h-4 w-full bg-stone-50 dark:bg-slate-800/50 animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : fetchError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="text-rose-500 text-sm mb-2">{fetchError}</p>
                      <Button variant="outline" size="sm" onClick={fetchData}>Tentar novamente</Button>
                    </TableCell>
                  </TableRow>
                ) : safeTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-sm">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  safeTransactions.slice(0, 8).map((t) => (
                    <TableRow key={t.id} className="border-stone-50 dark:border-slate-800/50">
                      <TableCell className="font-medium text-sm">{t.description}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{t.category?.name || "Geral"}</TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {new Date(t.competenceDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter ${
                          t.status === "REALIZED" 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}>
                          {t.status}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm ${t.type === "INCOME" ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"}`}>
                        {t.type === "INCOME" ? "+" : "-"} 
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  description: string;
  trend: "up" | "down" | "neutral";
  unit?: string;
  tooltip?: string;
}

function KPICard({ title, value, description, trend, unit, tooltip }: KPICardProps) {
  const tooltipId = `tooltip-${title.replace(/\s/g, "-").toLowerCase()}`;

  return (
    <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {title}
          {tooltip && (
            <div className="group relative">
              <Info 
                className="w-3 h-3 cursor-help text-slate-300" 
                aria-describedby={tooltipId}
              />
              <div 
                role="tooltip"
                id={tooltipId}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal font-normal"
              >
                {tooltip}
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
          {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
        </div>
        <div className={`text-[11px] font-semibold mt-1 ${
          trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-amber-500"
        }`}>
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse">
      <div className="h-3 w-24 bg-stone-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-7 w-32 bg-stone-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-2 w-20 bg-stone-100 dark:bg-slate-800 rounded" />
    </div>
  );
}

