import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, Wallet, Camera, Key, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type TabType = "profile" | "accounts" | "notifications" | "security";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user profile in backend
      await updateProfile({ avatarUrl: publicUrl });
    } catch (err: any) {
      console.error("Error uploading avatar:", err.message);
      alert("Erro ao enviar imagem. Verifique se o bucket 'avatars' existe no Supabase e tem permissões públicas.");
    } finally {
      setIsUploading(false);
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
                <p className="text-xs text-slate-500 mb-2">PNG, JPG ou GIF. Máximo de 2MB.</p>
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
              defaultChecked 
            />
            <NotificationToggle 
              title="Relatório Semanal" 
              description="Receber resumo financeiro semanal por e-mail." 
              defaultChecked 
            />
            <NotificationToggle 
              title="Sugestões da IA" 
              description="Dicas personalizadas do Nexus baseadas no seu perfil." 
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
                    <p className="text-xs text-slate-500">Última alteração há 3 meses.</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600">Alterar</Button>
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

function NotificationToggle({ title, description, defaultChecked = false }: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  );
}
