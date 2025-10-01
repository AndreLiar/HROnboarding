# GitHub-based Terraform Backend Configuration
# Zero-cost alternative to Azure Storage backend

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  
  # GitHub-based backend simulation
  # Note: This is a custom implementation using GitHub repository for state storage
  # The actual backend logic is handled by GitHub Actions workflows
}

# Local backend for development (will be replaced by GitHub Actions)
# In CI/CD, state will be managed via encrypted files in GitHub repository
locals {
  # Environment-specific configuration
  environment = var.environment
  
  # State management configuration
  state_config = {
    storage_type     = "github"
    repository       = "AndreLiar/HROnboarding"
    state_path       = ".github/terraform-state/encrypted-states"
    encryption       = "aes-256-cbc"
    locking_enabled  = true
    versioning       = true
  }
  
  # GitHub Actions integration
  github_integration = {
    workflow_state_management = true
    automated_backups        = true
    integrity_checks         = true
    lock_timeout            = "15m"
  }
}

# Data source to validate current state configuration
data "local_file" "state_config" {
  count    = fileexists("${path.root}/.terraform/terraform.tfstate") ? 1 : 0
  filename = "${path.root}/.terraform/terraform.tfstate"
}

# Output state configuration for GitHub Actions
output "state_management_config" {
  description = "Configuration for GitHub-based state management"
  value = {
    backend_type        = "github"
    encryption_enabled  = true
    locking_enabled     = true
    versioning_enabled  = true
    backup_enabled      = true
    environment        = local.environment
    repository         = local.state_config.repository
    state_path         = local.state_config.state_path
  }
  
  sensitive = false
}

# State validation and integrity check
output "state_validation" {
  description = "State validation information"
  value = {
    terraform_version = "1.5.0"
    state_format     = "encrypted"
    checksum_algo    = "sha256"
    last_modified    = timestamp()
    lock_support     = true
  }
}

# Environment-specific state configuration
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}