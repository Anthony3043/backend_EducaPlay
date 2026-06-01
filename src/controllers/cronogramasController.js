const { PrismaClient } = require('@prisma/client');
const { enviarPush } = require('../services/pushService');
const prisma = new PrismaClient();

async function notificarProfessor(professorId, titulo, mensagem, icon = 'calendario') {
  try {
    await prisma.notificacao.create({ data: { usuarioId: professorId, titulo, mensagem, icon } });
    const prof = await prisma.usuario.findUnique({ where: { id: professorId }, select: { expoPushToken: true } });
    if (prof?.expoPushToken) await enviarPush(prof.expoPushToken, titulo, mensagem);
  } catch (e) {
    console.error('notificarProfessor error:', e.message);
  }
}

// Builds the day-aware conflict filter for Aula
function diaConflictFilter(diaSemana) {
  if (!diaSemana) return {};
  return { OR: [{ diaSemana: null }, { diaSemana }] };
}

// Builds the day-aware conflict filter for BloqueioHorario
function diaConflictFilterBloqueio(diaSemana) {
  if (!diaSemana) return {};
  return { OR: [{ diaSemana: null }, { diaSemana }] };
}

// Aplica substituições temporárias de hoje nas aulas
async function aplicarSubstituicoes(aulas) {
  const hoje = new Date().toISOString().split('T')[0];
  const aulaIds = aulas.map(a => a.id);
  if (aulaIds.length === 0) return aulas;

  const subs = await prisma.substituicaoTemporaria.findMany({
    where: { aulaId: { in: aulaIds }, data: hoje },
    include: { professorSubstituto: { select: { id: true, nome: true, foto: true } } },
  });

  const subMap = new Map(subs.map(s => [s.aulaId, s.professorSubstituto]));

  return aulas.map(a => {
    const sub = subMap.get(a.id);
    if (!sub) return a;
    return { ...a, professor: sub, substitutoHoje: true };
  });
}

