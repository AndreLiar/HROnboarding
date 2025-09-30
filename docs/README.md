# HR Onboarding Documentation

## 📚 Documentation Index

This directory contains comprehensive documentation for the HR Onboarding application's deployment, rollback, and development procedures.

## 🚀 Deployment & Operations

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Complete guide for deploying the HR Onboarding application:
- Environment configuration (dev, staging, production)
- Semantic versioning and release process
- Manual approval workflows for production
- Health checks and monitoring
- Troubleshooting common deployment issues

### [ROLLBACK.md](./ROLLBACK.md)
Emergency procedures for rolling back deployments:
- When and how to perform rollbacks
- Automated rollback workflows
- Manual rollback procedures
- Verification and testing after rollback
- Emergency contact procedures

### [CONVENTIONAL_COMMITS.md](./CONVENTIONAL_COMMITS.md)
Guidelines for commit messages that drive automatic versioning:
- Commit message format and conventions
- Version impact rules (patch, minor, major)
- Examples and best practices
- IDE integration and tooling

## 🏗️ Release Management Features

### Phase 2 Implementation ✅
- **Semantic Versioning:** Automatic version bumping based on conventional commits
- **Release Notes:** Auto-generated from commit messages and PR descriptions
- **Manual Approval:** Production deployments require explicit approval
- **Artifact Storage:** Versioned deployment packages with 30-day retention
- **Rollback Capability:** One-click rollback to any previous version

### Environment Protection
- **Production:** Manual approval required, restricted to `main` branch
- **Staging:** Automatic deployment, team review recommended
- **Development:** Immediate deployment for rapid iteration

## 📋 Quick Reference

### Deployment URLs

| Environment | API | Frontend | Status |
|-------------|-----|----------|---------|
| **Production** | [hr-onboarding-prod-api.azurewebsites.net](https://hr-onboarding-prod-api.azurewebsites.net) | [hr-onboarding-prod-web.azurewebsites.net](https://hr-onboarding-prod-web.azurewebsites.net) | 🟢 Live |
| **Staging** | [hr-onboarding-staging-api.azurewebsites.net](https://hr-onboarding-staging-api.azurewebsites.net) | [hr-onboarding-staging-web.azurewebsites.net](https://hr-onboarding-staging-web.azurewebsites.net) | 🟡 Staging |
| **Development** | [hr-onboarding-dev-r2x0-api.azurewebsites.net](https://hr-onboarding-dev-r2x0-api.azurewebsites.net) | [mango-pebble-0d01d2103.1.azurestaticapps.net](https://mango-pebble-0d01d2103.1.azurestaticapps.net) | 🔵 Dev |

### Health Check URLs
```bash
# API Health Checks
curl https://hr-onboarding-prod-api.azurewebsites.net/health
curl https://hr-onboarding-staging-api.azurewebsites.net/health  
curl https://hr-onboarding-dev-r2x0-api.azurewebsites.net/health

# API Documentation
curl https://hr-onboarding-prod-api.azurewebsites.net/api-docs
```

### GitHub Actions Workflows

| Workflow | Purpose | Trigger | Manual |
|----------|---------|---------|---------|
| **Deploy** | Main deployment pipeline | Push to main/staging/dev | ❌ |
| **Rollback** | Emergency rollback procedure | Manual dispatch | ✅ |

### Emergency Procedures

**Quick Production Rollback:**
```bash
# 1. Go to GitHub Actions
# 2. Run "Rollback HR Onboarding Application" workflow
# 3. Select:
#    - Environment: production
#    - Version: v1.2.3 (last known good)
#    - Reason: "Brief description"
```

**Health Check Commands:**
```bash
# Verify all services
curl -f https://hr-onboarding-prod-api.azurewebsites.net/health
curl -f https://hr-onboarding-prod-web.azurewebsites.net
```

## 🔐 Access Requirements

### GitHub Permissions
- **Developers:** Write access to repository
- **DevOps Team:** Admin access for workflow management
- **Release Managers:** Environment approval rights for production

### Azure Permissions
- **Service Principal:** Contributor role on all resource groups
- **Emergency Access:** Owner role for manual intervention

## 📊 Monitoring & Observability

### Deployment Tracking
- **GitHub Releases:** [View Releases](https://github.com/AndreLiar/HROnboarding/releases)
- **Actions History:** [View Workflows](https://github.com/AndreLiar/HROnboarding/actions)
- **Artifact Storage:** Available in successful deployment runs

### Application Monitoring
- **Azure Application Insights:** Integrated with all environments
- **Health Endpoints:** Automated monitoring every 5 minutes
- **Error Logging:** Centralized in Azure Log Analytics

## 🚀 Future Enhancements (Phase 3)

### Week 3: Advanced Monitoring (Planned)
- Performance monitoring and alerting
- Custom Azure dashboards
- Slack/Teams integration for notifications
- SLA monitoring and reporting

### Week 4: Infrastructure (Planned)
- Terraform remote state management
- Blue/green deployment strategy
- Infrastructure as Code best practices
- Multi-region deployment capability

---

📝 **Last Updated:** $(date)  
🤖 **Generated with:** [Claude Code](https://claude.ai/code)