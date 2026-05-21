const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const bloqueios = await prisma.bloqueioHorario.findMany({
      where: { professorId: req.usuario.id },
      orderBy: { timeStart: 'asc' },
    });
    return res.json(bloqueios);
  } catch (err) {
    console.error('listar bloqueios error:', err);
    return res.status(500).json({ error: 'Erro ao listar bloqueios.' });
  }
};

const criar = async (req, res) => {
  try {
    const { timeStart, timeEnd, descricao } = req.body;
    if (!timeStart || !timeEnd) {
      return res.status(400).json({ error: 'timeStart e timeEnd são obrigatórios.' });
    }
    const bloqueio = await prisma.bloqueioHorario.create({
      data: { professorId: req.usuario.id, timeStart, timeEnd, descricao: descricao || null },
    });
    return res.status(201).json(bloqueio);
  } catch (err) {
    console.error('criar bloqueio error:', err);
    return res.status(500).json({ error: 'Erro ao criar bloqueio.' });
  }
};

const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const existe = await prisma.bloqueioHorario.findFirst({
      where: { id, professorId: req.usuario.id },
    });
    if (!existe) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
    await prisma.bloqueioHorario.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletar bloqueio error:', err);
    return res.status(500).json({ error: 'Erro ao deletar bloqueio.' });
  }
};

module.exports = { listar, criar, deletar };
