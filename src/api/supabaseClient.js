import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper para converter nomes de tabela de CamelCase para snake_case
function toSnakeCase(str) {
  // Handle consecutive capitals like "CRM" -> "crm" instead of "c_r_m"
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

// CORREÇÃO CRÍTICA: Helper para fazer parse de campos JSON retornados como string
// Necessário porque algumas colunas jsonb (aparelho, historico, etc) estão voltando como strings
function parseJsonSafe(val) {
  if (typeof val === 'string' && ((val.trim().startsWith('{') && val.trim().endsWith('}')) || (val.trim().startsWith('[') && val.trim().endsWith(']')))) {
    try {
      const parsed = JSON.parse(val);
      // Recursivo para lidar com dupla-serialização (ex: historico gigante)
      return typeof parsed === 'string' ? parseJsonSafe(parsed) : parsed;
    } catch {
      return val;
    }
  }
  return val;
}

function parseEntityData(data) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(parseEntityData);
  if (typeof data === 'object') {
    const result = { ...data };
    for (const [key, value] of Object.entries(result)) {
      result[key] = parseJsonSafe(value);
    }
    return result;
  }
  return data;
}

// SEGURANÇA: Campos sensíveis que nunca devem ser retornados ao frontend
const SENSITIVE_COLUMNS = { usuario: ['senha'] };

function stripSensitive(tableName, data) {
  const cols = SENSITIVE_COLUMNS[tableName];
  if (!cols || !data) return data;
  if (Array.isArray(data)) return data.map(row => stripSensitive(tableName, row));
  const clean = { ...data };
  for (const col of cols) delete clean[col];
  return clean;
}

// Classe que simula a interface de entidade do Base44
class Entity {
  constructor(tableName) {
    this.tableName = toSnakeCase(tableName);
  }


  async list(orderOrOptions = {}, limitParam = null) {
    let options = typeof orderOrOptions === 'string'
      ? { order: orderOrOptions, limit: limitParam }
      : { ...orderOrOptions };

    const buildBaseQuery = () => {
      let query = supabase.from(this.tableName).select('*');

      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      if (options.order) {
        const isDesc = options.order.startsWith('-');
        const field = isDesc ? options.order.slice(1) : options.order;
        query = query.order(field, { ascending: !isDesc });
      }

      return query;
    };

    // Obter o limite desejado (se existir)
    const targetLimit = options.limit || null;

    // Se houver um limite menor ou igual a 1000, podemos fazer apenas uma query
    if (targetLimit !== null && targetLimit <= 1000) {
      let query = buildBaseQuery().limit(targetLimit);
      const { data, error } = await query;
      if (error) {
        console.error(`Erro na query [list] em ${this.tableName}:`, error);
        throw error;
      }
      return stripSensitive(this.tableName, parseEntityData(data || []));
    }

    // Caso contrário (sem limite ou limite > 1000), usar paginação para buscar tudo
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let to = from + step - 1;
      let query = buildBaseQuery().range(from, to);

      const { data, error } = await query;
      if (error) {
        console.error(`Erro na query paginada [list] em ${this.tableName} (from: ${from}):`, error);
        throw error;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
      }

      // Parar quando:
      // 1. Não houver mais dados (retornou vazia ou menos de 1 página)
      // 2. Atingiu o limite configurado via parâmetro >= 1000 (caso passado na prop limit)
      if (!data || data.length < step || (targetLimit !== null && allData.length >= targetLimit)) {
        hasMore = false;
      }

      from += step;
    }

    // Se pedimos um limite muito grande por engano, vamos garantir recorte do targetLimit
    if (targetLimit !== null && allData.length > targetLimit) {
      allData = allData.slice(0, targetLimit);
    }

