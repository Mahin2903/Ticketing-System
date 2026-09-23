const express = require("express");
const router = express.Router();
const helpTopicsController = require("./help_topics.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// Authenticated users can view help topics
router.get("/", authenticate, authorize("user", "agent", "admin"), helpTopicsController.getAllHelpTopics);
router.get("/:id", authenticate, authorize("user", "agent", "admin"), helpTopicsController.getHelpTopicById);

// Only administrators can mutate help topics
router.post("/", authenticate, authorize("admin"), helpTopicsController.createHelpTopic);
router.patch("/:id", authenticate, authorize("admin"), helpTopicsController.updateHelpTopic);
router.delete("/:id", authenticate, authorize("admin"), helpTopicsController.deleteHelpTopic);

module.exports = router;
