const { Router } = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { upload, list, get, delete: del, ask } = require('../controllers/documentController');

const router = Router();
const storage = multer.memoryStorage();
const upload_mw = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', auth, list);
router.get('/:id', auth, get);
router.post('/upload', auth, upload_mw.single('file'), upload);
router.delete('/:id', auth, del);
router.post('/:id/ask', auth, ask);

module.exports = router;
