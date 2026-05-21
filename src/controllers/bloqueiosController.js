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

    // Encontra aulas conflitantes deste professor no mesmo período
    const aulasConflitantes = await prisma.aula.findMany({
      where: {
        professorId: req.usuario.id,
        isInterval: false,
        timeStart: { lt: timeEnd },
        timeEnd: { gt: timeStart },
      },
      include: { cronograma: true },
    });

    if (aulasConflitantes.length > 0) {
      // Remove as aulas conflitantes
      await prisma.aula.deleteMany({
        where: { id: { in: aulasConflitantes.map((a) => a.id) } },
      });

      // Notifica todos os supervisores
      const supervisores = await prisma.usuario.findMany({
        where: { papel: 'Supervisao' },
        select: { id: true },
      });
      const local = descricao ? `"${descricao}"` : 'outra escola';
      for (const aula of aulasConflitantes) {
        for (const sup of supervisores) {
          await prisma.notificacao.create({
            data: {
              usuarioId: sup.id,
              titulo: 'Aula removida por conflito',
              mensagem: `A aula "${aula.subject}" (${aula.timeStart}–${aula.timeEnd}) foi removida pois o professor ficou indisponível — está em ${local}.`,
              icon: '⚠️',
            },
          });
        }
      }
    }

    return res.status(201).json({ bloqueio, aulasRemovidas: aulasConflitantes.length });
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
