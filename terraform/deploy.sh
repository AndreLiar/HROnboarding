#!/bin/bash

# HR Onboarding - Terraform Deployment Script
# This script deploys the HR Onboarding application infrastructure using Terraform
#
# Usage: ./deploy.sh <environment> [action]
# Examples:
#   ./deploy.sh dev plan
#   ./deploy.sh dev apply
#   ./deploy.sh prod apply

set -e

ENVIRONMENT=${1}
ACTION=${2:-plan}

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Usage: $0 <environment> [action]"
    echo "   environment: dev, staging, prod"
    echo "   action: plan, apply, destroy (default: plan)"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Environment must be: dev, staging, or prod"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(plan|apply|destroy|init|validate|format)$ ]]; then
    echo "❌ Action must be: plan, apply, destroy, init, validate, or format"
    exit 1
fi

echo "🚀 Terraform Deployment for HR Onboarding"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo "Working Directory: $(pwd)"
echo ""

# Check if we're in the terraform directory
if [ ! -f "main.tf" ]; then
    echo "❌ main.tf not found. Please run this script from the terraform directory."
    exit 1
fi

# Check Azure CLI login
if ! az account show >/dev/null 2>&1; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "✅ Using Azure subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"

# Set Terraform variables
export TF_VAR_subscription_id="$SUBSCRIPTION_ID"
export TF_IN_AUTOMATION=true

# Terraform file paths
TFVARS_FILE="environments/${ENVIRONMENT}.tfvars"
BACKEND_CONFIG="backend-config.${ENVIRONMENT}.hcl"

# Check if environment file exists
if [ ! -f "$TFVARS_FILE" ]; then
    echo "❌ Environment file not found: $TFVARS_FILE"
    exit 1
fi

echo "📁 Using configuration files:"
echo "   Variables: $TFVARS_FILE"
echo "   Backend: $BACKEND_CONFIG"
echo ""

# Function to run terraform commands with common parameters
run_terraform() {
    local cmd=$1
    shift
    
    echo "🔧 Running: terraform $cmd $*"
    terraform "$cmd" \
        -var-file="$TFVARS_FILE" \
        "$@"
}

# Handle different actions
case $ACTION in
    "init")
        echo "🏗️ Initializing Terraform..."
        if [ -f "$BACKEND_CONFIG" ]; then
            terraform init -backend-config="$BACKEND_CONFIG" -upgrade
        else
            echo "⚠️ Backend config not found: $BACKEND_CONFIG"
            echo "   Initializing with local backend..."
            terraform init -upgrade
        fi
        ;;
        
    "format")
        echo "🎨 Formatting Terraform files..."
        terraform fmt -recursive
        echo "✅ Terraform files formatted"
        ;;
        
    "validate")
        echo "🔍 Validating Terraform configuration..."
        terraform validate
        echo "✅ Terraform configuration is valid"
        ;;
        
    "plan")
        echo "📋 Planning Terraform deployment..."
        
        # Initialize if needed
        if [ ! -d ".terraform" ]; then
            echo "🏗️ Initializing Terraform first..."
            if [ -f "$BACKEND_CONFIG" ]; then
                terraform init -backend-config="$BACKEND_CONFIG"
            else
                terraform init
            fi
        fi
        
        # Validate first
        terraform validate
        
        # Create plan
        PLAN_FILE="terraform-${ENVIRONMENT}.tfplan"
        run_terraform plan -out="$PLAN_FILE"
        
        echo ""
        echo "✅ Plan created: $PLAN_FILE"
        echo "💡 To apply: ./deploy.sh $ENVIRONMENT apply"
        ;;
        
    "apply")
        echo "🚀 Applying Terraform configuration..."
        
        # Check if plan file exists
        PLAN_FILE="terraform-${ENVIRONMENT}.tfplan"
        if [ -f "$PLAN_FILE" ]; then
            echo "📋 Using existing plan file: $PLAN_FILE"
            terraform apply "$PLAN_FILE"
        else
            echo "📋 No plan file found, creating and applying..."
            run_terraform apply -auto-approve
        fi
        
        echo ""
        echo "✅ Terraform apply completed!"
        
        # Show outputs
        echo "📊 Deployment outputs:"
        terraform output -json | jq '.'
        
        # Save outputs to file
        OUTPUT_FILE="outputs-${ENVIRONMENT}.json"
        terraform output -json > "$OUTPUT_FILE"
        echo "💾 Outputs saved to: $OUTPUT_FILE"
        ;;
        
    "destroy")
        echo "🗑️ Destroying Terraform infrastructure..."
        echo "⚠️ WARNING: This will destroy all resources in $ENVIRONMENT environment!"
        echo ""
        
        # Confirmation prompt
        read -p "Are you sure you want to destroy all resources? (type 'yes' to confirm): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "❌ Destruction cancelled"
            exit 1
        fi
        
        echo "💥 Proceeding with destruction..."
        run_terraform destroy -auto-approve
        
        echo ""
        echo "✅ Infrastructure destroyed"
        ;;
        
    *)
        echo "❌ Unknown action: $ACTION"
        exit 1
        ;;
esac

echo ""
echo "🎉 Terraform $ACTION completed successfully!"

# Cleanup plan files after apply
if [ "$ACTION" = "apply" ] && [ -f "terraform-${ENVIRONMENT}.tfplan" ]; then
    rm "terraform-${ENVIRONMENT}.tfplan"
    echo "🧹 Cleaned up plan file"
fi