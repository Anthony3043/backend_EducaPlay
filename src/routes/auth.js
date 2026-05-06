const router = require('express').Router();
const auth = require('../middlewares/auth');
const { register, login, perfil, atualizarPerfil, checkEmail, resetSenha } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/check-email', checkEmail);
router.post('/reset-senha', resetSenha);
router.get('/perfil', auth, perfil);
router.put('/perfil', auth, atualizarPerfil);
router.get('/reset-senha', require('../controllers/resetPageController'));

module.exports = router;
