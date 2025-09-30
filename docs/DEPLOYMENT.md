# HR Onboarding - Deployment Guide

## 🚀 Deployment Overview

The HR Onboarding application uses automated CI/CD pipelines with semantic versioning, manual approvals for production, and comprehensive rollback capabilities.

## 📋 Environments

### Development (`dev` branch)
- **API:** https://hr-onboarding-dev-r2x0-api.azurewebsites.net
- **Frontend:** https://mango-pebble-0d01d2103.1.azurestaticapps.net
- **Auto-deploy:** ✅ On every push to `dev`
- **Manual approval:** ❌ Not required

### Staging (`staging` branch)
- **API:** https://hr-onboarding-staging-api.azurewebsites.net
- **Frontend:** https://hr-onboarding-staging-web.azurewebsites.net
- **Auto-deploy:** ✅ On every push to `staging`
- **Manual approval:** ❌ Not required

### Production (`main` branch)
- **API:** https://hr-onboarding-prod-api.azurewebsites.net
- **Frontend:** https://hr-onboarding-prod-web.azurewebsites.net
- **Auto-deploy:** ✅ After manual approval
- **Manual approval:** ✅ **REQUIRED**

## 🏷️ Semantic Versioning

The application uses semantic versioning based on conventional commits:

### Version Bumping Rules
- **Patch** (1.0.1): Regular commits, bug fixes
- **Minor** (1.1.0): Commits starting with `feat:`
- **Major** (2.0.0): Commits containing `BREAKING CHANGE:`

### Commit Message Examples
```bash
# Patch version bump
git commit -m "fix: resolve authentication bug"

# Minor version bump  
git commit -m "feat: add new employee onboarding template"

# Major version bump
git commit -m "feat: redesign user interface

BREAKING CHANGE: The API endpoints have changed structure"
```

## 🔄 Deployment Process

### 1. Development Deployment
1. Push code to `dev` branch
2. Automatic deployment triggers
3. No approval required
4. Immediate availability

### 2. Staging Deployment
1. Create PR from `dev` to `staging`
2. Merge after review
3. Automatic deployment to staging
4. Test and validate functionality

### 3. Production Deployment
1. Create PR from `staging` to `main`
2. Merge after review
3. **Manual approval required** in GitHub Actions
4. Deployment proceeds after approval
5. Automatic release creation with changelog

## 🎯 Manual Approval Process

### Setting Up Production Environment Protection

**GitHub Repository Settings:**
1. Go to **Settings** → **Environments**
2. Create `production` environment
3. Add protection rules:
   - ✅ Required reviewers (select team members)
   - ✅ Wait timer: 0 minutes
   - ✅ Restrict to `main` branch only

### Approval Workflow
1. Production deployment waits for approval
2. Designated reviewers receive notification
3. Review deployment details and approve/reject
4. Deployment proceeds automatically after approval

## 📦 Artifact Storage

### Automatic Artifact Creation
Every deployment creates versioned artifacts:
- **API Package:** `hr-onboarding-api-{version}.zip`
- **Client Build:** `hr-onboarding-client-{version}/`
- **Retention:** 30 days
- **Location:** GitHub Actions artifacts

### Artifact Contents
```
API Artifacts:
├── api-deployment.zip
│   ├── node_modules/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── config/
│   ├── utils/
│   ├── server.js
│   └── package.json

Client Artifacts:
├── dist/
│   ├── index.html
│   ├── assets/
│   │   ├── index-{hash}.js
│   │   └── index-{hash}.css
│   └── favicon.ico
```

## 🔍 Health Checks

### Automatic Health Verification
After each deployment, the pipeline automatically verifies:

1. **API Health Check**
   - Endpoint: `/health`
   - Expected: HTTP 200
   - Retries: 6 attempts with 30s intervals

2. **Frontend Health Check**
   - Endpoint: Static Web App root
   - Expected: HTTP 200
   - Immediate failure on error

### Manual Health Verification
```bash
# API Health
curl https://hr-onboarding-prod-api.azurewebsites.net/health

# API Documentation
curl https://hr-onboarding-prod-api.azurewebsites.net/api-docs

# Frontend
curl https://hr-onboarding-prod-web.azurewebsites.net
```

## 🚨 Troubleshooting

### Common Deployment Issues

**API Won't Start**
```bash
# Check Azure logs
az webapp log tail --name hr-onboarding-prod-api --resource-group hr-onboarding-prod-rg

# Check application settings
az webapp config appsettings list --name hr-onboarding-prod-api --resource-group hr-onboarding-prod-rg
```

**Frontend Build Fails**
```bash
# Check build logs in GitHub Actions
# Ensure environment variables are set correctly
# Verify Vite configuration
```

**Health Check Fails**
```bash
# Wait for app warmup (Azure Free tier can be slow)
# Check application logs
# Verify database connectivity
# Confirm OpenAI API key is valid
```

## 📊 Monitoring

### Deployment Tracking
- **GitHub Releases:** Automatic creation for production deployments
- **Version Tags:** Semantic version tags in git history
- **Deployment History:** GitHub Actions run history
- **Artifact History:** 30-day retention of all deployment packages

### URLs for Monitoring
- **API Health:** `/health` endpoint
- **API Docs:** `/api-docs` endpoint  
- **Frontend:** Root URL health check
- **Azure Portal:** Resource monitoring and logs

---

📝 **Next Steps:** See [ROLLBACK.md](./ROLLBACK.md) for rollback procedures.