    return stripSensitive(this.tableName, parseEntityData(allData));
  }

  async filter(filters, options = {}) {
    return this.list({ ...options, filters });
  }

  async get(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Erro na query [get] em ${this.tableName} (id: ${id}):`, error);
      throw error;
    }
    return stripSensitive(this.tableName, parseEntityData(data));
  }

  async create(record) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error(`Erro na query [create] em ${this.tableName}:`, error);
      throw error;
    }
    return stripSensitive(this.tableName, parseEntityData(data));
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro na query [update] em ${this.tableName} (id: ${id}):`, error);
      throw error;
    }
    return stripSensitive(this.tableName, parseEntityData(data));
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro na query [delete] em ${this.tableName} (id: ${id}):`, error);
      throw error;
    }
    return { success: true };
  }
}

// Criar proxy para gerar entidades dinamicamente
export const entities = new Proxy({}, {
  get: (target, prop) => {
    if (!target[prop]) {
      target[prop] = new Entity(prop);
    }
    return target[prop];
  }
});

// Auth wrapper para Supabase
// NOTA: O sistema agora usa autenticação customizada via AuthContext.jsx
// Estes métodos são mantidos para compatibilidade, mas retornam null em vez de erro
export const auth = {
  async me() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) return null; // Retorna null em vez de lançar erro
      return user;
    } catch {
      return null;
    }
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erros de logout
    }
  },

  async register(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data.user;
  },

  async isLoggedIn() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  },

  // Método síncrono para compatibilidade com Base44
  isAuthenticated() {
    // Verificar sessão via localStorage do Supabase
    const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    const session = localStorage.getItem(storageKey);
    return !!session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
};

// Funções de integração para upload de arquivos
const integrations = {
  Core: {
    /**
     * Upload de arquivo para o Supabase Storage
     * @param {Object} options - Opções de upload
     * @param {File} options.file - Arquivo a ser enviado
     * @param {string} options.path - Caminho/pasta no storage (ex: 'produtos', 'os')
     * @returns {Promise<{url: string, file_url: string}>}
     */
    UploadFile: async ({ file, path = 'uploads' }) => {
      if (!file) throw new Error('Arquivo não fornecido');
      if (!supabase) throw new Error('Sistema indisponível. Verifique a configuração do servidor.');

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo permitido: 5MB');
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      // Fazer upload
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload Supabase Storage:', error);
        if (error.message?.includes('policy') || error.message?.includes('RLS') || error.statusCode === '403' || error.status === 403) {
          throw new Error('Sem permissão para upload. Verifique as políticas RLS do bucket "uploads" no Supabase.');
        }
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          throw new Error('Bucket "uploads" não encontrado no Supabase Storage. Crie o bucket no painel do Supabase.');
        }
        throw error;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        file_url: urlData.publicUrl,
        path: filePath
      };
    },

    /**
     * Upload de arquivo privado (requer autenticação para acessar)
     */
    UploadPrivateFile: async ({ file, path = 'private' }) => {
      if (!file) throw new Error('Arquivo não fornecido');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('private')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      return {
        path: filePath,
        file_url: filePath
      };
    },

    /**
     * Criar URL assinada para acesso temporário a arquivo privado
     */
    CreateFileSignedUrl: async ({ path, expiresIn = 3600 }) => {
      const { data, error } = await supabase.storage
        .from('private')
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return { signedUrl: data.signedUrl };
    },

    /**
     * Extrair dados de arquivo CSV/Excel (simplificado)
     */
    ExtractDataFromUploadedFile: async ({ file_url }) => {
      // Esta função precisa de implementação específica
      // Por agora, retorna erro informativo
      throw new Error('ExtractDataFromUploadedFile: Use a importação manual de CSV');
    },

    /**
     * Invocar LLM - não implementado (requer integração com OpenAI/Anthropic)
     */
    InvokeLLM: async () => {
      throw new Error('InvokeLLM não implementado - requer integração com API de IA');
    },

    /**
     * Enviar email - não implementado (requer integração com serviço de email)
     */
    SendEmail: async () => {
      throw new Error('SendEmail não implementado - requer integração com serviço de email');
    },

    /**
     * Gerar imagem - não implementado
     */
    GenerateImage: async () => {
      throw new Error('GenerateImage não implementado');
    }
  }
};

// Configuração do servidor WhatsApp (whatsapp-web.js)
const WHATSAPP_SERVER_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

// API do WhatsApp usando whatsapp-web.js
const whatsapp = {
  /**
   * Obter status da conexão WhatsApp
   */
  async getStatus() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/status`);
      return response.json();
    } catch (error) {
      return { status: 'offline', error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Obter QR Code para conexão
   */
  async getQRCode() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/qr`);
      return response.json();
    } catch (error) {
      return { error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Iniciar conexão com WhatsApp
   */
  async connect() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    } catch (error) {
      return { error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Desconectar do WhatsApp
   */
  async disconnect() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    } catch (error) {
      return { error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Enviar mensagem
   * @param {string} to - Número do destinatário
   * @param {string} message - Mensagem a enviar
   * @param {Object} media - Mídia opcional { mimetype, data, filename }
   */
  async sendMessage(to, message, media = null) {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, media })
      });
      return response.json();
    } catch (error) {
      return { error: 'Falha ao enviar mensagem' };
    }
  },

  /**
   * Listar conversas
   */
  async getConversations() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/conversations`);
      return response.json();
    } catch (error) {
      return { conversations: [], error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Obter mensagens de uma conversa
   * @param {string} chatId - ID do chat
   * @param {number} limit - Limite de mensagens
   */
  async getMessages(chatId, limit = 50) {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/messages/${encodeURIComponent(chatId)}?limit=${limit}`);
      return response.json();
    } catch (error) {
      return { messages: [], error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Listar contatos
   */
  async getContacts() {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/contacts`);
      return response.json();
    } catch (error) {
      return { contacts: [], error: 'Servidor WhatsApp não disponível' };
    }
  },

  /**
   * Marcar conversa como lida
   * @param {string} chatId - ID do chat
   */
  async markAsRead(chatId) {
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/api/read/${encodeURIComponent(chatId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    } catch (error) {
      return { error: 'Falha ao marcar como lida' };
    }
  },

  /**
   * URL do servidor para WebSocket
   */
  getServerURL() {
    return WHATSAPP_SERVER_URL;
  }
};

// Exportar objeto base44 para compatibilidade com código existente
export const base44 = {
  entities,
  auth,
  integrations,
  whatsapp,
  functions: {
    mercadoPagoCheckout: async () => { throw new Error('mercadoPagoCheckout não implementado'); },
    mercadoPagoWebhook: async () => { throw new Error('mercadoPagoWebhook não implementado'); },
    infinitePayCheckout: async () => { throw new Error('infinitePayCheckout não implementado'); },
    infinitePayWebhook: async () => { throw new Error('infinitePayWebhook não implementado'); }
  }
};
