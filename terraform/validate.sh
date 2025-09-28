#!/bin/bash

# HR Onboarding - Infrastructure Validation Script
# This script validates that all Azure resources are properly configured and healthy
#
# Usage: ./validate.sh <environment> [resource-group-name]

set -e

ENVIRONMENT=${1}
RESOURCE_GROUP=${2}

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Usage: $0 <environment> [resource-group-name]"
    echo "   environment: dev, staging, prod"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Environment must be: dev, staging, or prod"
    exit 1
fi

echo "🔍 HR Onboarding Infrastructure Validation"
echo "==========================================="
echo "Environment: $ENVIRONMENT"
echo ""

# Check Azure CLI login
if ! az account show >/dev/null 2>&1; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get subscription info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "✅ Using Azure subscription: $SUBSCRIPTION_NAME"

# If resource group not provided, try to get it from Terraform outputs
if [ -z "$RESOURCE_GROUP" ]; then
    if [ -f "outputs-${ENVIRONMENT}.json" ]; then
        RESOURCE_GROUP=$(jq -r '.resource_group_name.value' "outputs-${ENVIRONMENT}.json" 2>/dev/null || echo "")
    fi
    
    if [ -z "$RESOURCE_GROUP" ]; then
        echo "❌ Resource group name not provided and not found in Terraform outputs"
        echo "   Please provide resource group name as second parameter"
        exit 1
    fi
fi

echo "🔍 Validating resource group: $RESOURCE_GROUP"
echo ""

# Validation results
VALIDATION_RESULTS=()
ERRORS=0
WARNINGS=0

# Function to add validation result
add_result() {
    local status=$1
    local message=$2
    local details=${3:-""}
    
    case $status in
        "PASS")
            echo "✅ $message"
            ;;
        "FAIL")
            echo "❌ $message"
            ERRORS=$((ERRORS + 1))
            ;;
        "WARN")
            echo "⚠️ $message"
            WARNINGS=$((WARNINGS + 1))
            ;;
        "INFO")
            echo "ℹ️ $message"
            ;;
    esac
    
    if [ -n "$details" ]; then
        echo "   $details"
    fi
    
    VALIDATION_RESULTS+=("$status: $message")
}

# Check if resource group exists
echo "🏗️ Checking Resource Group..."
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
    RG_LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
    add_result "PASS" "Resource Group exists" "Location: $RG_LOCATION"
else
    add_result "FAIL" "Resource Group does not exist"
    exit 1
fi

# Get all resources in the resource group
echo ""
echo "📋 Checking Resources..."
RESOURCES=$(az resource list --resource-group "$RESOURCE_GROUP" --query "[].{name:name, type:type, location:location, state:properties.provisioningState}" -o json)

if [ "$(echo "$RESOURCES" | jq '. | length')" -eq 0 ]; then
    add_result "FAIL" "No resources found in resource group"
    exit 1
fi

# Check each resource type
echo ""
echo "🔍 Validating Individual Resources..."

# Function to check resource existence and status
check_resource() {
    local resource_type=$1
    local display_name=$2
    local required=${3:-true}
    
    local count=$(echo "$RESOURCES" | jq "[.[] | select(.type == \"$resource_type\")] | length")
    
    if [ "$count" -eq 0 ]; then
        if [ "$required" = "true" ]; then
            add_result "FAIL" "$display_name not found"
        else
            add_result "WARN" "$display_name not found (optional)"
        fi
        return 1
    elif [ "$count" -gt 1 ]; then
        add_result "WARN" "Multiple $display_name found ($count instances)"
    else
        local resource_name=$(echo "$RESOURCES" | jq -r ".[] | select(.type == \"$resource_type\") | .name")
        local resource_state=$(echo "$RESOURCES" | jq -r ".[] | select(.type == \"$resource_type\") | .state")
        
        if [ "$resource_state" = "Succeeded" ]; then
            add_result "PASS" "$display_name is healthy" "Name: $resource_name"
        else
            add_result "FAIL" "$display_name has issues" "Name: $resource_name, State: $resource_state"
        fi
    fi
    
    return 0
}

# Check required resources
check_resource "Microsoft.KeyVault/vaults" "Key Vault"
check_resource "Microsoft.DocumentDB/databaseAccounts" "Cosmos DB"
check_resource "Microsoft.Web/serverfarms" "App Service Plan"
check_resource "Microsoft.Web/sites" "Web App (API)"
check_resource "Microsoft.Web/staticSites" "Static Web App"
check_resource "Microsoft.CognitiveServices/accounts" "Azure OpenAI" false

# Detailed health checks
echo ""
echo "🏥 Detailed Health Checks..."

