# HR Onboarding - Student-Friendly Outputs

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
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
  value       = azurerm_static_web_app.frontend.name
}

output "static_app_url" {
  description = "URL of the Static Web App"
  value       = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "static_app_api_key" {
  description = "API key for Static Web App deployment"
  value       = azurerm_static_web_app.frontend.api_key
  sensitive   = true
}

output "sql_server_name" {
  description = "Name of the SQL Server"
  value       = azurerm_mssql_server.main.name
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "Name of the SQL Database"
  value       = azurerm_mssql_database.main.name
}

# Configuration summary
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment     = var.environment
    location        = var.location
    resource_group  = azurerm_resource_group.main.name
    api_url         = "https://${azurerm_linux_web_app.api.name}.azurewebsites.net"
    frontend_url    = "https://${azurerm_static_web_app.frontend.default_host_name}"
    database_type   = "Azure SQL Database Serverless"
    database_server = azurerm_mssql_server.main.fully_qualified_domain_name
    openai_endpoint = "OpenAI API"
  }
}