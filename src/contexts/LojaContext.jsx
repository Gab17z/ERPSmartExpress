import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabaseClient';

const LojaContext = createContext(null);

const LOJA_KEY = 'smartexpress_loja_ativa';

export function LojaProvider({ children }) {
  const { user } = useAuth();
  const [lojaAtiva, setLojaAtivaState] = useState(null);
  const [lojas, setLojas] = useState([]);
  const [loadingLoja, setLoadingLoja] = useState(true);

  // Admin: pode ver tudo (null) ou filtrar por loja específica
  // Adicionado um log e verificação rigorosa para garantir que Vendedor não caia aqui
  const isAdmin = user?.permissoes?.administrador_sistema === true ||
                  (user?.cargo?.nome && typeof user.cargo.nome === 'string' && user.cargo.nome.toLowerCase().includes('admin'));

  // Carregar todas as lojas do banco
  const fetchLojas = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('loja').select('*').eq('ativo', true).order('nome');
      setLojas(data || []);
      return data || [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLojaAtivaState(null);
      setLojas([]);
      setLoadingLoja(false);
      return;
    }

    const init = async () => {
      setLoadingLoja(true);
      const listaLojas = await fetchLojas();

      if (isAdmin) {
        // Admin: restaurar escolha salva ou usar a loja do seu perfil como padrão
        const saved = localStorage.getItem(LOJA_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const lojaExiste = listaLojas.find(l => l.id === parsed.id);
            setLojaAtivaState(lojaExiste || null);
          } catch {
            setLojaAtivaState(null);
          }
        } else {
          // Se admin tem loja vinculada, usa ela por padrão, senão vê tudo (null)
          const lojaPadraoId = user?.loja_id || user?.usuarioSistema?.loja_id;
          if (lojaPadraoId) {
            const loja = listaLojas.find(l => l.id === lojaPadraoId);
            setLojaAtivaState(loja || null);
          } else {
            setLojaAtivaState(null);
          }
        }
      } else {
        // Usuário comum: buscar loja do seu usuario_sistema (OBRIGATÓRIO)
        const lojaId = user?.loja_id || user?.usuarioSistema?.loja_id;
        
        if (lojaId) {
          const loja = listaLojas.find(l => l.id === lojaId);
          setLojaAtivaState(loja || null);
        } else {
          setLojaAtivaState(null);
        }
      }
      setLoadingLoja(false);
    };

    init();
  }, [user, isAdmin, fetchLojas]);

  // Só admin pode trocar de loja
  const setLojaAtiva = useCallback((loja) => {
    if (!isAdmin) return;
    setLojaAtivaState(loja);
    if (loja) {
      localStorage.setItem(LOJA_KEY, JSON.stringify(loja));
    } else {
      localStorage.removeItem(LOJA_KEY); // null = ver tudo
    }
  }, [isAdmin]);

  const value = {
    lojaAtiva,          // objeto loja ativo (null = admin vendo tudo)
    setLojaAtiva,       // só admin pode usar
    lojas,              // lista de todas as lojas ativas
    loadingLoja,
    isAdmin,
    // Helper: retorna o loja_id para usar em queries (null se admin sem filtro)
    lojaFiltroId: isAdmin 
      ? (lojaAtiva?.id || null) 
      : (lojaAtiva?.id || user?.loja_id || user?.usuarioSistema?.loja_id || null),
    // Helper: label para exibição no header
    lojaLabel: lojaAtiva?.nome || (isAdmin ? 'Todas as Lojas' : ''),
  };

  return (
    <LojaContext.Provider value={value}>
      {children}
    </LojaContext.Provider>
  );
}

export function useLoja() {
  const context = useContext(LojaContext);
  if (!context) {
    throw new Error('useLoja deve ser usado dentro de um LojaProvider');
  }
  return context;
}

export default LojaContext;
