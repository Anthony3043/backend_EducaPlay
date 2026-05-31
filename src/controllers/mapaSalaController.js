const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function gerarAssentos(n) {
  const assentos = [];
  for (let i = 1; i <= n; i++) {
    assentos.push({ id: String(i), numero: i, nome: null });
  }
  return assentos;
}

const buscar = async (req, res) => {
  const { salaId } = req.params;
  try {
    const sala = await prisma.sala.findUnique({
      where: { id: salaId },
      include: { mapa: true },
    });
    if (!sala) return res.status(404).json({ error: 'Sala não encontrada.' });

    if (!sala.mapa) {
      const capacidadeNum = sala.capacidade ? parseInt(sala.capacidade) : 30;
      const n = isNaN(capacidadeNum) ? 30 : Math.min(Math.max(capacidadeNum, 1), 80);
      const assentos = gerarAssentos(n);
      const mapa = await prisma.mapaSala.create({ data: { salaId, assentos, colunas: 5 } });
      return res.json({ salaId, salaNome: sala.nome, salaTurma: sala.turma, capacidade: sala.capacidade, assentos: mapa.assentos, colunas: mapa.colunas });
    }

    return res.json({ salaId, salaNome: sala.nome, salaTurma: sala.turma, capacidade: sala.capacidade, assentos: sala.mapa.assentos, colunas: sala.mapa.colunas });
  } catch (err) {
    console.error('buscar mapa error:', err);
    return res.status(500).json({ error: 'Erro ao buscar mapa da sala.' });
  }
};

const atualizar = async (req, res) => {
  const { salaId } = req.params;
  const { assentos, colunas } = req.body;

  if (req.usuario.papel === 'Professor') {
    // Verifica permissão por sala específica (novo modelo) OU permissão legada
    const permissao = await prisma.permissaoMapaSala.findUnique({
      where: { professorId_salaId: { professorId: req.usuario.id, salaId } },
    });
    if (!permissao) {
      return res.status(403).json({ error: 'Você não tem permissão para editar o mapa desta sala.' });
    }
  }

  if (!Array.isArray(assentos)) {
    return res.status(400).json({ error: 'Assentos deve ser uma lista.' });
  }

  try {
    const sala = await prisma.sala.findUnique({ where: { id: salaId } });
    if (!sala) return res.status(404).json({ error: 'Sala não encontrada.' });

    const updateData = { assentos };
    if (typeof colunas === 'number' && colunas >= 1 && colunas <= 10) {
      updateData.colunas = colunas;
    }

    const mapa = await prisma.mapaSala.upsert({
      where: { salaId },
      update: updateData,
      create: { salaId, assentos, colunas: updateData.colunas ?? 5 },
    });

    return res.json({ salaId, assentos: mapa.assentos, colunas: mapa.colunas });
  } catch (err) {
    console.error('atualizar mapa error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar mapa da sala.' });
  }
};

const regenerar = async (req, res) => {
  const { salaId } = req.params;
  if (req.usuario.papel !== 'Supervisao') {
    return res.status(403).json({ error: 'Apenas a supervisão pode regenerar o mapa.' });
  }

  try {
    const sala = await prisma.sala.findUnique({ where: { id: salaId } });
    if (!sala) return res.status(404).json({ error: 'Sala não encontrada.' });

    const capacidadeNum = sala.capacidade ? parseInt(sala.capacidade) : 30;
    const n = isNaN(capacidadeNum) ? 30 : Math.min(Math.max(capacidadeNum, 1), 80);
    const assentos = gerarAssentos(n);

    const mapa = await prisma.mapaSala.upsert({
      where: { salaId },
      update: { assentos },
      create: { salaId, assentos, colunas: 5 },
    });

    return res.json({ salaId, assentos: mapa.assentos, colunas: mapa.colunas });
  } catch (err) {
    console.error('regenerar mapa error:', err);
    return res.status(500).json({ error: 'Erro ao regenerar mapa.' });
  }
};

module.exports = { buscar, atualizar, regenerar };
