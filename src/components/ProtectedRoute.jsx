import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
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

  return children;
}
