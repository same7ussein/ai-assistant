const { Router } = require('express');
const auth = require('../middleware/auth');
const { list, create, delete: del } = require('../controllers/flashcardBatchController');

const router = Router();

router.get('/', auth, list);
router.post('/', auth, create);
router.delete('/:id', auth, del);

module.exports = router;
