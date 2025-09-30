// Artillery load test processor for HR Onboarding API
'use strict';

// Sample data for realistic testing
const roles = [
  'Développeur Junior',
  'Développeur Senior', 
  'Chef de Projet',
  'Analyste Business',
  'Responsable RH',
  'Assistant RH',
  'Comptable',
  'Commercial',
  'Designer UI/UX',
  'Data Analyst'
];

const departments = [
  'Informatique',
  'Ressources Humaines',
  'Finance',
  'Commercial',
  'Marketing',
  'Operations',
  'Juridique',
  'Direction Générale'
];

module.exports = {
  // Set random role and department for realistic testing
  setRandomRoleAndDepartment,
  
  // Log performance metrics
  logResponse,
  
  // Track OpenAI API usage
  trackOpenAIUsage,
  
  // Generate random string for slug testing
  generateRandomString
};

function setRandomRoleAndDepartment(requestParams, context, ee, next) {
  context.vars.role = roles[Math.floor(Math.random() * roles.length)];
  context.vars.department = departments[Math.floor(Math.random() * departments.length)];
  return next();
}

function logResponse(requestParams, response, context, ee, next) {
  // Log response time for analysis
  const responseTime = response.timings ? response.timings.response : 0;
  
  if (responseTime > 5000) {
    console.log(`⚠️  Slow response detected: ${responseTime}ms for ${requestParams.url}`);
  }
  
  // Emit custom metrics
  ee.emit('counter', 'api.requests.total', 1);
  ee.emit('histogram', 'api.response_time', responseTime);
  
  if (requestParams.url && requestParams.url.includes('/generate')) {
    ee.emit('counter', 'api.checklist.generations', 1);
    ee.emit('histogram', 'api.checklist.response_time', responseTime);
  }
  
  return next();
}

function trackOpenAIUsage(requestParams, response, context, ee, next) {
  // Track OpenAI API usage metrics
  if (response.body && response.body.includes('checklist')) {
    ee.emit('counter', 'openai.api.calls', 1);
    
    // Estimate cost (approximate)
    const estimatedTokens = response.body.length / 4; // Rough estimation
    const estimatedCost = (estimatedTokens / 1000) * 0.002; // GPT-3.5-turbo pricing
    ee.emit('histogram', 'openai.estimated_cost', estimatedCost);
  }
  
  return next();
}

function generateRandomString(context, events, done) {
  context.vars.randomString = Math.random().toString(36).substring(2, 15);
  return done();
}