import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Layout from "./Layout.jsx";
import Login from './Login';
import ProtectedRoute from '@/components/ProtectedRoute';

// Lazy loading: cada página é carregada sob demanda (code splitting)
const Dashboard = lazy(() => import("./Dashboard"));
const Clientes = lazy(() => import("./Clientes"));
const Produtos = lazy(() => import("./Produtos"));
const Caixa = lazy(() => import("./Caixa"));
const PDV = lazy(() => import("./PDV"));
const OrdensServico = lazy(() => import("./OrdensServico"));
const AvaliacaoSeminovo = lazy(() => import("./AvaliacaoSeminovo"));
const Relatorios = lazy(() => import("./Relatorios"));
const Configuracoes = lazy(() => import("./Configuracoes"));
const Marcas = lazy(() => import("./Marcas"));
const Fornecedores = lazy(() => import("./Fornecedores"));
const Categorias = lazy(() => import("./Categorias"));
const Usuarios = lazy(() => import("./Usuarios"));
const CalculadoraPagamentos = lazy(() => import("./CalculadoraPagamentos"));
const Aniversarios = lazy(() => import("./Aniversarios"));
const PosVenda = lazy(() => import("./PosVenda"));
const CuponsDesconto = lazy(() => import("./CuponsDesconto"));
const ContasReceber = lazy(() => import("./ContasReceber"));
const Etiquetas = lazy(() => import("./Etiquetas"));
const Integracoes = lazy(() => import("./Integracoes"));
const ContasPagar = lazy(() => import("./ContasPagar"));
const FluxoCaixa = lazy(() => import("./FluxoCaixa"));
const CentroCustos = lazy(() => import("./CentroCustos"));
const DRE = lazy(() => import("./DRE"));
const RelatorioEstoque = lazy(() => import("./RelatorioEstoque"));
const RelatorioOS = lazy(() => import("./RelatorioOS"));
const RelatorioClientes = lazy(() => import("./RelatorioClientes"));
const RelatorioFinanceiro = lazy(() => import("./RelatorioFinanceiro"));
const RelatorioComissoes = lazy(() => import("./RelatorioComissoes"));
const Fiscal = lazy(() => import("./Fiscal"));
const MovimentacaoFinanceira = lazy(() => import("./MovimentacaoFinanceira"));
const ConciliacaoBancaria = lazy(() => import("./ConciliacaoBancaria"));
const RelatorioSeminovos = lazy(() => import("./RelatorioSeminovos"));
const RelatorioFiscal = lazy(() => import("./RelatorioFiscal"));
const NFe = lazy(() => import("./NFe"));
const NFCe = lazy(() => import("./NFCe"));
const Logs = lazy(() => import("./Logs"));
const MetasAprimorado = lazy(() => import("./MetasAprimorado"));
const Metas = lazy(() => import("./Metas"));
const AgendaCompleta = lazy(() => import("./AgendaCompleta"));
const Agenda = lazy(() => import("./Agenda"));
const Marketplace = lazy(() => import("./Marketplace"));
const Carrinho = lazy(() => import("./Carrinho"));
const ContasRecorrentes = lazy(() => import("./ContasRecorrentes"));
const Compras = lazy(() => import("./Compras"));
const Devolucoes = lazy(() => import("./Devolucoes"));
const ContasBancarias = lazy(() => import("./ContasBancarias"));
const Comissoes = lazy(() => import("./Comissoes"));
const AnalisesCurvaABC = lazy(() => import("./AnalisesCurvaABC"));
const ChatbotConfig = lazy(() => import("./ChatbotConfig"));
const AdmWhatsApp = lazy(() => import("./AdmWhatsApp"));
const MultiLojas = lazy(() => import("./MultiLojas"));
const Previsoes = lazy(() => import("./Previsoes"));
const RentabilidadeLoja = lazy(() => import("./RentabilidadeLoja"));
const CRM = lazy(() => import("./CRM"));
const Tabela = lazy(() => import("./Tabela"));

const Marketing = lazy(() => import("./Marketing"));
const Financeiro = lazy(() => import("./Financeiro"));
const MeuPerfil = lazy(() => import("./MeuPerfil"));

const PAGES = {
    Dashboard, Clientes, Produtos, Caixa, PDV, OrdensServico, AvaliacaoSeminovo,
    Relatorios, Configuracoes, Marcas, Fornecedores, Categorias, Usuarios,
    CalculadoraPagamentos, Aniversarios, PosVenda, CuponsDesconto, ContasReceber,
    Etiquetas, Integracoes, ContasPagar, FluxoCaixa, CentroCustos, DRE,
    RelatorioEstoque, RelatorioOS, RelatorioClientes, RelatorioFinanceiro,
    RelatorioComissoes, Fiscal, MovimentacaoFinanceira, ConciliacaoBancaria,
    RelatorioSeminovos, RelatorioFiscal, NFe, NFCe, Logs, MetasAprimorado, Metas,
    AgendaCompleta, Agenda, Marketplace, Carrinho, ContasRecorrentes, Compras,
    Devolucoes, ContasBancarias, Comissoes, AnalisesCurvaABC, ChatbotConfig,
    AdmWhatsApp, MultiLojas, Previsoes, RentabilidadeLoja, CRM, Tabela,
    Marketing, Financeiro, MeuPerfil,
};

