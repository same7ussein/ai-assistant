const { Router } = require('express');
const auth = require('../middleware/auth');
const { list } = require('../controllers/activityController');

const router = Router();

router.get('/', auth, list);

module.exports = router;
