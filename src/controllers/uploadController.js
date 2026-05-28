const { PrismaClient } = require('@prisma/client');
const { uploadArquivo, deletarArquivo } = require('../services/storageService');

const prisma = new PrismaClient();

const uploadFoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const { mimetype, buffer, size } = req.file;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
    return res.status(400).json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' });
  }
  if (size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { foto: true },
    });

    if (usuario?.foto) {
      await deletarArquivo(usuario.foto);
    }

    const url = await uploadArquivo(buffer, mimetype, 'fotos');

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { foto: url },
    });

    return res.json({ url });
  } catch (err) {
    console.error('uploadFoto error:', err);
    return res.status(500).json({ error: 'Erro ao fazer upload da foto.' });
  }
};

module.exports = { uploadFoto };
