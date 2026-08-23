const db = require("../../config/db");

/**
 * Create a new help topic
 */
const createHelpTopic = async ({ topic_code, topic_title }) => {
  const queryText = `
    INSERT INTO help_topics (topic_code, topic_title)
    VALUES ($1, $2)
    RETURNING *
  `;

  const values = [topic_code.trim(), topic_title.trim()];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

/**
 * Get all help topics
 */
const getAllHelpTopics = async () => {
  const queryText = `
    SELECT *
    FROM help_topics
    ORDER BY id ASC
  `;

  const result = await db.query(queryText);
  return result.rows;
};

/**
 * Get help topic by ID
 */
const getHelpTopicById = async (id) => {
  const queryText = `
    SELECT *
    FROM help_topics
    WHERE id = $1
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

/**
 * Update help topic by ID
 */
const updateHelpTopic = async (id, data) => {
  const { topic_code, topic_title } = data;
  const updates = [];
  const params = [];

  if (topic_code !== undefined) {
    params.push(topic_code.trim());
    updates.push(`topic_code = $${params.length}`);
  }

  if (topic_title !== undefined) {
    params.push(topic_title.trim());
    updates.push(`topic_title = $${params.length}`);
  }

  if (updates.length === 0) {
    return await getHelpTopicById(id);
  }

  params.push(parseInt(id, 10));
  const queryText = `
    UPDATE help_topics
    SET ${updates.join(", ")}
    WHERE id = $${params.length}
    RETURNING *
  `;

  const result = await db.query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Delete help topic by ID
 */
const deleteHelpTopic = async (id) => {
  const queryText = `
    DELETE FROM help_topics
    WHERE id = $1
    RETURNING *
  `;

  const result = await db.query(queryText, [parseInt(id, 10)]);
  return result.rows[0] || null;
};

module.exports = {
  createHelpTopic,
  getAllHelpTopics,
  getHelpTopicById,
  updateHelpTopic,
  deleteHelpTopic,
};
