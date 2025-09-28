#!/bin/bash

# GitHub Actions Setup Script for HR Onboarding Application
# This script helps generate the required Azure credentials and tokens

set -e

echo "🚀 Setting up GitHub Actions secrets for HR Onboarding"
echo "=================================================="

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "📋 Current Azure Subscription: $SUBSCRIPTION_ID"

# Create service principal
echo ""
echo "🔐 Creating Azure Service Principal..."
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "hr-onboarding-github-actions" \
  --role "Contributor" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \
  --sdk-auth)

echo "✅ Service Principal created successfully!"
echo ""
echo "🔑 AZURE_CREDENTIALS secret value:"
echo "=================================="
echo "$SP_OUTPUT"
echo "=================================="
echo ""

# Get Static Web App API token
echo "🌐 Getting Static Web App API token..."
STATIC_APP_TOKEN=$(az staticwebapp secrets list \
  --name hr-onboarding-dev-r2x0-web \
  --resource-group hr-onboarding-dev-rg \
  --query "properties.apiKey" -o tsv 2>/dev/null || echo "NOT_FOUND")

if [ "$STATIC_APP_TOKEN" != "NOT_FOUND" ]; then
  echo "✅ Static Web App token retrieved!"
  echo ""
  echo "🔑 AZURE_STATIC_WEB_APPS_API_TOKEN secret value:"
  echo "================================================"
  echo "$STATIC_APP_TOKEN"
  echo "================================================"
else
  echo "⚠️  Static Web App not found. You'll need to get this token after deploying infrastructure."
fi

echo ""
echo "📝 Summary of secrets to add to GitHub:"
echo "========================================"
echo "1. AZURE_CREDENTIALS (copy the JSON above)"
echo "2. AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo "3. AZURE_STATIC_WEB_APPS_API_TOKEN (copy the token above)"
echo ""
echo "🔗 Add these secrets at: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo ""
echo "📖 For detailed setup instructions, see GITHUB_SETUP.md"

# Save credentials to file for reference
echo "$SP_OUTPUT" > azure-credentials.json
echo "💾 Azure credentials saved to azure-credentials.json (remember to delete this file after setup)"

echo ""
echo "✅ Setup complete! Next steps:"
echo "1. Add the secrets to your GitHub repository"
echo "2. Create GitHub environments (dev, staging, prod)"
echo "3. Configure protection rules"
echo "4. Test deployment by pushing to dev branch"