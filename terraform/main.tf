# HR Onboarding - Student-Friendly Configuration
# Works with Azure for Students Starter subscription limitations

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}

# Generate random suffix for unique naming
resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

# Local values for resource naming
locals {
  resource_suffix = "${var.environment}-${random_string.suffix.result}"
  common_tags = {
    Environment = var.environment
    Application = "HR-Onboarding"
    ManagedBy   = "Terraform"
    CreatedOn   = timestamp()
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.app_name}-${var.environment}-rg"
  location = var.location
  tags     = local.common_tags
}

# App Service Plan (Free tier only for students)
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-${var.environment}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "F1"  # Free tier

  tags = local.common_tags
}

# Web App for API
resource "azurerm_linux_web_app" "api" {
  name                = "${var.app_name}-${local.resource_suffix}-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
    always_on = false  # Required for Free tier
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "18-lts"
    "NODE_ENV"                     = "production"
    # Use Azure SQL Database for persistence
    "DATABASE_TYPE"                = "mssql"
    "DATABASE_SERVER"              = azurerm_mssql_server.main.fully_qualified_domain_name
    "DATABASE_NAME"                = azurerm_mssql_database.main.name
    "DATABASE_USERNAME"            = var.sql_admin_username
    "DATABASE_PASSWORD"            = var.sql_admin_password
    # Use OpenAI API (no Azure OpenAI for students)
    "OPENAI_API_KEY"              = var.openai_api_key
    "OPENAI_API_ENDPOINT"         = "https://api.openai.com/v1"
  }

  https_only = true

  tags = merge(local.common_tags, {
    Component = "API"
  })
}

# Azure SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = "${var.app_name}-${local.resource_suffix}-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password

  tags = merge(local.common_tags, {
    Component = "Database"
  })
}

# Azure SQL Database (Serverless)
resource "azurerm_mssql_database" "main" {
  name           = "hr-onboarding"
  server_id      = azurerm_mssql_server.main.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  sku_name       = "Free"   # Free tier for DreamSpark/Student subscriptions

  tags = merge(local.common_tags, {
    Component = "Database"
  })
}

# Firewall rule for Azure services
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Static Web App
resource "azurerm_static_web_app" "frontend" {
  name                = "${var.app_name}-${local.resource_suffix}-web"
  resource_group_name = azurerm_resource_group.main.name
  location            = "West Europe"
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = merge(local.common_tags, {
    Component = "Frontend"
  })
}