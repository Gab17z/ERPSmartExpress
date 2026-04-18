import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirecionar para login, salvando a página atual para voltar depois
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar permissão da rota (admin sempre tem acesso)
  if (requiredPermission) {
    const isAdmin = user?.permissoes?.administrador_sistema === true;
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const temPermissao = isAdmin || permissions.some(p => hasPermission(p));

    if (!temPermissao) {
      return <Navigate to="/pdv" replace />;
    }
  }

  return children;
}
