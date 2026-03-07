-- Schema para SmartExpress no Supabase
-- Execute este SQL no SQL Editor do Supabase

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TABELAS PRINCIPAIS
-- =====================

-- Cargos
CREATE TABLE IF NOT EXISTS cargo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  permissoes JSONB DEFAULT '[]',
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuários do Sistema
CREATE TABLE IF NOT EXISTS usuario (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  cargo_id UUID REFERENCES cargo(id),
  ativo BOOLEAN DEFAULT true,
  foto_url TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_sistema (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  cargo VARCHAR(100),
  permissoes JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS cliente (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  tipo_pessoa VARCHAR(10) DEFAULT 'fisica',
  telefone1 VARCHAR(20),
  telefone2 VARCHAR(20),
  email VARCHAR(255),
  data_nascimento DATE,
  endereco JSONB DEFAULT '{}',
  fonte VARCHAR(50) DEFAULT 'loja_fisica',
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marcas
CREATE TABLE IF NOT EXISTS marca (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  logo_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS fornecedor (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco JSONB DEFAULT '{}',
  contato VARCHAR(255),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorias
CREATE TABLE IF NOT EXISTS categoria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7),
  icone VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Famílias de produtos
CREATE TABLE IF NOT EXISTS familia (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria_id UUID REFERENCES categoria(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produto (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku VARCHAR(100) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  categoria_id UUID REFERENCES categoria(id),
  marca_nome VARCHAR(255),
  marca_id UUID REFERENCES marca(id),
  preco_custo DECIMAL(10,2) DEFAULT 0,
  preco_venda DECIMAL(10,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  fornecedor_nome VARCHAR(255),
  fornecedor_id UUID REFERENCES fornecedor(id),
  imagem_url TEXT,
  codigo_barras VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentação de Estoque
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  produto_id UUID REFERENCES produto(id),
  tipo VARCHAR(20) NOT NULL, -- entrada, saida, ajuste
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  usuario_id UUID REFERENCES usuario(id),
  data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Caixa
CREATE TABLE IF NOT EXISTS caixa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  valor_abertura DECIMAL(10,2) DEFAULT 0,
  valor_fechamento DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'aberto',
  usuario_abertura_id UUID REFERENCES usuario(id),
  usuario_fechamento_id UUID REFERENCES usuario(id),
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimentação de Caixa
CREATE TABLE IF NOT EXISTS movimentacao_caixa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  caixa_id UUID REFERENCES caixa(id),
  tipo VARCHAR(20) NOT NULL, -- entrada, saida, sangria, suprimento
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  forma_pagamento VARCHAR(50),
  usuario_id UUID REFERENCES usuario(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS venda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero VARCHAR(50),
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  vendedor_id UUID REFERENCES usuario(id),
  vendedor_nome VARCHAR(255),
  caixa_id UUID REFERENCES caixa(id),
  itens JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  forma_pagamento VARCHAR(50),
  pagamentos JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'finalizada',
  observacoes TEXT,
  data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ordens de Serviço
CREATE TABLE IF NOT EXISTS ordem_servico (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero VARCHAR(50),
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  equipamento JSONB DEFAULT '{}',
  problema_relatado TEXT,
  diagnostico TEXT,
  solucao TEXT,
  pecas JSONB DEFAULT '[]',
  servicos JSONB DEFAULT '[]',
  valor_pecas DECIMAL(10,2) DEFAULT 0,
  valor_servicos DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'aguardando',
  prioridade VARCHAR(20) DEFAULT 'normal',
  tecnico_id UUID REFERENCES usuario(id),
  tecnico_nome VARCHAR(255),
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_previsao TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avaliação de Seminovos
CREATE TABLE IF NOT EXISTS avaliacao_seminovo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  equipamento JSONB DEFAULT '{}',
  condicao_geral VARCHAR(20),
  itens_avaliacao JSONB DEFAULT '{}',
  fotos JSONB DEFAULT '[]',
  valor_avaliado DECIMAL(10,2),
  valor_oferecido DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'pendente',
  avaliador_id UUID REFERENCES usuario(id),
  avaliador_nome VARCHAR(255),
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Display Seminovo
CREATE TABLE IF NOT EXISTS display_seminovo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  avaliacao_id UUID REFERENCES avaliacao_seminovo(id),
  produto_id UUID REFERENCES produto(id),
  preco_venda DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'disponivel',
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de Auditoria
CREATE TABLE IF NOT EXISTS log_auditoria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id VARCHAR(255),
  usuario_nome VARCHAR(255),
  acao VARCHAR(50) NOT NULL,
  recurso VARCHAR(100) NOT NULL,
  recurso_id VARCHAR(255),
  descricao TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  ip_address VARCHAR(50),
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de Desconto
CREATE TABLE IF NOT EXISTS log_desconto (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venda_id UUID REFERENCES venda(id),
  usuario_id UUID REFERENCES usuario(id),
  usuario_nome VARCHAR(255),
  valor_desconto DECIMAL(10,2),
  percentual_desconto DECIMAL(5,2),
  motivo TEXT,
  aprovador_id UUID REFERENCES usuario(id),
  aprovador_nome VARCHAR(255),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações
CREATE TABLE IF NOT EXISTS configuracao (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chave VARCHAR(255) UNIQUE NOT NULL,
  valor JSONB,
  descricao TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cupons de Desconto
CREATE TABLE IF NOT EXISTS cupom_desconto (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) DEFAULT 'percentual', -- percentual, valor_fixo
  valor DECIMAL(10,2) NOT NULL,
  valor_minimo DECIMAL(10,2) DEFAULT 0,
  uso_maximo INTEGER,
  uso_atual INTEGER DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a Receber
CREATE TABLE IF NOT EXISTS conta_receber (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  venda_id UUID REFERENCES venda(id),
  valor DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a Pagar
CREATE TABLE IF NOT EXISTS conta_pagar (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  fornecedor_id UUID REFERENCES fornecedor(id),
  fornecedor_nome VARCHAR(255),
  compra_id UUID,
  valor DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  categoria VARCHAR(100),
  centro_custo VARCHAR(100),
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eventos (Agenda)
CREATE TABLE IF NOT EXISTS evento (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE,
  tipo VARCHAR(50),
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  usuario_id UUID REFERENCES usuario(id),
  cor VARCHAR(7),
  lembrete BOOLEAN DEFAULT false,
  lembrete_minutos INTEGER,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas Recorrentes
CREATE TABLE IF NOT EXISTS conta_recorrente (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- pagar, receber
  valor DECIMAL(10,2) NOT NULL,
  dia_vencimento INTEGER,
  frequencia VARCHAR(20) DEFAULT 'mensal',
  categoria VARCHAR(100),
  centro_custo VARCHAR(100),
  fornecedor_id UUID REFERENCES fornecedor(id),
  cliente_id UUID REFERENCES cliente(id),
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compras
CREATE TABLE IF NOT EXISTS compra (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero VARCHAR(50),
  fornecedor_id UUID REFERENCES fornecedor(id),
  fornecedor_nome VARCHAR(255),
  itens JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  frete DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente',
  data_compra DATE,
  data_entrega DATE,
  nota_fiscal VARCHAR(100),
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devoluções
CREATE TABLE IF NOT EXISTS devolucao (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venda_id UUID REFERENCES venda(id),
  cliente_id UUID REFERENCES cliente(id),
  cliente_nome VARCHAR(255),
  itens JSONB DEFAULT '[]',
  valor_total DECIMAL(10,2) DEFAULT 0,
  motivo TEXT,
  tipo_reembolso VARCHAR(20), -- dinheiro, credito, troca
  status VARCHAR(20) DEFAULT 'pendente',
  usuario_id UUID REFERENCES usuario(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas Bancárias
CREATE TABLE IF NOT EXISTS conta_bancaria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  banco VARCHAR(100),
  agencia VARCHAR(20),
  numero_conta VARCHAR(30),
  tipo VARCHAR(20) DEFAULT 'corrente',
  saldo_inicial DECIMAL(10,2) DEFAULT 0,
  saldo_atual DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transferências entre contas
CREATE TABLE IF NOT EXISTS transferencia (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conta_origem_id UUID REFERENCES conta_bancaria(id),
  conta_destino_id UUID REFERENCES conta_bancaria(id),
  valor DECIMAL(10,2) NOT NULL,
  data_transferencia DATE NOT NULL,
  descricao TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comissões
CREATE TABLE IF NOT EXISTS comissao (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendedor_id UUID REFERENCES usuario(id),
  vendedor_nome VARCHAR(255),
  venda_id UUID REFERENCES venda(id),
  valor_venda DECIMAL(10,2),
  percentual DECIMAL(5,2),
  valor_comissao DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pendente',
  data_pagamento DATE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações do Chatbot
CREATE TABLE IF NOT EXISTS chatbot_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255),
  mensagem_boas_vindas TEXT,
  respostas_automaticas JSONB DEFAULT '[]',
  horario_funcionamento JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversas WhatsApp
CREATE TABLE IF NOT EXISTS conversa_whats_app (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES cliente(id),
  telefone VARCHAR(20),
  nome_contato VARCHAR(255),
  ultima_mensagem TEXT,
  ultima_data TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'aberta',
  pasta_id UUID,
  etiquetas JSONB DEFAULT '[]',
  atendente_id UUID REFERENCES usuario(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastas WhatsApp
CREATE TABLE IF NOT EXISTS pasta_whats_app (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7),
  ordem INTEGER DEFAULT 0,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Etiquetas WhatsApp
CREATE TABLE IF NOT EXISTS etiqueta_whats_app (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config WhatsApp
CREATE TABLE IF NOT EXISTS config_whats_app (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  api_key VARCHAR(255),
  instance_id VARCHAR(255),
  webhook_url TEXT,
  ativo BOOLEAN DEFAULT false,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backups do Sistema
CREATE TABLE IF NOT EXISTS backup_sistema (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255),
  tamanho BIGINT,
  url TEXT,
  status VARCHAR(20) DEFAULT 'pendente',
  usuario_id UUID REFERENCES usuario(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notificações
CREATE TABLE IF NOT EXISTS notificacao (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuario(id),
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  tipo VARCHAR(50),
  lida BOOLEAN DEFAULT false,
  link TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lojas (Multi-lojas)
CREATE TABLE IF NOT EXISTS loja (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  endereco JSONB DEFAULT '{}',
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progresso do Tutorial
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuario(id),
  tutorial_id VARCHAR(100),
  etapa_atual INTEGER DEFAULT 0,
  concluido BOOLEAN DEFAULT false,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Previsões de Venda
CREATE TABLE IF NOT EXISTS previsao_venda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  periodo DATE,
  valor_previsto DECIMAL(10,2),
  valor_realizado DECIMAL(10,2),
  categoria VARCHAR(100),
  produto_id UUID REFERENCES produto(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transferência de Estoque (entre lojas)
CREATE TABLE IF NOT EXISTS transferencia_estoque (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loja_origem_id UUID REFERENCES loja(id),
  loja_destino_id UUID REFERENCES loja(id),
  produto_id UUID REFERENCES produto(id),
  quantidade INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  usuario_id UUID REFERENCES usuario(id),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_recebimento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads CRM
CREATE TABLE IF NOT EXISTS lead_crm (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  empresa VARCHAR(255),
  origem VARCHAR(100),
  status VARCHAR(30) DEFAULT 'novo',
  valor_potencial DECIMAL(10,2),
  responsavel_id UUID REFERENCES usuario(id),
  responsavel_nome VARCHAR(255),
  ultima_interacao TIMESTAMP WITH TIME ZONE,
  proxima_acao TEXT,
  data_proxima_acao DATE,
  notas TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_cliente_cpf_cnpj ON cliente(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_cliente_nome ON cliente(nome_completo);
CREATE INDEX IF NOT EXISTS idx_produto_sku ON produto(sku);
CREATE INDEX IF NOT EXISTS idx_produto_nome ON produto(nome);
CREATE INDEX IF NOT EXISTS idx_venda_data ON venda(data_venda);
CREATE INDEX IF NOT EXISTS idx_venda_cliente ON venda(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordem_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordem_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conta_receber_vencimento ON conta_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_conta_pagar_vencimento ON conta_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_log_auditoria_data ON log_auditoria(data_hora);

-- =====================
-- ROW LEVEL SECURITY (opcional)
-- =====================
-- Habilitar RLS nas tabelas principais
-- ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE produto ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE venda ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (exemplo - ajuste conforme necessário)
-- CREATE POLICY "Usuários autenticados podem ver clientes"
--   ON cliente FOR SELECT
--   TO authenticated
--   USING (true);

-- =====================
-- STORAGE BUCKETS
-- =====================
-- Execute no Supabase Dashboard > Storage
-- Criar buckets: uploads, private

-- =====================
-- DADOS INICIAIS (opcional)
-- =====================

-- Categorias padrão
INSERT INTO categoria (nome, descricao, cor) VALUES
  ('Celular', 'Smartphones e celulares', '#3B82F6'),
  ('Acessório', 'Acessórios para celular', '#10B981'),
  ('Peça', 'Peças de reposição', '#F59E0B'),
  ('Serviço', 'Serviços de reparo', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- Cargo padrão
INSERT INTO cargo (nome, descricao, permissoes) VALUES
  ('Administrador', 'Acesso total ao sistema', '["*"]'),
  ('Vendedor', 'Acesso a vendas e clientes', '["vendas", "clientes", "produtos"]'),
  ('Técnico', 'Acesso a ordens de serviço', '["os", "clientes", "produtos"]')
ON CONFLICT DO NOTHING;
