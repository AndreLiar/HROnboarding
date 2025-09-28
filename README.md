# HR Onboarding - Générateur de Checklist

Application web full-stack pour générer et partager des checklists d'intégration RH personnalisées par rôle et département.

## Structure du Projet

```
HROnboarding/
├── api/                    # Backend Node.js + Express
│   ├── server.js          # Point d'entrée API
│   ├── package.json       # Dépendances backend
│   └── .env.example       # Variables d'environnement
├── client/                # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Selector.jsx    # Sélecteurs rôle/département
│   │   │   ├── Checklist.jsx   # Liste éditable
│   │   │   └── Share.jsx       # Génération de lien
│   │   ├── App.jsx        # Composant principal
│   │   └── main.jsx       # Point d'entrée React
│   ├── package.json       # Dépendances frontend
│   └── vite.config.js     # Configuration Vite
└── README.md              # Documentation
```

## Tech Stack

- **Frontend**: React 18 + Vite + Material UI
- **Backend**: Node.js + Express
- **Base de données**: Azure Cosmos DB for NoSQL
- **IA**: Azure OpenAI (GPT-4)
- **Déploiement**: Azure Static Web Apps + Azure App Service

## Installation et Développement

### Prérequis
- Node.js 18+
- Compte Azure avec Cosmos DB et OpenAI configurés

### Configuration Backend

1. **Installation des dépendances**:
```bash
cd api
npm install
```

2. **Variables d'environnement**:
```bash
cp .env.example .env
```

Configurez les variables dans `.env`:
```env
PORT=3001
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-key
COSMOS_DB_DATABASE_ID=hr-onboarding
COSMOS_DB_CONTAINER_ID=checklists
```

3. **Démarrage du serveur**:
```bash
npm run dev
```

### Configuration Frontend

1. **Installation des dépendances**:
```bash
cd client
npm install
```

2. **Démarrage du serveur de développement**:
```bash
npm run dev
```

## Configuration Azure

### Cosmos DB

1. **Créer une base de données**:
```bash
az cosmosdb sql database create \
  --account-name your-account \
  --resource-group your-rg \
  --name hr-onboarding
```

2. **Créer un conteneur**:
```bash
az cosmosdb sql container create \
  --account-name your-account \
  --resource-group your-rg \
  --database-name hr-onboarding \
  --name checklists \
  --partition-key-path "/slug" \
  --throughput 400
```

### Azure OpenAI

1. **Créer la ressource OpenAI**:
```bash
az cognitiveservices account create \
  --name your-openai-resource \
  --resource-group your-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```

2. **Déployer le modèle GPT-4**:
```bash
az cognitiveservices account deployment create \
  --name your-openai-resource \
  --resource-group your-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "1106-Preview" \
  --model-format OpenAI \
  --scale-settings-scale-type "Standard"
```

## Déploiement

### Backend (Azure App Service)

1. **Créer l'App Service**:
```bash
az appservice plan create \
  --name hr-onboarding-plan \
  --resource-group your-rg \
  --sku B1 \
  --is-linux

az webapp create \
  --resource-group your-rg \
  --plan hr-onboarding-plan \
  --name hr-onboarding-api \
  --runtime "NODE|18-lts"
```

2. **Configurer les variables d'environnement**:
```bash
az webapp config appsettings set \
  --resource-group your-rg \
  --name hr-onboarding-api \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
    AZURE_OPENAI_API_KEY="your-api-key" \
    AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4" \
    COSMOS_DB_ENDPOINT="https://your-account.documents.azure.com:443/" \
    COSMOS_DB_KEY="your-primary-key" \
    COSMOS_DB_DATABASE_ID="hr-onboarding" \
    COSMOS_DB_CONTAINER_ID="checklists"
```

3. **Déployer le code**:
```bash
cd api
zip -r ../api.zip .
az webapp deployment source config-zip \
  --resource-group your-rg \
  --name hr-onboarding-api \
  --src ../api.zip
```

### Frontend (Azure Static Web Apps)

1. **Builder le projet**:
```bash
cd client
npm run build
```

2. **Créer la Static Web App**:
```bash
az staticwebapp create \
  --name hr-onboarding-frontend \
  --resource-group your-rg \
  --source https://github.com/your-username/hr-onboarding \
  --location "West Europe" \
  --branch main \
  --app-location "/client" \
  --build-location "dist"
```

3. **Configuration du proxy API** dans `staticwebapp.config.json`:
```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "https://hr-onboarding-api.azurewebsites.net/*"
    }
  ]
}
```

## API Endpoints

### POST /generate
Génère une checklist avec IA.

**Request**:
```json
{
  "role": "Développeur Junior",
  "department": "Informatique"
}
```

**Response**:
```json
{
  "checklist": [
    "Compléter la Déclaration Préalable à l'Embauche (DPAE)",
    "Créer un compte utilisateur et configurer l'accès aux outils internes"
  ],
  "role": "Développeur Junior",
  "department": "Informatique"
}
```

### POST /share
Sauvegarde une checklist et retourne un slug.

**Request**:
```json
{
  "checklist": ["Item 1", "Item 2"],
  "role": "Développeur Junior",
  "department": "Informatique"
}
```

**Response**:
```json
{
  "slug": "abc123xyz"
}
```

### GET /c/:slug
Récupère une checklist partagée.

**Response**:
```json
{
  "checklist": ["Item 1", "Item 2"],
  "role": "Développeur Junior",
  "department": "Informatique",
  "createdAt": "2023-12-01T10:00:00.000Z"
}
```

## Fonctionnalités

✅ Génération de checklist IA avec prompts spécialisés France  
✅ Interface Material UI responsive  
✅ Édition en ligne des éléments  
✅ Partage via liens courts  
✅ Stockage Cosmos DB  
✅ Prêt pour production Azure  

## Sécurité

- Variables d'environnement pour toutes les clés API
- Validation des entrées côté serveur
- CORS configuré pour le domaine de production
- Pas de stockage de données sensibles côté client

## Évolutions Futures

- Intégration SharePoint Online
- Authentification Microsoft Entra ID
- Templates de checklist personnalisables
- Notifications par email
- Analytics et métriques d'usage# HROnboarding
