const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const professores = await prisma.professor.findMany({
      orderBy: { nome: 'asc' },
    });
    return res.json(professores.map(p => ({
      ...p,
      materias: JSON.parse(p.materias),
    })));
  } catch (err) {
    console.error('listar professores error:', err);
    return res.status(500).json({ error: 'Erro ao listar professores.' });
  }
};

module.exports = { listar };