const listar = async (req, res) => {
  try {
    const cronogramas = await prisma.cronograma.findMany({
      where: { escolaId: req.usuario.escolaId },
      include: { aulas: { include: { professor: true, sala: true }, orderBy: { timeStart: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(cronogramas.map(async c => ({
      ...c,
      aulas: await aplicarSubstituicoes(
        c.aulas.map(a => ({
          ...a,
          professor: a.professor ? { id: a.professor.id, nome: a.professor.nome, foto: a.professor.foto } : null,
        }))
      ),
    })));

    return res.json(result);
  } catch (err) {
    console.error('listar error:', err);
    return res.status(500).json({ error: 'Erro ao listar cronogramas.' });
  }
};

const buscarPorTurno = async (req, res) => {
  try {
    const { turno } = req.params;
    const cronograma = await prisma.cronograma.findFirst({
      where: { turno, escolaId: req.usuario.escolaId },
      include: { aulas: { include: { professor: true, sala: true }, orderBy: { timeStart: 'asc' } } },
    });
    if (!cronograma) return res.status(404).json({ error: 'Cronograma não encontrado.' });
    return res.json({
      ...cronograma,
      aulas: cronograma.aulas.map(a => ({
        ...a,
        professor: a.professor ? { id: a.professor.id, nome: a.professor.nome } : null,
      })),
    });
  } catch (err) {
    console.error('buscarPorTurno error:', err);
    return res.status(500).json({ error: 'Erro ao buscar cronograma.' });
  }
};

const criar = async (req, res) => {
  try {
    const { turno } = req.body;
    if (!turno) return res.status(400).json({ error: 'Turno é obrigatório.' });
    const cronograma = await prisma.cronograma.create({ data: { turno, escolaId: req.usuario.escolaId } });
    return res.status(201).json(cronograma);
  } catch (err) {
    console.error('criar error:', err);
    return res.status(500).json({ error: 'Erro ao criar cronograma.' });
  }
};

const criarAula = async (req, res) => {
  try {
    const { cronogramaId, timeStart, timeEnd, subject, isInterval, professorId, salaId, diaSemana } = req.body;
    if (!cronogramaId || !timeStart || !timeEnd || !subject) {
      return res.status(400).json({ error: 'cronogramaId, timeStart, timeEnd e subject são obrigatórios.' });
    }
    const cronograma = await prisma.cronograma.findUnique({ where: { id: cronogramaId } });
    if (!cronograma) return res.status(404).json({ error: 'Cronograma não encontrado.' });

    if (!isInterval && professorId) {
      const confProfessor = await prisma.aula.findFirst({
        where: {
          professorId,
          isInterval: false,
          timeStart: { lt: timeEnd },
          timeEnd: { gt: timeStart },
          ...diaConflictFilter(diaSemana),
        },
        include: { sala: true },
      });
      if (confProfessor) {
        const prof = await prisma.usuario.findUnique({ where: { id: professorId }, select: { nome: true } });
        const nome = prof?.nome ?? 'O professor';
        const salaInfo = confProfessor.sala
          ? ` na sala ${confProfessor.sala.nome}${confProfessor.sala.turma ? ` — ${confProfessor.sala.turma}` : ''}`
          : ' em outra sala';
        return res.status(409).json({
          error: `Conflito de professor: ${nome} já está dando aula${salaInfo} neste mesmo horário (${confProfessor.timeStart}–${confProfessor.timeEnd}). Um professor não pode estar em duas salas ao mesmo tempo.`,
        });
      }

      const bloqueio = await prisma.bloqueioHorario.findFirst({
        where: {
          professorId,
          timeStart: { lt: timeEnd },
          timeEnd: { gt: timeStart },
          ...diaConflictFilterBloqueio(diaSemana),
        },
      });
      if (bloqueio) {
        const prof = await prisma.usuario.findUnique({ where: { id: professorId }, select: { nome: true } });
        const nome = prof?.nome ?? 'O professor';
        const local = bloqueio.descricao ? `"${bloqueio.descricao}"` : 'outra escola';
        return res.status(409).json({
          error: `${nome} está indisponível neste horário — está em ${local} das ${bloqueio.timeStart} às ${bloqueio.timeEnd}.`,
        });
      }
    }

    if (!isInterval && salaId) {
      const confSala = await prisma.aula.findFirst({
        where: {
          salaId,
          isInterval: false,
          timeStart: { lt: timeEnd },
          timeEnd: { gt: timeStart },
          ...diaConflictFilter(diaSemana),
        },
      });
      if (confSala) {
        const sala = await prisma.sala.findUnique({ where: { id: salaId }, select: { nome: true, turma: true } });
        const nomeSala = sala
          ? (sala.turma ? `${sala.nome} — ${sala.turma}` : sala.nome)
          : 'Esta sala';
        return res.status(409).json({
          error: `${nomeSala} já está ocupada neste período (${confSala.timeStart}–${confSala.timeEnd}). Aguarde o término da aula anterior.`,
        });
      }
    }

    const aula = await prisma.aula.create({
      data: {
        cronogramaId,
        timeStart,
        timeEnd,
        subject,
        diaSemana: diaSemana || null,
        isInterval: !!isInterval,
        professorId: professorId || null,
        salaId: salaId || null,
      },
      include: { professor: true, sala: true },
    });

    if (professorId && !isInterval) {
      const diaLabel = diaSemana ? ` (${diaSemana})` : '';
      await notificarProfessor(
        professorId,
        'Nova aula no seu cronograma',
        `Uma aula de "${subject}" foi adicionada: ${timeStart}–${timeEnd}${diaLabel} (turno ${cronograma.turno}).`,
        'calendario'
      );
    }

    return res.status(201).json({
      ...aula,
      professor: aula.professor ? { id: aula.professor.id, nome: aula.professor.nome } : null,
    });
  } catch (err) {
    console.error('criarAula error:', err);
    return res.status(500).json({ error: 'Erro ao criar aula.' });
  }
};

const atualizarAula = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, timeStart, timeEnd, professorId, salaId, diaSemana } = req.body;
    const existe = await prisma.aula.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Aula não encontrada.' });

    const novoStart = timeStart ?? existe.timeStart;
    const novoEnd = timeEnd ?? existe.timeEnd;
    const novoProfId = professorId !== undefined ? professorId : existe.professorId;
    const novoSalaId = salaId !== undefined ? salaId : existe.salaId;
    const novaDia = diaSemana !== undefined ? (diaSemana || null) : existe.diaSemana;

    if (!existe.isInterval && novoProfId) {
      const confProfessor = await prisma.aula.findFirst({
        where: {
          id: { not: id },
          professorId: novoProfId,
          isInterval: false,
          timeStart: { lt: novoEnd },
          timeEnd: { gt: novoStart },
          ...diaConflictFilter(novaDia),
        },
        include: { sala: true },
      });
      if (confProfessor) {
        const prof = await prisma.usuario.findUnique({ where: { id: novoProfId }, select: { nome: true } });
        const nome = prof?.nome ?? 'O professor';
        const salaInfo = confProfessor.sala
          ? ` na sala ${confProfessor.sala.nome}${confProfessor.sala.turma ? ` — ${confProfessor.sala.turma}` : ''}`
          : ' em outra sala';
        return res.status(409).json({
          error: `Conflito de professor: ${nome} já está dando aula${salaInfo} neste mesmo horário (${confProfessor.timeStart}–${confProfessor.timeEnd}). Um professor não pode estar em duas salas ao mesmo tempo.`,
        });
      }

      const bloqueio = await prisma.bloqueioHorario.findFirst({
        where: {
          professorId: novoProfId,
          timeStart: { lt: novoEnd },
          timeEnd: { gt: novoStart },
          ...diaConflictFilterBloqueio(novaDia),
        },
      });
      if (bloqueio) {
        const prof = await prisma.usuario.findUnique({ where: { id: novoProfId }, select: { nome: true } });
        const nome = prof?.nome ?? 'O professor';
        const local = bloqueio.descricao ? `"${bloqueio.descricao}"` : 'outra escola';
        return res.status(409).json({
          error: `${nome} está indisponível neste horário — está em ${local} das ${bloqueio.timeStart} às ${bloqueio.timeEnd}.`,
        });
      }
    }

    if (!existe.isInterval && novoSalaId) {
      const confSala = await prisma.aula.findFirst({
        where: {
          id: { not: id },
          salaId: novoSalaId,
          isInterval: false,
          timeStart: { lt: novoEnd },
          timeEnd: { gt: novoStart },
          ...diaConflictFilter(novaDia),
        },
      });
      if (confSala) {
        const sala = await prisma.sala.findUnique({ where: { id: novoSalaId }, select: { nome: true, turma: true } });
        const nomeSala = sala
          ? (sala.turma ? `${sala.nome} — ${sala.turma}` : sala.nome)
          : 'Esta sala';
        return res.status(409).json({
          error: `${nomeSala} já está ocupada neste período (${confSala.timeStart}–${confSala.timeEnd}). Aguarde o término da aula anterior.`,
        });
      }
    }

    const aula = await prisma.aula.update({
      where: { id },
      data: {
        subject: subject ?? existe.subject,
        timeStart: novoStart,
        timeEnd: novoEnd,
        diaSemana: novaDia,
        professorId: novoProfId,
        salaId: novoSalaId,
      },
      include: { professor: true, sala: true },
    });

    if (!existe.isInterval) {
      const nomeMateria = subject ?? existe.subject;
      if (novoProfId && novoProfId !== existe.professorId) {
        await notificarProfessor(novoProfId, 'Nova aula atribuída a você',
          `A aula de "${nomeMateria}" (${novoStart}–${novoEnd}) foi atribuída ao seu cronograma.`, 'calendario');
      }
      if (existe.professorId && novoProfId !== existe.professorId) {
        await notificarProfessor(existe.professorId, 'Você foi removido de uma aula',
          `A aula de "${nomeMateria}" (${existe.timeStart}–${existe.timeEnd}) foi atribuída a outro professor.`, 'calendario');
      }
      if (novoProfId && novoProfId === existe.professorId) {
        const mudou = novoStart !== existe.timeStart || novoEnd !== existe.timeEnd || (subject && subject !== existe.subject) || novaDia !== existe.diaSemana;
        if (mudou) {
          await notificarProfessor(novoProfId, 'Aula modificada no seu cronograma',
            `A aula de "${nomeMateria}" foi alterada para ${novoStart}–${novoEnd}.`, 'editar');
        }
      }
    }

    return res.json({
      ...aula,
      professor: aula.professor ? { id: aula.professor.id, nome: aula.professor.nome } : null,
    });
  } catch (err) {
    console.error('atualizarAula error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar aula.' });
  }
};

const deletarAula = async (req, res) => {
  try {
    const { id } = req.params;
    const existe = await prisma.aula.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Aula não encontrada.' });

    if (existe.professorId && !existe.isInterval) {
      await notificarProfessor(existe.professorId, 'Aula removida do seu cronograma',
        `A aula de "${existe.subject}" (${existe.timeStart}–${existe.timeEnd}) foi removida do seu cronograma.`, 'remover');
    }

    await prisma.aula.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletarAula error:', err);
    return res.status(500).json({ error: 'Erro ao deletar aula.' });
  }
};

const deletar = async (req, res) => {
  try {
    const existe = await prisma.cronograma.findUnique({ where: { id: req.params.id } });
    if (!existe) return res.status(404).json({ error: 'Cronograma não encontrado.' });
    await prisma.cronograma.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletar error:', err);
    return res.status(500).json({ error: 'Erro ao deletar cronograma.' });
  }
};

module.exports = { listar, buscarPorTurno, criar, criarAula, atualizarAula, deletarAula, deletar };
