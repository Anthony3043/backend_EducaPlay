const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enviarPush } = require('../services/pushService');

function haversineMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const registrar = async (req, res) => {
  if (req.usuario.papel !== 'Professor') {
    return res.status(403).json({ error: 'Apenas professores podem registrar ponto.' });
  }

  const { aulaId, diaSemana, latitude, longitude } = req.body;
  if (!aulaId || !diaSemana || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: aulaId, diaSemana, latitude, longitude.' });
  }

  try {
    const aula = await prisma.aula.findFirst({
      where: { id: aulaId, professorId: req.usuario.id },
      include: { sala: true },
    });
    if (!aula) return res.status(404).json({ error: 'Aula não encontrada ou não pertence a você.' });

    const config = await prisma.configuracaoEscola.findFirst();
    if (config && (config.latitude !== 0 || config.longitude !== 0)) {
      const distancia = haversineMetros(latitude, longitude, config.latitude, config.longitude);
      if (distancia > config.raio) {
        return res.status(400).json({
          error: `Você está a ${Math.round(distancia)}m da escola. Necessário estar dentro do raio de ${Math.round(config.raio)}m.`,
          fora: true,
          distancia: Math.round(distancia),
          raio: Math.round(config.raio),
        });
      }
    }

    const existente = await prisma.baterPonto.findFirst({
      where: { aulaId, professorId: req.usuario.id, diaSemana },
    });
    if (existente) {
      return res.status(409).json({ error: 'Ponto já registrado para esta aula neste dia.' });
    }

    const ponto = await prisma.baterPonto.create({
      data: { professorId: req.usuario.id, aulaId, diaSemana, latitude, longitude },
    });

    return res.status(201).json({ mensagem: 'Ponto registrado com sucesso!', ponto });
  } catch (err) {
    console.error('registrar ponto error:', err);
    return res.status(500).json({ error: 'Erro ao registrar ponto.' });
  }
};

const buscarPonto = async (req, res) => {
  const { aulaId } = req.params;
  const { diaSemana } = req.query;
  try {
    const where = { aulaId, professorId: req.usuario.id };
    if (diaSemana) where.diaSemana = diaSemana;
    const ponto = await prisma.baterPonto.findFirst({ where, orderBy: { timestamp: 'desc' } });
    return res.json(ponto || null);
  } catch (err) {
    console.error('buscar ponto error:', err);
    return res.status(500).json({ error: 'Erro ao buscar ponto.' });
  }
};

const notificarFalta = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode enviar notificações de falta.' });
  }

  const { aulaId, diaSemana } = req.body;
  if (!aulaId || !diaSemana) {
    return res.status(400).json({ error: 'Campos obrigatórios: aulaId, diaSemana.' });
  }

  try {
    const aula = await prisma.aula.findUnique({
      where: { id: aulaId },
      include: {
        professor: { select: { id: true, nome: true, expoPushToken: true } },
        sala: { select: { nome: true } },
      },
    });
    if (!aula || !aula.professor) {
      return res.status(404).json({ error: 'Aula ou professor não encontrado.' });
    }

    const titulo = 'Ponto não registrado';
    const mensagem = `Você não registrou presença na aula de ${aula.subject} (${aula.timeStart}–${aula.timeEnd}) na ${diaSemana}.`;

    await prisma.notificacao.create({
      data: { usuarioId: aula.professor.id, titulo, mensagem, icon: 'aviso' },
    });

    if (aula.professor.expoPushToken) {
      await enviarPush(aula.professor.expoPushToken, titulo, mensagem);
    }

    return res.json({ mensagem: 'Notificação de falta enviada.' });
  } catch (err) {
    console.error('notificarFalta error:', err);
    return res.status(500).json({ error: 'Erro ao enviar notificação.' });
  }
};

const listarPontosSala = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
  }

  const { diaSemana } = req.query;
  try {
    const where = {};
    if (diaSemana) where.diaSemana = diaSemana;
    const pontos = await prisma.baterPonto.findMany({
      where,
      include: {
        professor: { select: { id: true, nome: true } },
        aula: { select: { id: true, subject: true, timeStart: true, timeEnd: true, diaSemana: true, sala: { select: { nome: true } } } },
      },
      orderBy: { timestamp: 'desc' },
    });
    return res.json(pontos);
  } catch (err) {
    console.error('listarPontosSala error:', err);
    return res.status(500).json({ error: 'Erro ao listar pontos.' });
  }
};

const resumoDia = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
  }
  const { diaSemana } = req.query;
  if (!diaSemana) return res.status(400).json({ error: 'diaSemana é obrigatório.' });

  try {
    const aulas = await prisma.aula.findMany({
      where: { diaSemana, professorId: { not: null }, isInterval: false },
      include: {
        professor: { select: { id: true, nome: true, expoPushToken: true } },
        sala: { select: { id: true, nome: true, turma: true } },
        pontos: { where: { diaSemana } },
      },
      orderBy: { timeStart: 'asc' },
    });

    const resultado = aulas.map((aula) => ({
      aulaId: aula.id,
      subject: aula.subject,
      timeStart: aula.timeStart,
      timeEnd: aula.timeEnd,
      professor: aula.professor,
      sala: aula.sala,
      pontoBatido: aula.pontos.length > 0,
      pontoTimestamp: aula.pontos[0]?.timestamp ?? null,
    }));

    return res.json(resultado);
  } catch (err) {
    console.error('resumoDia error:', err);
    return res.status(500).json({ error: 'Erro ao buscar resumo do dia.' });
  }
};

module.exports = { registrar, buscarPonto, notificarFalta, listarPontosSala, resumoDia };
