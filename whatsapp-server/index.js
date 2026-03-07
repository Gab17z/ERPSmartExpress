/**
 * SmartExpress WhatsApp Server
 * Servidor Node.js usando whatsapp-web.js para integração com WhatsApp
 *
 * Documentação: https://github.com/pedroslopez/whatsapp-web.js
 */

import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { config } from 'dotenv';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';

// Log do path do ffmpeg
console.log('FFmpeg path:', ffmpegPath);

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const SESSION_PATH = process.env.SESSION_PATH || './sessions';

// Garantir que o diretório de sessões existe
if (!existsSync(SESSION_PATH)) {
  mkdirSync(SESSION_PATH, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Função para converter áudio WebM para OGG/OPUS (compatível com WhatsApp)
const convertAudioToOgg = async (base64Data, inputMimetype) => {
  const timestamp = Date.now();
  const inputExt = inputMimetype.includes('webm') ? 'webm' : 'mp3';
  const inputPath = join(tmpdir(), `audio_input_${timestamp}.${inputExt}`);
  const outputPath = join(tmpdir(), `audio_output_${timestamp}.ogg`);

  try {
    // Salvar arquivo de entrada
    const inputBuffer = Buffer.from(base64Data, 'base64');
    writeFileSync(inputPath, inputBuffer);
    console.log('Arquivo de entrada salvo:', inputPath);

    // Converter para OGG/OPUS usando ffmpeg diretamente
    const args = [
      '-i', inputPath,
      '-acodec', 'libopus',
      '-ac', '1',
      '-ar', '48000',
      '-f', 'ogg',
      '-y',
      outputPath
    ];

    console.log('Executando ffmpeg:', ffmpegPath, args.join(' '));

    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, args, (error, stdout, stderr) => {
        if (error) {
          console.error('Erro ffmpeg stderr:', stderr);
          reject(error);
        } else {
          console.log('FFmpeg concluído com sucesso');
          resolve();
        }
      });
    });

    // Ler arquivo convertido
    const outputBuffer = readFileSync(outputPath);
    const outputBase64 = outputBuffer.toString('base64');
    console.log('Áudio convertido, tamanho:', outputBuffer.length);

    // Limpar arquivos temporários
    try { unlinkSync(inputPath); } catch (e) { }
    try { unlinkSync(outputPath); } catch (e) { }

    return {
      data: outputBase64,
      mimetype: 'audio/ogg; codecs=opus',
      filename: 'audio.ogg'
    };
  } catch (err) {
    console.error('Erro na conversão:', err);
    // Limpar arquivos temporários
    try { unlinkSync(inputPath); } catch (e) { }
    try { unlinkSync(outputPath); } catch (e) { }
    throw err;
  }
};

// Estado do cliente WhatsApp
let whatsappClient = null;
let clientStatus = 'disconnected';
let qrCodeData = null;
let connectedNumber = null;

// Armazenamento em memória para mensagens (em produção, use banco de dados)
const conversations = new Map();
const pendingMessages = [];

/**
 * Inicializa o cliente WhatsApp
 */
function initializeWhatsAppClient() {
  if (whatsappClient) {
    console.log('Cliente WhatsApp já existe, destruindo...');
    whatsappClient.destroy();
  }

  console.log('Inicializando cliente WhatsApp...');
  clientStatus = 'initializing';
  io.emit('status', { status: clientStatus });

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: SESSION_PATH
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // Evento: QR Code gerado
  whatsappClient.on('qr', (qr) => {
    console.log('QR Code recebido!');
    qrCodeData = qr;
    clientStatus = 'qr_ready';
    qrcode.generate(qr, { small: true });
    io.emit('qr', { qr });
    io.emit('status', { status: clientStatus });
  });

  // Evento: Cliente pronto
  whatsappClient.on('ready', async () => {
    console.log('WhatsApp conectado!');
    clientStatus = 'connected';
    qrCodeData = null;

    try {
      const info = whatsappClient.info;
      connectedNumber = info.wid.user;
      console.log(`Conectado como: ${connectedNumber}`);
    } catch (e) {
      console.error('Erro ao obter info:', e);
    }

    io.emit('status', { status: clientStatus, number: connectedNumber });
    io.emit('ready', { number: connectedNumber });
  });

  // Evento: Autenticado
  whatsappClient.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
    clientStatus = 'authenticated';
    io.emit('status', { status: clientStatus });
  });

  // Evento: Falha na autenticação
  whatsappClient.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
    clientStatus = 'auth_failure';
    io.emit('status', { status: clientStatus, error: msg });
  });

  // Evento: Desconectado
  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    clientStatus = 'disconnected';
    connectedNumber = null;
    io.emit('status', { status: clientStatus, reason });
    io.emit('disconnected', { reason });
  });

  // Evento: Mensagem recebida
  whatsappClient.on('message', async (message) => {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

    // Obter informações do contato
    let contactName = null;
    let profilePicUrl = null;
    try {
      const contact = await message.getContact();
      contactName = contact.pushname || contact.name || contact.number;
      try {
        profilePicUrl = await whatsappClient.getProfilePicUrl(message.from);
      } catch (e) {
        // Sem foto de perfil
      }
    } catch (e) {
      console.log('Erro ao obter contato:', e.message);
    }

    const messageData = {
      id: message.id._serialized,
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type,
      isForwarded: message.isForwarded,
      fromMe: message.fromMe,
      hasMedia: message.hasMedia,
      contactName: contactName,
      profilePicUrl: profilePicUrl
    };

    // Adicionar à conversa
    if (!conversations.has(message.from)) {
      conversations.set(message.from, []);
    }
    conversations.get(message.from).push(messageData);

    // Emitir para o frontend
    io.emit('message', messageData);

    // Processar resposta automática se configurado
    await processAutoReply(message);
  });

  // Evento: Contato está digitando
  whatsappClient.on('chat', async (chat) => {
    // Emitir evento de chat atualizado
    io.emit('chat_update', {
      id: chat.id._serialized,
      unreadCount: chat.unreadCount
    });
  });

  // Evento: Mensagem enviada
  whatsappClient.on('message_create', (message) => {
    if (message.fromMe) {
      const messageData = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        type: message.type,
        fromMe: true
      };

      io.emit('message_sent', messageData);
    }
  });

  // Inicializar cliente
  whatsappClient.initialize().catch(err => {
    console.error('Erro ao inicializar WhatsApp:', err);
    clientStatus = 'error';
    io.emit('status', { status: clientStatus, error: err.message });
  });
}

