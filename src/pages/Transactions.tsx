import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Search, Filter } from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "REALIZED" | "PROJECTED";
  competenceDate: string;
  category?: { name: string; color: string; icon: string };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DashboardLayout title="Transações">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar transações..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-stone-200 dark:border-slate-800">
              <Filter className="w-4 h-4" />
              Filtrar
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </div>
        </div>

        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-stone-50 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-stone-100 dark:border-slate-800">
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Descrição</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Categoria</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Data</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-6 py-4"><div className="h-4 w-full bg-stone-50 dark:bg-slate-800/50 animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Nenhuma transação encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id} className="border-stone-50 dark:border-slate-800/50 hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-sm">{t.description}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-slate-500 text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category?.color || '#cbd5e1' }} />
                          {t.category?.name || "Geral"}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(t.competenceDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
                          t.status === "REALIZED" 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}>
                          {t.status === "REALIZED" ? "Realizado" : "Projetado"}
                        </span>
                      </TableCell>
                      <TableCell className={`px-6 py-4 text-right font-bold text-sm ${t.type === "INCOME" ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"}`}>
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
