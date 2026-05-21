const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { enviarEmailRecuperacao } = require('../services/emailService');

const prisma = new PrismaClient();

const register = async (req, res) => {
  const { nome, email, senha, papel, instituicao, cargo } = req.body;

  if (!nome || !email || !senha || !papel) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, papel.' });
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) return res.status(409).json({ error: 'E-mail já cadastrado.' });

  const hash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senha: hash, papel, instituicao, cargo },
  });

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.status(201).json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, cargo: usuario.cargo },
  });
};

const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return res.status(401).json({ error: 'Credenciais inválidas.' });

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  if (!senhaCorreta) return res.status(401).json({ error: 'Credenciais inválidas.' });

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, cargo: usuario.cargo, instituicao: usuario.instituicao, foto: usuario.foto },
  });
};

const perfil = async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { id: true, nome: true, email: true, papel: true, cargo: true, instituicao: true, foto: true },
  });
  return res.json(usuario);
};

const atualizarPerfil = async (req, res) => {
  try {
    const { nome, cargo, instituicao, foto } = req.body;
    const data = { nome, cargo, instituicao };
    if (foto !== undefined) data.foto = foto;
    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data,
      select: { id: true, nome: true, email: true, papel: true, cargo: true, instituicao: true, foto: true },
    });
    return res.json(usuario);
  } catch (err) {
    console.error('atualizarPerfil error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: 'E-mail não cadastrado.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiracao = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.usuario.update({
      where: { email },
      data: { resetToken: token, resetTokenExp: expiracao },
    });

    try {
      await enviarEmailRecuperacao(email, usuario.nome, token);
    } catch (e) {
      console.error('Erro ao enviar e-mail:', e.message);
    }

    return res.json({ existe: true });
  } catch (err) {
    console.error('checkEmail error:', err);
    return res.status(500).json({ error: 'Erro ao processar recuperação de senha.' });
  }
};

const resetSenha = async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });

  const usuario = await prisma.usuario.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  });

  if (!usuario) return res.status(400).json({ error: 'Token inválido ou expirado.' });

  const hash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senha: hash, resetToken: null, resetTokenExp: null },
  });

  return res.json({ message: 'Senha redefinida com sucesso.' });
};

module.exports = { register, login, perfil, atualizarPerfil, checkEmail, resetSenha };
