-- =====================================================================
-- MIGRATION: Add loja_id to tables missing multi-tenant isolation
-- Execute this in the Supabase SQL Editor
-- Date: 2026-04-24
-- =====================================================================

-- 1. movimentacao_caixa: linked to caixa which already has loja_id
--    Adding loja_id for direct filtering without JOIN
ALTER TABLE movimentacao_caixa
  ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

CREATE INDEX IF NOT EXISTS idx_movimentacao_caixa_loja ON movimentacao_caixa(loja_id);

-- 2. avaliacao_seminovo: needs loja scoping
ALTER TABLE avaliacao_seminovo
  ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

CREATE INDEX IF NOT EXISTS idx_avaliacao_seminovo_loja ON avaliacao_seminovo(loja_id);

-- 3. evento (agenda): needs loja scoping
ALTER TABLE evento
  ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

CREATE INDEX IF NOT EXISTS idx_evento_loja ON evento(loja_id);

-- 4. Ensure venda has loja_id (may already exist, safe to run)
ALTER TABLE venda
  ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

CREATE INDEX IF NOT EXISTS idx_venda_loja ON venda(loja_id);

-- =====================================================================
-- BACKFILL: After running the migration, run this to assign orphan
-- records to the Matriz store (id: 27f2a674-d319-4729-8674-0d9ed0f1ec30)
-- IMPORTANT: Replace the UUID below if your Matriz has a different ID.
-- =====================================================================

-- DO $$
-- DECLARE
--   MATRIZ_ID UUID := '27f2a674-d319-4729-8674-0d9ed0f1ec30';
-- BEGIN
--   UPDATE movimentacao_caixa SET loja_id = MATRIZ_ID WHERE loja_id IS NULL;
--   UPDATE avaliacao_seminovo SET loja_id = MATRIZ_ID WHERE loja_id IS NULL;
--   UPDATE evento SET loja_id = MATRIZ_ID WHERE loja_id IS NULL;
-- END $$;
