const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const professores = await prisma.usuario.findMany({
      where: { papel: 'Professor' },
      select: { id: true, nome: true, cargo: true, foto: true, materias: true },
      orderBy: { nome: 'asc' },
    });
    return res.json(professores);
  } catch (err) {
    console.error('listar professores error:', err);
    return res.status(500).json({ error: 'Erro ao listar professores.' });
  }
};

const excluir = async (req, res) => {
  const { id } = req.params;
  try {
    const professor = await prisma.usuario.findFirst({
      where: { id, papel: 'Professor' },
    });
    if (!professor) {
      return res.status(404).json({ error: 'Professor não encontrado.' });
    }

    // Desvincula aulas que referenciam este professor
    await prisma.aula.updateMany({
      where: { professorId: id },
      data: { professorId: null },
    });

    // Desvincula disponibilidades criadas por este usuário
    await prisma.disponibilidade.updateMany({
      where: { usuarioId: id },
      data: { usuarioId: null },
    });

    // Deleta o usuário (BloqueioHorario e Notificacao cascadeiam automaticamente)
    await prisma.usuario.delete({ where: { id } });

    return res.json({ mensagem: 'Professor excluído com sucesso.' });
  } catch (err) {
    console.error('excluir professor error:', err);
    return res.status(500).json({ error: 'Erro ao excluir professor.' });
  }
};

module.exports = { listar, excluir };
