const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  try {
    const professores = await prisma.usuario.findMany({
      where: { papel: 'Professor' },
      select: { id: true, nome: true, cargo: true, foto: true, materias: true, ativo: true, podeEditarMapaSala: true },
      orderBy: { nome: 'asc' },
    });
    return res.json(professores);
  } catch (err) {
    console.error('listar professores error:', err);
    return res.status(500).json({ error: 'Erro ao listar professores.' });
  }
};

const desativar = async (req, res) => {
  const { id } = req.params;
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode desativar professores.' });
  }
  try {
    const professor = await prisma.usuario.findFirst({ where: { id, papel: 'Professor' } });
    if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });

    await prisma.usuario.update({ where: { id }, data: { ativo: false } });
    return res.json({ mensagem: 'Professor desativado com sucesso.' });
  } catch (err) {
    console.error('desativar professor error:', err);
    return res.status(500).json({ error: 'Erro ao desativar professor.' });
  }
};

const reativar = async (req, res) => {
  const { id } = req.params;
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode reativar professores.' });
  }
  try {
    const professor = await prisma.usuario.findFirst({ where: { id, papel: 'Professor' } });
    if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });

    await prisma.usuario.update({ where: { id }, data: { ativo: true } });
    return res.json({ mensagem: 'Professor reativado com sucesso.' });
  } catch (err) {
    console.error('reativar professor error:', err);
    return res.status(500).json({ error: 'Erro ao reativar professor.' });
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
      select: { id: true, nome: true, cargo: true, foto: true, materias: true, ativo: true, podeEditarMapaSala: true },
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
      select: { id: true, nome: true, cargo: true, foto: true, materias: true, ativo: true, podeEditarMapaSala: true },
    });
    return res.json(atualizado);
  } catch (err) {
    console.error('atualizarMaterias error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar matérias.' });
  }
};

const atualizarPermissaoMapa = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode alterar permissões.' });
  }
  const { id } = req.params;
  const { podeEditarMapaSala } = req.body;
  try {
    const professor = await prisma.usuario.findFirst({ where: { id, papel: 'Professor' } });
    if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });

    const atualizado = await prisma.usuario.update({
      where: { id },
      data: { podeEditarMapaSala: Boolean(podeEditarMapaSala) },
      select: { id: true, podeEditarMapaSala: true },
    });
    return res.json(atualizado);
  } catch (err) {
    console.error('atualizarPermissaoMapa error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar permissão.' });
  }
};

module.exports = { listar, desativar, reativar, criar, atualizarMaterias, atualizarPermissaoMapa };
