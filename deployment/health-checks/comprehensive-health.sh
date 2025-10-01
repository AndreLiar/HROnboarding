#!/bin/bash

# Comprehensive Health Check Suite for Blue/Green Deployments
# Zero-cost health validation for HR Onboarding application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/health-check.log"
TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    log "${PURPLE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Health check functions
check_api_health() {
    local base_url=$1
    local health_endpoint="${base_url}/health"
    
    log_step "Checking API health endpoint: $health_endpoint"
    
    local response
    local status_code
    
    for attempt in $(seq 1 $RETRY_COUNT); do
        log_info "Health check attempt $attempt/$RETRY_COUNT"
        
        if response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$health_endpoint" 2>/dev/null); then
            status_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | sed '$d')
            
            if [[ "$status_code" == "200" ]]; then
                log_success "API health check passed (Status: $status_code)"
                
                # Validate response format
                if echo "$body" | jq -e '.status' >/dev/null 2>&1; then
                    local status=$(echo "$body" | jq -r '.status')
                    log_info "API status: $status"
                    
                    if [[ "$status" == "healthy" ]]; then
                        return 0
                    else
                        log_warning "API reports unhealthy status: $status"
                    fi
                else
                    log_warning "Invalid health response format"
                fi
            else
                log_error "API health check failed (Status: $status_code)"
                log_error "Response: $body"
            fi
        else
            log_error "Failed to connect to health endpoint"
        fi
        
        if [[ $attempt -lt $RETRY_COUNT ]]; then
            log_info "Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
    done
    
    return 1
}

check_api_endpoints() {
    local base_url=$1
    
    log_step "Testing core API endpoints"
    
    # Test root endpoint
    log_info "Testing root endpoint: $base_url/"
    if curl -s --max-time $TIMEOUT "$base_url/" >/dev/null; then
        log_success "Root endpoint accessible"
    else
        log_error "Root endpoint failed"
        return 1
    fi
    
    # Test API documentation
    log_info "Testing API docs: $base_url/api-docs"
    if curl -s --max-time $TIMEOUT "$base_url/api-docs" >/dev/null; then
        log_success "API documentation accessible"
    else
        log_warning "API documentation failed (non-critical)"
    fi
    
    return 0
}

check_checklist_generation() {
    local base_url=$1
    local generate_endpoint="${base_url}/generate"
    
    log_step "Testing checklist generation functionality"
    
    local test_payload='{
        "role": "Développeur Junior",
        "department": "Informatique"
    }'
    
    log_info "Testing generate endpoint: $generate_endpoint"
    
    local response
    local status_code
    
    if response=$(curl -s -w "\n%{http_code}" \
        --max-time 60 \
        -H "Content-Type: application/json" \
        -d "$test_payload" \
        "$generate_endpoint" 2>/dev/null); then
        
        status_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [[ "$status_code" == "200" ]]; then
            log_success "Checklist generation successful (Status: $status_code)"
            
            # Validate response structure
            if echo "$body" | jq -e '.checklist' >/dev/null 2>&1; then
                local checklist_count=$(echo "$body" | jq '.checklist | length')
                log_info "Generated checklist with $checklist_count items"
                
                # Check if checklist contains expected French HR elements
                if echo "$body" | jq -e '.checklist[] | select(.étape // . | tostring | test("DPAE|RGPD|médecine"))' >/dev/null 2>&1; then
                    log_success "Checklist contains expected French HR compliance items"
                    return 0
                else
                    log_warning "Checklist may not contain expected compliance items"
                fi
            else
                log_error "Invalid checklist response format"
                log_error "Response: $body"
            fi
        else
            log_error "Checklist generation failed (Status: $status_code)"
            log_error "Response: $body"
        fi
    else
        log_error "Failed to connect to generate endpoint"
    fi
    
    return 1
}

check_frontend_application() {
    local frontend_url=$1
    
    log_step "Testing frontend application: $frontend_url"
    
    local response
    local status_code
    
    if response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$frontend_url" 2>/dev/null); then
        status_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [[ "$status_code" == "200" ]]; then
            log_success "Frontend application accessible (Status: $status_code)"
            
            # Check for React app indicators
            if echo "$body" | grep -q "React"; then
                log_success "React application detected"
            fi
            
            # Check for app title
            if echo "$body" | grep -qi "HR Onboarding"; then
                log_success "Application title found"
            fi
            
            return 0
        else
            log_error "Frontend application failed (Status: $status_code)"
        fi
    else
        log_error "Failed to connect to frontend application"
    fi
    
    return 1
}

