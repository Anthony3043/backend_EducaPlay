const axios = require('axios');

const enviarPush = async (tokens, titulo, body, data = {}) => {
  const validos = (Array.isArray(tokens) ? tokens : [tokens])
    .filter((t) => t && typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (validos.length === 0) return;

  // Detecta o tipo para escolher canal e cor
  const tipo = data.tipo || '';
  const isAtraso  = tipo === 'atraso'  || titulo.includes('Atraso');
  const isAusencia = tipo === 'ausencia' || titulo.includes('Ausência');
  const isPonto   = titulo.includes('Ponto') || titulo.includes('ponto');

  const channelId = isAtraso || isAusencia ? 'avisos_v2' : isPonto ? 'ponto_v2' : 'geral_v2';
  const color     = isAtraso ? '#f97316' : isAusencia ? '#ef4444' : isPonto ? '#3b82f6' : '#3a7d44';

  // Remove emojis do título para a barra de notificação do sistema
  const tituloLimpo = titulo.replace(/[\u{1F300}-\u{1FFFF}⚠️✅🚫📅🔔📍✏️🗑️]/gu, '').trim();

  const messages = validos.map((to) => ({
    to,
    title: tituloLimpo,
    body,
    data,
    sound: 'default',
    priority: 'high',
    channelId,
    color,
    badge: 1,
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
