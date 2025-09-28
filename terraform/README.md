# HR Onboarding - Terraform Infrastructure

This directory contains Terraform configuration for provisioning Azure resources for the HR Onboarding application.

## 🏗️ Architecture

The infrastructure includes:
- **Resource Group** - Container for all resources
- **Key Vault** - Secure storage for secrets and keys
- **Cosmos DB** - NoSQL database for checklists and analytics
- **Azure OpenAI** - AI service for checklist generation (optional)
- **App Service Plan** - Hosting plan for the API
- **Linux Web App** - API backend with Node.js 18
- **Static Web App** - Frontend hosting for React app

## 📁 Directory Structure

```
terraform/
├── main.tf                    # Main infrastructure configuration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output definitions
├── backend.tf                 # Remote state configuration
├── deploy.sh                  # Deployment script
├── validate.sh                # Infrastructure validation script
├── environments/              # Environment-specific configurations
│   ├── dev.tfvars            # Development environment
│   ├── staging.tfvars        # Staging environment
│   └── prod.tfvars           # Production environment
└── backend-config.*.hcl      # Backend configuration files
```

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and configured
2. **Terraform** >= 1.0 installed
3. **Azure subscription** with appropriate permissions
4. **jq** for JSON processing (optional, for validation script)

### Login to Azure

```bash
az login
az account set --subscription "your-subscription-id"
```

### Deploy Infrastructure

1. **Initialize Terraform** (first time only):
```bash
cd terraform
./deploy.sh dev init
```

2. **Plan the deployment**:
```bash
./deploy.sh dev plan
```

3. **Apply the configuration**:
```bash
./deploy.sh dev apply
```

### Validate Deployment

```bash
./validate.sh dev
```

## 🔧 Configuration

### Environment Variables

The deployment script automatically sets:
- `TF_VAR_subscription_id` - Current Azure subscription ID
- `TF_IN_AUTOMATION` - Indicates automated deployment

### Environment Files

Each environment has its own `.tfvars` file:

- **dev.tfvars** - Development (B1 App Service, 400 RU/s Cosmos)
- **staging.tfvars** - Staging (S1 App Service, 600 RU/s Cosmos)
- **prod.tfvars** - Production (P1v2 App Service, 1000 RU/s Cosmos)

### Backend Configuration

For production environments, configure remote state storage:

1. Create a storage account for Terraform state:
```bash
# Create resource group for Terraform state
az group create --name terraform-state-rg --location "West Europe"

# Create storage account
az storage account create \
  --name terraformstatehrprod \
  --resource-group terraform-state-rg \
  --location "West Europe" \
  --sku Standard_LRS

# Create container
az storage container create \
  --name terraform-state \
  --account-name terraformstatehrprod
```

2. Update backend configuration files with your storage account details.

## 📋 Available Commands

### Deployment Script (`./deploy.sh`)

```bash
# Initialize Terraform
./deploy.sh <env> init

# Format Terraform files
./deploy.sh <env> format

# Validate configuration
./deploy.sh <env> validate

# Plan deployment
./deploy.sh <env> plan

# Apply configuration
./deploy.sh <env> apply

# Destroy infrastructure
./deploy.sh <env> destroy
```

### Validation Script (`./validate.sh`)

```bash
# Validate infrastructure health
./validate.sh <env> [resource-group-name]
```

## 🔍 Resource Naming Convention

Resources are named using the pattern:
```
{app_name}-{environment}-{resource_type}-{random_suffix}
```

Example for development:
- Resource Group: `hr-onboarding-dev-rg`
- Key Vault: `hr-onboarding-dev-abc123-kv`
- Cosmos DB: `hr-onboarding-dev-abc123-cosmos`
- Web App: `hr-onboarding-dev-abc123-api`

## 🔐 Security

### Key Vault Integration

All sensitive configuration is stored in Key Vault:
- `cosmos-endpoint` - Cosmos DB endpoint URL
- `cosmos-key` - Cosmos DB primary access key
- `openai-endpoint` - Azure OpenAI endpoint URL
- `openai-key` - Azure OpenAI API key

### Managed Identity

The Web App uses system-assigned managed identity to access Key Vault secrets, eliminating the need for connection strings in app settings.

### Network Security

- All services use HTTPS only
- Key Vault has soft delete enabled
- Cosmos DB uses secure defaults

## 📊 Monitoring

### Outputs

After deployment, the following outputs are available:
- `api_app_url` - URL of the deployed API
- `static_app_url` - URL of the frontend
- `cosmos_db_endpoint` - Cosmos DB endpoint
- `deployment_summary` - Summary of all resources

### Health Checks

The validation script checks:
- ✅ Resource provisioning status
- ✅ Web App runtime status
- ✅ Cosmos DB databases and containers
- ✅ Key Vault secrets
- ✅ Azure OpenAI service health
- ✅ App configuration settings

## 🔄 Environment Management

### Development

```bash
./deploy.sh dev plan
./deploy.sh dev apply
./validate.sh dev
```

### Staging

```bash
./deploy.sh staging plan
./deploy.sh staging apply
./validate.sh staging
```

### Production

```bash
# Use remote state backend
./deploy.sh prod init
./deploy.sh prod plan
./deploy.sh prod apply
./validate.sh prod
```

## 🚨 Troubleshooting

### Common Issues

1. **Azure OpenAI Not Available**
   - Set `enable_azure_openai = false` in `.tfvars`
   - Use OpenAI API instead

2. **Key Vault Access Denied**
   - Ensure your user has Key Vault permissions
   - Check Azure RBAC assignments

3. **Cosmos DB Throughput Limits**
   - Verify subscription quotas
   - Adjust `cosmos_throughput` in `.tfvars`

4. **Static Web App Limitations**
   - Free tier has usage limits
   - Consider upgrading for production

### Logs and Debugging

```bash
# Enable Terraform debug logging
export TF_LOG=DEBUG
./deploy.sh dev plan

# Check Azure resource logs
az monitor activity-log list --resource-group <rg-name>

# Validate specific resources
az resource list --resource-group <rg-name> --output table
```

## 🧹 Cleanup

To destroy all resources:

```bash
./deploy.sh <environment> destroy
```

⚠️ **Warning**: This will permanently delete all resources and data!

## 📚 Additional Resources

- [Terraform Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)