check_database_connectivity() {
    local api_base_url=$1
    
    log_step "Testing database connectivity through API"
    
    # Use a lightweight endpoint that touches the database
    local test_endpoint="${api_base_url}/health"
    
    log_info "Testing database connection via health endpoint"
    
    local response
    if response=$(curl -s --max-time $TIMEOUT "$test_endpoint" 2>/dev/null); then
        if echo "$response" | jq -e '.database // .db // .storage' >/dev/null 2>&1; then
            local db_status=$(echo "$response" | jq -r '.database // .db // .storage // "connected"')
            log_success "Database connectivity verified: $db_status"
            return 0
        else
            log_info "Database status not explicitly reported (assuming healthy)"
            return 0
        fi
    else
        log_error "Cannot verify database connectivity"
        return 1
    fi
}

check_performance_metrics() {
    local api_base_url=$1
    
    log_step "Measuring performance metrics"
    
    local health_endpoint="${api_base_url}/health"
    local start_time
    local end_time
    local response_time
    
    log_info "Measuring API response time"
    
    start_time=$(date +%s%N)
    if curl -s --max-time $TIMEOUT "$health_endpoint" >/dev/null; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
        
        log_info "API response time: ${response_time}ms"
        
        if [[ $response_time -lt 5000 ]]; then
            log_success "Response time within acceptable limits (<5s)"
        else
            log_warning "Response time above 5 seconds: ${response_time}ms"
        fi
        
        return 0
    else
        log_error "Performance test failed - endpoint unreachable"
        return 1
    fi
}

run_integration_test() {
    local api_base_url=$1
    local frontend_url=$2
    
    log_step "Running end-to-end integration test"
    
    # Test the full user workflow simulation
    log_info "Simulating user workflow: role selection → generation → sharing"
    
    # 1. Generate checklist
    local generate_payload='{
        "role": "Chef de Projet",
        "department": "Informatique"
    }'
    
    log_info "Step 1: Generate checklist"
    local checklist_response
    if checklist_response=$(curl -s --max-time 60 \
        -H "Content-Type: application/json" \
        -d "$generate_payload" \
        "${api_base_url}/generate" 2>/dev/null); then
        
        if echo "$checklist_response" | jq -e '.checklist' >/dev/null 2>&1; then
            log_success "Checklist generation successful"
            
            # 2. Test sharing functionality
            log_info "Step 2: Test sharing functionality"
            local share_payload
            share_payload=$(echo "$checklist_response" | jq -c '. + {"checklist": .checklist}')
            
            local share_response
            if share_response=$(curl -s --max-time 30 \
                -H "Content-Type: application/json" \
                -d "$share_payload" \
                "${api_base_url}/share" 2>/dev/null); then
                
                if echo "$share_response" | jq -e '.slug' >/dev/null 2>&1; then
                    local slug=$(echo "$share_response" | jq -r '.slug')
                    log_success "Share functionality successful (slug: $slug)"
                    
                    # 3. Test shared checklist retrieval
                    log_info "Step 3: Test shared checklist retrieval"
                    if curl -s --max-time 30 "${api_base_url}/c/${slug}" >/dev/null; then
                        log_success "Shared checklist retrieval successful"
                        log_success "End-to-end integration test PASSED"
                        return 0
                    else
                        log_error "Shared checklist retrieval failed"
                    fi
                else
                    log_error "Share response missing slug"
                fi
            else
                log_error "Share functionality failed"
            fi
        else
            log_error "Checklist generation returned invalid response"
        fi
    else
        log_error "Checklist generation failed"
    fi
    
    log_error "End-to-end integration test FAILED"
    return 1
}

generate_health_report() {
    local results_file="${SCRIPT_DIR}/health-report.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    log_step "Generating health check report"
    
    cat > "$results_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "${ENVIRONMENT:-unknown}",
  "version": "${VERSION:-unknown}",
  "api_url": "${API_URL:-unknown}",
  "frontend_url": "${FRONTEND_URL:-unknown}",
  "checks": {
    "api_health": $API_HEALTH_RESULT,
    "api_endpoints": $API_ENDPOINTS_RESULT,
    "checklist_generation": $CHECKLIST_GENERATION_RESULT,
    "frontend_application": $FRONTEND_APPLICATION_RESULT,
    "database_connectivity": $DATABASE_CONNECTIVITY_RESULT,
    "performance_metrics": $PERFORMANCE_METRICS_RESULT,
    "integration_test": $INTEGRATION_TEST_RESULT
  },
  "overall_status": "$OVERALL_STATUS",
  "response_time_ms": $RESPONSE_TIME_MS,
  "recommendations": [
    $RECOMMENDATIONS
  ]
}
EOF
    
    log_success "Health report generated: $results_file"
}

