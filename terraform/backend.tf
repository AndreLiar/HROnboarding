# Terraform Backend Configuration
# This file configures the Terraform state backend for remote state management

terraform {
  backend "azurerm" {
    # Backend configuration is set via backend config file or environment variables
    # Use: terraform init -backend-config=backend-config.hcl
    
    # Example values (replace with your actual values):
    # resource_group_name  = "terraform-state-rg"
    # storage_account_name = "terraformstatestg"
    # container_name       = "terraform-state"
    # key                  = "hr-onboarding.terraform.tfstate"
  }
}

# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# Data source to get subscription information
data "azurerm_subscription" "current" {}