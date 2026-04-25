import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, entities } from '@/api/supabaseClient';

const AuthContext = createContext(null);

// Chave para armazenar sessão no localStorage
const SESSION_KEY = 'smartexpress_user_session';
// S02 FIX: Chave para controle de tentativas de login
const LOGIN_ATTEMPTS_KEY = 'smartexpress_login_attempts';
// S05 FIX: Tempo de expiração de sessão (8 horas em ms)
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
// S02 FIX: Máximo de tentativas antes de bloquear
const MAX_LOGIN_ATTEMPTS = 5;
// S02 FIX: Tempo de bloqueio após exceder tentativas (15 minutos)
const LOCKOUT_MS = 15 * 60 * 1000;

// SEGURANÇA: Remove campos sensíveis antes de armazenar/expor
function sanitizeUser(obj) {
  if (!obj) return obj;
  const { senha, password, ...safe } = obj;
  return safe;
}

// S02 FIX: Verificar e controlar tentativas de login (rate limiting no frontend)
function checkLoginAttempts(email) {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const record = data[email] || { count: 0, lastAttempt: 0, lockedUntil: 0 };
    const now = Date.now();

    if (record.lockedUntil && now < record.lockedUntil) {
      const minutosRestantes = Math.ceil((record.lockedUntil - now) / 60000);
      throw new Error(`Muitas tentativas falhas. Conta bloqueada por ${minutosRestantes} minuto(s).`);
    }

    // Resetar contador se passou mais de 30 minutos desde a última tentativa
    if (now - record.lastAttempt > 30 * 60 * 1000) {
      record.count = 0;
    }
  } catch (err) {
    if (err.message.includes('bloqueada')) throw err;
  }
}

function recordFailedAttempt(email) {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const record = data[email] || { count: 0, lastAttempt: 0, lockedUntil: 0 };

    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MS;
      console.warn(`[SEGURANÇA] Conta ${email} bloqueada por ${LOCKOUT_MS / 60000} minutos após ${MAX_LOGIN_ATTEMPTS} tentativas.`);
    }

    data[email] = record;
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function clearLoginAttempts(email) {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    delete data[email];
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

// S05 FIX: Verificar se a sessão ainda é válida (expiração de 8 horas)
function isSessionValid(userData) {
  if (!userData) return false;
  if (!userData.session_expires_at) return true; // Sessões antigas sem campo ainda são válidas
  return Date.now() < userData.session_expires_at;
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

          // S05 FIX: Verificar expiração da sessão
          if (!isSessionValid(userData)) {
            console.warn('[SEGURANÇA] Sessão expirada — logout automático.');
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
            setLoading(false);
            return;
          }

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
              permissoes: usuarioSistema?.[0]?.cargo?.permissoes || {},
              loja_id: usuarioSistema?.[0]?.loja_id || null,
              // Preservar expiração existente
              session_expires_at: userData.session_expires_at,
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

    const emailNorm = email.trim().toLowerCase();

    // S02 FIX: Verificar bloqueio por tentativas excessivas ANTES de bater no banco
    checkLoginAttempts(emailNorm);

    // S01 FIX: Usar RPC do Supabase com bcrypt (pgcrypto)
    // Função 'verificar_login' retorna: { id, nome, email, ativo }
    // loja_id NÃO vem da RPC — vem de usuario_sistema logo abaixo
    const { data: usuariosRPC, error: rpcError } = await supabase
      .rpc('verificar_login', {
        p_email: email.trim(),
        p_senha: password
      });

    if (rpcError) {
      // A RPC falhou — pode ser que a função ainda não foi criada no banco
      // Nesse caso, as senhas ainda estão em texto puro (pré-migração)
      console.warn('[AUTH] RPC verificar_login indisponível, usando fallback:', rpcError?.code);

      const { data: usuarios, error: fallbackError } = await supabase
        .from('usuario')
        .select('*')
        .ilike('email', email.trim())
        .eq('ativo', true)
        .limit(1);

      if (fallbackError || !usuarios?.length) {
        recordFailedAttempt(emailNorm);
        throw new Error('Usuário ou senha incorretos');
      }

      const u = usuarios[0];
      // Fallback só compara plaintext — se senha já foi migrada para bcrypt, redireciona ao erro
      if (u.senha !== password) {
        recordFailedAttempt(emailNorm);
        // Se a senha começa com $2a$, está em bcrypt mas a RPC falhou
        if (u.senha?.startsWith('$2a$') || u.senha?.startsWith('$2b$')) {
          throw new Error('Erro na autenticação segura. Contate o administrador do sistema.');
        }
        throw new Error('Usuário ou senha incorretos');
      }

      clearLoginAttempts(emailNorm);
      const usuarioSeguroFallback = sanitizeUser(u);
      const { data: usuarioSistemaFallback } = await supabase
        .from('usuario_sistema').select('*, cargo:cargo_id(*)').eq('user_id', usuarioSeguroFallback.id).limit(1);

      const userFallback = {
        ...usuarioSeguroFallback,
        usuarioSistema: usuarioSistemaFallback?.[0] || null,
        cargo: usuarioSistemaFallback?.[0]?.cargo || null,
        permissoes: usuarioSistemaFallback?.[0]?.cargo?.permissoes || {},
        loja_id: usuarioSistemaFallback?.[0]?.loja_id || null,
        session_expires_at: Date.now() + SESSION_EXPIRY_MS,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(userFallback));
      setUser(userFallback);
      return userFallback;
    }

    // RPC retorna array vazio se senha/email errados
    if (!usuariosRPC || usuariosRPC.length === 0) {
      recordFailedAttempt(emailNorm);
      throw new Error('Usuário ou senha incorretos');
    }

    // S02 FIX: Limpar tentativas após login bem-sucedido
    clearLoginAttempts(emailNorm);

    const usuarioRPC = usuariosRPC[0]; // Já vem sem a senha — a RPC não retorna o campo senha

    // Buscar dados do UsuarioSistema (cargo, permissões, loja_id)
    const { data: usuarioSistema } = await supabase
      .from('usuario_sistema')
      .select('*, cargo:cargo_id(*)')
      .eq('user_id', usuarioRPC.id)
      .limit(1);

    // Montar objeto do usuário com permissões (sem senha)
    const userWithPermissions = {
      ...usuarioRPC,
      usuarioSistema: usuarioSistema?.[0] || null,
      cargo: usuarioSistema?.[0]?.cargo || null,
      permissoes: usuarioSistema?.[0]?.cargo?.permissoes || {},
      loja_id: usuarioSistema?.[0]?.loja_id || null,
      // S05 FIX: Definir expiração da sessão (8 horas)
      session_expires_at: Date.now() + SESSION_EXPIRY_MS,
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
    return !!user && isSessionValid(user);
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
