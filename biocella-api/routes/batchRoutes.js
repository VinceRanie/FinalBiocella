const express = require("express");
const router = express.Router();
const batchController = require("../controllers/batchController");

router.post("/", batchController.create);
router.get("/", batchController.getAll);
router.get("/:id", batchController.getById);
router.get("/:id/usage-guidance", batchController.getUsageGuidance);
router.put("/:id", batchController.update);
router.delete("/:id", batchController.remove);

module.exports = router;
