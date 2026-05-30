const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");

router.post("/", appointmentController.create);
router.get("/", appointmentController.getAll);
router.get("/unavailable-dates", appointmentController.getUnavailableDates);
router.post("/unavailable-dates", appointmentController.markDateUnavailable);
router.delete("/unavailable-dates/:date", appointmentController.removeUnavailableDate);
router.get("/availability/date", appointmentController.getAvailability);  // Must be before /:id
router.get("/calendar/overview", appointmentController.getCalendarOverview);  // Must be before /:id
router.get("/status/:status", appointmentController.getByStatus);
router.get("/verify", appointmentController.getByQRToken);
router.get("/:id", appointmentController.getById);
router.put("/:id", appointmentController.update);
router.post("/:id/approve", appointmentController.approve);
router.post("/:id/deny", appointmentController.deny);
router.post("/:id/no-show", appointmentController.markNoShow);
router.post("/verify-qr", appointmentController.verifyQR);
router.delete("/:id", appointmentController.remove);

module.exports = router;
