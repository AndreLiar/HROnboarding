# GitHub Actions CI/CD Setup Guide

This guide explains how to configure GitHub repository settings and secrets for automatic deployment.

## 🔐 Required GitHub Secrets

### 1. Azure Service Principal Credentials

Create an Azure Service Principal and add these secrets to your GitHub repository:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "hr-onboarding-github-actions" \
  --role "Contributor" \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

**Required Secrets:**
- `AZURE_CREDENTIALS` - Complete JSON output from the service principal creation
- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID

### 2. Azure Static Web Apps Token

Get the deployment token for your Static Web App:

```bash
# Get Static Web App API token
az staticwebapp secrets list \
  --name hr-onboarding-dev-r2x0-web \
  --resource-group hr-onboarding-dev-rg \
  --query "properties.apiKey" -o tsv
```

**Required Secret:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - API token for Static Web Apps deployment

## 🛡️ Environment Protection Rules

### 1. Create GitHub Environments

In your GitHub repository settings, create these environments:
- `dev` - Development environment
- `staging` - Staging environment  
- `prod` - Production environment

### 2. Configure Protection Rules

#### Production Environment (`prod`)
- ✅ **Required reviewers**: Add team members who must approve production deployments
- ✅ **Wait timer**: 0 minutes (or set delay if needed)
- ✅ **Deployment branches**: Only `main` branch

#### Staging Environment (`staging`)
- ✅ **Required reviewers**: Add reviewers (optional)
- ✅ **Deployment branches**: Only `staging` branch

#### Development Environment (`dev`)
- ✅ **Deployment branches**: Only `dev` branch
- ⚠️ **No required reviewers** (for faster development)

## 🔄 Deployment Workflow

### Branch Strategy
- `main` → Production deployment
- `staging` → Staging deployment
- `dev` → Development deployment

### Automatic Deployments
1. **Push to `dev`** → Deploys to development environment
2. **Push to `staging`** → Creates staging infrastructure + deploys
3. **Push to `main`** → Creates production infrastructure + deploys

### Pull Request Validation
- All PRs run tests and validation
- Terraform plan is executed for review
- No actual deployment occurs

## 📋 Setup Checklist

### Repository Settings
- [ ] Create environments: `dev`, `staging`, `prod`
- [ ] Configure protection rules for each environment
- [ ] Add required reviewers for production

### Azure Setup
- [ ] Create Azure Service Principal
- [ ] Grant Contributor role to subscription
- [ ] Get Static Web Apps API token

### GitHub Secrets
- [ ] Add `AZURE_CREDENTIALS`
- [ ] Add `AZURE_SUBSCRIPTION_ID`
- [ ] Add `AZURE_STATIC_WEB_APPS_API_TOKEN`

### Testing
- [ ] Create test PR to verify validation workflow
- [ ] Test deployment to dev environment
- [ ] Test deployment to staging environment
- [ ] Test deployment to production environment

## 🚀 Quick Start Commands

### Create Azure Service Principal
```bash
# Replace {subscription-id} with your actual subscription ID
az ad sp create-for-rbac \
  --name "hr-onboarding-github-actions" \
  --role "Contributor" \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth > azure-credentials.json

# Copy the entire JSON output to AZURE_CREDENTIALS secret
cat azure-credentials.json
```

### Get Static Web App Token
```bash
# For development environment
az staticwebapp secrets list \
  --name hr-onboarding-dev-r2x0-web \
  --resource-group hr-onboarding-dev-rg \
  --query "properties.apiKey" -o tsv

# Save this token as AZURE_STATIC_WEB_APPS_API_TOKEN secret
```

### Test Deployment
```bash
# Test development deployment
git checkout dev
git add .
git commit -m "test: trigger dev deployment"
git push origin dev

# Test staging deployment
git checkout staging
git merge dev
git push origin staging

# Test production deployment (requires approval)
git checkout main
git merge staging
git push origin main
```

## 🔍 Monitoring Deployments

### GitHub Actions Tab
- View workflow runs and logs
- Monitor deployment status
- Review approval requests

### Azure Portal
- Check App Service deployment status
- Monitor Static Web App builds
- Review application logs

### Health Checks
The workflow includes automatic health checks:
- API endpoint: `https://{app-name}.azurewebsites.net/health`
- Frontend: `https://{static-app-name}.azurestaticapps.net`

## 🚨 Troubleshooting

### Common Issues
1. **Azure login fails** → Check AZURE_CREDENTIALS format
2. **Terraform fails** → Verify subscription permissions
3. **Static Web App deployment fails** → Check API token
4. **Health checks fail** → Wait for deployment to complete

### Debugging Steps
1. Check GitHub Actions logs
2. Verify Azure resource status
3. Test endpoints manually
4. Review application logs in Azure Portal