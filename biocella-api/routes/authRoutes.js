const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const upload = require("../config/upload");

// Authentication endpoints
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/forgot-password", authController.forgotPassword);
router.post("/forgot-password-authenticated", authController.requestPasswordResetAuthenticated);
router.post("/reset-password", authController.resetPassword);
router.post("/finalize-setup", authController.finalizeSetup);
router.post("/complete-reverification", authController.completeReverification);
router.post("/get-user-by-token", authController.getUserByToken);
router.post("/get-reset-user-by-token", authController.getResetUserByToken);
router.post("/logout", authController.logout);
router.get("/verify-token", authController.verifyToken);
router.get("/profile", authController.getUserProfile);
router.patch("/profile", authController.updateUserProfile);
router.post("/profile/upload", upload.single("image"), authController.uploadProfilePhoto);
router.post("/google-verify", authController.verifyGoogleProfile);

// Admin user management
router.get("/users", authController.getUsers);
router.patch("/users/:id/role", authController.updateUserRole);
router.patch("/users/:id/deactivate", authController.deactivateUser);
router.patch("/users/:id/reactivate", authController.reactivateUser);
router.post("/admin-invite", authController.adminInvite);

module.exports = router;
