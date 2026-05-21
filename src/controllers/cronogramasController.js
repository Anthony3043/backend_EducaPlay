const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const cronogramas = await prisma.cronograma.findMany({
      include: { aulas: { include: { professor: true, sala: true }, orderBy: { timeStart: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(cronogramas.map(c => ({
      ...c,
      aulas: c.aulas.map(a => ({
        ...a,
        professor: a.professor ? { ...a.professor, materias: JSON.parse(a.professor.materias) } : null,
      })),
    })));
  } catch (err) {
    console.error('listar error:', err);
    return res.status(500).json({ error: 'Erro ao listar cronogramas.' });
  }
};

const buscarPorTurno = async (req, res) => {
  try {
    const { turno } = req.params;
    const cronograma = await prisma.cronograma.findFirst({
      where: { turno },
      include: { aulas: { include: { professor: true, sala: true }, orderBy: { timeStart: 'asc' } } },
    });
    if (!cronograma) return res.status(404).json({ error: 'Cronograma não encontrado.' });
    return res.json({
      ...cronograma,
      aulas: cronograma.aulas.map(a => ({
        ...a,
        professor: a.professor ? { ...a.professor, materias: JSON.parse(a.professor.materias) } : null,
      })),
    });
  } catch (err) {
    console.error('buscarPorTurno error:', err);
    return res.status(500).json({ error: 'Erro ao buscar cronograma.' });
  }
};

const criar = async (req, res) => {
  try {
    const { turno } = req.body;
    if (!turno) return res.status(400).json({ error: 'Turno é obrigatório.' });
    const cronograma = await prisma.cronograma.create({ data: { turno } });
    return res.status(201).json(cronograma);
  } catch (err) {
    console.error('criar error:', err);
    return res.status(500).json({ error: 'Erro ao criar cronograma.' });
  }
};

const criarAula = async (req, res) => {
  try {
    const { cronogramaId, timeStart, timeEnd, subject, isInterval, professorId, salaId } = req.body;
    if (!cronogramaId || !timeStart || !timeEnd || !subject) {
      return res.status(400).json({ error: 'cronogramaId, timeStart, timeEnd e subject são obrigatórios.' });
    }
    const cronograma = await prisma.cronograma.findUnique({ where: { id: cronogramaId } });
    if (!cronograma) return res.status(404).json({ error: 'Cronograma não encontrado.' });

    if (!isInterval && professorId) {
      const confProfessor = await prisma.aula.findFirst({
        where: { professorId, timeStart, timeEnd, isInterval: false },
      });
      if (confProfessor) {
        return res.status(409).json({ error: 'Este professor já está alocado em outro horário neste mesmo período.' });
      }
    }

    if (!isInterval && salaId) {
      const confSala = await prisma.aula.findFirst({
        where: { salaId, timeStart, timeEnd, isInterval: false },
      });
      if (confSala) {
        return res.status(409).json({ error: 'Esta sala já está ocupada neste mesmo período.' });
      }
    }

    const aula = await prisma.aula.create({
      data: {
        cronogramaId,
        timeStart,
        timeEnd,
        subject,
        isInterval: !!isInterval,
        professorId: professorId || null,
        salaId: salaId || null,
      },
      include: { professor: true, sala: true },
    });
    return res.status(201).json({
      ...aula,
      professor: aula.professor ? { ...aula.professor, materias: JSON.parse(aula.professor.materias) } : null,
    });
  } catch (err) {
    console.error('criarAula error:', err);
    return res.status(500).json({ error: 'Erro ao criar aula.' });
  }
};

const atualizarAula = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, timeStart, timeEnd, isInterval, professorId, salaId } = req.body;
    const existe = await prisma.aula.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Aula não encontrada.' });
    const aula = await prisma.aula.update({
      where: { id },
      data: { subject, timeStart, timeEnd, isInterval, professorId, salaId },
      include: { professor: true, sala: true },
    });
    return res.json({
      ...aula,
      professor: aula.professor ? { ...aula.professor, materias: JSON.parse(aula.professor.materias) } : null,
    });
  } catch (err) {
    console.error('atualizarAula error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar aula.' });
  }
};

const deletar = async (req, res) => {
  try {
    const existe = await prisma.cronograma.findUnique({ where: { id: req.params.id } });
    if (!existe) return res.status(404).json({ error: 'Cronograma não encontrado.' });
    await prisma.cronograma.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletar error:', err);
    return res.status(500).json({ error: 'Erro ao deletar cronograma.' });
  }
};

module.exports = { listar, buscarPorTurno, criar, criarAula, atualizarAula, deletar };
