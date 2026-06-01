const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const buscar = async (req, res) => {
  try {
    const escolaId = req.usuario.escolaId;
    let config = await prisma.configuracaoEscola.findFirst({ where: { escolaId } });
    if (!config) {
      config = await prisma.configuracaoEscola.create({ data: { latitude: 0, longitude: 0, raio: 200, escolaId } });
    }
    return res.json(config);
  } catch (err) {
    console.error('buscar config error:', err);
    return res.status(500).json({ error: 'Erro ao buscar configuração.' });
  }
};

const salvar = async (req, res) => {
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode configurar a escola.' });
  }
  const { latitude, longitude, raio } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude e longitude são obrigatórios.' });
  }
  try {
    const escolaId = req.usuario.escolaId;
    const data = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      raio: raio !== undefined ? Number(raio) : 200,
      escolaId,
    };
    const config = await prisma.configuracaoEscola.upsert({
      where: { escolaId: escolaId ?? '' },
      update: data,
      create: data,
    });
    return res.json(config);
  } catch (err) {
    console.error('salvar config error:', err);
    return res.status(500).json({ error: 'Erro ao salvar configuração.' });
  }
};

module.exports = { buscar, salvar };
