const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
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

const criar = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode cadastrar professores.' });
  }

  const { nome, email, senha, materias } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha.' });
  }

  try {
    const supervisao = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { instituicao: true },
    });

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(409).json({ error: 'E-mail já cadastrado.' });

    const hash = await bcrypt.hash(senha, 10);
    const professor = await prisma.usuario.create({
      data: {
        nome, email, senha: hash, papel: 'Professor',
        instituicao: supervisao?.instituicao ?? null,
        materias: Array.isArray(materias) ? materias : [],
      },
      select: { id: true, nome: true, cargo: true, foto: true, materias: true },
    });
    return res.status(201).json(professor);
  } catch (err) {
    console.error('criar professor error:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar professor.' });
  }
};

const atualizarMaterias = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode editar professores.' });
  }
  const { id } = req.params;
  const { materias } = req.body;
  if (!Array.isArray(materias)) {
    return res.status(400).json({ error: 'Materias deve ser uma lista.' });
  }
  try {
    const professor = await prisma.usuario.findFirst({ where: { id, papel: 'Professor' } });
    if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });

    const atualizado = await prisma.usuario.update({
      where: { id },
      data: { materias },
      select: { id: true, nome: true, cargo: true, foto: true, materias: true },
    });
    return res.json(atualizado);
  } catch (err) {
    console.error('atualizarMaterias error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar matérias.' });
  }
};

module.exports = { listar, excluir, criar, atualizarMaterias };
