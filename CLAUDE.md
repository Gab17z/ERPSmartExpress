# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartExpress is a complete ERP system for cell phone stores (lojas de celular) built with React + Vite and Supabase backend. It handles sales (PDV), service orders (OS), inventory, customers, financials, and more.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + React Router DOM
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **State**: TanStack React Query for server state
- **Forms**: React Hook Form + Zod validation

### Directory Structure

```
src/
├── api/                    # Backend integration layer
│   ├── supabaseClient.js   # Supabase client + Entity abstraction
│   ├── base44Client.js     # Re-exports from supabaseClient (compatibility)
│   ├── entities.js         # All entity exports (Cliente, Produto, Venda, etc.)
│   ├── functions.js        # Edge function stubs (payments, webhooks)
│   └── integrations.js     # File upload, LLM stubs
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── [domain]/           # Domain-specific components (os/, pdv/, seminovos/, etc.)
├── pages/                  # Route pages (one file per route)
│   ├── index.jsx           # Router configuration
│   └── Layout.jsx          # Main layout with sidebar navigation
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities (cn function)
└── utils/                  # Helper functions (createPageUrl)
```

### Entity System

The `supabaseClient.js` provides a Base44-compatible Entity abstraction over Supabase:

```javascript
// Usage pattern in components
import { base44 } from "@/api/base44Client";

// List with ordering (prefix '-' for descending)
const clientes = await base44.entities.Cliente.list('-created_date');

// CRUD operations
await base44.entities.Produto.create(data);
await base44.entities.Produto.update(id, updates);
await base44.entities.Produto.delete(id);
await base44.entities.Produto.get(id);
```

Entity names use CamelCase and are auto-converted to snake_case table names.

### Key Entities

- **Cliente** - Customers (CPF/CNPJ, address, contact)
- **Produto** - Products/inventory with SKU, pricing, stock levels
- **Venda** - Sales transactions with items (JSONB), payments
- **OrdemServico** - Service orders for repairs
- **AvaliacaoSeminovo** - Used device evaluations
- **Caixa/MovimentacaoCaixa** - Cash register operations
- **ContaReceber/ContaPagar** - Accounts receivable/payable
- **Usuario/Cargo** - System users and roles

### Routing

Routes are defined in `src/pages/index.jsx`. Each page component maps to a URL path using the page name (e.g., `Clientes` → `/clientes`). The `createPageUrl()` helper generates paths.

### Data Fetching Pattern

Components use TanStack Query for data fetching:

```javascript
const { data: produtos = [], isLoading } = useQuery({
  queryKey: ['produtos'],
  queryFn: () => base44.entities.Produto.list('-created_date'),
});

const createMutation = useMutation({
  mutationFn: (data) => base44.entities.Produto.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
});
```

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Path Alias

`@` is aliased to `./src` in vite.config.js. Always use `@/` for imports.

## Database

The Supabase database has 44 tables with RLS enabled. Schema is documented in `supabase-schema.sql`. Key patterns:
- All tables have `id` (UUID), `created_date`, `updated_date`
- JSONB fields for nested data (endereco, itens, pagamentos)
- Foreign key relationships between entities
