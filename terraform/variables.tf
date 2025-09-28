# HR Onboarding - Student-Friendly Variables

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
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "location" {
  description = "Azure region for resource deployment"
  type        = string
  default     = "West Europe"
}

variable "sql_admin_username" {
  description = "Administrator username for SQL Server"
  type        = string
  default     = "sqladmin"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9]{2,}$", var.sql_admin_username))
    error_message = "SQL admin username must start with a letter and be at least 3 characters."
  }
}

variable "sql_admin_password" {
  description = "Administrator password for SQL Server"
  type        = string
  sensitive   = true
  default     = "HROnboarding2024!"
  validation {
    condition     = length(var.sql_admin_password) >= 8
    error_message = "Password must be at least 8 characters long."
  }
}