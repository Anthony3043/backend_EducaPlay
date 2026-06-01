/**
 * Seed de escolas — roda com: node seed-escola.js
 * Cria a escola padrão e vincula todos os dados existentes a ela.
 * Para adicionar escolas novas no futuro, só acrescente linhas no array ESCOLAS.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ESCOLAS = [
  { nome: 'Escola Padrão', codigo: 'default' },
  // Adicione novas escolas aqui:
  // { nome: 'Escola Foch', codigo: 'Foch_2026' },
];

async function main() {
  console.log('🏫 Criando escolas...');

  for (const e of ESCOLAS) {
    const escola = await prisma.escola.upsert({
      where: { codigo: e.codigo },
      update: { nome: e.nome },
      create: { nome: e.nome, codigo: e.codigo },
    });
    console.log(`  ✅ ${escola.nome} (codigo: ${escola.codigo}) → id: ${escola.id}`);
  }

  // Pega a escola padrão
  const padrao = await prisma.escola.findUnique({ where: { codigo: 'default' } });
  if (!padrao) { console.log('Escola padrão não encontrada.'); return; }

  console.log('\n🔗 Vinculando dados existentes à escola padrão...');

  const u = await prisma.usuario.updateMany({ where: { escolaId: null }, data: { escolaId: padrao.id } });
  console.log(`  👤 Usuários: ${u.count}`);

  const s = await prisma.sala.updateMany({ where: { escolaId: null }, data: { escolaId: padrao.id } });
  console.log(`  🏫 Salas: ${s.count}`);

  const c = await prisma.cronograma.updateMany({ where: { escolaId: null }, data: { escolaId: padrao.id } });
  console.log(`  📅 Cronogramas: ${c.count}`);

  const cfg = await prisma.configuracaoEscola.updateMany({ where: { escolaId: null }, data: { escolaId: padrao.id } });
  console.log(`  ⚙️  Configurações: ${cfg.count}`);

  console.log('\n✅ Seed concluído!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
