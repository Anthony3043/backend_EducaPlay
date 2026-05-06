const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const salas = await prisma.sala.findMany({ orderBy: { nome: 'asc' } });
  return res.json(salas);
};

const criar = async (req, res) => {
  const { nome, capacidade } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da sala é obrigatório.' });
  const sala = await prisma.sala.create({ data: { nome, capacidade } });
  return res.status(201).json(sala);
};

const atualizar = async (req, res) => {
  const { nome, capacidade } = req.body;
  const existe = await prisma.sala.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
  const sala = await prisma.sala.update({ where: { id: req.params.id }, data: { nome, capacidade } });
  return res.json(sala);
};

const deletar = async (req, res) => {
  const existe = await prisma.sala.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: 'Sala não encontrada.' });
  await prisma.sala.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

module.exports = { listar, criar, atualizar, deletar };
