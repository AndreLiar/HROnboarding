# Development Environment Configuration

environment        = "dev"
location           = "West Europe"
app_name           = "hr-onboarding"

# Azure OpenAI
enable_azure_openai = true
openai_location     = "East US"

# Cosmos DB
cosmos_throughput = 400

# App Service
app_service_sku = "B1"

# Additional tags
additional_tags = {
  Project     = "HR-Onboarding"
  Owner       = "Development-Team"
  CostCenter  = "IT-Development"
  Environment = "Development"
}