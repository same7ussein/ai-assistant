const { Router } = require('express');
const auth = require('../middleware/auth');
const { generate } = require('../controllers/quizGenController');

const router = Router();

router.post('/generate', auth, generate);

module.exports = router;
