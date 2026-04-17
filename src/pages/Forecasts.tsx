import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Sparkles } from "lucide-react";

export default function Forecasts() {
  return (
    <DashboardLayout title="Previsões Inteligentes">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-semibold">Análise de Tendência</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center text-slate-400 italic text-sm text-center px-8">
            Nossa IA está analisando seus dados para gerar projeções de fluxo de caixa para os próximos meses.
          </CardContent>
        </Card>
        
        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-base font-semibold">Saúde Financeira</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-stone-50 dark:bg-slate-900 rounded-lg border border-stone-100 dark:border-slate-800">
              <p className="text-sm font-medium mb-1">Dica da Semana</p>
              <p className="text-xs text-slate-500 leading-relaxed">Com base no seu atual burn rate, recomendamos reduzir despesas fixas em 5% para atingir sua meta de reserva até o final do ano.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
