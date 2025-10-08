const OpenAI = require('openai');

// OpenAI configuration (optional)
let openai = null;

// In test mode, create a basic OpenAI instance for mocking
if (process.env.NODE_ENV === 'test') {
  openai = new OpenAI({
    apiKey: 'test-key',
  });
  console.log('OpenAI configured for testing');
} else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_ENDPOINT,
    });
    console.log('OpenAI configured successfully');
  } catch (error) {
    console.warn('OpenAI configuration failed:', error.message);
  }
} else {
  console.log('OpenAI not configured - using fallback checklist generation');
}

module.exports = openai;
