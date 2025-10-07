# 🛡️ HR Onboarding Security Testing Framework

This directory contains comprehensive security testing configurations and tools for the HR Onboarding application.

## 📋 Overview

The security testing framework includes:
- **Dependency Vulnerability Scanning** (Snyk, npm audit, OWASP Dependency Check)
- **Static Application Security Testing (SAST)** (ESLint Security, Semgrep, SonarQube)
- **Dynamic Application Security Testing (DAST)** (OWASP ZAP, Nuclei, Custom Tests)
- **Accessibility & Cross-Browser Testing** (axe-core, pa11y, Playwright)

## 🏗️ Directory Structure

```
security/
├── README.md                          # This file
├── .eslintrc.security.js              # ESLint security configuration
├── reports/                           # Generated security reports
├── owasp-zap/                        # OWASP ZAP configurations
│   ├── baseline-scan.conf            # Baseline security scanning
│   └── comprehensive-scan.conf       # Comprehensive security scanning
├── nuclei/                           # Nuclei vulnerability scanner
│   └── custom-templates/             # Custom security test templates
│       └── hr-onboarding-api.yaml    # API-specific security tests
└── sonarqube/                        # SonarQube configuration
    └── sonar-project.properties      # Code quality and security rules

performance/
├── accessibility/                    # Accessibility testing
│   ├── axe-config.js                # axe-core configuration
│   └── cross-browser-tests.spec.js  # Playwright cross-browser tests
└── lighthouse/                       # Performance monitoring
```

## 🚀 Running Security Tests

### Manual Execution

The comprehensive security pipeline can be triggered manually via GitHub Actions:

1. **Go to Actions tab** in your GitHub repository
2. **Select "Comprehensive QA & Security Pipeline"**
3. **Click "Run workflow"**
4. **Configure options:**
   - **Test Suite:** Choose from `performance-only`, `security-only`, `accessibility`, `comprehensive`, `security-comprehensive`
   - **Security Level:** Select `baseline`, `standard`, `comprehensive`, or `penetration`
   - **Environment:** Target `dev`, `staging`, or `production`
   - **Notifications:** Choose `email`, `slack`, `teams`, or `none`

### Automatic Triggers

The security pipeline runs automatically:
- **After deployments** (workflow_run trigger)
- **Daily at 6 AM UTC** (comprehensive suite)
- **Every 6 hours** (security baseline)
- **On pull requests** (security and accessibility focus)
- **On pushes to main branches** (security validation)

## 🔒 Security Test Types

### 1. Dependency Vulnerability Scanning

**Tools Used:**
- **Snyk** - Identifies vulnerable dependencies
- **npm audit** - Node.js security audit  
- **OWASP Dependency Check** - Comprehensive dependency analysis

**Configuration:**
```bash
# npm audit threshold
--audit-level=moderate

# Snyk severity threshold  
--severity-threshold=high

# OWASP Dependency Check
--failOnCVSS 7
```

### 2. Static Application Security Testing (SAST)

**ESLint Security Rules:**
- `security/detect-object-injection`
- `security/detect-non-literal-regexp`
- `security/detect-eval-with-expression`
- `no-secrets/no-secrets` (credential detection)

**Semgrep Analysis:**
- Custom security patterns
- OWASP Top 10 rule sets
- Language-specific vulnerability detection

**SonarQube Integration:**
- Code quality analysis
- Security hotspot detection
- Technical debt assessment

### 3. Dynamic Application Security Testing (DAST)

**OWASP ZAP Scanning:**
- **Baseline Scan:** Quick security assessment
- **Comprehensive Scan:** Full active security testing
- **API Security Testing:** OpenAPI/Swagger integration

**Nuclei Vulnerability Detection:**
- CVE-based vulnerability scanning
- Custom template execution
- Technology-specific tests

**Custom Security Tests:**
- SQL injection testing
- XSS prevention validation
- Directory traversal checks
- Exposed file detection
- SSL/TLS configuration analysis

