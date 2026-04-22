import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { ConfirmProvider } from "@/contexts/ConfirmContext"
import { LojaProvider } from "@/contexts/LojaContext"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
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
            <Toaster />
          </ConfirmProvider>
        </LojaProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App