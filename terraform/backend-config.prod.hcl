# Backend configuration for production environment
# Usage: terraform init -backend-config=backend-config.prod.hcl

resource_group_name  = "terraform-state-rg"
storage_account_name = "terraformstatehrprod"
container_name       = "terraform-state"
key                  = "hr-onboarding-prod.terraform.tfstate"