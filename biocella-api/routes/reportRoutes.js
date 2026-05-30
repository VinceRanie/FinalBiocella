const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/", reportController.getAll);
router.post("/", reportController.create);
router.delete("/:id", reportController.remove);

module.exports = router;
