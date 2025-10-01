#!/bin/bash

# GitHub-based Terraform State Encryption and Management
# Zero-cost alternative to Azure Storage backend

set -euo pipefail

# Configuration
REPO_OWNER="AndreLiar"
REPO_NAME="HROnboarding"
STATE_DIR=".github/terraform-state/encrypted-states"
LOCK_DIR=".github/terraform-state/state-locks"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Encrypt Terraform state file
encrypt_state() {
    local environment=$1
    local state_file=$2
    local encrypted_file="${STATE_DIR}/${environment}.tfstate.enc"
    
    if [[ ! -f "$state_file" ]]; then
        log_error "State file not found: $state_file"
        return 1
    fi
    
    if [[ -z "${STATE_ENCRYPTION_KEY:-}" ]]; then
        log_error "STATE_ENCRYPTION_KEY environment variable not set"
        return 1
    fi
    
    log_info "Encrypting state file for environment: $environment"
    
    # Create encrypted state with AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -k "$STATE_ENCRYPTION_KEY" \
        -in "$state_file" \
        -out "$encrypted_file"
    
    # Create metadata file
    cat > "${encrypted_file}.meta" << EOF
{
  "environment": "$environment",
  "encrypted_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "terraform_version": "$(terraform version -json | jq -r '.terraform_version')",
  "checksum": "$(sha256sum "$state_file" | cut -d' ' -f1)"
}
EOF
    
    log_success "State file encrypted: $encrypted_file"
    return 0
}

# Decrypt Terraform state file
decrypt_state() {
    local environment=$1
    local output_file=$2
    local encrypted_file="${STATE_DIR}/${environment}.tfstate.enc"
    
    if [[ ! -f "$encrypted_file" ]]; then
        log_error "Encrypted state file not found: $encrypted_file"
        return 1
    fi
    
    if [[ -z "${STATE_ENCRYPTION_KEY:-}" ]]; then
        log_error "STATE_ENCRYPTION_KEY environment variable not set"
        return 1
    fi
    
    log_info "Decrypting state file for environment: $environment"
    
    # Decrypt state file
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
        -k "$STATE_ENCRYPTION_KEY" \
        -in "$encrypted_file" \
        -out "$output_file"
    
    log_success "State file decrypted: $output_file"
    return 0
}

# Create state lock
create_lock() {
    local environment=$1
    local operation=$2
    local lock_file="${LOCK_DIR}/${environment}.lock"
    
    if [[ -f "$lock_file" ]]; then
        log_warning "Lock already exists for environment: $environment"
        cat "$lock_file"
        return 1
    fi
    
    # Create lock metadata
    cat > "$lock_file" << EOF
{
  "ID": "$(uuidgen)",
  "Operation": "$operation",
  "Info": "Terraform state lock",
  "Who": "${GITHUB_ACTOR:-$(whoami)}",
  "Version": "$(terraform version -json | jq -r '.terraform_version')",
  "Created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "Path": "$environment"
}
EOF
    
    log_success "Lock created for environment: $environment"
    return 0
}

# Release state lock
release_lock() {
    local environment=$1
    local lock_file="${LOCK_DIR}/${environment}.lock"
    
    if [[ ! -f "$lock_file" ]]; then
        log_warning "No lock found for environment: $environment"
        return 0
    fi
    
    rm "$lock_file"
    log_success "Lock released for environment: $environment"
    return 0
}

# Backup current state
backup_state() {
    local environment=$1
    local backup_dir="${STATE_DIR}/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    mkdir -p "$backup_dir"
    
    if [[ -f "${STATE_DIR}/${environment}.tfstate.enc" ]]; then
        cp "${STATE_DIR}/${environment}.tfstate.enc" \
           "${backup_dir}/${environment}_${timestamp}.tfstate.enc"
        log_success "State backed up: ${backup_dir}/${environment}_${timestamp}.tfstate.enc"
    else
        log_warning "No existing state to backup for environment: $environment"
    fi
}

