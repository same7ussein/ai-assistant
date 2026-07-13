const { Router } = require('express');
const auth = require('../middleware/auth');
const { currentPlan, generatePlan, updateTask, history } = require('../controllers/studyPlanController');

const router = Router();

router.get('/current', auth, currentPlan);
router.post('/generate', auth, generatePlan);
router.patch('/tasks/:taskId', auth, updateTask);
router.get('/history', auth, history);

module.exports = router;