// Fallback de loading enquanto o chunk carrega
function PageLoader() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
    );
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Rotas abertas para todos os usuários logados */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/Dashboard" element={<Dashboard />} />
                    <Route path="/PDV" element={<PDV />} />
                    <Route path="/MeuPerfil" element={<MeuPerfil />} />

                    {/* Rotas do vendedor (requerem permissão específica) */}
                    <Route path="/Clientes" element={<ProtectedRoute requiredPermission="gerenciar_clientes"><Clientes /></ProtectedRoute>} />
                    <Route path="/Produtos" element={<ProtectedRoute requiredPermission={["gerenciar_estoque", "gerenciar_produtos"]}><Produtos /></ProtectedRoute>} />
                    <Route path="/Marcas" element={<ProtectedRoute requiredPermission={["gerenciar_estoque", "gerenciar_produtos"]}><Marcas /></ProtectedRoute>} />
                    <Route path="/Categorias" element={<ProtectedRoute requiredPermission={["gerenciar_estoque", "gerenciar_produtos"]}><Categorias /></ProtectedRoute>} />
                    <Route path="/Etiquetas" element={<ProtectedRoute requiredPermission="acessar_etiquetas"><Etiquetas /></ProtectedRoute>} />
                    <Route path="/OrdensServico" element={<ProtectedRoute requiredPermission={["gerenciar_os", "criar_os"]}><OrdensServico /></ProtectedRoute>} />
                    <Route path="/AvaliacaoSeminovo" element={<ProtectedRoute requiredPermission="avaliar_seminovos"><AvaliacaoSeminovo /></ProtectedRoute>} />
                    <Route path="/Tabela" element={<ProtectedRoute requiredPermission="realizar_vendas"><Tabela /></ProtectedRoute>} />
                    <Route path="/CalculadoraPagamentos" element={<ProtectedRoute requiredPermission="realizar_vendas"><CalculadoraPagamentos /></ProtectedRoute>} />

                    {/* Caixa */}
                    <Route path="/Caixa" element={<ProtectedRoute requiredPermission={["gerenciar_caixa", "abrir_fechar_caixa"]}><Caixa /></ProtectedRoute>} />

                    {/* Agenda */}
                    <Route path="/Agenda" element={<ProtectedRoute requiredPermission="acessar_agenda"><Agenda /></ProtectedRoute>} />
                    <Route path="/AgendaCompleta" element={<ProtectedRoute requiredPermission="acessar_agenda"><AgendaCompleta /></ProtectedRoute>} />

                    {/* Metas */}
                    <Route path="/Metas" element={<ProtectedRoute requiredPermission="acessar_metas"><Metas /></ProtectedRoute>} />
                    <Route path="/MetasAprimorado" element={<ProtectedRoute requiredPermission="acessar_metas"><MetasAprimorado /></ProtectedRoute>} />

                    {/* Financeiro - requer visualizar_custos */}
                    <Route path="/Financeiro" element={<ProtectedRoute requiredPermission="visualizar_custos"><Financeiro /></ProtectedRoute>} />
                    <Route path="/ContasReceber" element={<ProtectedRoute requiredPermission="visualizar_custos"><ContasReceber /></ProtectedRoute>} />
                    <Route path="/ContasPagar" element={<ProtectedRoute requiredPermission="visualizar_custos"><ContasPagar /></ProtectedRoute>} />
                    <Route path="/ContasRecorrentes" element={<ProtectedRoute requiredPermission="visualizar_custos"><ContasRecorrentes /></ProtectedRoute>} />
                    <Route path="/ContasBancarias" element={<ProtectedRoute requiredPermission="visualizar_custos"><ContasBancarias /></ProtectedRoute>} />
                    <Route path="/FluxoCaixa" element={<ProtectedRoute requiredPermission="visualizar_custos"><FluxoCaixa /></ProtectedRoute>} />
                    <Route path="/CentroCustos" element={<ProtectedRoute requiredPermission="visualizar_custos"><CentroCustos /></ProtectedRoute>} />
                    <Route path="/DRE" element={<ProtectedRoute requiredPermission="visualizar_custos"><DRE /></ProtectedRoute>} />
                    <Route path="/MovimentacaoFinanceira" element={<ProtectedRoute requiredPermission="visualizar_custos"><MovimentacaoFinanceira /></ProtectedRoute>} />
                    <Route path="/ConciliacaoBancaria" element={<ProtectedRoute requiredPermission="visualizar_custos"><ConciliacaoBancaria /></ProtectedRoute>} />
                    <Route path="/Previsoes" element={<ProtectedRoute requiredPermission="visualizar_custos"><Previsoes /></ProtectedRoute>} />
                    <Route path="/RentabilidadeLoja" element={<ProtectedRoute requiredPermission="visualizar_custos"><RentabilidadeLoja /></ProtectedRoute>} />

                    {/* Relatórios */}
                    <Route path="/Relatorios" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><Relatorios /></ProtectedRoute>} />
                    <Route path="/RelatorioEstoque" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><RelatorioEstoque /></ProtectedRoute>} />
                    <Route path="/RelatorioOS" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><RelatorioOS /></ProtectedRoute>} />
                    <Route path="/RelatorioClientes" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><RelatorioClientes /></ProtectedRoute>} />
                    <Route path="/RelatorioFinanceiro" element={<ProtectedRoute requiredPermission="visualizar_custos"><RelatorioFinanceiro /></ProtectedRoute>} />
                    <Route path="/RelatorioComissoes" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><RelatorioComissoes /></ProtectedRoute>} />
                    <Route path="/RelatorioSeminovos" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><RelatorioSeminovos /></ProtectedRoute>} />
                    <Route path="/RelatorioFiscal" element={<ProtectedRoute requiredPermission="visualizar_custos"><RelatorioFiscal /></ProtectedRoute>} />
                    <Route path="/AnalisesCurvaABC" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><AnalisesCurvaABC /></ProtectedRoute>} />

                    {/* Fiscal */}
                    <Route path="/Fiscal" element={<ProtectedRoute requiredPermission="visualizar_custos"><Fiscal /></ProtectedRoute>} />
                    <Route path="/NFe" element={<ProtectedRoute requiredPermission="visualizar_custos"><NFe /></ProtectedRoute>} />
                    <Route path="/NFCe" element={<ProtectedRoute requiredPermission="visualizar_custos"><NFCe /></ProtectedRoute>} />

                    {/* Fornecedores e Compras */}
                    <Route path="/Fornecedores" element={<ProtectedRoute requiredPermission="gerenciar_fornecedores"><Fornecedores /></ProtectedRoute>} />
                    <Route path="/Compras" element={<ProtectedRoute requiredPermission="gerenciar_fornecedores"><Compras /></ProtectedRoute>} />

                    {/* CRM e Marketing */}
                    <Route path="/CRM" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><CRM /></ProtectedRoute>} />
                    <Route path="/Aniversarios" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><Aniversarios /></ProtectedRoute>} />
                    <Route path="/PosVenda" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><PosVenda /></ProtectedRoute>} />
                    <Route path="/Marketing" element={<ProtectedRoute requiredPermission="acessar_integracoes"><Marketing /></ProtectedRoute>} />
                    <Route path="/CuponsDesconto" element={<ProtectedRoute requiredPermission="acessar_configuracoes"><CuponsDesconto /></ProtectedRoute>} />

                    {/* Comissões e Devoluções */}
                    <Route path="/Comissoes" element={<ProtectedRoute requiredPermission={["visualizar_relatorios", "acessar_relatorios"]}><Comissoes /></ProtectedRoute>} />
                    <Route path="/Devolucoes" element={<ProtectedRoute requiredPermission="cancelar_vendas"><Devolucoes /></ProtectedRoute>} />

                    {/* Administração */}
                    <Route path="/Configuracoes" element={<ProtectedRoute requiredPermission="acessar_configuracoes"><Configuracoes /></ProtectedRoute>} />
                    <Route path="/Usuarios" element={<ProtectedRoute requiredPermission="gerenciar_usuarios"><Usuarios /></ProtectedRoute>} />
                    <Route path="/Logs" element={<ProtectedRoute requiredPermission="acessar_logs"><Logs /></ProtectedRoute>} />
                    <Route path="/Integracoes" element={<ProtectedRoute requiredPermission="acessar_integracoes"><Integracoes /></ProtectedRoute>} />
                    <Route path="/ChatbotConfig" element={<ProtectedRoute requiredPermission="acessar_integracoes"><ChatbotConfig /></ProtectedRoute>} />
                    <Route path="/AdmWhatsApp" element={<ProtectedRoute requiredPermission="acessar_integracoes"><AdmWhatsApp /></ProtectedRoute>} />
                    <Route path="/MultiLojas" element={<ProtectedRoute requiredPermission="acesso_multilojas"><MultiLojas /></ProtectedRoute>} />

                    {/* Marketplace */}
                    <Route path="/Marketplace" element={<Marketplace />} />
                    <Route path="/Carrinho" element={<Carrinho />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <PagesContent />
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}
