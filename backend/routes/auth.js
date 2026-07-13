const { Router } = require('express');
const auth = require('../middleware/auth');
const { register, login, getMe, changePassword } = require('../controllers/authController');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/password', auth, changePassword);

module.exports = router;
