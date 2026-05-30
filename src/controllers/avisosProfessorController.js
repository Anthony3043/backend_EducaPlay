const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enviarPush } = require('../services/pushService');

// Professor envia aviso de atraso ou ausência
const enviar = async (req, res) => {
  try {
    const { tipo, horarioChegada, motivo, professorSubstitutoId, diaSemana } = req.body;
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

    let substituto = null;
    let aulasSubstituidas = 0;

    // ── Substituição de professor ──────────────────────────────
    if (professorSubstitutoId && diaSemana) {
      substituto = await prisma.usuario.findUnique({
        where: { id: professorSubstitutoId },
        select: { id: true, nome: true },
      });

      if (substituto) {
        // Busca aulas do professor naquele dia
        const aulasNoDia = await prisma.aula.findMany({
          where: {
            professorId,
            diaSemana,
            isInterval: false,
          },
        });

        let aulasParaAtualizar = aulasNoDia;

        // Se atraso: só atualiza aulas que começam antes do horário de chegada
        if (tipo === 'atraso' && horarioChegada) {
          aulasParaAtualizar = aulasNoDia.filter(a => a.timeStart < horarioChegada);
        }

        if (aulasParaAtualizar.length > 0) {
          await prisma.aula.updateMany({
            where: { id: { in: aulasParaAtualizar.map(a => a.id) } },
            data: { professorId: professorSubstitutoId },
          });
          aulasSubstituidas = aulasParaAtualizar.length;
        }
      }
    }

    // ── Notificações para a supervisão ─────────────────────────
    const supervisores = await prisma.usuario.findMany({
      where: { papel: 'Supervisao' },
      select: { id: true, expoPushToken: true },
    });

    const icon  = tipo === 'atraso' ? '⚠️' : '🚫';
    const label = tipo === 'atraso' ? 'Atraso' : 'Ausência';
    const horaStr = tipo === 'atraso' && horarioChegada ? ` — chegada: ${horarioChegada}` : '';
    const subStr  = substituto ? ` | Substituto: ${substituto.nome}` : '';

    const titulo   = `${icon} ${label}: ${professor.nome}`;
    const mensagem = `${motivo.trim()}${horaStr}${subStr}`;

    if (supervisores.length > 0) {
      await Promise.all(
        supervisores.map(sup =>
          prisma.notificacao.create({
            data: { usuarioId: sup.id, icon, titulo, mensagem, lida: false },
          })
        )
      );

      const tokens = supervisores.map(s => s.expoPushToken).filter(Boolean);
      if (tokens.length > 0) {
        await enviarPush(tokens, titulo, mensagem, {
          tipo, professorId, professorNome: professor.nome,
          horarioChegada: horarioChegada || null,
          substitutoNome: substituto?.nome || null,
        });
      }
    }

    return res.json({ ok: true, notificados: supervisores.length, aulasSubstituidas });
  } catch (err) {
    console.error('avisosProfessor.enviar error:', err);
    return res.status(500).json({ error: 'Não foi possível enviar o aviso.' });
  }
};

