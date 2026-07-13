const { Router } = require("express");
const auth = require("../middleware/auth");
const { generate } = require("../controllers/examGenController");

const router = Router();

router.post("/generate", auth, generate);

module.exports = router;
