const { Router } = require('express');
const auth = require('../middleware/auth');
const { generateRoadmap, getRoadmap } = require('../controllers/studyRoadmapController');

const router = Router();

router.get('/', auth, getRoadmap);
router.post('/generate', auth, generateRoadmap);

module.exports = router;
