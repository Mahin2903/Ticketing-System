const express = require("express");
const router = express.Router();
const helpTopicsController = require("./help_topics.controller");

router.post("/", helpTopicsController.createHelpTopic);
router.get("/", helpTopicsController.getAllHelpTopics);
router.get("/:id", helpTopicsController.getHelpTopicById);
router.patch("/:id", helpTopicsController.updateHelpTopic);
router.delete("/:id", helpTopicsController.deleteHelpTopic);

module.exports = router;
