import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Planning() {
  return (
    <DashboardLayout title="Planejamento">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Objetivo
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Reserva de Emergência</CardTitle>
              <Target className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">R$ 15.000,00</span>
                  <span className="text-xs text-slate-400">Meta: R$ 30.000,00</span>
                </div>
                <div className="w-full h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/2 rounded-full" />
                </div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider text-center">50% Concluído</p>
              </div>
            </CardContent>
          </Card>
          {/* Add more goal cards as needed */}
        </div>

        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Orçamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-slate-400 italic text-sm">
            Área de orçamentos em desenvolvimento.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
