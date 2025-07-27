import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let whatsappClient = null;
let isInitialized = false;
let initializationPromise = null;
let reconnecting = false;

export const initWhatsAppClient = async () => {
  if (whatsappClient) return whatsappClient;

  console.log('Inicializando cliente WhatsApp...');

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp_session'
    }),
    puppeteer: {
      headless: true, // Cambiar a false para ver el navegador
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    }
  });

  whatsappClient.on('qr', qr => {
    console.log('\n\n=== ESCANEA ESTE CÓDIGO QR CON WHATSAPP ===');
    qrcode.generate(qr, { small: true });
    console.log('===========================================\n\n');
  });

  whatsappClient.on('authenticated', () => {
    console.log('Autenticación exitosa!');
  });

  whatsappClient.on('auth_failure', msg => {
    console.error('Error de autenticación:', msg);
  });

  whatsappClient.on('ready', () => {
    console.log('Cliente WhatsApp listo!');
    isInitialized = true;
    if (initializationPromise) {
      initializationPromise.resolve();
      initializationPromise = null;
    }
  });

  whatsappClient.on('disconnected', reason => {
    console.log('Cliente desconectado:', reason);
    whatsappClient = null;
    isInitialized = false;

    if (!reconnecting) {
      reconnecting = true;
      setTimeout(async () => {
        console.log('Reiniciando cliente WhatsApp después de desconexión...');
        await initWhatsAppClient();
        reconnecting = false;
      }, 5000);
    }
  });

  initializationPromise = new Promise((resolve, reject) => {
    whatsappClient.initialize().catch(reject);
  });

  return whatsappClient;
};

const waitForClientReady = () => {
  return new Promise((resolve, reject) => {
    if (isInitialized) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      whatsappClient.off('ready', readyListener);
      reject(new Error('Timeout esperando inicialización de WhatsApp'));
    }, 60000); // Aumentar a 60 segundos

    const readyListener = () => {
      clearTimeout(timeout);
      resolve();
    };

    whatsappClient.on('ready', readyListener);
  });
};

export const sendWhatsAppMessage = async (number, message) => {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!whatsappClient) {
        console.error('Cliente WhatsApp no inicializado, intentando inicializar...');
        await initWhatsAppClient();
      }

      if (!isInitialized) {
        console.log(`Esperando inicialización de WhatsApp (intento ${attempt}/${MAX_RETRIES})...`);
        await waitForClientReady();
      }

      const chatId = `${number}@c.us`;
      await whatsappClient.sendMessage(chatId, message);
      return true;
    } catch (error) {
      console.error(`Error enviando mensaje de WhatsApp (intento ${attempt}):`, error);

      if (error.message.includes('Execution context was destroyed') || 
          (error.originalMessage && error.originalMessage.includes('Execution context was destroyed'))) {
        console.log('Reinicializando cliente WhatsApp debido a contexto destruido...');

        try {
          if (whatsappClient) {
            await whatsappClient.destroy();
          }
        } catch (destroyError) {
          console.error('Error al destruir cliente:', destroyError);
        }

        whatsappClient = null;
        isInitialized = false;
        await initWhatsAppClient();
        continue;
      }

      return false;
    }
  }

  console.error('Todos los intentos fallaron para enviar el mensaje');
  return false;
};

// Inicializar inmediatamente al cargar el módulo
//initWhatsAppClient();
