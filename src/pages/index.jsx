import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Clientes from "./Clientes";

import Produtos from "./Produtos";

import Caixa from "./Caixa";

import PDV from "./PDV";

import OrdensServico from "./OrdensServico";

import AvaliacaoSeminovo from "./AvaliacaoSeminovo";

import Relatorios from "./Relatorios";

import Configuracoes from "./Configuracoes";

import Marcas from "./Marcas";

import Fornecedores from "./Fornecedores";

import Categorias from "./Categorias";

import Usuarios from "./Usuarios";

import CalculadoraPagamentos from "./CalculadoraPagamentos";

import Aniversarios from "./Aniversarios";

import PosVenda from "./PosVenda";

import CuponsDesconto from "./CuponsDesconto";

import ContasReceber from "./ContasReceber";

import Etiquetas from "./Etiquetas";

import Integracoes from "./Integracoes";

import ContasPagar from "./ContasPagar";

import FluxoCaixa from "./FluxoCaixa";

import CentroCustos from "./CentroCustos";

import DRE from "./DRE";

import RelatorioEstoque from "./RelatorioEstoque";

import RelatorioOS from "./RelatorioOS";

import RelatorioClientes from "./RelatorioClientes";

import RelatorioFinanceiro from "./RelatorioFinanceiro";

import RelatorioComissoes from "./RelatorioComissoes";

import Fiscal from "./Fiscal";

import MovimentacaoFinanceira from "./MovimentacaoFinanceira";

import ConciliacaoBancaria from "./ConciliacaoBancaria";

import RelatorioSeminovos from "./RelatorioSeminovos";

import RelatorioFiscal from "./RelatorioFiscal";

import NFe from "./NFe";

import NFCe from "./NFCe";

import Logs from "./Logs";

import MetasAprimorado from "./MetasAprimorado";

import Metas from "./Metas";

import AgendaCompleta from "./AgendaCompleta";

import Agenda from "./Agenda";

import Marketplace from "./Marketplace";

import Carrinho from "./Carrinho";

import ContasRecorrentes from "./ContasRecorrentes";

import Compras from "./Compras";

import Devolucoes from "./Devolucoes";

import ContasBancarias from "./ContasBancarias";

import Comissoes from "./Comissoes";

import AnalisesCurvaABC from "./AnalisesCurvaABC";

import ChatbotConfig from "./ChatbotConfig";

import AdmWhatsApp from "./AdmWhatsApp";

import MultiLojas from "./MultiLojas";

import Previsoes from "./Previsoes";

import RentabilidadeLoja from "./RentabilidadeLoja";

import CRM from "./CRM";

import ConfiguracaoCupom from "./ConfiguracaoCupom";

import Marketing from "./Marketing";

import Financeiro from "./Financeiro";

import MeuPerfil from "./MeuPerfil";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Login from './Login';
import ProtectedRoute from '@/components/ProtectedRoute';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Clientes: Clientes,
    
    Produtos: Produtos,
    
    Caixa: Caixa,
    
    PDV: PDV,
    
    OrdensServico: OrdensServico,
    
    AvaliacaoSeminovo: AvaliacaoSeminovo,
    
    Relatorios: Relatorios,
    
    Configuracoes: Configuracoes,
    
    Marcas: Marcas,
    
    Fornecedores: Fornecedores,
    
    Categorias: Categorias,
    
    Usuarios: Usuarios,
    
    CalculadoraPagamentos: CalculadoraPagamentos,
    
    Aniversarios: Aniversarios,
    
    PosVenda: PosVenda,
    
    CuponsDesconto: CuponsDesconto,
    
    ContasReceber: ContasReceber,
    
    Etiquetas: Etiquetas,
    
    Integracoes: Integracoes,
    
    ContasPagar: ContasPagar,
    
    FluxoCaixa: FluxoCaixa,
    
    CentroCustos: CentroCustos,
    
    DRE: DRE,
    
    RelatorioEstoque: RelatorioEstoque,
    
    RelatorioOS: RelatorioOS,
    
    RelatorioClientes: RelatorioClientes,
    
    RelatorioFinanceiro: RelatorioFinanceiro,
    
    RelatorioComissoes: RelatorioComissoes,
    
    Fiscal: Fiscal,
    
    MovimentacaoFinanceira: MovimentacaoFinanceira,
    
    ConciliacaoBancaria: ConciliacaoBancaria,
    
    RelatorioSeminovos: RelatorioSeminovos,
    
    RelatorioFiscal: RelatorioFiscal,
    
    NFe: NFe,
    
    NFCe: NFCe,
    
    Logs: Logs,
    
    MetasAprimorado: MetasAprimorado,
    
    Metas: Metas,
    
    AgendaCompleta: AgendaCompleta,
    
    Agenda: Agenda,
    
    Marketplace: Marketplace,
    
    Carrinho: Carrinho,
    
    ContasRecorrentes: ContasRecorrentes,
    
    Compras: Compras,
    
    Devolucoes: Devolucoes,
    
    ContasBancarias: ContasBancarias,
    
    Comissoes: Comissoes,
    
    AnalisesCurvaABC: AnalisesCurvaABC,
    
    ChatbotConfig: ChatbotConfig,
    
    AdmWhatsApp: AdmWhatsApp,
    
    MultiLojas: MultiLojas,
    
    Previsoes: Previsoes,
    
    RentabilidadeLoja: RentabilidadeLoja,
    
    CRM: CRM,

    ConfiguracaoCupom: ConfiguracaoCupom,

    Marketing: Marketing,

    Financeiro: Financeiro,

    MeuPerfil: MeuPerfil,

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
                <Route path="/ConfiguracaoCupom" element={<ProtectedRoute requiredPermission="acessar_configuracoes"><ConfiguracaoCupom /></ProtectedRoute>} />

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