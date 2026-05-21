const axios = require('axios');

const enviarPush = async (tokens, titulo, body, data = {}) => {
  const validos = (Array.isArray(tokens) ? tokens : [tokens])
    .filter((t) => t && typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (validos.length === 0) return;

  const messages = validos.map((to) => ({
    to,
    title: titulo,
    body,
    data,
    sound: 'default',
    priority: 'high',
  }));

  try {
    await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 8000,
    });
  } catch (e) {
    console.error('Erro ao enviar push:', e.message);
  }
};

module.exports = { enviarPush };
