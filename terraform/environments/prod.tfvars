# Production Environment Configuration

environment        = "prod"
location           = "West Europe"
app_name           = "hr-onboarding"

# Azure OpenAI
enable_azure_openai = true
openai_location     = "East US"

# Cosmos DB
cosmos_throughput = 1000

# App Service
app_service_sku = "P1v2"

# Additional tags
additional_tags = {
  Project     = "HR-Onboarding"
  Owner       = "Development-Team"
  CostCenter  = "IT-Production"
  Environment = "Production"
  Backup      = "Required"
  Monitoring  = "Critical"
}