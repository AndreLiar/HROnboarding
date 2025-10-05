// Minimal diagnostic server to identify startup issues
console.log('🔍 Starting diagnostic server...');

// Basic environment check
console.log('Environment variables check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- DATABASE_SERVER:', process.env.DATABASE_SERVER ? 'set' : 'not set');

try {
  console.log('✅ Step 1: Loading express...');
  const express = require('express');
  console.log('✅ Express loaded successfully');

  console.log('✅ Step 2: Creating app...');
  const app = express();
  console.log('✅ App created successfully');

  const PORT = process.env.PORT || 3001;

  console.log('✅ Step 3: Setting up basic middleware...');
  app.use(express.json());
  console.log('✅ Basic middleware set');

  console.log('✅ Step 4: Setting up basic route...');
  app.get('/', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Diagnostic server running',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      diagnostic: true,
    });
  });
  console.log('✅ Routes set');

  console.log('✅ Step 5: Starting server...');
  app.listen(PORT, () => {
    console.log(`🚀 Diagnostic server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`✅ Diagnostic server started successfully`);
  });

  console.log('✅ Server setup complete');
} catch (error) {
  console.error('❌ Error during startup:', error);
  console.error('Stack trace:', error.stack);
  throw error;
}
