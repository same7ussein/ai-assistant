const { Router } = require('express');
const auth = require('../middleware/auth');
const { start, review, end, history } = require('../controllers/studySessionController');

const router = Router();

router.get('/', auth, history);
router.post('/start', auth, start);
router.post('/review', auth, review);
router.patch('/:id/end', auth, end);

module.exports = router;
