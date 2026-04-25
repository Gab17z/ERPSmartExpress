-- Script para adicionar a coluna loja_id à tabela cliente
-- Isso é necessário para a isolação de dados entre lojas (multi-tenant)
-- Se você ativou o RLS (Row Level Security), as queries podem falhar com erro 400 se esta coluna não existir.

-- 1. Adicionar a coluna loja_id
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES loja(id);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cliente_loja_id ON cliente(loja_id);

-- 3. (Opcional) Migrar registros existentes para a loja Matriz
-- Se você já tem o ID da loja matriz, substitua 'ID_DA_LOJA_MATRIZ' abaixo:
-- UPDATE cliente SET loja_id = 'ID_DA_LOJA_MATRIZ' WHERE loja_id IS NULL;

-- 4. Habilitar RLS se ainda não estiver habilitado
-- ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;

-- 5. Criar política de isolamento (exemplo)
-- CREATE POLICY "Clientes isolados por loja" ON cliente
--   FOR ALL USING (loja_id = auth.uid_loja_id()); -- Ajuste conforme sua função de auth