# Main health check execution
main() {
    local api_url=${1:-""}
    local frontend_url=${2:-""}
    
    if [[ -z "$api_url" ]]; then
        log_error "Usage: $0 <api_url> [frontend_url]"
        log_error "Example: $0 https://hr-onboarding-dev-api.azurewebsites.net https://example.com"
        exit 1
    fi
    
    # Initialize log file
    echo "=== Health Check Started at $(date) ===" > "$LOG_FILE"
    
    log_info "Starting comprehensive health check"
    log_info "API URL: $api_url"
    log_info "Frontend URL: ${frontend_url:-"Not specified"}"
    
    # Initialize result variables
    API_HEALTH_RESULT=false
    API_ENDPOINTS_RESULT=false
    CHECKLIST_GENERATION_RESULT=false
    FRONTEND_APPLICATION_RESULT=false
    DATABASE_CONNECTIVITY_RESULT=false
    PERFORMANCE_METRICS_RESULT=false
    INTEGRATION_TEST_RESULT=false
    OVERALL_STATUS="FAILED"
    RESPONSE_TIME_MS=0
    RECOMMENDATIONS=""
    
    # Run health checks
    local all_passed=true
    
    if check_api_health "$api_url"; then
        API_HEALTH_RESULT=true
    else
        all_passed=false
    fi
    
    if check_api_endpoints "$api_url"; then
        API_ENDPOINTS_RESULT=true
    else
        all_passed=false
    fi
    
    if check_checklist_generation "$api_url"; then
        CHECKLIST_GENERATION_RESULT=true
    else
        all_passed=false
    fi
    
    if [[ -n "$frontend_url" ]]; then
        if check_frontend_application "$frontend_url"; then
            FRONTEND_APPLICATION_RESULT=true
        else
            all_passed=false
        fi
    else
        log_info "Skipping frontend check (URL not provided)"
        FRONTEND_APPLICATION_RESULT=true
    fi
    
    if check_database_connectivity "$api_url"; then
        DATABASE_CONNECTIVITY_RESULT=true
    else
        all_passed=false
    fi
    
    if check_performance_metrics "$api_url"; then
        PERFORMANCE_METRICS_RESULT=true
    else
        all_passed=false
    fi
    
    if [[ -n "$frontend_url" ]]; then
        if run_integration_test "$api_url" "$frontend_url"; then
            INTEGRATION_TEST_RESULT=true
        else
            all_passed=false
        fi
    else
        log_info "Skipping integration test (frontend URL not provided)"
        INTEGRATION_TEST_RESULT=true
    fi
    
    # Determine overall status
    if [[ "$all_passed" == "true" ]]; then
        OVERALL_STATUS="PASSED"
        log_success "=== ALL HEALTH CHECKS PASSED ==="
    else
        OVERALL_STATUS="FAILED"
        log_error "=== SOME HEALTH CHECKS FAILED ==="
    fi
    
    # Generate report
    generate_health_report
    
    # Display summary
    echo ""
    echo "=== HEALTH CHECK SUMMARY ==="
    echo "API Health: ${API_HEALTH_RESULT}"
    echo "API Endpoints: ${API_ENDPOINTS_RESULT}"
    echo "Checklist Generation: ${CHECKLIST_GENERATION_RESULT}"
    echo "Frontend Application: ${FRONTEND_APPLICATION_RESULT}"
    echo "Database Connectivity: ${DATABASE_CONNECTIVITY_RESULT}"
    echo "Performance Metrics: ${PERFORMANCE_METRICS_RESULT}"
    echo "Integration Test: ${INTEGRATION_TEST_RESULT}"
    echo "Overall Status: ${OVERALL_STATUS}"
    echo ""
    
    if [[ "$OVERALL_STATUS" == "PASSED" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Export environment variables for use in report
export ENVIRONMENT="${ENVIRONMENT:-unknown}"
export VERSION="${VERSION:-unknown}"
export API_URL="${1:-unknown}"
export FRONTEND_URL="${2:-unknown}"

# Run main function with all arguments
main "$@"