# HR Onboarding - Rollback Guide

## 🔄 Rollback Overview

The HR Onboarding application provides comprehensive rollback capabilities to quickly restore previous versions in case of issues or incidents.

## 🚨 When to Rollback

### Immediate Rollback Scenarios
- ✅ Application completely down or unresponsive
- ✅ Critical security vulnerability discovered
- ✅ Data corruption or loss
- ✅ Performance degradation > 50%
- ✅ Core functionality broken (checklist generation fails)

### Consider Alternative Solutions
- ❌ Minor UI issues (can wait for hotfix)
- ❌ Non-critical features broken
- ❌ Performance issues < 20%
- ❌ Cosmetic problems

## 🛠️ Rollback Methods

### Method 1: Automated Rollback (Recommended)

**GitHub Actions Workflow Rollback**

1. **Navigate to GitHub Actions**
   ```
   https://github.com/AndreLiar/HROnboarding/actions/workflows/rollback.yml
   ```

2. **Click "Run workflow"**
   - Environment: `production` / `staging` / `dev`
   - Version: `v1.2.3` (target version to rollback to)
   - Reason: Brief description of why

3. **Approve if Required**
   - Production rollbacks require manual approval
   - Staging/dev rollbacks are automatic

4. **Monitor Progress**
   - API rollback: ~3-5 minutes
   - Frontend rollback: ~2-3 minutes
   - Health verification: ~2 minutes

### Method 2: Manual Azure Portal Rollback

**API Rollback via Azure Portal**

1. **Navigate to App Service**
   ```
   Azure Portal → App Services → hr-onboarding-prod-api
   ```

2. **Deployment Center**
   - Go to "Deployment Center"
   - View deployment history
   - Select previous successful deployment
   - Click "Redeploy"

3. **Verify Health**
   ```bash
   curl https://hr-onboarding-prod-api.azurewebsites.net/health
   ```

**Frontend Rollback via Static Web Apps**

1. **Navigate to Static Web App**
   ```
   Azure Portal → Static Web Apps → hr-onboarding-prod-web
   ```

2. **Deployment History**
   - View deployment history
   - Select previous version
   - Revert deployment

## 🔍 Available Versions

### Finding Available Versions

**GitHub Releases**
```
https://github.com/AndreLiar/HROnboarding/releases
```

**GitHub Tags**
```bash
git tag --sort=-version:refname
```

**GitHub Actions Artifacts**
```
https://github.com/AndreLiar/HROnboarding/actions
→ Select successful deployment run
→ View "Artifacts" section
```

### Version Information Format
```
v1.2.3
├── hr-onboarding-api-1.2.3.zip
├── hr-onboarding-client-1.2.3/
├── Release Notes
├── Deployment URLs
└── Health Check Results
```

## ⚡ Quick Rollback Commands

### Emergency Production Rollback
```bash
# 1. Identify last known good version
LAST_GOOD_VERSION="v1.2.1"

# 2. Trigger rollback workflow
gh workflow run rollback.yml \
  -f environment=production \
  -f version=$LAST_GOOD_VERSION \
  -f reason="Emergency rollback - API returning 500 errors"

# 3. Monitor rollback progress
gh run watch

# 4. Verify health
curl https://hr-onboarding-prod-api.azurewebsites.net/health
```

### Staging Rollback
```bash
gh workflow run rollback.yml \
  -f environment=staging \
  -f version="v1.1.5" \
  -f reason="Testing rollback procedure"
```

## 📋 Rollback Checklist

### Pre-Rollback
- [ ] **Identify target version** (last known good version)
- [ ] **Document incident** (what went wrong)
- [ ] **Notify stakeholders** (if production rollback)
- [ ] **Verify artifacts exist** for target version
- [ ] **Check rollback permissions** (GitHub environment access)

### During Rollback
- [ ] **Monitor rollback progress** in GitHub Actions
- [ ] **Watch for rollback failures** and retry if needed
- [ ] **Verify each component** (API, Frontend) individually
- [ ] **Check health endpoints** after rollback completion

### Post-Rollback
- [ ] **Verify application functionality**
  - [ ] Homepage loads correctly
  - [ ] Role/department selection works
  - [ ] Checklist generation works
  - [ ] Sharing functionality works
- [ ] **Check database connectivity**
- [ ] **Monitor error logs** for 15 minutes
- [ ] **Notify stakeholders** of successful rollback
- [ ] **Plan forward fix** for original issue

## 🔐 Rollback Permissions

### Required Access
- **GitHub Actions:** Write permissions
- **Environment Access:** Production environment approval rights
- **Azure Resources:** Contributor role on resource groups

### Emergency Access
```bash
# If GitHub Actions unavailable, use Azure CLI
az webapp deployment source config-zip \
  --resource-group hr-onboarding-prod-rg \
  --name hr-onboarding-prod-api \
  --src ./previous-api-deployment.zip
```

## 📊 Rollback Verification

### Health Check Endpoints
```bash
# API Health
curl -f https://hr-onboarding-prod-api.azurewebsites.net/health
# Expected: {"status":"healthy","timestamp":"..."}

# API Documentation
curl -f https://hr-onboarding-prod-api.azurewebsites.net/api-docs
# Expected: HTML swagger documentation

# Frontend
curl -f https://hr-onboarding-prod-web.azurewebsites.net
# Expected: HTML page with React app
```

### Functional Testing
```bash
# Test checklist generation
curl -X POST https://hr-onboarding-prod-api.azurewebsites.net/generate \
  -H "Content-Type: application/json" \
  -d '{"role":"Développeur Junior","department":"Informatique"}' \
  | jq .
```

## 🚨 Rollback Failure Recovery

### If Automated Rollback Fails

1. **Check GitHub Actions logs**
   - Identify failure point
   - Retry failed jobs if possible

2. **Manual Azure intervention**
   ```bash
   # Stop app service
   az webapp stop --name hr-onboarding-prod-api --resource-group hr-onboarding-prod-rg
   
   # Deploy previous version manually
   az webapp deployment source config-zip --src ./backup-deployment.zip
   
   # Start app service
   az webapp start --name hr-onboarding-prod-api --resource-group hr-onboarding-prod-rg
   ```

3. **Emergency contact procedures**
   - Escalate to Azure support if infrastructure issues
   - Contact development team lead
   - Consider temporary maintenance page

### Database Rollback (if applicable)
```sql
-- If database schema changes were made, restore from backup
-- This should be rare with our current stateless architecture
-- Contact DBA or senior developer for assistance
```

## 📞 Emergency Contacts

### Escalation Path
1. **Development Team Lead**
2. **DevOps Engineer** 
3. **Azure Support** (if infrastructure issues)
4. **Business Stakeholders** (for communication)

### Communication Templates

**Incident Notification**
```
🚨 INCIDENT: HR Onboarding Application Down
- Environment: Production
- Impact: Complete service unavailability  
- Action: Rolling back to v1.2.1
- ETA: 10 minutes
- Updates: Every 5 minutes
```

**Rollback Complete**
```
✅ RESOLVED: HR Onboarding Application Restored
- Rollback to v1.2.1 successful
- All services operational
- Monitoring for 30 minutes
- Root cause investigation in progress
```

---

📝 **Related Documentation:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for standard deployment procedures.