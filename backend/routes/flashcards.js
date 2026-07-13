const { Router } = require('express');
const auth = require('../middleware/auth');
const { list, delete: del, generate, review, reviewed, due, dueCount, stats } = require('../controllers/flashcardController');

const router = Router();

router.get('/', auth, list);
router.get('/reviewed', auth, reviewed);
router.get('/due', auth, due);
router.get('/due/count', auth, dueCount);
router.get('/stats', auth, stats);
router.post('/generate', auth, generate);
router.patch('/:id/review', auth, review);
router.delete('/:id', auth, del);

module.exports = router;