### 4. Accessibility & Cross-Browser Testing

**Accessibility Standards:**
- WCAG 2.1 AA compliance
- Section 508 requirements
- Keyboard navigation testing
- Screen reader compatibility

**Cross-Browser Support:**
- Chromium, Firefox, WebKit testing
- Mobile responsiveness validation
- Performance across devices

## 📊 Security Levels

### Baseline (Quick Security Check)
- Dependency scanning (npm audit, Snyk)
- Basic SAST (ESLint security rules)
- Accessibility baseline (axe-core)
- **Duration:** ~5-8 minutes

### Standard (Recommended)
- All baseline tests
- DAST baseline scanning (OWASP ZAP)
- Cross-browser accessibility testing
- **Duration:** ~10-15 minutes

### Comprehensive (Thorough Analysis)
- All standard tests
- Full DAST scanning with active tests
- SonarQube analysis
- Mobile accessibility testing
- SSL/TLS security assessment
- **Duration:** ~20-30 minutes

### Penetration (Maximum Security)
- All comprehensive tests
- Advanced OWASP ZAP scanning
- Custom penetration testing scripts
- Infrastructure security scanning
- **Duration:** ~30-45 minutes

## 📈 Report Generation

### Automated Reports

Each security run generates:
- **HTML Reports** - Visual dashboards
- **JSON Reports** - Machine-readable results  
- **SARIF Reports** - Security analysis format
- **Markdown Summaries** - Quick overview

### Report Storage

- **Artifacts retention:** 30 days
- **Notification:** Email/Slack/Teams
- **Trend analysis:** Historical comparison
- **CI/CD integration:** Fail on critical issues

## 🔧 Configuration

### Environment Variables

Required secrets in GitHub repository:

```env
# Security Tools
SNYK_TOKEN=your_snyk_api_token
SONAR_TOKEN=your_sonarqube_token

# Notifications  
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SLACK_WEBHOOK=your_slack_webhook_url
TEAMS_WEBHOOK=your_teams_webhook_url

# Optional: ZAP Authentication
ZAP_AUTH_USERNAME=test_user_email
ZAP_AUTH_PASSWORD=test_user_password
```

### Customizing Security Rules

**ESLint Security Rules:**
Edit `security/.eslintrc.security.js` to modify security patterns.

**Nuclei Templates:**
Add custom templates in `security/nuclei/custom-templates/`.

**OWASP ZAP Configuration:**
Modify `security/owasp-zap/*.conf` files for scan parameters.

## 🚨 Security Thresholds

### Blocking Conditions

The pipeline will fail on:
- **Critical security vulnerabilities** (CVSS 9.0+)
- **High-severity issues** in production
- **Accessibility violations** (WCAG AA)
- **Performance regression** (>3s load time)

### Warning Conditions

The pipeline will warn on:
- **Medium-severity vulnerabilities**
- **Code quality issues**
- **Missing security headers**
- **Accessibility improvements**

## 📞 Support & Troubleshooting

### Common Issues

**Snyk Authentication:**
```bash
# Verify token
snyk auth your_token_here
snyk test --dry-run
```

**OWASP ZAP Connection:**
```bash
# Check target accessibility
curl -I https://your-api-url.com/health
```

**Nuclei Template Errors:**
```bash
# Validate custom templates
nuclei -validate -t security/nuclei/custom-templates/
```

### Getting Help

1. **Check workflow logs** in GitHub Actions
2. **Review security reports** in artifacts
3. **Contact security team** via email notifications
4. **Update configurations** based on findings

## 🎯 Best Practices

### Development Workflow

1. **Run security baseline** on feature branches
2. **Address critical issues** before merging
3. **Monitor security trends** over time
4. **Update dependencies** regularly
5. **Review security reports** weekly

### Production Deployment

1. **Comprehensive security scan** before production
2. **Emergency rollback** procedures in place
3. **Security monitoring** enabled
4. **Incident response** plan activated

---

*🔒 Secure development is a team responsibility. Report security issues immediately.*