/**
 * Processa resposta automática (chatbot básico)
 */
async function processAutoReply(message) {
  // Ignorar mensagens de grupos por padrão
  if (message.from.includes('@g.us')) return;

  // Ignorar mensagens próprias
  if (message.fromMe) return;

  const body = message.body.toLowerCase().trim();

  // Respostas automáticas básicas
  const autoReplies = {
    'oi': 'Olá! Bem-vindo ao SmartExpress. Como posso ajudar?\n\n1 - Consultar produtos\n2 - Status da OS\n3 - Falar com atendente',
    'olá': 'Olá! Bem-vindo ao SmartExpress. Como posso ajudar?\n\n1 - Consultar produtos\n2 - Status da OS\n3 - Falar com atendente',
    'ola': 'Olá! Bem-vindo ao SmartExpress. Como posso ajudar?\n\n1 - Consultar produtos\n2 - Status da OS\n3 - Falar com atendente',
    '1': 'Para consultar nossos produtos, acesse nossa loja online ou informe o nome do produto que deseja buscar.',
    '2': 'Para consultar o status da sua OS, informe o número da ordem de serviço.',
    '3': 'Um atendente entrará em contato em breve. Aguarde, por favor.',
    'obrigado': 'Por nada! Estamos à disposição. 😊',
    'obrigada': 'Por nada! Estamos à disposição. 😊'
  };

  if (autoReplies[body]) {
    try {
      await message.reply(autoReplies[body]);
    } catch (err) {
      console.error('Erro ao enviar resposta automática:', err);
    }
  }
}

// ================== ROTAS API ==================

// Status do WhatsApp
app.get('/api/status', (req, res) => {
  res.json({
    status: clientStatus,
    connected: clientStatus === 'connected',
    number: connectedNumber,
    hasQR: !!qrCodeData
  });
});

// Obter QR Code
app.get('/api/qr', (req, res) => {
  if (qrCodeData) {
    res.json({ qr: qrCodeData });
  } else if (clientStatus === 'connected') {
    res.json({ error: 'Já conectado', status: 'connected' });
  } else {
    res.json({ error: 'QR Code não disponível', status: clientStatus });
  }
});

// Iniciar conexão
app.post('/api/connect', (req, res) => {
  if (clientStatus === 'connected') {
    return res.json({ success: true, message: 'Já conectado', number: connectedNumber });
  }

  initializeWhatsAppClient();
  res.json({ success: true, message: 'Iniciando conexão...' });
});

