import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { ConfirmProvider } from "@/contexts/ConfirmContext"
import { LojaProvider } from "@/contexts/LojaContext"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // P01 FIX: staleTime de 5 minutos por padrão — evita 237 refetches desnecessários
      // Páginas críticas (PDV, Caixa) sobrescrevem com staleTime: 0
      staleTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Evita refetch agressivo ao trocar de aba
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LojaProvider>
          <ConfirmProvider>
            <Pages />
            {/* C03 FIX: Apenas Sonner como sistema de toast — removido Toaster shadcn duplicado */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </ConfirmProvider>
        </LojaProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App