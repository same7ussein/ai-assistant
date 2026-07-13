const { Router } = require('express');
const auth = require('../middleware/auth');
const { chat } = require('../controllers/aiController');

const router = Router();

router.post('/chat', auth, chat);

module.exports = router;
