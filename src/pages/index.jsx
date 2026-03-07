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
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/Clientes" element={<Clientes />} />
                <Route path="/Produtos" element={<Produtos />} />
                <Route path="/Caixa" element={<Caixa />} />
                <Route path="/PDV" element={<PDV />} />
                <Route path="/OrdensServico" element={<OrdensServico />} />
                <Route path="/AvaliacaoSeminovo" element={<AvaliacaoSeminovo />} />
                <Route path="/Relatorios" element={<Relatorios />} />
                <Route path="/Configuracoes" element={<Configuracoes />} />
                <Route path="/Marcas" element={<Marcas />} />
                <Route path="/Fornecedores" element={<Fornecedores />} />
                <Route path="/Categorias" element={<Categorias />} />
                <Route path="/Usuarios" element={<Usuarios />} />
                <Route path="/CalculadoraPagamentos" element={<CalculadoraPagamentos />} />
                <Route path="/Aniversarios" element={<Aniversarios />} />
                <Route path="/PosVenda" element={<PosVenda />} />
                <Route path="/CuponsDesconto" element={<CuponsDesconto />} />
                <Route path="/ContasReceber" element={<ContasReceber />} />
                <Route path="/Etiquetas" element={<Etiquetas />} />
                <Route path="/Integracoes" element={<Integracoes />} />
                <Route path="/ContasPagar" element={<ContasPagar />} />
                <Route path="/FluxoCaixa" element={<FluxoCaixa />} />
                <Route path="/CentroCustos" element={<CentroCustos />} />
                <Route path="/DRE" element={<DRE />} />
                <Route path="/RelatorioEstoque" element={<RelatorioEstoque />} />
                <Route path="/RelatorioOS" element={<RelatorioOS />} />
                <Route path="/RelatorioClientes" element={<RelatorioClientes />} />
                <Route path="/RelatorioFinanceiro" element={<RelatorioFinanceiro />} />
                <Route path="/RelatorioComissoes" element={<RelatorioComissoes />} />
                <Route path="/Fiscal" element={<Fiscal />} />
                <Route path="/MovimentacaoFinanceira" element={<MovimentacaoFinanceira />} />
                <Route path="/ConciliacaoBancaria" element={<ConciliacaoBancaria />} />
                <Route path="/RelatorioSeminovos" element={<RelatorioSeminovos />} />
                <Route path="/RelatorioFiscal" element={<RelatorioFiscal />} />
                <Route path="/NFe" element={<NFe />} />
                <Route path="/NFCe" element={<NFCe />} />
                <Route path="/Logs" element={<Logs />} />
                <Route path="/MetasAprimorado" element={<MetasAprimorado />} />
                <Route path="/Metas" element={<Metas />} />
                <Route path="/AgendaCompleta" element={<AgendaCompleta />} />
                <Route path="/Agenda" element={<Agenda />} />
                <Route path="/Marketplace" element={<Marketplace />} />
                <Route path="/Carrinho" element={<Carrinho />} />
                <Route path="/ContasRecorrentes" element={<ContasRecorrentes />} />
                <Route path="/Compras" element={<Compras />} />
                <Route path="/Devolucoes" element={<Devolucoes />} />
                <Route path="/ContasBancarias" element={<ContasBancarias />} />
                <Route path="/Comissoes" element={<Comissoes />} />
                <Route path="/AnalisesCurvaABC" element={<AnalisesCurvaABC />} />
                <Route path="/ChatbotConfig" element={<ChatbotConfig />} />
                <Route path="/AdmWhatsApp" element={<AdmWhatsApp />} />
                <Route path="/MultiLojas" element={<MultiLojas />} />
                <Route path="/Previsoes" element={<Previsoes />} />
                <Route path="/RentabilidadeLoja" element={<RentabilidadeLoja />} />
                <Route path="/CRM" element={<CRM />} />
                <Route path="/ConfiguracaoCupom" element={<ConfiguracaoCupom />} />
                <Route path="/Marketing" element={<Marketing />} />
                <Route path="/Financeiro" element={<Financeiro />} />
                <Route path="/MeuPerfil" element={<MeuPerfil />} />
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