# HR Onboarding - Terraform Outputs

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "cosmos_db_name" {
  description = "Name of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.name
}

output "cosmos_db_endpoint" {
  description = "Endpoint URL of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmos_db_primary_key" {
  description = "Primary access key for Cosmos DB"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "openai_service_name" {
  description = "Name of the Azure OpenAI service"
  value       = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].name : null
}

output "openai_endpoint" {
  description = "Endpoint URL of the Azure OpenAI service"
  value       = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].endpoint : "Use OpenAI API"
}

output "openai_primary_key" {
  description = "Primary access key for Azure OpenAI"
  value       = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].primary_access_key : null
  sensitive   = true
}

output "app_service_plan_name" {
  description = "Name of the App Service Plan"
  value       = azurerm_service_plan.main.name
}

output "api_app_name" {
  description = "Name of the API Web App"
  value       = azurerm_linux_web_app.api.name
}

output "api_app_url" {
  description = "URL of the API Web App"
  value       = "https://${azurerm_linux_web_app.api.name}.azurewebsites.net"
}

output "static_app_name" {
  description = "Name of the Static Web App"
  value       = azurerm_static_site.frontend.name
}

output "static_app_url" {
  description = "URL of the Static Web App"
  value       = "https://${azurerm_static_site.frontend.default_host_name}"
}

output "static_app_api_key" {
  description = "API key for Static Web App deployment"
  value       = azurerm_static_site.frontend.api_key
  sensitive   = true
}

output "web_app_identity_principal_id" {
  description = "Principal ID of the Web App's managed identity"
  value       = azurerm_linux_web_app.api.identity[0].principal_id
}

# Configuration summary for easy reference
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment          = var.environment
    location            = var.location
    resource_group      = azurerm_resource_group.main.name
    api_url             = "https://${azurerm_linux_web_app.api.name}.azurewebsites.net"
    frontend_url        = "https://${azurerm_static_site.frontend.default_host_name}"
    cosmos_endpoint     = azurerm_cosmosdb_account.main.endpoint
    openai_enabled      = var.enable_azure_openai
    openai_endpoint     = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].endpoint : "OpenAI API"
  }
}

# Environment variables for application deployment
output "environment_variables" {
  description = "Environment variables for application configuration"
  value = {
    COSMOS_DB_ENDPOINT                 = azurerm_cosmosdb_account.main.endpoint
    COSMOS_DB_DATABASE_ID             = "hr-onboarding"
    COSMOS_DB_CONTAINER_ID            = "checklists"
    AZURE_OPENAI_ENDPOINT             = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].endpoint : "https://api.openai.com/v1"
    AZURE_OPENAI_DEPLOYMENT_NAME      = "gpt-4"
    KEY_VAULT_NAME                    = azurerm_key_vault.main.name
  }
  sensitive = false
}