// Desconectar
app.post('/api/disconnect', async (req, res) => {
  if (whatsappClient) {
    try {
      await whatsappClient.logout();
      await whatsappClient.destroy();
      whatsappClient = null;
      clientStatus = 'disconnected';
      connectedNumber = null;
      qrCodeData = null;
      res.json({ success: true, message: 'Desconectado com sucesso' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ success: true, message: 'Já estava desconectado' });
  }
});

// Enviar mensagem
app.post('/api/send', async (req, res) => {
  const { to, message, media } = req.body;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  if (!to || (!message && !media)) {
    return res.status(400).json({ error: 'Destinatário e mensagem/mídia são obrigatórios' });
  }

  try {
    // Formatar número (adicionar @c.us se necessário)
    let chatId = to;
    if (!chatId.includes('@')) {
      // Remover caracteres não numéricos
      chatId = chatId.replace(/\D/g, '');
      // Adicionar código do país se não tiver
      if (!chatId.startsWith('55')) {
        chatId = '55' + chatId;
      }
      chatId = chatId + '@c.us';
    }
    // Se já tem @, usar como está (suporta @lid, @c.us, @g.us, etc)
    console.log('Enviando para chatId:', chatId);

    let sentMessage;

    if (media) {
      // Enviar com mídia
      console.log('Enviando mídia:', { mimetype: media.mimetype, filename: media.filename, dataLength: media.data?.length });

      try {
        let mediaData = media.data;
        let mediaMimetype = media.mimetype;
        let mediaFilename = media.filename;

        // Verificar se é áudio que precisa de conversão
        const isAudio = media.mimetype && media.mimetype.startsWith('audio/');
        const isWebm = media.mimetype && media.mimetype.includes('webm');

        // Se for áudio WebM, converter para OGG/OPUS
        if (isAudio && isWebm) {
          console.log('Convertendo áudio WebM para OGG/OPUS...');
          try {
            const converted = await convertAudioToOgg(media.data, media.mimetype);
            mediaData = converted.data;
            mediaMimetype = converted.mimetype;
            mediaFilename = converted.filename;
            console.log('Áudio convertido com sucesso!', { newMimetype: mediaMimetype });
          } catch (convError) {
            console.error('Erro na conversão, tentando enviar original:', convError.message);
            // Continua com o original se a conversão falhar
          }
        }

        const mediaObj = new MessageMedia(mediaMimetype, mediaData, mediaFilename);

        // Verificar se agora é OGG/OPUS para usar sendAudioAsVoice
        const isOggOpus = mediaMimetype && (mediaMimetype.includes('ogg') || mediaMimetype.includes('opus'));

        const options = {
          ...(message && { caption: message }),
          ...(isAudio && isOggOpus && { sendAudioAsVoice: true })
        };

        console.log('Enviando mídia final:', { isAudio, isOggOpus, mimetype: mediaMimetype });
        console.log('Opções de envio:', options);
        sentMessage = await whatsappClient.sendMessage(chatId, mediaObj, options);
        console.log('Mídia enviada com sucesso:', sentMessage.id._serialized);
      } catch (mediaError) {
        console.error('Erro detalhado ao enviar mídia:', mediaError);
        throw mediaError;
      }
    } else {
      // Enviar apenas texto
      sentMessage = await whatsappClient.sendMessage(chatId, message);
    }

    res.json({
      success: true,
      messageId: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar conversas
app.get('/api/conversations', async (req, res) => {
  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const { limit = 500 } = req.query; // Limite padrão aumentado para 500
    const chats = await whatsappClient.getChats();
    const chatsToProcess = limit === 'all' ? chats : chats.slice(0, parseInt(limit));
    const conversationList = await Promise.all(
      chatsToProcess.map(async (chat) => {
        let profilePicUrl = null;
        let contactName = chat.name;
        let phoneNumber = chat.id.user;

        try {
          profilePicUrl = await whatsappClient.getProfilePicUrl(chat.id._serialized);
        } catch (e) {
          // Sem foto de perfil
        }

        // Para chats individuais, obter dados do contato via Store direto
        if (!chat.isGroup) {
          try {
            const pupPage = whatsappClient.pupPage;
            if (pupPage) {
              const storeData = await pupPage.evaluate((cid) => {
                const result = { name: null, number: null };
                if (!window.Store || !window.Store.Chat) return result;

                const chat = window.Store.Chat.get(cid);
                if (!chat) return result;

                // Tentar do contact
                if (chat.contact) {
                  const names = [
                    chat.contact.pushname,
                    chat.contact.notifyName,
                    chat.contact.name,
                    chat.contact.verifiedName
                  ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                  if (names.length > 0) result.name = names[0];
                  if (chat.contact.id?.user) result.number = chat.contact.id.user;
                }

                // Fallback para chat
                if (!result.name) {
                  const chatNames = [chat.pushname, chat.notifyName, chat.formattedTitle]
                    .filter(n => n && n !== 'undefined' && !n.startsWith('+'));
                  if (chatNames.length > 0) result.name = chatNames[0];
                }

                // Buscar nas mensagens
                if (!result.name && chat.msgs) {
                  try {
                    const msgs = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : [];
                    for (let i = msgs.length - 1; i >= Math.max(0, msgs.length - 5); i--) {
                      const msg = msgs[i];
                      if (msg && !msg.id?.fromMe && msg.senderObj?.pushname) {
                        if (!msg.senderObj.pushname.startsWith('+')) {
                          result.name = msg.senderObj.pushname;
                          break;
                        }
                      }
                    }
                  } catch (e) { }
                }

                return result;
              }, chat.id._serialized);

              if (storeData.name) contactName = storeData.name;
              if (storeData.number) phoneNumber = storeData.number;
            }
          } catch (e) {
            // Fallback silencioso
          }
        }

        return {
          id: chat.id._serialized,
          name: contactName || (phoneNumber ? `+${phoneNumber}` : 'Desconhecido'),
          phoneNumber: phoneNumber,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          lastMessage: chat.lastMessage?.body,
          timestamp: chat.lastMessage?.timestamp,
          profilePicUrl
        };
      })
    );

    res.json({ conversations: conversationList });
  } catch (err) {
    console.error('Erro ao listar conversas:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obter foto de perfil de um contato
app.get('/api/profile-pic/:contactId', async (req, res) => {
  const { contactId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const profilePicUrl = await whatsappClient.getProfilePicUrl(contactId);
    res.json({ profilePicUrl: profilePicUrl || null });
  } catch (err) {
    res.json({ profilePicUrl: null });
  }
});

// Obter mensagens de uma conversa
app.get('/api/messages/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50 } = req.query;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: parseInt(limit) });

    // Buscar nome do contato usando métodos oficiais da API
    let contactName = chat.name;
    let contactNumber = chat.id.user;

    console.log(`\n📨 BUSCANDO MENSAGENS para ${chatId}`);
    console.log(`   Chat.name original: "${contactName}"`);

    if (!chat.isGroup) {
      // Buscar diretamente no Store via Puppeteer (bypass da API bugada)
      try {
        const pupPage = whatsappClient.pupPage;
        if (pupPage) {
          const storeData = await pupPage.evaluate((cid) => {
            const result = { name: null, number: null };

            if (!window.Store || !window.Store.Chat) return result;

            const chat = window.Store.Chat.get(cid);
            if (!chat) return result;

            // 1. Tentar do contact associado ao chat
            if (chat.contact) {
              const names = [
                chat.contact.pushname,
                chat.contact.notifyName,
                chat.contact.name,
                chat.contact.verifiedName,
                chat.contact.shortName
              ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

              if (names.length > 0) {
                result.name = names[0];
              }

              if (chat.contact.id?.user) {
                result.number = chat.contact.id.user;
              }
            }

            // 2. Se não achou, tentar do próprio chat
            if (!result.name) {
              const chatNames = [
                chat.pushname,
                chat.notifyName,
                chat.formattedTitle,
                chat.name
              ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

              if (chatNames.length > 0) {
                result.name = chatNames[0];
              }
            }

            // 3. Se ainda não achou, buscar nas mensagens recentes
            if (!result.name && chat.msgs) {
              try {
                const msgs = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : [];
                for (let i = msgs.length - 1; i >= 0 && i >= msgs.length - 10; i--) {
                  const msg = msgs[i];
                  if (msg && !msg.id?.fromMe && msg.senderObj) {
                    const senderNames = [
                      msg.senderObj.pushname,
                      msg.senderObj.notifyName,
                      msg.senderObj.name
                    ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                    if (senderNames.length > 0) {
                      result.name = senderNames[0];
                      break;
                    }
                  }
                }
              } catch (e) { /* ignorar */ }
            }

            return result;
          }, chatId);

          if (storeData.name) {
            contactName = storeData.name;
            console.log(`   ✅ Via Store direto: "${contactName}"`);
          }
          if (storeData.number) {
            contactNumber = storeData.number;
          }
        }
      } catch (e) {
        console.log(`   ⚠️ Store direto erro: ${e.message}`);
      }

      // Fallback para chat.name
      if (!contactName || contactName.startsWith('+')) {
        const chatName = chat.name || chat.formattedTitle || chat.notifyName;
        if (chatName && chatName !== 'undefined' && !chatName.startsWith('+')) {
          contactName = chatName;
          console.log(`   ✅ Via chat.name fallback: "${contactName}"`);
        }
      }
    }

    console.log(`   RESULTADO FINAL: name="${contactName}", number="${contactNumber}"\n`);

    const messageList = await Promise.all(messages.map(async (msg) => {
      let mediaData = null;

      // Se a mensagem tem mídia, tentar baixar
      if (msg.hasMedia) {
        try {
          const media = await msg.downloadMedia();
          if (media) {
            mediaData = {
              mimetype: media.mimetype,
              data: media.data, // base64
              filename: media.filename
            };
          }
        } catch (e) {
          console.log('Erro ao baixar mídia:', e.message);
        }
      }

      return {
        id: msg.id._serialized,
        body: msg.body,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        type: msg.type,
        hasMedia: msg.hasMedia,
        media: mediaData
      };
    }));

    res.json({
      messages: messageList,
      contactInfo: {
        name: contactName,
        number: contactNumber,
        chatId: chatId
      }
    });
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obter contatos
app.get('/api/contacts', async (req, res) => {
  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const contacts = await whatsappClient.getContacts();
    const contactList = contacts
      .filter(c => c.isWAContact && !c.isGroup)
      .slice(0, 100)
      .map(contact => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname,
        number: contact.number,
        isMyContact: contact.isMyContact
      }));

    res.json({ contacts: contactList });
  } catch (err) {
    console.error('Erro ao listar contatos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marcar como lida
app.post('/api/read/:chatId', async (req, res) => {
  const { chatId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.sendSeen();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao marcar como lida:', err);
    res.status(500).json({ error: err.message });
  }
});

// Enviar status de digitando
app.post('/api/typing/:chatId', async (req, res) => {
  const { chatId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.sendStateTyping();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir/Arquivar conversa
app.delete('/api/chat/:chatId', async (req, res) => {
  const { chatId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    // Tentar deletar a conversa (remove do WhatsApp)
    await chat.delete();

    // Remover do mapa de conversas em memória
    conversations.delete(chatId);

    console.log(`Conversa ${chatId} excluída com sucesso`);
    res.json({ success: true, message: 'Conversa excluída' });
  } catch (err) {
    console.error('Erro ao excluir conversa:', err);
    // Se falhar ao deletar, tentar arquivar
    try {
      const chat = await whatsappClient.getChatById(chatId);
      await chat.archive();
      res.json({ success: true, message: 'Conversa arquivada (não foi possível excluir)' });
    } catch (archiveErr) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Arquivar conversa
app.post('/api/chat/archive/:chatId', async (req, res) => {
  const { chatId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.archive();
    console.log(`Conversa ${chatId} arquivada com sucesso`);
    res.json({ success: true, message: 'Conversa arquivada' });
  } catch (err) {
    console.error('Erro ao arquivar conversa:', err);
    res.status(500).json({ error: err.message });
  }
});

// Desarquivar conversa
app.post('/api/chat/unarchive/:chatId', async (req, res) => {
  const { chatId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.unarchive();
    console.log(`Conversa ${chatId} desarquivada com sucesso`);
    res.json({ success: true, message: 'Conversa desarquivada' });
  } catch (err) {
    console.error('Erro ao desarquivar conversa:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obter informações de presença/status de um contato
app.get('/api/presence/:contactId', async (req, res) => {
  const { contactId } = req.params;

  if (!whatsappClient || clientStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não conectado' });
  }

  try {
    const contact = await whatsappClient.getContactById(contactId);
    const chat = await whatsappClient.getChatById(contactId);

    res.json({
      id: contactId,
      name: contact.name || contact.pushname,
      isOnline: chat.isOnline || false,
      lastSeen: chat.lastSeen || null
    });
  } catch (err) {
    res.json({ id: contactId, isOnline: false, lastSeen: null });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', whatsapp: clientStatus });
});

// ================== SOCKET.IO ==================

io.on('connection', (socket) => {
  console.log('Cliente conectado via Socket.IO:', socket.id);

  // Enviar status atual
  socket.emit('status', {
    status: clientStatus,
    number: connectedNumber,
    hasQR: !!qrCodeData
  });

  // Se tiver QR disponível, enviar
  if (qrCodeData) {
    socket.emit('qr', { qr: qrCodeData });
  }

  // Evento para sincronização progressiva de conversas
  socket.on('sync_conversations', async (options = {}) => {
    console.log('🔵 SERVIDOR: sync_conversations recebido!', { options, clientStatus, hasClient: !!whatsappClient });

    if (!whatsappClient || clientStatus !== 'connected') {
      console.log('🔴 SERVIDOR: WhatsApp não conectado, emitindo sync_error');
      socket.emit('sync_error', { error: 'WhatsApp não conectado' });
      return;
    }

    const limit = options.limit || 500;
    console.log(`🔵 SERVIDOR: Iniciando sincronização progressiva de até ${limit} conversas...`);

    try {
      console.log('🔵 SERVIDOR: Buscando chats do WhatsApp...');
      const chats = await whatsappClient.getChats();
      console.log(`🔵 SERVIDOR: ${chats.length} chats encontrados`);

      // Buscar todos os contatos diretamente do Store do WhatsApp Web (bypass do bug)
      console.log('🔵 SERVIDOR: Buscando contatos via Store...');
      let contactsMap = new Map();
      try {
        const pupPage = whatsappClient.pupPage;
        if (pupPage) {
          const rawContacts = await pupPage.evaluate(() => {
            const contacts = [];

            // Tentar várias fontes de contatos
            const sources = [];

            // Fonte 1: Store.Contact
            if (window.Store && window.Store.Contact) {
              try {
                const arr = window.Store.Contact.getModelsArray();
                sources.push({ name: 'Contact', count: arr.length });
                arr.forEach(contact => {
                  contacts.push({
                    id: contact.id?._serialized,
                    number: contact.id?.user,
                    pushname: contact.pushname,
                    name: contact.name,
                    shortName: contact.shortName,
                    verifiedName: contact.verifiedName,
                    notifyName: contact.notifyName,
                    isWAContact: contact.isWAContact,
                    source: 'Contact'
                  });
                });
              } catch (e) { console.log('Erro Contact:', e.message); }
            }

            // Fonte 2: Store.Chat - extrair dados dos próprios chats (IMPORTANTE para LIDs)
            if (window.Store && window.Store.Chat) {
              try {
                const arr = window.Store.Chat.getModelsArray();
                sources.push({ name: 'Chat', count: arr.length });
                arr.forEach(chat => {
                  if (!chat.isGroup) {
                    const chatId = chat.id?._serialized;
                    const existing = contacts.find(c => c.id === chatId);

                    // Extrair nome de várias fontes possíveis do chat
                    const chatPushname = chat.contact?.pushname ||
                                         chat.pushname ||
                                         chat.notifyName ||
                                         chat.formattedTitle ||
                                         chat.name;

                    // Tentar pegar o número real (pode estar em diferentes lugares)
                    const realNumber = chat.contact?.id?.user ||
                                       chat.contact?.number ||
                                       chat.id?.user;

                    if (!existing) {
                      contacts.push({
                        id: chatId,
                        number: realNumber,
                        pushname: chatPushname,
                        name: chat.contact?.name || chat.formattedTitle,
                        shortName: chat.contact?.shortName,
                        verifiedName: chat.contact?.verifiedName,
                        notifyName: chat.contact?.notifyName || chat.notifyName,
                        isWAContact: true,
                        source: 'Chat'
                      });
                    } else {
                      // Atualizar se o existente não tinha pushname
                      if (!existing.pushname && chatPushname && !chatPushname.startsWith('+')) {
                        existing.pushname = chatPushname;
                      }
                      if (!existing.notifyName && chat.notifyName) {
                        existing.notifyName = chat.notifyName;
                      }
                    }
                  }
                });
              } catch (e) { console.log('Erro Chat:', e.message); }
            }

            // Fonte 3: Tentar mapear LID -> número real via phonebook/contacts
            if (window.Store && window.Store.Wap) {
              try {
                // Alguns campos adicionais que podem ter o mapeamento
                sources.push({ name: 'Wap', count: 'checked' });
              } catch (e) { }
            }

            console.log('Fontes de contatos:', JSON.stringify(sources));
            return contacts;
          });

          console.log(`🔵 SERVIDOR: ${rawContacts.length} contatos encontrados via Store`);

          // Log dos primeiros 5 contatos com pushname para debug
          const withPushname = rawContacts.filter(c => c.pushname);
          console.log(`🔵 SERVIDOR: ${withPushname.length} contatos com pushname`);
          if (withPushname.length > 0) {
            console.log('📇 Exemplos de contatos com pushname:', withPushname.slice(0, 5).map(c => ({
              id: c.id?.slice(-20),
              number: c.number,
              pushname: c.pushname,
              name: c.name
            })));
          }

          for (const contact of rawContacts) {
            if (contact.id) {
              contactsMap.set(contact.id, contact);
              // Também mapear variações do ID (c.us, lid, etc)
              const parts = contact.id.split('@');
              if (parts.length === 2) {
                contactsMap.set(parts[0], contact); // só o número/lid
                contactsMap.set(`${parts[0]}@c.us`, contact);
                contactsMap.set(`${parts[0]}@lid`, contact);
              }
            }
            if (contact.number) {
              contactsMap.set(contact.number, contact);
              contactsMap.set(`${contact.number}@c.us`, contact);
            }
          }
          console.log(`🔵 SERVIDOR: Mapa de contatos com ${contactsMap.size} entradas`);
        }
      } catch (e) {
        console.log('⚠️ Erro ao buscar contatos via Store:', e.message);
      }

      const chatsToProcess = limit === 'all' ? chats : chats.slice(0, parseInt(limit));
      const total = chatsToProcess.length;

      // Emitir início da sincronização
      console.log(`🔵 SERVIDOR: Emitindo sync_start com total=${total}`);
      socket.emit('sync_start', { total });

      // Processar conversas em lotes para melhor performance
      const batchSize = 10;
      const processedConversations = [];

      for (let i = 0; i < chatsToProcess.length; i += batchSize) {
        const batch = chatsToProcess.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        try {
          // Processar cada chat usando dados disponíveis
          const batchResults = await Promise.all(batch.map(async (chat) => {
            let contactName = chat.name;
            let phoneNumber = chat.id.user || '';

            // Para chats individuais, buscar dados do contato via API oficial
            if (!chat.isGroup) {
              const chatIdSerialized = chat.id._serialized;
              const chatUser = chat.id.user;
              const shouldLog = processedConversations.length < 10;

              if (shouldLog) {
                console.log(`\n🔍 DEBUG Chat #${processedConversations.length + 1}:`);
                console.log(`   ID: ${chatIdSerialized}`);
                console.log(`   Chat.name: "${chat.name}"`);

                // Debug extra para os primeiros chats
                try {
                  const pupPage = whatsappClient.pupPage;
                  if (pupPage) {
                    const debugData = await pupPage.evaluate((cid) => {
                      const chat = window.Store?.Chat?.get(cid);
                      if (!chat) return { found: false };

                      // Pegar a última mensagem recebida
                      let lastReceivedMsg = null;
                      if (chat.msgs) {
                        const msgs = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : [];
                        for (let i = msgs.length - 1; i >= 0; i--) {
                          if (!msgs[i].id?.fromMe) {
                            const m = msgs[i];
                            lastReceivedMsg = {
                              notifyName: m.notifyName,
                              senderPushname: m.senderObj?.pushname,
                              senderNotifyName: m.senderObj?.notifyName,
                              dataNotifyName: m._data?.notifyName,
                              senderObjKeys: m.senderObj ? Object.keys(m.senderObj).slice(0, 10) : null
                            };
                            break;
                          }
                        }
                      }

                      return {
                        found: true,
                        contact: {
                          exists: !!chat.contact,
                          pushname: chat.contact?.pushname,
                          notifyName: chat.contact?.notifyName,
                          name: chat.contact?.name
                        },
                        chat: {
                          pushname: chat.pushname,
                          notifyName: chat.notifyName,
                          formattedTitle: chat.formattedTitle,
                          displayName: chat.displayName,
                          title: chat.title
                        },
                        lastReceivedMsg
                      };
                    }, chatIdSerialized);
                    console.log(`   DEBUG Store:`, JSON.stringify(debugData, null, 2));
                  }
                } catch (e) {
                  console.log(`   DEBUG erro: ${e.message}`);
                }
              }

              // MÉTODO 1: Buscar diretamente no Store via Puppeteer (bypass da API bugada)
              try {
                const pupPage = whatsappClient.pupPage;
                if (pupPage) {
                  const storeData = await pupPage.evaluate((cid) => {
                    const result = { name: null, number: null };

                    if (!window.Store || !window.Store.Chat) return result;

                    const chat = window.Store.Chat.get(cid);
                    if (!chat) return result;

                    // 1. Tentar do contact associado ao chat
                    if (chat.contact) {
                      const names = [
                        chat.contact.pushname,
                        chat.contact.notifyName,
                        chat.contact.name,
                        chat.contact.verifiedName,
                        chat.contact.shortName
                      ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                      if (names.length > 0) {
                        result.name = names[0];
                      }

                      if (chat.contact.id?.user) {
                        result.number = chat.contact.id.user;
                      }
                    }

                    // 2. Se não achou, tentar do próprio chat
                    if (!result.name) {
                      const chatNames = [
                        chat.pushname,
                        chat.notifyName,
                        chat.formattedTitle,
                        chat.name
                      ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                      if (chatNames.length > 0) {
                        result.name = chatNames[0];
                      }
                    }

                    // 3. Se ainda não achou, buscar nas mensagens recentes
                    if (!result.name && chat.msgs) {
                      try {
                        const msgs = chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : [];
                        for (let i = msgs.length - 1; i >= 0 && i >= msgs.length - 20; i--) {
                          const msg = msgs[i];
                          if (msg && !msg.id?.fromMe) {
                            // Tentar múltiplas fontes de nome na mensagem
                            const senderNames = [
                              msg.senderObj?.pushname,
                              msg.senderObj?.notifyName,
                              msg.senderObj?.name,
                              msg.notifyName,
                              msg._data?.notifyName,
                              msg.sender?.pushname,
                              msg.sender?.notifyName
                            ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                            if (senderNames.length > 0) {
                              result.name = senderNames[0];
                              break;
                            }
                          }
                        }
                      } catch (e) { /* ignorar */ }
                    }

                    // 4. Última tentativa: verificar o título formatado do header do chat
                    if (!result.name) {
                      try {
                        const displayName = chat.displayName || chat.title || chat.__x_formattedTitle;
                        if (displayName && !displayName.startsWith('+')) {
                          result.name = displayName;
                        }
                      } catch (e) { /* ignorar */ }
                    }

                    return result;
                  }, chatIdSerialized);

                  if (storeData.name) {
                    contactName = storeData.name;
                    if (shouldLog) {
                      console.log(`   ✅ Via Store direto: "${contactName}"`);
                    }
                  }
                  if (storeData.number) {
                    phoneNumber = storeData.number;
                  }
                }
              } catch (e) {
                if (shouldLog) {
                  console.log(`   ⚠️ Store direto erro: ${e.message}`);
                }
              }

              // MÉTODO 2: Fallback para mapa de contatos do Store
              if (!contactName || contactName.startsWith('+')) {
                let contact = contactsMap.get(chatIdSerialized) ||
                              contactsMap.get(chatUser) ||
                              contactsMap.get(`${chatUser}@c.us`) ||
                              contactsMap.get(`${chatUser}@lid`);

                if (contact) {
                  const possibleNames = [
                    contact.pushname,
                    contact.notifyName,
                    contact.name,
                    contact.shortName,
                    contact.verifiedName
                  ].filter(n => n && n !== 'undefined' && !n.startsWith('+'));

                  if (possibleNames.length > 0) {
                    contactName = possibleNames[0];
                    if (shouldLog) {
                      console.log(`   ✅ Via contactsMap: "${contactName}"`);
                    }
                  }

                  if (contact.number && !phoneNumber) {
                    phoneNumber = contact.number;
                  }
                }
              }

              // MÉTODO 4: Usar chat.name se for um nome válido
              if (!contactName || contactName.startsWith('+')) {
                const chatName = chat.name || chat.formattedTitle || chat.notifyName;
                if (chatName && chatName !== 'undefined' && !chatName.startsWith('+')) {
                  contactName = chatName;
                  if (shouldLog) {
                    console.log(`   ✅ Via chat.name: "${contactName}"`);
                  }
                }
              }

              if (shouldLog) {
                console.log(`   RESULTADO: "${contactName}"`);
              }
            }

            return {
              id: chat.id._serialized,
              name: contactName || (phoneNumber ? `+${phoneNumber}` : 'Desconhecido'),
              phoneNumber: phoneNumber,
              isGroup: chat.isGroup || false,
              unreadCount: chat.unreadCount || 0,
              lastMessage: chat.lastMessage?.body || null,
              timestamp: chat.lastMessage?.timestamp || null,
              profilePicUrl: null
            };
          }));

          processedConversations.push(...batchResults);
          console.log(`🔵 SERVIDOR: Lote ${batchNumber} processado, ${processedConversations.length} conversas no total`);
        } catch (batchError) {
          console.error(`🔴 SERVIDOR: Erro no lote ${batchNumber}:`, batchError.message);
          // Continuar com o próximo lote mesmo se este falhar
        }

        // Emitir progresso com as conversas processadas até agora
        const processed = Math.min(i + batchSize, total);
        socket.emit('sync_progress', {
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
          conversations: processedConversations
        });
      }

      // Emitir conclusão
      console.log(`🔵 SERVIDOR: Emitindo sync_complete com ${processedConversations.length} conversas`);
      socket.emit('sync_complete', {
        total: processedConversations.length,
        conversations: processedConversations
      });

      console.log(`🔵 SERVIDOR: Sincronização concluída: ${processedConversations.length} conversas`);

      // Buscar fotos de perfil em background (não bloqueia o sync)
      console.log('🔵 SERVIDOR: Iniciando busca de fotos de perfil em background...');
      (async () => {
        const batchSize = 20;
        for (let i = 0; i < processedConversations.length; i += batchSize) {
          const batch = processedConversations.slice(i, i + batchSize);
          const updates = [];

          for (const conv of batch) {
            try {
              const picUrl = await whatsappClient.getProfilePicUrl(conv.id);
              if (picUrl) {
                conv.profilePicUrl = picUrl;
                updates.push({ id: conv.id, profilePicUrl: picUrl });
              }
            } catch (e) {
              // Sem foto de perfil, ignorar
            }
          }

          // Emitir atualização de fotos em lote
          if (updates.length > 0) {
            socket.emit('profile_pics_update', { updates });
          }
        }
        console.log('🔵 SERVIDOR: Busca de fotos de perfil concluída');
      })();
    } catch (err) {
      console.error('Erro na sincronização:', err);
      socket.emit('sync_error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// ================== INICIALIZAÇÃO ==================

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     SmartExpress WhatsApp Server                       ║
║     Usando whatsapp-web.js                             ║
╠════════════════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:${PORT}            ║
║  Status: Aguardando conexão                            ║
║                                                        ║
║  Endpoints disponíveis:                                ║
║  - GET  /api/status      - Status da conexão           ║
║  - GET  /api/qr          - Obter QR Code               ║
║  - POST /api/connect     - Iniciar conexão             ║
║  - POST /api/disconnect  - Desconectar                 ║
║  - POST /api/send        - Enviar mensagem             ║
║  - GET  /api/conversations - Listar conversas          ║
║  - GET  /api/messages/:id  - Mensagens de uma conversa ║
║  - GET  /api/contacts    - Listar contatos             ║
║  - DELETE /api/chat/:id  - Excluir conversa            ║
╚════════════════════════════════════════════════════════╝
  `);

  // Auto-inicializar se houver sessão salva
  if (existsSync(`${SESSION_PATH}/session`)) {
    console.log('Sessão anterior encontrada, tentando reconectar...');
    initializeWhatsAppClient();
  }
});
