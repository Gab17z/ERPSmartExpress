import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Bell,
  Palette,
  LogOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MeuPerfil() {
  const { user: authUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    avatar_url: ''
  });

  // Password change
  const [dialogSenha, setDialogSenha] = useState(false);
  const [senhaData, setSenhaData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Preferences
  const [preferencias, setPreferencias] = useState({
    notificacoes_email: true,
    notificacoes_push: true,
    tema: 'light',
    som_notificacoes: true,
    atalhos_teclado: true
  });

  useEffect(() => {
    if (authUser) {
      setFormData({
        nome: authUser?.nome || '',
        telefone: authUser?.telefone || '',
        avatar_url: authUser?.avatar_url || ''
      });
    }

    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('user_preferences');
    if (savedPrefs) {
      try {
        setPreferencias(JSON.parse(savedPrefs));
      } catch (e) {
        console.error("Erro ao carregar preferências:", e);
      }
    }
  }, [authUser]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      // Update user profile via Usuario entity
      await base44.entities.Usuario.update(authUser.id, {
        nome: formData.nome,
        telefone: formData.telefone,
        avatar_url: formData.avatar_url
      });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (senhaData.novaSenha !== senhaData.confirmarSenha) {
      toast.error("As senhas nao coincidem");
      return;
    }

    if (senhaData.novaSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      setChangingPassword(true);
      await base44.entities.Usuario.update(authUser.id, { senha: senhaData.novaSenha });
      toast.success("Senha alterada com sucesso!");
      setDialogSenha(false);
      setSenhaData({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('user_preferences', JSON.stringify(preferencias));
    toast.success("Preferencias salvas com sucesso!");
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, avatar_url: file_url });
      toast.success("Avatar enviado!");
    } catch (error) {
      console.error("Erro ao enviar avatar:", error);
      toast.error("Erro ao enviar avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informacoes pessoais e preferencias</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.avatar_url} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                {getInitials(formData.nome || authUser?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{formData.nome || 'Usuario'}</h2>
              <p className="text-gray-500">{authUser?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Conta ativa
                </Badge>
                {authUser?.permissoes?.administrador_sistema && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    <Shield className="w-3 h-3 mr-1" />
                    Administrador
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="perfil">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Lock className="w-4 h-4 mr-2" />
            Seguranca
          </TabsTrigger>
          <TabsTrigger value="preferencias">
            <Settings className="w-4 h-4 mr-2" />
            Preferencias
          </TabsTrigger>
        </TabsList>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Informacoes Pessoais</CardTitle>
              <CardDescription>Atualize suas informacoes de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="pl-10"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      value={authUser?.email || ''}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                  <p className="text-xs text-gray-500">O email nao pode ser alterado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="pl-10"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Foto do Perfil</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                        {getInitials(formData.nome || authUser?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {uploadingAvatar ? "Enviando..." : "Escolher Foto"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                      </label>
                      {formData.avatar_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-red-600 h-7"
                          onClick={() => setFormData({ ...formData, avatar_url: '' })}
                        >
                          Remover foto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alteracoes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguranca Tab */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Seguranca da Conta</CardTitle>
              <CardDescription>Gerencie a seguranca da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alterar Senha */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Senha</h3>
                    <p className="text-sm text-gray-500">Altere sua senha de acesso</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setDialogSenha(true)}>
                  Alterar Senha
                </Button>
              </div>

              {/* Sessoes Ativas */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Sessao Atual</h3>
                    <p className="text-sm text-gray-500">
                      Logado desde {user?.last_sign_in_at
                        ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
                        : 'agora'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativa
                </Badge>
              </div>

              {/* Info de Seguranca */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Dicas de Seguranca</h4>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1">
                      <li>Use uma senha forte com letras, numeros e simbolos</li>
                      <li>Nao compartilhe sua senha com outras pessoas</li>
                      <li>Faca logout ao usar computadores publicos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferencias Tab */}
        <TabsContent value="preferencias">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias do Sistema</CardTitle>
              <CardDescription>Configure suas preferencias de uso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notificacoes */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificacoes
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificacoes por Email</p>
                      <p className="text-sm text-gray-500">Receba alertas por email</p>
                    </div>
                    <Switch
                      checked={preferencias.notificacoes_email}
                      onCheckedChange={(checked) =>
                        setPreferencias({ ...preferencias, notificacoes_email: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificacoes Push</p>
                      <p className="text-sm text-gray-500">Receba notificacoes no navegador</p>
                    </div>
                    <Switch
                      checked={preferencias.notificacoes_push}
                      onCheckedChange={(checked) =>
                        setPreferencias({ ...preferencias, notificacoes_push: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Som de Notificacoes</p>
                      <p className="text-sm text-gray-500">Reproduzir som ao receber alertas</p>
                    </div>
                    <Switch
                      checked={preferencias.som_notificacoes}
                      onCheckedChange={(checked) =>
                        setPreferencias({ ...preferencias, som_notificacoes: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Aparencia */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Aparencia
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Tema</p>
                      <p className="text-sm text-gray-500">Escolha o tema do sistema</p>
                    </div>
                    <Select
                      value={preferencias.tema}
                      onValueChange={(value) =>
                        setPreferencias({ ...preferencias, tema: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Acessibilidade */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Acessibilidade
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Atalhos de Teclado</p>
                      <p className="text-sm text-gray-500">Habilitar atalhos rapidos</p>
                    </div>
                    <Switch
                      checked={preferencias.atalhos_teclado}
                      onCheckedChange={(checked) =>
                        setPreferencias({ ...preferencias, atalhos_teclado: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSavePreferences}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Preferencias
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Alterar Senha */}
      <Dialog open={dialogSenha} onOpenChange={setDialogSenha}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova-senha"
                  type={showNovaSenha ? "text" : "password"}
                  value={senhaData.novaSenha}
                  onChange={(e) => setSenhaData({ ...senhaData, novaSenha: e.target.value })}
                  placeholder="Digite a nova senha"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                >
                  {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={senhaData.confirmarSenha}
                onChange={(e) => setSenhaData({ ...senhaData, confirmarSenha: e.target.value })}
                placeholder="Confirme a nova senha"
              />
            </div>
            {senhaData.novaSenha && senhaData.confirmarSenha && (
              <div className="flex items-center gap-2 text-sm">
                {senhaData.novaSenha === senhaData.confirmarSenha ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Senhas coincidem</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">Senhas nao coincidem</span>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSenha(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || senhaData.novaSenha !== senhaData.confirmarSenha}
            >
              {changingPassword ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
