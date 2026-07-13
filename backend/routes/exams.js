const { Router } = require("express");
const auth = require("../middleware/auth");
const {
  list,
  create,
  saveResult,
  clearResult,
  delete: del,
} = require("../controllers/examGenController");

const router = Router();

router.get("/", auth, list);
router.post("/", auth, create);
router.patch("/:id/result", auth, saveResult);
router.delete("/:id/result", auth, clearResult);
router.delete("/:id", auth, del);

module.exports = router;
