import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Search, Filter, X, Loader2, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "REALIZED" | "PROJECTED";
  competenceDate: string;
  categoryId?: string;
  category?: Category;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Filters State
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    type: "EXPENSE" as const,
    status: "REALIZED" as const,
    competenceDate: new Date().toISOString().split('T')[0],
    categoryId: ""
  });

  const fetchData = async (p = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/transactions?page=${p}&limit=50`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar transações");
      
      setData(json.data);
      setMeta(json.meta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      fetchData(page);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const cats = await res.json();
        setCategories(cats);
        if (cats.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: cats[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories");
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredTransactions = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category?.name.toLowerCase().includes(term)
      );
    }
    if (filterType) {
      result = result.filter(t => t.type === filterType);
    }
    if (filterStatus) {
      result = result.filter(t => t.status === filterStatus);
    }
    return result;
  }, [data, searchTerm, filterType, filterStatus]);

  const activeFiltersCount = (filterType ? 1 : 0) + (filterStatus ? 1 : 0);

  const clearFilters = () => {
    setFilterType(null);
    setFilterStatus(null);
    setSearchTerm("");
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      setError("O valor deve ser maior que zero");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          competenceDate: new Date(formData.competenceDate).toISOString()
        })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Falha ao criar");
      
      setIsModalOpen(false);
      setFormData({
        description: "",
        amount: 0,
        type: "EXPENSE",
        status: "REALIZED",
        competenceDate: new Date().toISOString().split('T')[0],
        categoryId: categories[0]?.id || ""
      });
      fetchData(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title="Transações">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:max-w-sm px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar transações..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative group">
              <Button 
                variant="outline" 
                size="sm" 
                className={`flex-1 sm:flex-none items-center gap-2 border-stone-200 dark:border-slate-800 ${activeFiltersCount > 0 ? "border-emerald-500 bg-emerald-50/50" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : "Filtrar"}
              </Button>
              
              {showFilters && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold uppercase text-slate-400">Filtros</span>
                    <button onClick={clearFilters} className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700">Limpar</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Tipo</label>
                      <div className="flex flex-wrap gap-2">
                        {["INCOME", "EXPENSE", "TRANSFER"].map(t => (
                          <button 
                            key={t}
                            onClick={() => setFilterType(filterType === t ? null : t)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                              filterType === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {t === "INCOME" ? "Receita" : t === "EXPENSE" ? "Despesa" : "Transf."}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {["REALIZED", "PROJECTED"].map(s => (
                          <button 
                            key={s}
                            onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                              filterStatus === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {s === "REALIZED" ? "Realizado" : "Projetado"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              size="sm" 
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
             <span className="text-xs text-slate-400">Filtros ativos:</span>
             <div className="flex flex-wrap gap-2">
               {filterType && (
                 <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border border-emerald-100">
                    Tipo: {filterType}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterType(null)} />
                 </span>
               )}
               {filterStatus && (
                 <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border border-emerald-100">
                    Status: {filterStatus}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus(null)} />
                 </span>
               )}
             </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded text-rose-600 text-xs font-medium flex justify-between items-center animate-in slide-in-from-top-2">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-stone-50 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
              </div>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-stone-100 dark:border-slate-800">
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Descrição</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Categoria</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Data</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Valor</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-6 py-4"><div className="h-4 w-full bg-stone-50 dark:bg-slate-800/50 animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Nenhuma transação encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id} className="border-stone-50 dark:border-slate-800/50 hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-default">
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
                        {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""} 
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.amount))}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="Excluir transação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-50 dark:border-slate-800 bg-stone-50/30 dark:bg-slate-900/30">
              <p className="text-xs text-slate-400">Mostrando {filteredTransactions.length} de {meta.total} transações</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1 || isLoading} 
                  onClick={() => setPage(p => p - 1)}
                  className="text-xs h-8"
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === meta.totalPages || isLoading} 
                  onClick={() => setPage(p => p + 1)}
                  className="text-xs h-8"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* --- Block 2.1: New Transaction Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-slate-800">
              <h2 className="text-base font-semibold">Nova Transação</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Descrição</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Aluguel, Supermercado..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={formData.amount || ""}
                    onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Tipo</label>
                  <select 
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={formData.type}
                    onChange={e => setFormData(f => ({ ...f, type: e.target.value as any }))}
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                    <option value="TRANSFER">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Data</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={formData.competenceDate}
                    onChange={e => setFormData(f => ({ ...f, competenceDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400">Status</label>
                  <select 
                    className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                  >
                    <option value="REALIZED">Realizado</option>
                    <option value="PROJECTED">Projetado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Categoria</label>
                <select 
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={formData.categoryId}
                  onChange={e => setFormData(f => ({ ...f, categoryId: e.target.value }))}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  {categories.length === 0 && <option value="">Sem categorias</option>}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2 rounded border border-stone-200 dark:border-slate-800 text-sm font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Criar Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
