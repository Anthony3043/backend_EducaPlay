const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Usuários
  const senhaSupervisao = await bcrypt.hash('123456', 10);
  const senhaProfessor = await bcrypt.hash('123456', 10);

  const supervisao = await prisma.usuario.upsert({
    where: { email: 'supervisao@educaplay.com' },
    update: {},
    create: {
      nome: 'Anthony Silva',
      email: 'supervisao@educaplay.com',
      senha: senhaSupervisao,
      papel: 'Supervisao',
      cargo: 'Supervisor Escolar',
      instituicao: 'Escola Municipal de Educação',
    },
  });

  const professor = await prisma.usuario.upsert({
    where: { email: 'professor@educaplay.com' },
    update: {},
    create: {
      nome: 'Ricardo Souza',
      email: 'professor@educaplay.com',
      senha: senhaProfessor,
      papel: 'Professor',
      cargo: 'Professor de Matemática',
      instituicao: 'Escola Municipal de Educação',
    },
  });

  // Professores
  const professores = await Promise.all([
    prisma.professor.upsert({ where: { id: 'p1' }, update: {}, create: { id: 'p1', nome: 'Prof. Ricardo', materias: JSON.stringify(['Matemática', 'Física']) } }),
    prisma.professor.upsert({ where: { id: 'p2' }, update: {}, create: { id: 'p2', nome: 'Prof. Ana', materias: JSON.stringify(['História', 'Geografia']) } }),
    prisma.professor.upsert({ where: { id: 'p3' }, update: {}, create: { id: 'p3', nome: 'Prof. Carlos', materias: JSON.stringify(['Português', 'Literatura']) } }),
    prisma.professor.upsert({ where: { id: 'p4' }, update: {}, create: { id: 'p4', nome: 'Prof. Beatriz', materias: JSON.stringify(['Ciências', 'Biologia']) } }),
    prisma.professor.upsert({ where: { id: 'p5' }, update: {}, create: { id: 'p5', nome: 'Prof. Marcos', materias: JSON.stringify(['Geografia', 'História']) } }),
  ]);

  // Salas
  await Promise.all([
    prisma.sala.upsert({ where: { id: 's1' }, update: {}, create: { id: 's1', nome: 'Sala 01', capacidade: '35 alunos' } }),
    prisma.sala.upsert({ where: { id: 's2' }, update: {}, create: { id: 's2', nome: 'Sala 02', capacidade: '35 alunos' } }),
    prisma.sala.upsert({ where: { id: 's3' }, update: {}, create: { id: 's3', nome: 'Laboratório de Ciências', capacidade: '20 alunos' } }),
    prisma.sala.upsert({ where: { id: 's4' }, update: {}, create: { id: 's4', nome: 'Sala de Informática', capacidade: '25 alunos' } }),
  ]);

  // Cronograma matutino
  const cronograma = await prisma.cronograma.upsert({
    where: { id: 'c1' },
    update: {},
    create: { id: 'c1', turno: 'matutino' },
  });

  await Promise.all([
    prisma.aula.upsert({ where: { id: 'm1' }, update: {}, create: { id: 'm1', timeStart: '07:00', timeEnd: '07:50', subject: 'Matemática', cronogramaId: 'c1', professorId: 'p1' } }),
    prisma.aula.upsert({ where: { id: 'm2' }, update: {}, create: { id: 'm2', timeStart: '07:50', timeEnd: '08:40', subject: 'História', cronogramaId: 'c1', professorId: 'p2' } }),
    prisma.aula.upsert({ where: { id: 'm3' }, update: {}, create: { id: 'm3', timeStart: '08:40', timeEnd: '09:30', subject: 'Português', cronogramaId: 'c1', professorId: 'p3' } }),
    prisma.aula.upsert({ where: { id: 'mi' }, update: {}, create: { id: 'mi', timeStart: '09:30', timeEnd: '09:50', subject: 'Intervalo', isInterval: true, cronogramaId: 'c1' } }),
    prisma.aula.upsert({ where: { id: 'm4' }, update: {}, create: { id: 'm4', timeStart: '09:50', timeEnd: '10:40', subject: 'Ciências', cronogramaId: 'c1', professorId: 'p4' } }),
    prisma.aula.upsert({ where: { id: 'm5' }, update: {}, create: { id: 'm5', timeStart: '10:40', timeEnd: '11:30', subject: 'Geografia', cronogramaId: 'c1', professorId: 'p5' } }),
  ]);

  // Notificações para supervisão
  await prisma.notificacao.createMany({
    data: [
      { titulo: 'Bem-vindo ao EducaPlay!', mensagem: 'Seu sistema está pronto para uso.', icon: '🎉', usuarioId: supervisao.id },
      { titulo: 'Cronograma criado', mensagem: 'O cronograma matutino foi criado com sucesso.', icon: '📅', usuarioId: supervisao.id },
    ],
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('📧 supervisao@educaplay.com | senha: 123456');
  console.log('📧 professor@educaplay.com  | senha: 123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
