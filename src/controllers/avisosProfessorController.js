const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Professor envia aviso de atraso ou ausência para a supervisão
const enviar = async (req, res) => {
  try {
    const { tipo, horarioChegada, motivo } = req.body;
    const professorId = req.usuario.id;

    if (req.usuario.papel !== 'Professor') {
      return res.status(403).json({ error: 'Apenas professores podem enviar avisos.' });
    }
    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'Motivo é obrigatório.' });
    }
    if (!['atraso', 'ausencia'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use "atraso" ou "ausencia".' });
    }

    const professor = await prisma.usuario.findUnique({ where: { id: professorId } });
    if (!professor) return res.status(404).json({ error: 'Professor não encontrado.' });

    // Busca todos os usuários de Supervisão para notificar
    const supervisores = await prisma.usuario.findMany({
      where: { papel: 'Supervisao' },
      select: { id: true },
    });

    const icon  = tipo === 'atraso' ? '⚠️' : '🚫';
    const label = tipo === 'atraso' ? 'Atraso' : 'Ausência';
    const horaStr = tipo === 'atraso' && horarioChegada
      ? ` — chegada prevista: ${horarioChegada}`
      : '';

    const titulo   = `${icon} ${label}: ${professor.nome}`;
    const mensagem = `${motivo.trim()}${horaStr}`;

    // Cria uma notificação para cada supervisor
    await Promise.all(
      supervisores.map(sup =>
        prisma.notificacao.create({
          data: {
            usuarioId: sup.id,
            icon: icon,
            titulo,
            mensagem,
            lida: false,
          },
        })
      )
    );

    return res.json({ ok: true, notificados: supervisores.length });
  } catch (err) {
    console.error('avisosProfessor.enviar error:', err);
    return res.status(500).json({ error: 'Não foi possível enviar o aviso.' });
  }
};

// Supervisão busca avisos recentes (notificações de atraso/ausência)
const recentes = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }

    const avisos = await prisma.notificacao.findMany({
      where: {
        usuarioId: req.usuario.id,
        lida: false,
        OR: [
          { titulo: { contains: 'Atraso' } },
          { titulo: { contains: 'Ausência' } },
          { titulo: { contains: '⚠️' } },
          { titulo: { contains: '🚫' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Formata para o front esperando: { professor: { nome }, tipo, horarioChegada, motivo, criadoEm }
    const resultado = avisos.map(a => {
      const isAtraso = a.titulo.includes('Atraso') || a.titulo.includes('⚠️');
      const nomeProfessor = a.titulo.replace(/^[⚠️🚫]\s*(Atraso|Ausência):\s*/u, '').trim();

      let horarioChegada = null;
      let motivo = a.mensagem;
      const match = a.mensagem.match(/^(.+?)\s*—\s*chegada prevista:\s*(.+)$/);
      if (match) {
        motivo = match[1].trim();
        horarioChegada = match[2].trim();
      }

      return {
        id: a.id,
        tipo: isAtraso ? 'atraso' : 'ausencia',
        professor: { nome: nomeProfessor },
        horarioChegada,
        motivo,
        criadoEm: a.createdAt,
      };
    });

    // Marca como lidas após retornar
    if (avisos.length > 0) {
      await prisma.notificacao.updateMany({
        where: { id: { in: avisos.map(a => a.id) } },
        data: { lida: true },
      });
    }

    return res.json(resultado);
  } catch (err) {
    console.error('avisosProfessor.recentes error:', err);
    return res.status(500).json({ error: 'Não foi possível buscar os avisos.' });
  }
};

module.exports = { enviar, recentes };
