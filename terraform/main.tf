# HR Onboarding - Main Terraform Configuration
# This configuration provisions all Azure resources for the HR Onboarding application

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    cognitive_account {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Generate random suffix for unique naming
resource "random_string" "suffix" {
  length  = 6
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

# Key Vault for secrets management
resource "azurerm_key_vault" "main" {
  name                = "${var.app_name}-${local.resource_suffix}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  enable_rbac_authorization       = false
  purge_protection_enabled        = false
  soft_delete_retention_days      = 7

  tags = local.common_tags
}

# Get current client configuration
data "azurerm_client_config" "current" {}

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "main" {
  name                = "${var.app_name}-${local.resource_suffix}-cosmos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
    zone_redundant    = false
  }

  backup {
    type = "Continuous"
  }

  tags = local.common_tags
}

# Cosmos DB SQL Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "hr-onboarding"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = var.cosmos_throughput
}

# Cosmos DB SQL Container - Checklists
resource "azurerm_cosmosdb_sql_container" "checklists" {
  name                   = "checklists"
  resource_group_name    = azurerm_resource_group.main.name
  account_name           = azurerm_cosmosdb_account.main.name
  database_name          = azurerm_cosmosdb_sql_database.main.name
  partition_key_path     = "/slug"
  partition_key_version  = 1
  default_ttl           = -1

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }

    composite_index {
      index {
        path  = "/createdAt"
        order = "descending"
      }
      index {
        path  = "/department"
        order = "ascending"
      }
    }

    composite_index {
      index {
        path  = "/role"
        order = "ascending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }
  }

  unique_key {
    paths = ["/slug"]
  }
}

# Cosmos DB SQL Container - Analytics
resource "azurerm_cosmosdb_sql_container" "analytics" {
  name                   = "analytics"
  resource_group_name    = azurerm_resource_group.main.name
  account_name           = azurerm_cosmosdb_account.main.name
  database_name          = azurerm_cosmosdb_sql_database.main.name
  partition_key_path     = "/date"
  partition_key_version  = 1
  default_ttl           = 7776000 # 90 days

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }

    composite_index {
      index {
        path  = "/date"
        order = "descending"
      }
      index {
        path  = "/eventType"
        order = "ascending"
      }
    }
  }
}

# Azure OpenAI Service (conditional)
resource "azurerm_cognitive_account" "openai" {
  count               = var.enable_azure_openai ? 1 : 0
  name                = "${var.app_name}-${local.resource_suffix}-openai"
  location            = var.openai_location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "OpenAI"
  sku_name            = "S0"

  custom_subdomain_name = "${var.app_name}-${local.resource_suffix}-openai"
  public_network_access_enabled = true

  tags = local.common_tags
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-${var.environment}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku

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
    always_on = true
    http2_enabled = true
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "18-lts"
    "NODE_ENV"                     = "production"
    "COSMOS_DB_DATABASE_ID"        = "hr-onboarding"
    "COSMOS_DB_CONTAINER_ID"       = "checklists"
    "AZURE_OPENAI_DEPLOYMENT_NAME" = "gpt-4"
  }

  identity {
    type = "SystemAssigned"
  }

  https_only = true

  tags = merge(local.common_tags, {
    Component = "API"
  })
}

# Static Web App
resource "azurerm_static_site" "frontend" {
  name                = "${var.app_name}-${local.resource_suffix}-frontend"
  resource_group_name = azurerm_resource_group.main.name
  location            = "West Europe" # Static Web Apps are only available in specific regions
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = merge(local.common_tags, {
    Component = "Frontend"
  })
}

# Key Vault Access Policy for Web App
resource "azurerm_key_vault_access_policy" "web_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.api.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "cosmos_endpoint" {
  name         = "cosmos-endpoint"
  value        = azurerm_cosmosdb_account.main.endpoint
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.web_app]
}

resource "azurerm_key_vault_secret" "cosmos_key" {
  name         = "cosmos-key"
  value        = azurerm_cosmosdb_account.main.primary_key
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.web_app]
}

resource "azurerm_key_vault_secret" "openai_endpoint" {
  name         = "openai-endpoint"
  value        = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].endpoint : "https://api.openai.com/v1"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.web_app]
}

resource "azurerm_key_vault_secret" "openai_key" {
  name         = "openai-key"
  value        = var.enable_azure_openai ? azurerm_cognitive_account.openai[0].primary_access_key : "your-openai-api-key-here"
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault_access_policy.web_app]
}