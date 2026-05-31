const router = require('express').Router();
const multer = require('multer');
const auth = require('../middlewares/auth');
const p = require('../controllers/professoresController');
const s = require('../controllers/salasController');
const c = require('../controllers/cronogramasController');
const n = require('../controllers/notificacoesController');
const d = require('../controllers/disponibilidadeController');
const b = require('../controllers/bloqueiosController');
const ms = require('../controllers/mapaSalaController');
const pt = require('../controllers/pontoController');
const cfg = require('../controllers/configuracaoController');
const up = require('../controllers/uploadController');
const av = require('../controllers/avisosProfessorController');
const pm = require('../controllers/permissaoMapaController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Professores (usuários com papel Professor)
router.get('/professores', auth, p.listar);
router.post('/professores', auth, p.criar);
router.put('/professores/:id/materias', auth, p.atualizarMaterias);
router.put('/professores/:id/desativar', auth, p.desativar);
router.put('/professores/:id/reativar', auth, p.reativar);
router.put('/professores/:id/permissao-mapa', auth, p.atualizarPermissaoMapa);

// Salas
router.get('/salas', auth, s.listar);
router.post('/salas', auth, s.criar);
router.put('/salas/:id', auth, s.atualizar);
router.delete('/salas/:id', auth, s.deletar);

// Mapa de Sala
router.get('/salas/:salaId/mapa', auth, ms.buscar);
router.put('/salas/:salaId/mapa', auth, ms.atualizar);
router.post('/salas/:salaId/mapa/regenerar', auth, ms.regenerar);

// Cronogramas
router.get('/cronogramas', auth, c.listar);
router.get('/cronogramas/turno/:turno', auth, c.buscarPorTurno);
router.post('/cronogramas', auth, c.criar);
router.post('/aulas', auth, c.criarAula);
router.put('/aulas/:id', auth, c.atualizarAula);
router.delete('/aulas/:id', auth, c.deletarAula);
router.delete('/cronogramas/:id', auth, c.deletar);

// Notificações (rotas específicas ANTES das com parâmetro dinâmico)
router.get('/notificacoes', auth, n.listar);
router.patch('/notificacoes/todas/lidas', auth, n.marcarTodasLidas);
router.patch('/notificacoes/:id/lida', auth, n.marcarLida);
router.delete('/notificacoes', auth, n.limparTodas);
router.delete('/notificacoes/:id', auth, n.deletar);

// Disponibilidade
router.get('/disponibilidade/:professorId', auth, d.listar);
router.post('/disponibilidade', auth, d.salvar);

// Bloqueios de horário (professor indisponível em outras escolas)
router.get('/bloqueios', auth, b.listar);
router.get('/bloqueios/professor/:professorId', auth, b.listarPorProfessor);
router.post('/bloqueios', auth, b.criar);
router.delete('/bloqueios/:id', auth, b.deletar);

// Bater Ponto
router.post('/ponto', auth, pt.registrar);
router.get('/ponto/resumo-dia', auth, pt.resumoDia);
router.get('/ponto/aula/:aulaId', auth, pt.buscarPonto);
router.get('/ponto', auth, pt.listarPontosSala);
router.post('/ponto/notificar-falta', auth, pt.notificarFalta);

// Configuração da escola
router.get('/configuracao-escola', auth, cfg.buscar);
router.put('/configuracao-escola', auth, cfg.salvar);

// Permissões de mapa de sala por professor
router.get('/professores/:professorId/permissoes-mapa',         auth, pm.listarSalasComPermissoes);
router.put('/professores/:professorId/permissoes-mapa',         auth, pm.atualizarPermissoes);
router.get('/professores/:professorId/permissoes-mapa/:salaId', auth, pm.verificarPermissao);

// Upload de arquivos (Object Storage)
router.post('/upload/foto', auth, upload.single('foto'), up.uploadFoto);

// Avisos de atraso/ausência do professor
router.post('/avisos-professor',                       auth, av.enviar);
router.get('/avisos-professor/recentes',               auth, av.recentes);
router.post('/avisos-professor/substituir',            auth, av.substituir);
router.get('/avisos-professor/professores-disponiveis', auth, av.professoresDisponiveis);

module.exports = router;
