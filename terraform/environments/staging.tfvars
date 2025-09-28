# Staging Environment Configuration

environment        = "staging"
location           = "West Europe"
app_name           = "hr-onboarding"

# Azure OpenAI
enable_azure_openai = true
openai_location     = "East US"

# Cosmos DB
cosmos_throughput = 600

# App Service
app_service_sku = "S1"

# Additional tags
additional_tags = {
  Project     = "HR-Onboarding"
  Owner       = "Development-Team"
  CostCenter  = "IT-Development"
  Environment = "Staging"
}