const helpTopicsService = require("./help_topics.service");

/**
 * POST /api/help-topics - Create a new help topic
 */
const createHelpTopic = async (req, res) => {
  const { topic_code, topic_title } = req.body;

  if (!topic_code || !topic_title) {
    return res.status(400).json({
      success: false,
      message: "topic_code and topic_title are required.",
    });
  }

  const topic = await helpTopicsService.createHelpTopic({
    topic_code,
    topic_title,
  });

  res.status(201).json({
    success: true,
    message: "Help topic created successfully",
    data: topic,
  });
};

/**
 * GET /api/help-topics - Get all help topics
 */
const getAllHelpTopics = async (req, res) => {
  const topics = await helpTopicsService.getAllHelpTopics();

  res.json({
    success: true,
    count: topics.length,
    data: topics,
  });
};

/**
 * GET /api/help-topics/:id - Get help topic by ID
 */
const getHelpTopicById = async (req, res) => {
  const topic = await helpTopicsService.getHelpTopicById(req.params.id);

  if (!topic) {
    return res.status(404).json({
      success: false,
      message: "Help topic not found",
    });
  }

  res.json({
    success: true,
    data: topic,
  });
};

/**
 * PATCH /api/help-topics/:id - Update help topic details
 */
const updateHelpTopic = async (req, res) => {
  const topic = await helpTopicsService.updateHelpTopic(
    req.params.id,
    req.body
  );

  if (!topic) {
    return res.status(404).json({
      success: false,
      message: "Help topic not found",
    });
  }

  res.json({
    success: true,
    message: "Help topic updated successfully",
    data: topic,
  });
};

/**
 * DELETE /api/help-topics/:id - Delete help topic
 */
const deleteHelpTopic = async (req, res) => {
  const topic = await helpTopicsService.deleteHelpTopic(req.params.id);

  if (!topic) {
    return res.status(404).json({
      success: false,
      message: "Help topic not found",
    });
  }

  res.json({
    success: true,
    message: "Help topic deleted successfully",
    data: topic,
  });
};

module.exports = {
  createHelpTopic,
  getAllHelpTopics,
  getHelpTopicById,
  updateHelpTopic,
  deleteHelpTopic,
};
