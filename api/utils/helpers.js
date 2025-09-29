const crypto = require('crypto');

// Generate unique slug for sharing
const generateSlug = () => {
  return crypto.randomUUID().substring(0, 10);
};

// Validate request body
const validateRequired = (fields, body) => {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

// Format error response
const errorResponse = (message) => {
  return { error: message };
};

// Format success response
const successResponse = (data) => {
  return data;
};

module.exports = {
  generateSlug,
  validateRequired,
  errorResponse,
  successResponse
};