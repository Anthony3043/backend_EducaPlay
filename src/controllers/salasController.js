const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const salas = await prisma.sala.findMany({ orderBy: { nome: 'asc' } });
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
    const sala = await prisma.sala.create({ data: { nome, turma: turma || null, capacidade: capacidade || null } });
    return res.status(201).json(sala);
  } catch (err) {
    console.error('criar sala error:', err);
    return res.status(500).json({ error: 'Erro ao criar sala.' });
  }
};

const atualizar = async (req, res) => {
  try {
    const { nome, turma, capacidade } = req.body;
    const existe = await prisma.sala.findUnique({ where: { id: req.params.id } });
    if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
    const sala = await prisma.sala.update({
      where: { id: req.params.id },
      data: { nome, turma: turma ?? null, capacidade: capacidade ?? null },
    });
    return res.json(sala);
  } catch (err) {
    console.error('atualizar sala error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar sala.' });
  }
};

const deletar = async (req, res) => {
  try {
    const existe = await prisma.sala.findUnique({ where: { id: req.params.id } });
    if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
    await prisma.sala.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletar sala error:', err);
    return res.status(500).json({ error: 'Erro ao deletar sala.' });
  }
};

module.exports = { listar, criar, atualizar, deletar };
