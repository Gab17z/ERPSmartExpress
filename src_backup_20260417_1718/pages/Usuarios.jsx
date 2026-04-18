import { Navigate } from 'react-router-dom';

// Página redirecionada para Configurações
// O gerenciamento de usuários agora está na aba "Usuários" de /configuracoes
export default function Usuarios() {
  return <Navigate to="/configuracoes" replace />;
}
