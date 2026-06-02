const router = require('express').Router();
const auth = require('../middlewares/auth');
const { register, login, perfil, atualizarPerfil, checkEmail, resetSenha, salvarPushToken, deletarConta, validarCodigoSupervisao, testarPush } = require('../controllers/authController');

router.post('/register', register);
router.post('/validar-codigo-supervisao', validarCodigoSupervisao);
router.post('/login', login);
router.post('/check-email', checkEmail);
router.post('/reset-senha', resetSenha);
router.get('/perfil', auth, perfil);
router.put('/perfil', auth, atualizarPerfil);
router.put('/push-token', auth, salvarPushToken);
router.delete('/conta', auth, deletarConta);
router.post('/test-push', auth, testarPush);
router.get('/reset-senha', require('../controllers/resetPageController'));

module.exports = router;
