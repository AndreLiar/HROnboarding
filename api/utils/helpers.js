const crypto = require('crypto');

// Generate unique slug for sharing
const generateSlug = () => {
  return crypto.randomUUID().substring(0, 10);
};

// Validate request body
const validateRequired = (fields, body) => {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    // Generate user-friendly error messages
    const fieldMessages = missing.map(field => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      return `${fieldName} is required`;
    });
    throw new Error(fieldMessages.join(', '));
  }
};

// Format error response
const errorResponse = message => {
  return { success: false, error: message };
};

// Format success response
const successResponse = data => {
  return { success: true, data };
};

module.exports = {
  generateSlug,
  validateRequired,
  errorResponse,
  successResponse,
};
