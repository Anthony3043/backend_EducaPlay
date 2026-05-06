const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const cronogramas = await prisma.cronograma.findMany({
    include: { aulas: { include: { professor: true }, orderBy: { timeStart: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(cronogramas.map(c => ({
    ...c,
    aulas: c.aulas.map(a => ({
      ...a,
      professor: a.professor ? { ...a.professor, materias: JSON.parse(a.professor.materias) } : null,
    })),
  })));
};

const buscarPorTurno = async (req, res) => {
  const { turno } = req.params;
  const cronograma = await prisma.cronograma.findFirst({
    where: { turno },
    include: { aulas: { include: { professor: true }, orderBy: { timeStart: 'asc' } } },
  });
  if (!cronograma) return res.status(404).json({ error: 'Cronograma não encontrado.' });
  return res.json({
    ...cronograma,
    aulas: cronograma.aulas.map(a => ({
      ...a,
      professor: a.professor ? { ...a.professor, materias: JSON.parse(a.professor.materias) } : null,
    })),
  });
};

const criar = async (req, res) => {
  const { turno } = req.body;
  if (!turno) return res.status(400).json({ error: 'Turno é obrigatório.' });
  const cronograma = await prisma.cronograma.create({ data: { turno } });
  return res.status(201).json(cronograma);
};

const atualizarAula = async (req, res) => {
  const { id } = req.params;
  const { subject, timeStart, timeEnd, isInterval, professorId } = req.body;
  const existe = await prisma.aula.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ error: 'Aula não encontrada.' });
  const aula = await prisma.aula.update({
    where: { id },
    data: { subject, timeStart, timeEnd, isInterval, professorId },
    include: { professor: true },
  });
  return res.json({
    ...aula,
    professor: aula.professor ? { ...aula.professor, materias: JSON.parse(aula.professor.materias) } : null,
  });
};

const deletar = async (req, res) => {
  const existe = await prisma.cronograma.findUnique({ where: { id: req.params.id } });
  if (!existe) return res.status(404).json({ error: 'Cronograma não encontrado.' });
  await prisma.cronograma.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

module.exports = { listar, buscarPorTurno, criar, atualizarAula, deletar };
