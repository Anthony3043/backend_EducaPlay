const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listar = async (req, res) => {
  const notificacoes = await prisma.notificacao.findMany({
    where: { usuarioId: req.usuario.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(notificacoes);
};

const marcarLida = async (req, res) => {
  const notif = await prisma.notificacao.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.usuarioId !== req.usuario.id) {
    return res.status(404).json({ error: 'Notificação não encontrada.' });
  }
  const atualizada = await prisma.notificacao.update({ where: { id: req.params.id }, data: { lida: true } });
  return res.json(atualizada);
};

const marcarTodasLidas = async (req, res) => {
  await prisma.notificacao.updateMany({ where: { usuarioId: req.usuario.id, lida: false }, data: { lida: true } });
  return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
};

const deletar = async (req, res) => {
  const notif = await prisma.notificacao.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.usuarioId !== req.usuario.id) {
    return res.status(404).json({ error: 'Notificação não encontrada.' });
  }
  await prisma.notificacao.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

const limparTodas = async (req, res) => {
  await prisma.notificacao.deleteMany({ where: { usuarioId: req.usuario.id } });
  return res.status(204).send();
};

module.exports = { listar, marcarLida, marcarTodasLidas, deletar, limparTodas };
