const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const professores = await prisma.professor.findMany({ orderBy: { nome: 'asc' } });
  return res.json(professores.map(p => ({ ...p, materias: JSON.parse(p.materias) })));
};

const buscarPorId = async (req, res) => {
  const professor = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });
  return res.json({ ...professor, materias: JSON.parse(professor.materias) });
};

const criar = async (req, res) => {
  const { nome, materias } = req.body;
  if (!nome || !materias?.length) {
    return res.status(400).json({ error: 'Nome e ao menos uma matéria são obrigatórios.' });
  }
  const professor = await prisma.professor.create({
    data: { nome, materias: JSON.stringify(materias) },
  });
  return res.status(201).json({ ...professor, materias: JSON.parse(professor.materias) });
};

const atualizar = async (req, res) => {
  const { nome, materias } = req.body;
  const existe = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: 'Professor não encontrado.' });

  const professor = await prisma.professor.update({
    where: { id: req.params.id },
    data: { nome, materias: JSON.stringify(materias) },
  });
  return res.json({ ...professor, materias: JSON.parse(professor.materias) });
};

const deletar = async (req, res) => {
  const existe = await prisma.professor.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: 'Professor não encontrado.' });
  await prisma.professor.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
