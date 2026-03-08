
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Wrench,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Smartphone,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Tag,
  TrendingUp,
  Calendar,
  MessageSquare,
  Target,
  Building2,
  Bot,
  Trophy,
  Wallet,
  Megaphone,
  Plug
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SeletorLojaAtiva from "@/components/multilojas/SeletorLojaAtiva";
import NotificacoesRealTime from "@/components/NotificacoesRealTime";

const navigationItems = [
  // SEÇÃO 1: VISÃO GERAL - todos podem ver
  {
    section: "Visão Geral",
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    permissions: [] // Vazio = todos têm acesso
  },
  // SEÇÃO 2: VENDAS E ATENDIMENTO
  {
    section: "Vendas e Atendimento",
    title: "PDV - Vendas",
    url: createPageUrl("PDV"),
    icon: ShoppingCart,
    permissions: ["realizar_vendas"]
  },
  {
    section: "Vendas e Atendimento",
    title: "Caixa",
    url: createPageUrl("Caixa"),
    icon: Wallet,
    permissions: ["gerenciar_caixa", "abrir_fechar_caixa"],
    submenu: [
      { title: "Gerenciar Caixa", url: createPageUrl("Caixa") },
      { title: "Calculadora de Pagamentos", url: createPageUrl("CalculadoraPagamentos") },
    ]
  },
  {
    section: "Vendas e Atendimento",
    title: "Ordens de Serviço",
    url: createPageUrl("OrdensServico"),
    icon: Wrench,
    permissions: ["gerenciar_os"]
  },
  {
    section: "Vendas e Atendimento",
    title: "Avaliador Seminovos",
    url: createPageUrl("AvaliacaoSeminovo"),
    icon: Smartphone,
    permissions: ["avaliar_seminovos"]
  },
  // SEÇÃO 3: CLIENTES E MARKETING
  {
    section: "Clientes e Marketing",
    title: "Clientes",
    url: createPageUrl("Clientes"),
    icon: Users,
    permissions: ["gerenciar_clientes"]
  },
  {
    section: "Clientes e Marketing",
    title: "CRM & Funil",
    url: createPageUrl("CRM"),
    icon: Target,
    permissions: ["gerenciar_crm"]
  },
  {
    section: "Clientes e Marketing",
    title: "Marketing",
    url: createPageUrl("Marketing"),
    icon: Megaphone,
    permissions: ["gerenciar_marketing"],
    submenu: [
      { title: "Aniversários", url: createPageUrl("Aniversarios") },
      { title: "Pós-Venda", url: createPageUrl("PosVenda") },
      { title: "Cupons de Desconto", url: createPageUrl("CuponsDesconto") },
    ]
  },
  // SEÇÃO 4: ESTOQUE
  {
    section: "Estoque",
    title: "Produtos",
    url: createPageUrl("Produtos"),
    icon: Package,
    permissions: ["gerenciar_estoque", "gerenciar_produtos"],
    submenu: [
      { title: "Produtos", url: createPageUrl("Produtos") },
      { title: "Compras", url: createPageUrl("Compras") },
      { title: "Devoluções", url: createPageUrl("Devolucoes") },
      { title: "Categorias", url: createPageUrl("Categorias") },
      { title: "Marcas", url: createPageUrl("Marcas") },
      { title: "Fornecedores", url: createPageUrl("Fornecedores") },
    ]
  },
  // SEÇÃO 5: FINANCEIRO
  {
    section: "Financeiro",
    title: "Financeiro",
    url: createPageUrl("Financeiro"),
    icon: DollarSign,
    permissions: ["gerenciar_financeiro"],
    submenu: [
      { title: "Contas a Receber", url: createPageUrl("ContasReceber") },
      { title: "Contas a Pagar", url: createPageUrl("ContasPagar") },
      { title: "Contas Recorrentes", url: createPageUrl("ContasRecorrentes") },
      { title: "Contas Bancárias", url: createPageUrl("ContasBancarias") },
      { title: "Movimentação Financeira", url: createPageUrl("MovimentacaoFinanceira") },
      { title: "Fluxo de Caixa", url: createPageUrl("FluxoCaixa") },
      { title: "Centro de Custos", url: createPageUrl("CentroCustos") },
      { title: "Conciliação Bancária", url: createPageUrl("ConciliacaoBancaria") },
      { title: "NFe (Nota Fiscal)", url: createPageUrl("NFe") },
      { title: "NFC-e (Cupom Fiscal)", url: createPageUrl("NFCe") },
      { title: "DRE Simplificado", url: createPageUrl("DRE") },
    ]
  },
  // SEÇÃO 6: ANÁLISES E METAS
  {
    section: "Análises e Metas",
    title: "Relatórios",
    url: createPageUrl("Relatorios"),
    icon: BarChart3,
    permissions: ["acessar_relatorios"],
    submenu: [
      { title: "Vendas", url: createPageUrl("Relatorios") },
      { title: "Estoque", url: createPageUrl("RelatorioEstoque") },
      { title: "Ordens de Serviço", url: createPageUrl("RelatorioOS") },
      { title: "Clientes", url: createPageUrl("RelatorioClientes") },
      { title: "Seminovos", url: createPageUrl("RelatorioSeminovos") },
      { title: "Financeiro", url: createPageUrl("RelatorioFinanceiro") },
      { title: "Comissões", url: createPageUrl("Comissoes") },
      { title: "Rentabilidade por Loja", url: createPageUrl("RentabilidadeLoja") },
      { title: "Fiscal", url: createPageUrl("RelatorioFiscal") },
      { title: "Análises (Curva ABC)", url: createPageUrl("AnalisesCurvaABC") },
    ]
  },
  {
    section: "Análises e Metas",
    title: "Metas e Performance",
    url: createPageUrl("Metas"),
    icon: Trophy,
    permissions: ["acessar_metas"]
  },
  {
    section: "Análises e Metas",
    title: "Previsões de Vendas",
    url: createPageUrl("Previsoes"),
    icon: TrendingUp,
    permissions: ["acessar_relatorios"]
  },
  // SEÇÃO 7: FERRAMENTAS
  {
    section: "Ferramentas",
    title: "Agenda",
    url: createPageUrl("Agenda"),
    icon: Calendar,
    permissions: ["acessar_agenda"]
  },
  {
    section: "Ferramentas",
    title: "Etiquetas",
    url: createPageUrl("Etiquetas"),
    icon: Tag,
    permissions: ["acessar_etiquetas"]
  },
  {
    section: "Ferramentas",
    title: "Multi-Lojas",
    url: createPageUrl("MultiLojas"),
    icon: Building2,
    permissions: ["administrador_sistema"]
  },
  // SEÇÃO 8: COMUNICAÇÃO
  {
    section: "Comunicação",
    title: "Chatbot WhatsApp",
    url: createPageUrl("ChatbotConfig"),
    icon: Bot,
    permissions: ["gerenciar_comunicacao"]
  },
  {
    section: "Comunicação",
    title: "ADM WhatsApp",
    url: createPageUrl("AdmWhatsApp"),
    icon: MessageSquare,
    permissions: ["gerenciar_comunicacao"]
  },
  // SEÇÃO 9: CONFIGURAÇÕES
  {
    section: "Configurações",
    title: "Integrações",
    url: createPageUrl("Integracoes"),
    icon: Plug,
    permissions: ["administrador_sistema"]
  },
  {
    section: "Configurações",
    title: "Configurações",
    url: createPageUrl("Configuracoes"),
    icon: Settings,
    permissions: ["administrador_sistema"], // Apenas super admin
    submenu: [
      { title: "Sistema", url: createPageUrl("Configuracoes") },
      { title: "Cupom Fiscal", url: createPageUrl("ConfiguracaoCupom") },
      { title: "Logs", url: createPageUrl("Logs") },
    ]
  }
];