// Supervisão busca avisos não lidos (polling a cada 30s no app)
const recentes = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }

    // Busca notificações não lidas que são avisos (ícone ⚠️ ou 🚫)
    const avisos = await prisma.notificacao.findMany({
      where: {
        usuarioId: req.usuario.id,
        lida: false,
        OR: [
          { icon: '⚠️' },
          { icon: '🚫' },
          { titulo: { contains: 'Atraso' } },
          { titulo: { contains: 'Ausência' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (avisos.length === 0) return res.json([]);

    // Busca ID do professor pelo nome extraído do título
    const nomesUnicos = [...new Set(avisos.map(a =>
      a.titulo.replace(/^[⚠️🚫]\s*(Atraso|Ausência):\s*/u, '').trim()
    ))];
    const professoresEncontrados = await prisma.usuario.findMany({
      where: { nome: { in: nomesUnicos }, papel: 'Professor' },
      select: { id: true, nome: true, foto: true },
    });
    const profMap = new Map(professoresEncontrados.map(p => [p.nome, p]));

    // Formata para o front
    const resultado = avisos.map(a => {
      const isAtraso = a.titulo.includes('Atraso') || a.icon === '⚠️';
      const nomeProfessor = a.titulo
        .replace(/^[⚠️🚫]\s*(Atraso|Ausência):\s*/u, '')
        .trim();

      let horarioChegada = null;
      let motivo = a.mensagem;
      const matchHora = a.mensagem.match(/^(.+?)\s*—\s*chegada:\s*(.+?)(?:\s*\|.*)?$/);
      if (matchHora) {
        motivo = matchHora[1].trim();
        horarioChegada = matchHora[2].trim();
      }
      // Remove info de substituto da mensagem se houver
      motivo = motivo.replace(/\s*\|.*$/, '').trim();

      const prof = profMap.get(nomeProfessor);

      return {
        id: a.id,
        tipo: isAtraso ? 'atraso' : 'ausencia',
        professor: prof
          ? { id: prof.id, nome: prof.nome, foto: prof.foto }
          : { id: null, nome: nomeProfessor, foto: null },
        horarioChegada,
        motivo,
        criadoEm: a.createdAt,
      };
    });

    // Marca como lidas para não aparecer no próximo poll
    await prisma.notificacao.updateMany({
      where: { id: { in: avisos.map(a => a.id) } },
      data: { lida: true },
    });

    return res.json(resultado);
  } catch (err) {
    console.error('avisosProfessor.recentes error:', err);
    return res.status(500).json({ error: 'Não foi possível buscar os avisos.' });
  }
};

// Supervisão substitui — aceita array { substituicoes: [{ aulaId, professorSubstitutoId, professorOriginalId }] }
const substituir = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Apenas supervisão pode substituir professores.' });
    }

    const { substituicoes } = req.body;

    if (!Array.isArray(substituicoes) || substituicoes.length === 0) {
      return res.status(400).json({ error: 'substituicoes deve ser um array não vazio.' });
    }

    const hoje = new Date().toISOString().split('T')[0];

    await Promise.all(
      substituicoes
        .filter(s => s.professorSubstitutoId) // só onde escolheram um substituto
        .map(s =>
          prisma.substituicaoTemporaria.upsert({
            where: { aulaId_data: { aulaId: s.aulaId, data: hoje } },
            create: {
              aulaId: s.aulaId,
              data: hoje,
              professorOriginalId: s.professorOriginalId,
              professorSubstitutoId: s.professorSubstitutoId,
            },
            update: { professorSubstitutoId: s.professorSubstitutoId },
          })
        )
    );

    const count = substituicoes.filter(s => s.professorSubstitutoId).length;
    return res.json({ ok: true, aulasSubstituidas: count, data: hoje });
  } catch (err) {
    console.error('avisosProfessor.substituir error:', err);
    return res.status(500).json({ error: 'Não foi possível realizar a substituição.' });
  }
};

// Retorna AULAS do professor ausente com professores disponíveis POR HORÁRIO
const professoresDisponiveis = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }

    const { professorAbsenteId, diaSemana, horarioChegada } = req.query;
    if (!professorAbsenteId || !diaSemana) {
      return res.status(400).json({ error: 'professorAbsenteId e diaSemana são obrigatórios.' });
    }

    // Aulas do professor ausente naquele dia
    let aulasAlvo = await prisma.aula.findMany({
      where: { professorId: professorAbsenteId, diaSemana, isInterval: false },
      select: { id: true, timeStart: true, timeEnd: true, subject: true },
      orderBy: { timeStart: 'asc' },
    });

    // Atraso: só aulas ANTES do horário de chegada
    if (horarioChegada) {
      aulasAlvo = aulasAlvo.filter(a => a.timeStart < horarioChegada);
    }

    if (aulasAlvo.length === 0) return res.json([]);

    // Busca todos os professores ativos (exceto o ausente)
    const todosProfessores = await prisma.usuario.findMany({
      where: { papel: 'Professor', ativo: true, id: { not: professorAbsenteId } },
      select: { id: true, nome: true, foto: true, materias: true },
    });

    // Para cada aula, descobre quais professores têm conflito naquele horário específico
    const resultado = await Promise.all(aulasAlvo.map(async aula => {
      const comConflito = await prisma.aula.findMany({
        where: {
          diaSemana,
          isInterval: false,
          professorId: { not: professorAbsenteId },
          timeStart: { lt: aula.timeEnd },
          timeEnd: { gt: aula.timeStart },
          professor: { isNot: null },
        },
        select: { professorId: true },
        distinct: ['professorId'],
      });

      const idsOcupados = new Set(comConflito.map(a => a.professorId).filter(Boolean));

      return {
        aulaId: aula.id,
        timeStart: aula.timeStart,
        timeEnd: aula.timeEnd,
        subject: aula.subject,
        professoresDisponiveis: todosProfessores.filter(p => !idsOcupados.has(p.id)),
      };
    }));

    return res.json(resultado);
  } catch (err) {
    console.error('avisosProfessor.professoresDisponiveis error:', err);
    return res.status(500).json({ error: 'Erro ao buscar professores disponíveis.' });
  }
};

module.exports = { enviar, recentes, substituir, professoresDisponiveis };
