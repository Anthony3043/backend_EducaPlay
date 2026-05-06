const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const professores = await prisma.usuario.findMany({
    where: { papel: 'Professor' },
    select: { id: true, nome: true, email: true, cargo: true, instituicao: true },
    orderBy: { nome: 'asc' },
  });
  return res.json(professores);
};

module.exports = { listar };
