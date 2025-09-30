# HR Onboarding - Générateur de Checklist d'Intégration

Application web full-stack pour générer et partager des checklists d'intégration RH personnalisées par rôle et département, avec conformité française intégrée.

## 🎯 Fonctionnalités

✅ **Génération IA** - Checklists personnalisées via OpenAI GPT-3.5-turbo  
✅ **Conformité française** - DPAE, RGPD, médecine du travail intégrés  
✅ **Interface intuitive** - Material UI responsive  
✅ **Édition interactive** - Modification en ligne des éléments  
✅ **Partage instantané** - Liens courts pour partager les checklists  
✅ **API documentée** - Documentation Swagger interactive  
✅ **Production ready** - Déployé sur Azure avec CI/CD  

## 📁 Structure du Projet

```
HROnboarding/
├── .github/                # GitHub Actions workflows
│   └── workflows/
│       ├── deploy.yml      # CI/CD automatisé avec versioning
│       └── rollback.yml    # Workflow de rollback d'urgence
├── api/                    # Backend Node.js + Express
│   ├── server.js          # API avec Swagger documentation
│   ├── package.json       # Dépendances backend
│   └── .env.example       # Variables d'environnement
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Selector.jsx    # Sélecteurs rôle/département
│   │   │   ├── Checklist.jsx   # Liste éditable interactive
│   │   │   └── Share.jsx       # Génération de liens
│   │   ├── App.jsx        # Composant principal
│   │   └── main.jsx       # Point d'entrée React
│   ├── package.json       # Dépendances frontend
│   ├── vite.config.js     # Configuration Vite
│   └── staticwebapp.config.json # Configuration Azure SWA
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Ressources Azure principales
│   ├── variables.tf       # Variables Terraform
│   └── environments/      # Configurations par environnement
├── docs/                  # Documentation détaillée
│   ├── DEPLOYMENT.md      # Guide de déploiement
│   ├── ROLLBACK.md        # Procédures de rollback
│   └── CONVENTIONAL_COMMITS.md # Guide des commits sémantiques
└── README.md              # Documentation
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + Material UI
- **Backend**: Node.js + Express + Swagger UI
- **Base de données**: Azure SQL Database (serverless)
- **IA**: OpenAI API (GPT-3.5-turbo)
- **Infrastructure**: Terraform
- **Déploiement**: Azure Static Web Apps + App Service
- **CI/CD**: GitHub Actions multi-environnements

## 🚀 Déploiement Live

- **Application**: https://mango-pebble-0d01d2103.1.azurestaticapps.net/
- **API**: https://hr-onboarding-dev-r2x0-api.azurewebsites.net/
- **Documentation API**: https://hr-onboarding-dev-r2x0-api.azurewebsites.net/api-docs

## 🔧 Installation et Développement

### Prérequis
- Node.js 18+
- Compte Azure
- Clé OpenAI API

### Configuration Backend

1. **Installation**:
```bash
cd api
npm install
```

2. **Variables d'environnement**:
```bash
cp .env.example .env
```

Configurez dans `.env`:
```env
PORT=3001
DATABASE_SERVER=your-server.database.windows.net
DATABASE_NAME=hr-onboarding
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
OPENAI_API_KEY=your-openai-key
OPENAI_API_ENDPOINT=https://api.openai.com/v1
```

3. **Démarrage**:
```bash
npm start
```

### Configuration Frontend

1. **Installation**:
```bash
cd client
npm install
```

2. **Développement**:
```bash
npm run dev
```

## 📊 API Endpoints

### 🔍 Documentation Interactive
Accédez à la documentation Swagger complète : `/api-docs`

### 🚀 Endpoints Principaux

#### `GET /`
Status de l'API et informations système.

#### `POST /generate`
Génère une checklist personnalisée.

**Request**:
```json
{
  "role": "Développeur Senior",
  "department": "Informatique"
}
```

**Response**:
```json
{
  "checklist": [
    {"étape": "Compléter la Déclaration Préalable à l'Embauche (DPAE)"},
    {"étape": "Formation à la sécurité informatique et accès aux outils internes"},
    {"étape": "Examen médical obligatoire avec le médecin du travail"}
  ],
  "role": "Développeur Senior",
  "department": "Informatique"
}
```

#### `POST /share`
Sauvegarde et génère un lien de partage.

#### `GET /c/:slug`
Récupère une checklist partagée.

#### `GET /health`
Vérification de l'état des services (base de données, OpenAI).

## 🏗️ Infrastructure

### Azure Resources
- **App Service Plan**: F1 Free tier
- **App Service**: API backend
- **SQL Database**: Free tier (32MB)
- **Static Web App**: Frontend hosting
- **Resource Groups**: Organisation par environnement

### Environments
- **Development**: `hr-onboarding-dev-rg`
- **Staging**: `hr-onboarding-staging-rg` (à venir)
- **Production**: `hr-onboarding-prod-rg` (à venir)

## 🔒 Sécurité

- **Variables d'environnement** pour toutes les clés sensibles
- **Validation des entrées** côté serveur
- **CORS configuré** pour domaines autorisés
- **SQL paramétrisé** contre les injections
- **Chiffrement TLS** en production

## 📈 Coûts Azure

**Actuel (Free tier)**: ~$0.50-$2.00/mois
- App Service F1: Gratuit
- SQL Database Free: Gratuit
- Static Web App: Gratuit  
- OpenAI API: ~$0.50-$2.00 selon usage

## 🔄 CI/CD Pipeline

### Phase 2: Release Management ✅
GitHub Actions automatise maintenant:
- ✅ **Semantic Versioning** - Versioning automatique basé sur les commits
- ✅ **Release Notes** - Génération automatique des notes de version
- ✅ **Manual Approval** - Approbation manuelle pour la production
- ✅ **Artifact Storage** - Stockage des packages de déploiement (30 jours)
- ✅ **Rollback Capability** - Rollback en un clic vers versions précédentes
- ✅ Tests et qualité (ESLint, Prettier, npm audit)
- ✅ Déploiement infrastructure (Terraform)
- ✅ Déploiement API (App Service)
- ✅ Déploiement frontend (Static Web Apps)
- ✅ Health checks post-déploiement

### Environments
- **Production** (`main`): Approbation manuelle requise
- **Staging** (`staging`): Déploiement automatique
- **Development** (`dev`): Déploiement immédiat

📖 **Documentation complète:** [docs/](./docs/)

## 🌍 Conformité Française

L'application intègre les exigences légales françaises :
- **DPAE** - Déclaration Préalable à l'Embauche
- **Médecine du travail** - Visites obligatoires
- **RGPD** - Protection des données
- **Sécurité informatique** - Formations obligatoires
- **Confidentialité** - Accords de non-divulgation

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour les détails.