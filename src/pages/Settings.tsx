import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Wallet, Camera, Key, Mail, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type TabType = "profile" | "accounts" | "notifications" | "security";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    gastos: true,
    relatorio: true,
    ia: false,
  });

  useEffect(() => {
    if (user?.preferences) {
      const prefs = user.preferences as any;
      if (prefs.notifications) {
        setNotifications(prefs.notifications);
      }
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // --- Block 1.4: Validation (CORRIGIDO) ---
    const MAX_SIZE_MB = 2;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`A imagem deve ter no máximo ${MAX_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");

      await updateProfile({ avatarUrl: data.avatarUrl });
    } catch (err: any) {
      console.error("Error uploading avatar:", err.message);
      alert("Erro ao enviar imagem: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ name });
      alert("Alterações salvas com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar alterações: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotification = async (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    
    try {
      await fetch("/api/auth/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: newNotifications }),
      });
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pwForm.next !== pwForm.confirm) { setPwError("As senhas não coincidem."); return; }
    if (pwForm.next.length < 6) { setPwError("Nova senha deve ter pelo menos 6 caracteres."); return; }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => { setIsChangingPassword(false); setPwSuccess(false); }, 2000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-stone-50 dark:border-slate-800">
              <div className="relative group">
                <div 
                  className="w-20 h-20 rounded-full bg-stone-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  ) : user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <button 
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>
              <div>
                <h3 className="text-sm font-bold">Foto de Perfil</h3>
                <p className="text-xs text-slate-500 mb-2">PNG, JPG, GIF ou WebP. Máximo de 2MB.</p>
                <button 
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? "Enviando..." : "Alterar foto"}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Nome completo</label>
                <input 
                  type="text" 
                  className="w-full bg-transparent border border-stone-200 dark:border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">E-mail</label>
                <div className="relative">
                  <input 
                    type="email" 
                    className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-400 cursor-not-allowed" 
                    readOnly 
                    value={user?.email || ""} 
                  />
                  <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-6"
                onClick={handleSaveChanges}
                disabled={isSaving || isUploading}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </div>
        );
      case "accounts":
        return (
          <div className="space-y-6">
            <div className="p-12 text-center space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <h3 className="text-sm font-bold">Nenhuma conta vinculada</h3>
                <p className="text-xs text-slate-500">Adicione suas contas bancárias para sincronização automática.</p>
              </div>
              <Button variant="outline" size="sm" className="mx-auto border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                Vincular Nova Conta
              </Button>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-4">
            <NotificationToggle 
              title="Alertas de Gastos" 
              description="Notificar quando atingir 80% do orçamento mensal." 
              checked={notifications.gastos}
              onChange={v => handleToggleNotification("gastos", v)}
            />
            <NotificationToggle 
              title="Relatório Semanal" 
              description="Receber resumo financeiro semanal por e-mail." 
              checked={notifications.relatorio}
              onChange={v => handleToggleNotification("relatorio", v)}
            />
            <NotificationToggle 
              title="Sugestões da IA" 
              description="Dicas personalizadas do Nexus baseadas no seu perfil." 
              checked={notifications.ia}
              onChange={v => handleToggleNotification("ia", v)}
            />
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-stone-100 dark:border-slate-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-stone-100 dark:bg-slate-800 rounded-full">
                    <Key className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Senha</h3>
                    <p className="text-xs text-slate-500">Altere sua senha de acesso periodicamente.</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-bold text-emerald-600"
                  onClick={() => setIsChangingPassword(true)}
                >
                  Alterar
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-stone-100 dark:border-slate-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 rounded-full">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Autenticação em Dois Fatores</h3>
                    <p className="text-xs text-slate-500">Proteja sua conta com um nível extra de segurança.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs font-bold border-emerald-200 text-emerald-600">Ativar</Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout title="Configurações">
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="space-y-1">
            <SettingsTab 
              icon={<User className="w-4 h-4" />} 
              label="Perfil" 
              active={activeTab === "profile"} 
              onClick={() => setActiveTab("profile")}
            />
            <SettingsTab 
              icon={<Wallet className="w-4 h-4" />} 
              label="Contas Bancárias" 
              active={activeTab === "accounts"} 
              onClick={() => setActiveTab("accounts")}
            />
            <SettingsTab 
              icon={<Bell className="w-4 h-4" />} 
              label="Notificações" 
              active={activeTab === "notifications"} 
              onClick={() => setActiveTab("notifications")}
            />
            <SettingsTab 
              icon={<Shield className="w-4 h-4" />} 
              label="Segurança" 
              active={activeTab === "security"} 
              onClick={() => setActiveTab("security")}
            />
          </aside>
          
          <Card className="md:col-span-3 border border-stone-200 dark:border-slate-800 shadow-sm min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {activeTab === "profile" && "Configurações de Perfil"}
                {activeTab === "accounts" && "Minhas Contas"}
                {activeTab === "notifications" && "Preferências de Notificação"}
                {activeTab === "security" && "Segurança da Conta"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Block 2.5: Change Password Modal --- */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-slate-800">
              <h2 className="text-base font-semibold">Alterar Senha</h2>
              <button onClick={() => setIsChangingPassword(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {pwError && <p className="text-rose-500 text-xs font-medium bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{pwError}</p>}
              {pwSuccess && <p className="text-emerald-500 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">Senha alterada com sucesso!</p>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Senha Atual</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                  <input 
                    type="password" 
                    className="w-full pl-10 pr-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={pwForm.current} 
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                  <input 
                    type="password" 
                    className="w-full pl-10 pr-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={pwForm.next} 
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400">Confirmar Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                  <input 
                    type="password" 
                    className="w-full pl-10 pr-3 py-2 border border-stone-200 dark:border-slate-800 rounded text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={pwForm.confirm} 
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsChangingPassword(false)} 
                  className="flex-1 px-4 py-2 rounded border border-stone-200 dark:border-slate-800 text-sm font-medium hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || pwSuccess} 
                  className="flex-1 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {pwSuccess ? "Sucesso!" : "Salvar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SettingsTab({ 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active 
          ? "bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100" 
          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-stone-50 dark:hover:bg-slate-900/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function NotificationToggle({ 
  title, description, checked, onChange 
}: { 
  title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer" 
        />
        <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  );
}