# List all state files
list_states() {
    log_info "Available Terraform states:"
    
    if [[ -d "$STATE_DIR" ]]; then
        for file in "$STATE_DIR"/*.tfstate.enc; do
            if [[ -f "$file" ]]; then
                local basename=$(basename "$file" .tfstate.enc)
                local meta_file="${file}.meta"
                
                echo -n "  - $basename"
                if [[ -f "$meta_file" ]]; then
                    local encrypted_at=$(jq -r '.encrypted_at' "$meta_file")
                    echo " (last updated: $encrypted_at)"
                else
                    echo " (no metadata)"
                fi
            fi
        done
    else
        log_warning "No state directory found"
    fi
}

# Validate state integrity
validate_state() {
    local environment=$1
    local encrypted_file="${STATE_DIR}/${environment}.tfstate.enc"
    local meta_file="${encrypted_file}.meta"
    
    if [[ ! -f "$encrypted_file" ]]; then
        log_error "State file not found: $encrypted_file"
        return 1
    fi
    
    if [[ ! -f "$meta_file" ]]; then
        log_warning "Metadata file not found: $meta_file"
        return 0
    fi
    
    log_info "Validating state integrity for environment: $environment"
    
    # Decrypt to temporary file for validation
    local temp_file=$(mktemp)
    if decrypt_state "$environment" "$temp_file"; then
        local current_checksum=$(sha256sum "$temp_file" | cut -d' ' -f1)
        local stored_checksum=$(jq -r '.checksum' "$meta_file")
        
        if [[ "$current_checksum" == "$stored_checksum" ]]; then
            log_success "State integrity validated"
        else
            log_error "State integrity check failed - checksums don't match"
        fi
        
        rm "$temp_file"
    else
        log_error "Failed to decrypt state for validation"
        return 1
    fi
}

# Main script logic
main() {
    local command=${1:-"help"}
    local environment=${2:-""}
    local state_file=${3:-""}
    
    case "$command" in
        "encrypt")
            if [[ -z "$environment" ]] || [[ -z "$state_file" ]]; then
                log_error "Usage: $0 encrypt <environment> <state_file>"
                exit 1
            fi
            encrypt_state "$environment" "$state_file"
            ;;
        "decrypt")
            if [[ -z "$environment" ]] || [[ -z "$state_file" ]]; then
                log_error "Usage: $0 decrypt <environment> <output_file>"
                exit 1
            fi
            decrypt_state "$environment" "$state_file"
            ;;
        "lock")
            if [[ -z "$environment" ]]; then
                log_error "Usage: $0 lock <environment> [operation]"
                exit 1
            fi
            create_lock "$environment" "${3:-terraform}"
            ;;
        "unlock")
            if [[ -z "$environment" ]]; then
                log_error "Usage: $0 unlock <environment>"
                exit 1
            fi
            release_lock "$environment"
            ;;
        "backup")
            if [[ -z "$environment" ]]; then
                log_error "Usage: $0 backup <environment>"
                exit 1
            fi
            backup_state "$environment"
            ;;
        "list")
            list_states
            ;;
        "validate")
            if [[ -z "$environment" ]]; then
                log_error "Usage: $0 validate <environment>"
                exit 1
            fi
            validate_state "$environment"
            ;;
        "help"|*)
            echo "Terraform State Management (GitHub Backend)"
            echo "Usage: $0 <command> [arguments]"
            echo ""
            echo "Commands:"
            echo "  encrypt <env> <state_file>  - Encrypt and store state file"
            echo "  decrypt <env> <output_file> - Decrypt state file"
            echo "  lock <env> [operation]      - Create state lock"
            echo "  unlock <env>                - Release state lock"
            echo "  backup <env>                - Backup current state"
            echo "  list                        - List all state files"
            echo "  validate <env>              - Validate state integrity"
            echo "  help                        - Show this help"
            echo ""
            echo "Environment variables:"
            echo "  STATE_ENCRYPTION_KEY        - Key for state encryption (required)"
            echo "  GITHUB_ACTOR               - GitHub actor (for lock metadata)"
            ;;
    esac
}

# Run main function with all arguments
main "$@"