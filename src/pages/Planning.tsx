import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListRestart, Plus, Settings2, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  recurrence: string;
  nextDueDate: string;
  active: boolean;
  category?: { name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function Planning() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    recurrence: "MONTHLY",
    nextDueDate: new Date().toISOString().split('T')[0],
    categoryId: ""
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [expRes, catRes] = await Promise.all([
        fetch("/api/fixed-expenses"),
        fetch("/api/categories")
      ]);
      
      if (expRes.ok) setExpenses(await expRes.json());
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
        if (cats.length > 0 && !formData.categoryId) setFormData(f => ({ ...f, categoryId: cats[0].id }));
      }
    } catch (err) {
      setError("Falha ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/fixed-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nextDueDate: new Date(formData.nextDueDate).toISOString()
        })
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      
      setIsModalOpen(false);
      setFormData({
        description: "",
        amount: 0,
        recurrence: "MONTHLY",
        nextDueDate: new Date().toISOString().split('T')[0],
        categoryId: categories[0]?.id || ""
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (expense: FixedExpense) => {
    try {
      const res = await fetch(`/api/fixed-expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !expense.active })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Toggle failed");
    }
  };

  return (
    <DashboardLayout title="Planejamento">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Gastos Fixos</h2>
            <p className="text-sm text-slate-500">Gerencie suas despesas recorrentes e provisionamento automático.</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold"
          >
            <Plus className="w-4 h-4" />
            Adicionar Gasto Fixo
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-stone-50 animate-pulse rounded-xl border" />)
          ) : expenses.length === 0 ? (
            <Card className="col-span-full border-dashed border-2 p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <ListRestart className="w-12 h-12 opacity-20" />
              <p>Nenhum gasto fixo cadastrado.</p>
            </Card>
          ) : (
            expenses.map(expense => (
              <Card key={expense.id} className={`border border-stone-200 dark:border-slate-800 shadow-sm transition-opacity ${!expense.active ? 'opacity-60' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: expense.category?.color || '#cbd5e1' }} />
                    <CardTitle className="text-sm font-semibold">{expense.description}</CardTitle>
                  </div>
                  <button onClick={() => toggleStatus(expense)} className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${expense.active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                    {expense.active ? 'Ativo' : 'Pausado'}
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{expense.recurrence}</span>
                    </div>
                    <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Póximo vencimento:</span>
                      <span>{new Date(expense.nextDueDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Configuração de Categorias</CardTitle>
            <Settings2 className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 border rounded-full bg-white dark:bg-slate-900 border-stone-100 dark:border-slate-800 text-xs font-semibold">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="rounded-full text-[10px] font-bold text-slate-400">+ Nova Categoria</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Fixed Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-slate-800">
              <h2 className="text-base font-semibold">Novo Gasto Fixo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Descrição</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none" 
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none" 
                    value={formData.amount || ""}
                    onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Recorrência</label>
                  <select 
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={formData.recurrence}
                    onChange={e => setFormData(f => ({ ...f, recurrence: e.target.value }))}
                  >
                    <option value="DAILY">Diário</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Próximo Vencimento</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none" 
                  value={formData.nextDueDate}
                  onChange={e => setFormData(f => ({ ...f, nextDueDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Categoria</label>
                <select 
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={formData.categoryId}
                  onChange={e => setFormData(f => ({ ...f, categoryId: e.target.value }))}
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
