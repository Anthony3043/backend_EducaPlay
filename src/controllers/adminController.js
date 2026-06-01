/**
 * adminController.js — Rotas de administração do EducaPlay
 * Protegidas pela variável de ambiente ADMIN_SECRET_KEY
 * Apenas o desenvolvedor conhece essa chave
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verificarAdmin = (req, res, next) => {
  const chave = req.headers['x-admin-key'];
  if (!chave || chave !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

// Listar todas as escolas
const listarEscolas = async (req, res) => {
  try {
    const escolas = await prisma.escola.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usuarios: true } } },
    });
    return res.json(escolas);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Criar nova escola
const criarEscola = async (req, res) => {
  try {
    const { nome, codigo } = req.body;
    if (!nome || !codigo) return res.status(400).json({ error: 'nome e codigo são obrigatórios.' });

    const existe = await prisma.escola.findUnique({ where: { codigo } });
    if (existe) return res.status(409).json({ error: 'Código já está em uso por outra escola.' });

    const escola = await prisma.escola.create({ data: { nome, codigo } });
    return res.status(201).json(escola);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Ativar / desativar escola
const toggleEscola = async (req, res) => {
  try {
    const { id } = req.params;
    const escola = await prisma.escola.findUnique({ where: { id } });
    if (!escola) return res.status(404).json({ error: 'Escola não encontrada.' });

    const atualizada = await prisma.escola.update({
      where: { id },
      data: { ativo: !escola.ativo },
    });
    return res.json(atualizada);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Atualizar escola
const atualizarEscola = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, codigo, instituicao } = req.body;

    const escola = await prisma.escola.findUnique({ where: { id } });
    if (!escola) return res.status(404).json({ error: 'Escola não encontrada.' });

    if (codigo && codigo !== escola.codigo) {
      const codigoEmUso = await prisma.escola.findUnique({ where: { codigo } });
      if (codigoEmUso) return res.status(409).json({ error: 'Código já está em uso.' });
    }

    const atualizada = await prisma.escola.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(codigo && { codigo }),
      },
    });
    return res.json(atualizada);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { verificarAdmin, listarEscolas, criarEscola, toggleEscola, atualizarEscola };
