const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Paleta de cores aleatórias ────────────────────────────────────────────────
const PALETA = [
  '#4361ee', '#f97316', '#8b5cf6', '#e11d48', '#0891b2',
  '#f59e0b', '#ec4899', '#6b7280', '#d97706', '#7c3aed',
  '#0f766e', '#9333ea', '#1d4ed8', '#16a34a', '#be185d',
];

// ── Mapa: palavra no nome → cor hex ──────────────────────────────────────────
const CORES_NOME = {
  laranja:   '#f97316',
  azul:      '#3b82f6',
  amarelo:   '#f59e0b',
  amarela:   '#f59e0b',
  verde:     '#16a34a',
  vermelho:  '#ef4444',
  vermelha:  '#ef4444',
  rosa:      '#ec4899',
  roxo:      '#8b5cf6',
  roxa:      '#8b5cf6',
  cinza:     '#6b7280',
  preto:     '#1e293b',
  preta:     '#1e293b',
  branco:    '#94a3b8',
  branca:    '#94a3b8',
  dourado:   '#d97706',
  dourada:   '#d97706',
  violeta:   '#7c3aed',
  turquesa:  '#0891b2',
  lilas:     '#a78bfa',
  coral:     '#f43f5e',
  prata:     '#94a3b8',
  ouro:      '#d97706',
};

// Remove acentos e deixa minúsculo para comparação
function normalizar(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Detecta se o nome contém uma palavra de cor — retorna o hex ou null
function detectarCorNome(nome) {
  const n = normalizar(nome);
  for (const [palavra, hex] of Object.entries(CORES_NOME)) {
    if (n.includes(normalizar(palavra))) return hex;
  }
  return null;
}

// Escolhe cor aleatória que ainda não está em coresUsadas
function corAleatoria(coresUsadas) {
  const disponiveis = PALETA.filter(c => !coresUsadas.includes(c));
  const pool = disponiveis.length > 0 ? disponiveis : PALETA;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Determina a cor da sala e faz swap se necessário
// salaIdAtual = id da sala sendo criada/editada (excluir da busca de existentes)
async function determinarCor(nome, salaIdAtual = null, escolaId = null) {
  const where = { ...(salaIdAtual ? { id: { not: salaIdAtual } } : {}), ...(escolaId ? { escolaId } : {}) };
  const existentes = await prisma.sala.findMany({ where, select: { id: true, cor: true } });
  const coresUsadas = existentes.map(s => s.cor).filter(Boolean);

  const corNome = detectarCorNome(nome);

  if (corNome) {
    // Se outra sala já tem essa cor, troca ela para uma cor aleatória
    const colisao = existentes.find(s => s.cor === corNome);
    if (colisao) {
      const novaCor = corAleatoria(coresUsadas.filter(c => c !== corNome));
      await prisma.sala.update({ where: { id: colisao.id }, data: { cor: novaCor } });
    }
    return corNome;
  }

  return corAleatoria(coresUsadas);
}

// ── Controllers ───────────────────────────────────────────────────────────────

const ef = (req) => ({ escolaId: req.usuario.escolaId });

const listar = async (req, res) => {
  try {
    const salas = await prisma.sala.findMany({ where: { ...ef(req) }, orderBy: { nome: 'asc' } });
    return res.json(salas);
  } catch (err) {
    console.error('listar salas error:', err);
    return res.status(500).json({ error: 'Erro ao listar salas.' });
  }
};

const criar = async (req, res) => {
  try {
    const { nome, turma, capacidade } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome da sala é obrigatório.' });
    const cor = await determinarCor(nome, null, req.usuario.escolaId);
    const sala = await prisma.sala.create({
      data: { nome, turma: turma || null, capacidade: capacidade || null, cor, escolaId: req.usuario.escolaId },
    });
    return res.status(201).json(sala);
  } catch (err) {
    console.error('criar sala error:', err);
    return res.status(500).json({ error: 'Erro ao criar sala.' });
  }
};

const atualizar = async (req, res) => {
  try {
    const { nome, turma, capacidade } = req.body;
    const existe = await prisma.sala.findFirst({ where: { id: req.params.id, ...ef(req) } });
    if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
    const cor = nome !== existe.nome
      ? await determinarCor(nome, req.params.id, req.usuario.escolaId)
      : existe.cor || await determinarCor(nome, req.params.id, req.usuario.escolaId);
    const sala = await prisma.sala.update({
      where: { id: req.params.id },
      data: { nome, turma: turma ?? null, capacidade: capacidade ?? null, cor },
    });
    return res.json(sala);
  } catch (err) {
    console.error('atualizar sala error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar sala.' });
  }
};

const deletar = async (req, res) => {
  try {
    const existe = await prisma.sala.findFirst({ where: { id: req.params.id, ...ef(req) } });
    if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
    await prisma.sala.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletar sala error:', err);
    return res.status(500).json({ error: 'Erro ao deletar sala.' });
  }
};

module.exports = { listar, criar, atualizar, deletar };
