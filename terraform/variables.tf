# HR Onboarding - Terraform Variables

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "hr-onboarding"
  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.app_name))
    error_message = "App name must be 3-20 characters, lowercase letters, numbers, and hyphens only."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "West Europe"
}

variable "enable_azure_openai" {
  description = "Enable Azure OpenAI service (may not be available in all regions)"
  type        = bool
  default     = true
}

variable "openai_location" {
  description = "Azure region for OpenAI service (separate from main location)"
  type        = string
  default     = "East US"
  validation {
    condition     = contains(["East US", "West Europe", "South Central US", "Australia East"], var.openai_location)
    error_message = "OpenAI location must be one of: East US, West Europe, South Central US, Australia East."
  }
}

variable "cosmos_throughput" {
  description = "Cosmos DB database throughput (RU/s)"
  type        = number
  default     = 400
  validation {
    condition     = var.cosmos_throughput >= 400 && var.cosmos_throughput <= 4000
    error_message = "Cosmos DB throughput must be between 400 and 4000 RU/s."
  }
}

variable "app_service_sku" {
  description = "App Service Plan SKU"
  type        = string
  default     = "B1"
  validation {
    condition     = contains(["B1", "B2", "S1", "S2", "P1v2", "P2v2"], var.app_service_sku)
    error_message = "App Service SKU must be one of: B1, B2, S1, S2, P1v2, P2v2."
  }
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = null
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
  default     = null
}

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}