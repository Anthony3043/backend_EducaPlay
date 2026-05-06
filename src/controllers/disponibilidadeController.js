const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const { professorId } = req.params;
  const disponibilidades = await prisma.disponibilidade.findMany({
    where: { professorId },
    orderBy: { diaSemana: 'asc' },
  });
  return res.json(disponibilidades);
};

const salvar = async (req, res) => {
  const { professorId, slots } = req.body;
  // slots: [{ diaSemana, turno }]
  if (!professorId || !slots?.length) {
    return res.status(400).json({ error: 'professorId e slots são obrigatórios.' });
  }

  // Remove as antigas e recria
  await prisma.disponibilidade.deleteMany({ where: { professorId } });
  const criadas = await prisma.disponibilidade.createMany({
    data: slots.map(s => ({ professorId, diaSemana: s.diaSemana, turno: s.turno, usuarioId: req.usuario.id })),
  });

  return res.status(201).json({ count: criadas.count });
};

module.exports = { listar, salvar };
