require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');
const OpenAI = require('openai');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Cosmos DB setup
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE_ID);
const container = database.container(process.env.COSMOS_DB_CONTAINER_ID);

// Azure OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_API_KEY,
  },
});

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

// POST /generate - Generate checklist using AI
app.post('/generate', async (req, res) => {
  try {
    const { role, department } = req.body;

    if (!role || !department) {
      return res.status(400).json({ error: 'Role and department are required' });
    }

    const userPrompt = `Rôle: ${role}, Département: ${department}`;

    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const checklistText = completion.choices[0].message.content.trim();
    let checklist;

    try {
      checklist = JSON.parse(checklistText);
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      checklist = [
        "Compléter la Déclaration Préalable à l'Embauche (DPAE)",
        "Créer un compte utilisateur et configurer les accès",
        "Planifier la visite médicale obligatoire",
        "Présentation des procédures RGPD et sécurité",
        "Réunion d'accueil avec l'équipe"
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

    const slug = nanoid(10);
    const checklistData = {
      id: slug,
      slug,
      checklist,
      role,
      department,
      createdAt: new Date().toISOString()
    };

    await container.items.create(checklistData);

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

    const { resource: item } = await container.item(slug, slug).read();

    if (!item) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json({
      checklist: item.checklist,
      role: item.role,
      department: item.department,
      createdAt: item.createdAt
    });
  } catch (error) {
    console.error('Error retrieving checklist:', error);
    if (error.code === 404) {
      res.status(404).json({ error: 'Checklist not found' });
    } else {
      res.status(500).json({ error: 'Failed to retrieve checklist' });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`HR Onboarding API running on port ${PORT}`);
});

module.exports = app;