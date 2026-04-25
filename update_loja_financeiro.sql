-- 1. Adicionar loja_id nas tabelas secundárias e financeiras
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE devolucao ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE conta_pagar ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE conta_receber ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE conta_bancaria ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE compra ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE comissao ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE log_desconto ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE log_auditoria ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE cupom_desconto ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);
ALTER TABLE movimentacao_caixa ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

-- 2. Atribuir todo o histórico atual à loja Matriz (para não perder dados e garantir que a Kelly não os veja)
UPDATE movimentacao_estoque SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE devolucao SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE conta_pagar SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE conta_receber SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE conta_bancaria SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE compra SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE comissao SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE log_desconto SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE log_auditoria SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE cupom_desconto SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
UPDATE movimentacao_caixa SET loja_id = '27f2a674-d319-4729-8674-0d9ed0f1ec30' WHERE loja_id IS NULL;