function SidebarContentComponent({ navigationItemsToRender, modoEscuro }) {
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const { setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Auto-abrir submenu se a página atual pertence a ele
  useEffect(() => {
    let menuToOpen = null;
    navigationItemsToRender.forEach(item => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some(subItem => location.pathname === subItem.url);
        if (isSubmenuActive) {
          menuToOpen = item.title;
        }
      }
    });
    setOpenSubmenu(menuToOpen);
  }, [location.pathname, navigationItemsToRender]);

  // Fechar outros submenus quando clicar em um novo
  const handleSubmenuClick = (itemTitle) => {
    setOpenSubmenu(itemTitle);
  };

  const handleLinkClick = () => {
    // Fechar sidebar no mobile quando clicar em um link
    if (window.innerWidth < 1024) {
      setOpenMobile(false);
    }
  };

  // Agrupar itens por seção mantendo a ordem
  const sections = [...new Set(navigationItemsToRender.map(item => item.section))];

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.url;

    if (item.submenu) {
      const isSubmenuActive = item.submenu.some(subItem => location.pathname === subItem.url);
      return (
        <Collapsible
          key={item.title}
          open={openSubmenu === item.title || isSubmenuActive}
          onOpenChange={(isOpen) => setOpenSubmenu(isOpen ? item.title : null)}
        >
          <SidebarMenuItem>
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-full">
                      <SidebarMenuButton
                        className={`transition-all duration-200 rounded-lg mb-0.5 flex items-center justify-center h-9 w-9 p-0 ${isSubmenuActive ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isSubmenuActive ? 'text-blue-600' : ''}`} />
                      </SidebarMenuButton>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col gap-1">
                    <p className="font-semibold">{item.title}</p>
                    {item.submenu.map(sub => (
                      <Link
                        key={sub.title}
                        to={sub.url}
                        className="text-xs hover:underline"
                        onClick={handleLinkClick}
                      >
                        • {sub.title}
                      </Link>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                <CollapsibleTrigger asChild>
                  <button
                    onClick={() => handleSubmenuClick(item.title)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg mb-0.5 transition-all duration-200 ${isSubmenuActive ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${isSubmenuActive ? 'text-blue-600' : ''}`} />
                      <span>{item.title}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${openSubmenu === item.title || isSubmenuActive ? 'rotate-90' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem) => {
                      const isSubActive = location.pathname === subItem.url;
                      return (
                        <Link
                          key={subItem.title}
                          to={subItem.url}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isSubActive ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-slate-50'}`}
                          onClick={handleLinkClick}
                        >
                          <span className="text-sm">{subItem.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </>
            )}
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center w-full">
                  <Link
                    to={item.url}
                    className={`flex items-center justify-center h-9 w-9 rounded-lg mb-0.5 transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                        : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                  </Link>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Link
            to={item.url}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all duration-200 ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
            }`}
            onClick={handleLinkClick}
          >
            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
            <span>{item.title}</span>
          </Link>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarContent className="p-2 gap-0">
      {sections.map((section, index) => {
        const sectionItems = navigationItemsToRender.filter(item => item.section === section);
        if (sectionItems.length === 0) return null;

        return (
          <SidebarGroup key={section} className={`p-0 ${index > 0 ? 'mt-3' : ''}`}>
            <SidebarGroupLabel className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-0 mb-0.5 h-auto group-data-[collapsible=icon]:hidden ${modoEscuro ? 'text-slate-400' : 'text-slate-400'}`}>
              {section}
            </SidebarGroupLabel>
            <SidebarGroupContent className="p-0 gap-0">
              <SidebarMenu className="gap-0">
                {sectionItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </SidebarContent>
  );
}

export default function Layout({ children, currentPageName }) {
  // Adiciona meta viewport para mobile
  useEffect(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout, loading: authLoading } = useAuth();
  const [configuracoes, setConfiguracoes] = useState(null);

  // Verificar se é admin baseado no cargo ou permissão específica
  const isAdmin = authUser?.cargo?.nome?.toLowerCase() === 'administrador' ||
                  authUser?.permissoes?.administrador_sistema === true;

  // Função auxiliar para verificar permissão
  const hasPermission = (permission) => {
    if (!authUser?.permissoes) return false;
    return authUser.permissoes[permission] === true;
  };

  useEffect(() => {
    loadConfiguracoes();

    // Listener para atualizar configurações quando salvas
    const handleConfigUpdate = () => {
      loadConfiguracoes();
    };

    window.addEventListener('configuracoes_atualizadas', handleConfigUpdate);
    return () => window.removeEventListener('configuracoes_atualizadas', handleConfigUpdate);
  }, []);

  const loadConfiguracoes = () => {
    const configSalva = localStorage.getItem('configuracoes_erp');
    if (configSalva) {
      try {
        setConfiguracoes(JSON.parse(configSalva));
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, redirecionar para login
      navigate('/login');
    }
  };

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isPDV = currentPageName === "PDV" || location.pathname.includes('/PDV');
  const modoEscuro = configuracoes?.sistema?.modo_escuro ?? false;

  // Filtrar itens baseado nas permissões do cargo do usuário
  const filteredNavigationItems = navigationItems.filter(item => {
    // Admin vê tudo
    if (isAdmin) return true;

    // Se não tem permissões definidas (array vazio), todos podem ver
    if (!item.permissions || item.permissions.length === 0) return true;

    // Verificar se usuário tem ALGUMA das permissões necessárias
    return item.permissions.some(perm => hasPermission(perm));
  });

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  const empresaNome = configuracoes?.empresa?.nome || "Smart Express";
  const empresaLogo = configuracoes?.empresa?.logo_url;

  return (
    <SidebarProvider defaultOpen={!isPDV}>
      <div className={`min-h-screen flex w-full ${modoEscuro ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
        {modoEscuro ? (
          <style>{`
            :root {
              --background: 222.2 84% 4.9%;
              --foreground: 210 40% 98%;
              --card: 222.2 84% 4.9%;
              --card-foreground: 210 40% 98%;
              --popover: 222.2 84% 4.9%;
              --popover-foreground: 210 40% 98%;
              --primary: 217.2 91.2% 59.8%;
              --primary-foreground: 222.2 47.4% 11.2%;
              --secondary: 217.2 32.6% 17.5%;
              --secondary-foreground: 210 40% 98%;
              --muted: 217.2 32.6% 17.5%;
              --muted-foreground: 215 20.2% 65.1%;
              --accent: 217.2 32.6% 17.5%;
              --accent-foreground: 210 40% 98%;
              --destructive: 0 62.8% 30.6%;
              --destructive-foreground: 210 40% 98%;
              --border: 217.2 32.6% 17.5%;
              --input: 217.2 32.6% 17.5%;
              --ring: 224.3 76.3% 48%;
            }
          `}</style>
        ) : null}
        
        <Sidebar className={`border-r ${modoEscuro ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} collapsible="icon">
          <SidebarHeader className="border-b border-slate-200 p-6 group-data-[collapsible=icon]:p-3">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              {empresaLogo ? (
                <img src={empresaLogo} alt={empresaNome} className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <h2 className="font-bold text-lg text-slate-900">{empresaNome}</h2>
                <p className="text-xs text-slate-500">Sistema de Gestão</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContentComponent navigationItemsToRender={filteredNavigationItems} modoEscuro={modoEscuro} />

          <SidebarFooter className="border-t border-slate-200 p-4 group-data-[collapsible=icon]:p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-50 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
                  <Avatar className="w-10 h-10 border-2 border-slate-200 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {getUserInitials(authUser?.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {authUser?.nome || authUser?.email?.split('@')[0] || "Usuário"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{authUser?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(createPageUrl("MeuPerfil"))}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className={`border-b px-4 sm:px-6 py-3 sticky top-0 z-10 ${modoEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors" />
                {empresaLogo ? (
                  <img src={empresaLogo} alt={empresaNome} className="h-8 w-auto object-contain hidden sm:block" />
                ) : (
                  <span className="font-bold text-lg text-slate-900 hidden sm:block">{empresaNome}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <SeletorLojaAtiva />
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificacoesRealTime />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>

      </div>
    </SidebarProvider>
  );
}
