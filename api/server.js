require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const OpenAI = require('openai');
// Use crypto.randomUUID() instead of nanoid for Node 18+ compatibility
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'https://mango-pebble-0d01d2103.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

// Simple test endpoint (no dependencies)
app.get('/', (req, res) => {
  res.json({ 
    message: 'HR Onboarding API is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// SQL Server configuration
const sqlConfig = {
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  server: process.env.DATABASE_SERVER,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false // change to true for local dev / self-signed certs
  }
};

// OpenAI configuration (optional)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
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

// French HR system prompt
const SYSTEM_PROMPT = `Vous êtes un assistant RH spécialisé dans l'intégration des employés en France.
Générez une liste de contrôle d'intégration concise en français (forme formelle 'vous').
Exigences:
- Format: tableau JSON de chaînes de caractères
- Longueur: 5-7 éléments
- Inclure les étapes RH/légales françaises (DPAE, sécurité, médecine du travail, RGPD)
- Adapter au rôle et au département
- Rôles techniques → configuration IT/sécurité
- RH/Finance → conformité et confidentialité
- Commercial/Marketing → CRM, RGPD, communication client

Répondez UNIQUEMENT avec le tableau JSON, sans texte supplémentaire.`;

// Database initialization
async function initializeDatabase() {
  try {
    console.log('Connecting to SQL Server...');
    await sql.connect(sqlConfig);
    console.log('Connected to SQL Server');

    // Create table if it doesn't exist
    const request = new sql.Request();
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='checklists' AND xtype='U')
      CREATE TABLE checklists (
        id NVARCHAR(50) PRIMARY KEY,
        slug NVARCHAR(50) UNIQUE NOT NULL,
        checklist NVARCHAR(MAX) NOT NULL,
        role NVARCHAR(200),
        department NVARCHAR(200),
        createdAt DATETIME2 DEFAULT GETDATE()
      )
    `);
    console.log('Database table ready');
  } catch (err) {
    console.error('Database connection failed:', err);
    console.log('App will continue without database functionality');
    // Don't exit - allow app to start without database
  }
}

// POST /generate - Generate checklist using AI
app.post('/generate', async (req, res) => {
  try {
    const { role, department } = req.body;

    if (!role || !department) {
      return res.status(400).json({ error: 'Role and department are required' });
    }

    let checklist;

    if (openai) {
      try {
        const userPrompt = `Rôle: ${role}, Département: ${department}`;
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });

        const checklistText = completion.choices[0].message.content.trim();
        checklist = JSON.parse(checklistText);
      } catch (aiError) {
        console.warn('OpenAI API error, using fallback:', aiError.message);
        checklist = null;
      }
    }

    // Fallback checklist if OpenAI is not available or failed
    if (!checklist) {
      checklist = [
        "Compléter la Déclaration Préalable à l'Embauche (DPAE)",
        "Créer un compte utilisateur et configurer les accès",
        "Planifier la visite médicale obligatoire",
        "Présentation des procédures RGPD et sécurité",
        "Réunion d'accueil avec l'équipe",
        `Formation spécifique au rôle: ${role}`,
        `Intégration équipe ${department}`
      ];
    }

    res.json({ checklist, role, department });
  } catch (error) {
    console.error('Error generating checklist:', error);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
});

// POST /share - Save checklist and return slug
app.post('/share', async (req, res) => {
  try {
    const { checklist, role, department } = req.body;

    if (!checklist || !Array.isArray(checklist)) {
      return res.status(400).json({ error: 'Valid checklist array is required' });
    }

    const slug = crypto.randomUUID().substring(0, 10);
    const checklistJson = JSON.stringify(checklist);

    const request = new sql.Request();
    await request
      .input('id', sql.NVarChar, slug)
      .input('slug', sql.NVarChar, slug)
      .input('checklist', sql.NVarChar, checklistJson)
      .input('role', sql.NVarChar, role)
      .input('department', sql.NVarChar, department)
      .query(`
        INSERT INTO checklists (id, slug, checklist, role, department)
        VALUES (@id, @slug, @checklist, @role, @department)
      `);

    res.json({ slug });
  } catch (error) {
    console.error('Error saving checklist:', error);
    res.status(500).json({ error: 'Failed to save checklist' });
  }
});

// GET /c/:slug - Retrieve checklist by slug
app.get('/c/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const request = new sql.Request();
    const result = await request
      .input('slug', sql.NVarChar, slug)
      .query('SELECT * FROM checklists WHERE slug = @slug');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const item = result.recordset[0];
    const checklist = JSON.parse(item.checklist);

    res.json({
      checklist,
      role: item.role,
      department: item.department,
      createdAt: item.createdAt
    });
  } catch (error) {
    console.error('Error retrieving checklist:', error);
    res.status(500).json({ error: 'Failed to retrieve checklist' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'Unknown',
      openai: openai ? 'Available' : 'Not configured'
    }
  };

  try {
    // Test database connection
    const pool = await sql.connect(sqlConfig);
    health.services.database = pool.connected ? 'Connected' : 'Disconnected';
  } catch (error) {
    health.services.database = 'Disconnected';
  }

  res.json(health);
});

// Start server immediately without database dependency
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HR Onboarding API running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🗄️ Database: ${sqlConfig.server}/${sqlConfig.database}`);
  console.log(`🤖 OpenAI: ${openai ? 'Configured' : 'Not configured'}`);
  console.log(`✅ Server started successfully`);
  
  // Initialize database in background (non-blocking)
  setTimeout(() => {
    initializeDatabase().catch(err => {
      console.error('Database initialization failed:', err.message);
    });
  }, 1000);
});

module.exports = app;