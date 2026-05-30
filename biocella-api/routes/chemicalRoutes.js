const express = require("express");
const router = express.Router();
const chemicalController = require("../controllers/chemicalController");

router.post("/", chemicalController.create);
router.get("/", chemicalController.getAll);
router.get("/:id", chemicalController.getById);
router.put("/:id", chemicalController.update);
router.delete("/:id", chemicalController.remove);

module.exports = router;