# Check Cosmos DB
COSMOS_NAME=$(echo "$RESOURCES" | jq -r '.[] | select(.type == "Microsoft.DocumentDB/databaseAccounts") | .name' | head -1)
if [ -n "$COSMOS_NAME" ] && [ "$COSMOS_NAME" != "null" ]; then
    echo "📊 Checking Cosmos DB: $COSMOS_NAME"
    
    # Check databases
    DATABASES=$(az cosmosdb sql database list --account-name "$COSMOS_NAME" --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv 2>/dev/null || echo "")
    if echo "$DATABASES" | grep -q "hr-onboarding"; then
        add_result "PASS" "Cosmos DB database 'hr-onboarding' exists"
        
        # Check containers
        CONTAINERS=$(az cosmosdb sql container list --account-name "$COSMOS_NAME" --resource-group "$RESOURCE_GROUP" --database-name "hr-onboarding" --query "[].name" -o tsv 2>/dev/null || echo "")
        if echo "$CONTAINERS" | grep -q "checklists"; then
            add_result "PASS" "Cosmos DB container 'checklists' exists"
        else
            add_result "FAIL" "Cosmos DB container 'checklists' missing"
        fi
        
        if echo "$CONTAINERS" | grep -q "analytics"; then
            add_result "PASS" "Cosmos DB container 'analytics' exists"
        else
            add_result "WARN" "Cosmos DB container 'analytics' missing (optional)"
        fi
    else
        add_result "FAIL" "Cosmos DB database 'hr-onboarding' missing"
    fi
fi

# Check Web App
WEB_APP_NAME=$(echo "$RESOURCES" | jq -r '.[] | select(.type == "Microsoft.Web/sites") | .name' | head -1)
if [ -n "$WEB_APP_NAME" ] && [ "$WEB_APP_NAME" != "null" ]; then
    echo "🌐 Checking Web App: $WEB_APP_NAME"
    
    # Check if app is running
    APP_STATE=$(az webapp show --name "$WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv 2>/dev/null || echo "Unknown")
    if [ "$APP_STATE" = "Running" ]; then
        add_result "PASS" "Web App is running"
        
        # Check app settings
        APP_SETTINGS=$(az webapp config appsettings list --name "$WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv 2>/dev/null || echo "")
        
        required_settings=("COSMOS_DB_DATABASE_ID" "COSMOS_DB_CONTAINER_ID" "NODE_ENV")
        for setting in "${required_settings[@]}"; do
            if echo "$APP_SETTINGS" | grep -q "$setting"; then
                add_result "PASS" "App setting '$setting' configured"
            else
                add_result "FAIL" "App setting '$setting' missing"
            fi
        done
        
        # Test HTTP endpoint
        APP_URL="https://${WEB_APP_NAME}.azurewebsites.net/health"
        if curl -s --max-time 10 "$APP_URL" >/dev/null 2>&1; then
            add_result "PASS" "Web App health endpoint responding"
        else
            add_result "WARN" "Web App health endpoint not responding (may not be deployed yet)"
        fi
    else
        add_result "FAIL" "Web App is not running" "State: $APP_STATE"
    fi
fi

# Check Key Vault
KEY_VAULT_NAME=$(echo "$RESOURCES" | jq -r '.[] | select(.type == "Microsoft.KeyVault/vaults") | .name' | head -1)
if [ -n "$KEY_VAULT_NAME" ] && [ "$KEY_VAULT_NAME" != "null" ]; then
    echo "🔐 Checking Key Vault: $KEY_VAULT_NAME"
    
    # Check secrets
    SECRETS=$(az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[].name" -o tsv 2>/dev/null || echo "")
    
    required_secrets=("cosmos-endpoint" "cosmos-key" "openai-endpoint" "openai-key")
    for secret in "${required_secrets[@]}"; do
        if echo "$SECRETS" | grep -q "$secret"; then
            add_result "PASS" "Key Vault secret '$secret' exists"
        else
            add_result "FAIL" "Key Vault secret '$secret' missing"
        fi
    done
fi

# Check Azure OpenAI (if enabled)
OPENAI_NAME=$(echo "$RESOURCES" | jq -r '.[] | select(.type == "Microsoft.CognitiveServices/accounts") | .name' | head -1)
if [ -n "$OPENAI_NAME" ] && [ "$OPENAI_NAME" != "null" ]; then
    echo "🤖 Checking Azure OpenAI: $OPENAI_NAME"
    
    OPENAI_STATE=$(az cognitiveservices account show --name "$OPENAI_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.provisioningState" -o tsv 2>/dev/null || echo "Unknown")
    if [ "$OPENAI_STATE" = "Succeeded" ]; then
        add_result "PASS" "Azure OpenAI service is healthy"
        
        # Check deployments (requires REST API call)
        OPENAI_ENDPOINT=$(az cognitiveservices account show --name "$OPENAI_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.endpoint" -o tsv 2>/dev/null || echo "")
        if [ -n "$OPENAI_ENDPOINT" ]; then
            add_result "PASS" "Azure OpenAI endpoint available"
        else
            add_result "WARN" "Azure OpenAI endpoint not found"
        fi
    else
        add_result "FAIL" "Azure OpenAI service has issues" "State: $OPENAI_STATE"
    fi
else
    add_result "INFO" "Azure OpenAI not deployed (using OpenAI API)"
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="
echo "Total checks: ${#VALIDATION_RESULTS[@]}"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "🎉 All validations passed! Infrastructure is healthy."
        exit 0
    else
        echo "✅ Validation completed with warnings. Infrastructure is mostly healthy."
        exit 0
    fi
else
    echo "❌ Validation failed with $ERRORS errors. Please fix the issues above."
    exit 1
fi