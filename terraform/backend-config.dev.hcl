# Backend configuration for development environment
# Usage: terraform init -backend-config=backend-config.dev.hcl

resource_group_name  = "terraform-state-rg"
storage_account_name = "terraformstatehrdev"
container_name       = "terraform-state"
key                  = "hr-onboarding-dev.terraform.tfstate"