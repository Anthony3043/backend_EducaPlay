const router = require('express').Router();
const auth = require('../middlewares/auth');
const p = require('../controllers/professoresController');
const s = require('../controllers/salasController');
const c = require('../controllers/cronogramasController');
const n = require('../controllers/notificacoesController');
const d = require('../controllers/disponibilidadeController');

// Professores (usuários com papel Professor)
router.get('/professores', auth, p.listar);

// Salas
router.get('/salas', auth, s.listar);
router.post('/salas', auth, s.criar);
router.put('/salas/:id', auth, s.atualizar);
router.delete('/salas/:id', auth, s.deletar);

// Cronogramas
router.get('/cronogramas', auth, c.listar);
router.get('/cronogramas/turno/:turno', auth, c.buscarPorTurno);
router.post('/cronogramas', auth, c.criar);
router.post('/aulas', auth, c.criarAula);
router.put('/aulas/:id', auth, c.atualizarAula);
router.delete('/cronogramas/:id', auth, c.deletar);

// Notificações
router.get('/notificacoes', auth, n.listar);
router.patch('/notificacoes/:id/lida', auth, n.marcarLida);
router.patch('/notificacoes/todas/lidas', auth, n.marcarTodasLidas);
router.delete('/notificacoes/:id', auth, n.deletar);
router.delete('/notificacoes', auth, n.limparTodas);

// Disponibilidade
router.get('/disponibilidade/:professorId', auth, d.listar);
router.post('/disponibilidade', auth, d.salvar);

module.exports = router;
