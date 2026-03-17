import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, entities } from '@/api/supabaseClient';

const AuthContext = createContext(null);

// Chave para armazenar sessão no localStorage
const SESSION_KEY = 'smartexpress_user_session';

// SEGURANÇA: Remove campos sensíveis antes de armazenar/expor
function sanitizeUser(obj) {
  if (!obj) return obj;
  const { senha, password, ...safe } = obj;
  return safe;
}

// Nota: Usamos select('*') em vez de colunas explícitas para evitar quebrar
// se o schema do banco divergir. sanitizeUser() remove campos sensíveis.

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão salva no localStorage
    const checkSession = async () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const userData = JSON.parse(savedSession);
          // Verificar se o usuário ainda existe no banco (sem trazer senha)
          const { data: usuarioAtual, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', userData.id)
            .maybeSingle();

          if (!error && usuarioAtual && usuarioAtual.ativo !== false) {
            // Buscar dados do UsuarioSistema (cargo, permissões)
            const { data: usuarioSistema } = await supabase
              .from('usuario_sistema')
              .select('*, cargo:cargo_id(*)')
              .eq('user_id', usuarioAtual.id)
              .limit(1);

            // Montar objeto do usuário com permissões
            const userWithPermissions = sanitizeUser({
              ...usuarioAtual,
              usuarioSistema: usuarioSistema?.[0] || null,
              cargo: usuarioSistema?.[0]?.cargo || null,
              permissoes: usuarioSistema?.[0]?.cargo?.permissoes || {}
            });

            // Atualizar sessão com dados completos (sem senha)
            localStorage.setItem(SESSION_KEY, JSON.stringify(userWithPermissions));
            setUser(userWithPermissions);
          } else {
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email, password) => {
    if (!supabase) {
      throw new Error('Sistema indisponível. Verifique a configuração do servidor.');
    }

    // Buscar usuário pelo email (precisa da senha APENAS para validar login)
    const { data: usuarios, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('ativo', true)
      .limit(1);

    if (error) throw error;

    if (!usuarios || usuarios.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const usuario = usuarios[0];

    // Verificar senha
    if (usuario.senha !== password) {
      throw new Error('Senha incorreta');
    }

    // SEGURANÇA: Remover senha do objeto IMEDIATAMENTE após validação
    const usuarioSeguro = sanitizeUser(usuario);

    // Buscar dados do UsuarioSistema (cargo, permissões)
    const { data: usuarioSistema } = await supabase
      .from('usuario_sistema')
      .select('*, cargo:cargo_id(*)')
      .eq('user_id', usuarioSeguro.id)
      .limit(1);

    // Montar objeto do usuário com permissões (sem senha)
    const userWithPermissions = {
      ...usuarioSeguro,
      usuarioSistema: usuarioSistema?.[0] || null,
      cargo: usuarioSistema?.[0]?.cargo || null,
      permissoes: usuarioSistema?.[0]?.cargo?.permissoes || {}
    };

    // Salvar sessão no localStorage (sem senha)
    localStorage.setItem(SESSION_KEY, JSON.stringify(userWithPermissions));
    setUser(userWithPermissions);

    return userWithPermissions;
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!user;
  };

  // Função para verificar permissão específica
  const hasPermission = (permission) => {
    if (!user?.permissoes) return false;
    return user.permissoes[permission] === true;
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export default AuthContext;
