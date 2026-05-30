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

    // Formata para o front
    const resultado = avisos.map(a => {
      const isAtraso = a.titulo.includes('Atraso') || a.icon === '⚠️';
      // Extrai nome do professor do título: "⚠️ Atraso: Nome Aqui" → "Nome Aqui"
      const nomeProfessor = a.titulo
        .replace(/^[⚠️🚫]\s*(Atraso|Ausência):\s*/u, '')
        .trim();

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

// Supervisão substitui um professor APENAS para o dia de hoje (sem alterar cronograma permanente)
const substituir = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Apenas supervisão pode substituir professores.' });
    }

    const { professorAbsenteId, professorSubstitutoId, diaSemana, horarioChegada } = req.body;

    if (!professorAbsenteId || !professorSubstitutoId || !diaSemana) {
      return res.status(400).json({ error: 'professorAbsenteId, professorSubstitutoId e diaSemana são obrigatórios.' });
    }

    // Data de hoje no formato YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    // Busca aulas do professor ausente naquele dia
    const aulas = await prisma.aula.findMany({
      where: { professorId: professorAbsenteId, diaSemana, isInterval: false },
    });

    // Filtra pelo horário de chegada (atraso: só antes da chegada)
    const aulasAlvo = horarioChegada
      ? aulas.filter(a => a.timeStart < horarioChegada)
      : aulas;

    if (aulasAlvo.length === 0) {
      return res.json({ ok: true, aulasSubstituidas: 0 });
    }

    // Cria SubstituicaoTemporaria para cada aula — NÃO altera o professorId permanente
    await Promise.all(
      aulasAlvo.map(aula =>
        prisma.substituicaoTemporaria.upsert({
          where: { aulaId_data: { aulaId: aula.id, data: hoje } },
          create: {
            aulaId: aula.id,
            data: hoje,
            professorOriginalId: professorAbsenteId,
            professorSubstitutoId,
          },
          update: { professorSubstitutoId },
        })
      )
    );

    return res.json({ ok: true, aulasSubstituidas: aulasAlvo.length, data: hoje });
  } catch (err) {
    console.error('avisosProfessor.substituir error:', err);
    return res.status(500).json({ error: 'Não foi possível realizar a substituição.' });
  }
};

// Retorna professores disponíveis para substituir (sem conflito de horário)
const professoresDisponiveis = async (req, res) => {
  try {
    if (req.usuario.papel !== 'Supervisao') {
      return res.status(403).json({ error: 'Acesso restrito à supervisão.' });
    }

    const { professorAbsenteId, diaSemana, horarioChegada } = req.query;
    if (!professorAbsenteId || !diaSemana) {
      return res.status(400).json({ error: 'professorAbsenteId e diaSemana são obrigatórios.' });
    }

    // Busca as aulas que precisam ser cobertas (aulas do professor ausente)
    const aulasAusente = await prisma.aula.findMany({
      where: { professorId: professorAbsenteId, diaSemana, isInterval: false },
      select: { timeStart: true, timeEnd: true },
    });

    // Filtra pelo horário de chegada se for atraso
    const aulasAlvo = horarioChegada
      ? aulasAusente.filter(a => a.timeStart < horarioChegada)
      : aulasAusente;

    if (aulasAlvo.length === 0) {
      // Nenhuma aula para cobrir — retorna todos os professores ativos exceto o ausente
      const todos = await prisma.usuario.findMany({
        where: { papel: 'Professor', ativo: true, id: { not: professorAbsenteId } },
        select: { id: true, nome: true, foto: true, materias: true },
      });
      return res.json(todos);
    }

    // Descobre quais professores JÁ têm aulas naqueles horários (conflito)
    const horarios = aulasAlvo.map(a => ({ timeStart: a.timeStart, timeEnd: a.timeEnd }));

    // Professores com conflito: têm aula no mesmo dia em qualquer um dos horários a cobrir
    const comConflito = await prisma.aula.findMany({
      where: {
        diaSemana,
        isInterval: false,
        professorId: { not: professorAbsenteId, not: null },
        OR: horarios.map(h => ({
          AND: [
            { timeStart: { lt: h.timeEnd } },
            { timeEnd: { gt: h.timeStart } },
          ],
        })),
      },
      select: { professorId: true },
      distinct: ['professorId'],
    });

    const idsComConflito = new Set(comConflito.map(a => a.professorId).filter(Boolean));

    // Retorna professores ativos sem conflito
    const todos = await prisma.usuario.findMany({
      where: { papel: 'Professor', ativo: true, id: { not: professorAbsenteId } },
      select: { id: true, nome: true, foto: true, materias: true },
    });

    const disponiveis = todos.filter(p => !idsComConflito.has(p.id));
    return res.json(disponiveis);
  } catch (err) {
    console.error('avisosProfessor.professoresDisponiveis error:', err);
    return res.status(500).json({ error: 'Erro ao buscar professores disponíveis.' });
  }
};

module.exports = { enviar, recentes, substituir, professoresDisponiveis };
