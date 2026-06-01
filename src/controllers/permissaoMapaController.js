const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAX_POR_SALA = 2;

// Lista salas com quantidade de professores que podem editar + se o professor tem permissão
const listarSalasComPermissoes = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }
    const { professorId } = req.params;

    const salas = await prisma.sala.findMany({
      where: { escolaId: req.usuario.escolaId },
      include: {
        permissoesMapa: {
          select: { professorId: true },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return res.json(salas.map(s => ({
      id: s.id,
      nome: s.nome,
      turma: s.turma,
      capacidade: s.capacidade,
      totalPermitidos: s.permissoesMapa.length,
      cheio: s.permissoesMapa.length >= MAX_POR_SALA,
      temPermissao: s.permissoesMapa.some(p => p.professorId === professorId),
    })));
  } catch (err) {
    console.error('permissaoMapa.listarSalas error:', err);
    return res.status(500).json({ error: 'Erro ao listar salas.' });
  }
};

// Atualiza permissões de um professor (substitui a lista de salas)
const atualizarPermissoes = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }

    const { professorId } = req.params;
    const { salaIds } = req.body; // array de IDs das salas permitidas

    if (!Array.isArray(salaIds)) {
      return res.status(400).json({ error: 'salaIds deve ser um array.' });
    }

    // Valida que cada sala não ultrapassará o limite de 2
    for (const salaId of salaIds) {
      const jaExiste = await prisma.permissaoMapaSala.findUnique({
        where: { professorId_salaId: { professorId, salaId } },
      });
      if (!jaExiste) {
        const count = await prisma.permissaoMapaSala.count({ where: { salaId } });
        if (count >= MAX_POR_SALA) {
          const sala = await prisma.sala.findUnique({ where: { id: salaId }, select: { nome: true } });
          return res.status(400).json({ error: `A sala "${sala?.nome}" já tem ${MAX_POR_SALA} professores com permissão.` });
        }
      }
    }

    // Remove todas as permissões atuais do professor
    await prisma.permissaoMapaSala.deleteMany({ where: { professorId } });

    // Cria as novas
    if (salaIds.length > 0) {
      await prisma.permissaoMapaSala.createMany({
        data: salaIds.map(salaId => ({ professorId, salaId })),
        skipDuplicates: true,
      });
    }

    // Atualiza o campo legado podeEditarMapaSala
    await prisma.usuario.update({
      where: { id: professorId },
      data: { podeEditarMapaSala: salaIds.length > 0 },
    });

    return res.json({ ok: true, salas: salaIds.length });
  } catch (err) {
    console.error('permissaoMapa.atualizarPermissoes error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar permissões.' });
  }
};

// Verifica se professor tem permissão para uma sala específica
const verificarPermissao = async (req, res) => {
  try {
    const { professorId, salaId } = req.params;
    const perm = await prisma.permissaoMapaSala.findUnique({
      where: { professorId_salaId: { professorId, salaId } },
    });
    return res.json({ temPermissao: !!perm });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar permissão.' });
  }
};

module.exports = { listarSalasComPermissoes, atualizarPermissoes, verificarPermissao };
