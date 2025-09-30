# HR Onboarding - Monitoring & Observability Guide

## 🎯 Overview

The HR Onboarding application includes comprehensive monitoring, performance testing, and alerting capabilities to ensure optimal performance and early issue detection.

## 📊 Monitoring Stack

### **Application Insights**
- **Real-time telemetry** for API performance and errors
- **Custom metrics** for business logic monitoring
- **User behavior analytics** and usage patterns
- **Cost monitoring** for OpenAI API usage

### **Performance Testing**
- **Artillery load testing** for API performance validation
- **Lighthouse CI** for frontend performance monitoring
- **Stress testing** to identify breaking points
- **Automated performance reporting**

### **Alerting & Notifications**
- **Email notifications** to andrelaurelyvan.kanmegnetabouguie@ynov.com
- **Threshold-based alerts** for performance and errors
- **Cost monitoring** alerts for budget control
- **Real-time incident notifications**

## 🚀 Performance Testing

### **Automated Testing Triggers**
- ✅ **After every deployment** (automatic)
- ✅ **Daily scheduled runs** (6 AM UTC)
- ✅ **Manual on-demand testing** (GitHub Actions)

### **Test Types Available**

#### **1. Load Testing**
```bash
# Manual trigger via GitHub Actions
# Test Type: "load"
# Simulates: 5-20 concurrent users
# Duration: ~5 minutes
# Focus: Realistic usage patterns
```

**Test Scenarios:**
- Health check endpoint validation
- Checklist generation under load
- Share functionality testing
- Shared checklist retrieval

#### **2. Stress Testing**
```bash
# Manual trigger via GitHub Actions  
# Test Type: "stress"
# Simulates: Up to 75 concurrent users
# Duration: ~6 minutes
# Focus: Breaking point identification
```

**Progressive Load:**
- 5 users (baseline)
- 15 users (increased)
- 30 users (high load)
- 50 users (stress)
- 75 users (breaking point)

#### **3. Frontend Performance (Lighthouse)**
```bash
# Manual trigger via GitHub Actions
# Test Type: "lighthouse"
# Metrics: Core Web Vitals, Accessibility, SEO
# Runs: 3 iterations for accuracy
```

**Performance Targets:**
- **Performance Score:** > 80/100
- **Accessibility:** > 90/100
- **Best Practices:** > 85/100
- **First Contentful Paint:** < 2 seconds
- **Largest Contentful Paint:** < 3 seconds
- **Cumulative Layout Shift:** < 0.1

## 📈 Application Insights Monitoring

### **Automatic Metrics Collected**

#### **System Metrics**
- API response times (average, 95th percentile)
- Request success/failure rates
- Server resource utilization
- Database connection metrics

#### **Business Metrics**
- Checklist generation requests
- Most popular roles and departments
- Share link creation and usage
- User engagement patterns

#### **Cost Metrics**
- OpenAI API call frequency
- Estimated API costs per day
- Token usage patterns
- Cost per checklist generated

### **Custom Events Tracked**
```javascript
// Example custom events in Application Insights
{
  "ChecklistGenerated": {
    "role": "Développeur Senior",
    "department": "Informatique", 
    "duration": 1250,
    "tokenUsage": 150
  },
  "ShareLinkCreated": {
    "checklistSize": 8,
    "generationTime": 850
  },
  "SharedChecklistViewed": {
    "slug": "abc123",
    "viewerLocation": "France"
  }
}
```

## 🚨 Alert Rules & Thresholds

### **Critical Alerts (Immediate Email)**

#### **1. High Error Rate**
- **Threshold:** > 5% error rate
- **Window:** 10 minutes
- **Severity:** High
- **Action:** Immediate email notification

#### **2. Application Unavailable**
- **Threshold:** < 99% availability
- **Window:** 30 minutes  
- **Severity:** Critical
- **Action:** Immediate email notification

#### **3. Database Connection Failures**
- **Threshold:** Any connection error
- **Window:** 15 minutes
- **Severity:** High
- **Action:** Immediate email notification

### **Performance Alerts**

#### **4. Slow API Response**
- **Threshold:** > 5 seconds (95th percentile)
- **Window:** 15 minutes
- **Severity:** Medium
- **Action:** Email notification

#### **5. OpenAI API Failures**
- **Threshold:** > 3 failures in 20 minutes
- **Window:** 20 minutes
- **Severity:** Medium
- **Action:** Email notification

### **Cost Alerts**

#### **6. High Daily Cost**
- **Threshold:** > $5 per day
- **Window:** 24 hours
- **Severity:** Low
- **Action:** Email notification

## 📧 Email Notifications

### **Notification Types**

#### **Deployment Notifications**
```
✅ DEPLOYMENT SUCCESS - HR Onboarding v1.3.0
Environment: Production
Performance: All metrics within targets
Health Check: Passed
Rollback Available: v1.2.5
```

#### **Performance Alerts**
```
🚨 PERFORMANCE ALERT - High Response Time
Environment: Production  
Current: 8.2s (threshold: 5.0s)
Duration: 15 minutes
Dashboard: [View Details]
```

#### **Cost Alerts**
```
💰 COST ALERT - Daily Budget Exceeded
Daily Cost: $6.50 (threshold: $5.00)
OpenAI Calls: 2,500
Avg Cost/Call: $0.0026
```

### **Email Configuration**
- **Recipient:** andrelaurelyvan.kanmegnetabouguie@ynov.com
- **Delivery:** Real-time via GitHub Actions
- **Format:** HTML with links and context
- **Frequency:** Immediate, no batching

## 🎛️ Dashboards & Visualization

### **Main Dashboard Tiles**

#### **Performance Overview**
- API response time trends
- Request success rate
- Error rate over time
- Active users count

#### **Business Metrics**
- Checklists generated per hour
- Most popular roles/departments  
- Share link utilization
- User engagement patterns

#### **Cost Analysis**
- OpenAI API usage trends
- Daily cost tracking
- Cost per checklist
- Budget utilization

#### **System Health**
- Server resource usage
- Database performance
- Application availability
- Recent errors table

### **Accessing Dashboards**
```bash
# Azure Portal Navigation
1. Go to Azure Portal
2. Search "Application Insights"
3. Select "hr-onboarding-{environment}-insights"
4. Navigate to "Dashboards" section
```

## 🔧 Manual Performance Testing

### **GitHub Actions Workflow**

1. **Navigate to Actions**
   ```
   https://github.com/AndreLiar/HROnboarding/actions/workflows/performance-monitoring.yml
   ```

2. **Click "Run workflow"**
   - **Test Type:** load/stress/lighthouse/all
   - **Environment:** dev/staging/production
   - **Click "Run workflow"**

3. **Monitor Results**
   - Real-time logs in GitHub Actions
   - Artifacts with detailed reports
   - Email notification upon completion

### **CLI Testing (Local)**
```bash
# Install Artillery globally
npm install -g artillery@latest

# Run load test against dev environment
cd performance/load-tests
artillery run api-load-test.yml

# Generate HTML report
artillery report load-test-results.json --output report.html
```

## 📊 Key Performance Indicators (KPIs)

### **Availability Targets**
- **Uptime:** > 99.5%
- **API Response Time:** < 2s (median)
- **API Response Time:** < 5s (95th percentile)
- **Error Rate:** < 1%

### **Performance Targets**
- **Frontend Load Time:** < 3s (LCP)
- **Lighthouse Performance:** > 80/100
- **Concurrent Users:** Support 20+ users
- **Database Queries:** < 500ms average

### **Business Metrics**
- **Checklists Generated:** Track daily volume
- **User Engagement:** Monitor return usage
- **Popular Content:** Track role/department trends
- **Cost Efficiency:** Monitor cost per checklist

## 🚨 Incident Response

### **Performance Degradation**
1. **Automatic Alert:** Email notification sent
2. **Investigation:** Check dashboard for root cause
3. **Mitigation:** Scale resources or rollback if needed
4. **Resolution:** Monitor recovery and document

### **Application Unavailable**
1. **Immediate Alert:** Critical email notification
2. **Health Check:** Verify all endpoints
3. **Rollback:** Use emergency rollback workflow if needed
4. **Recovery:** Monitor and validate full restoration

### **Cost Spike**
1. **Budget Alert:** Email notification sent
2. **Usage Review:** Check OpenAI API usage patterns
3. **Rate Limiting:** Implement if necessary
4. **Optimization:** Review and optimize AI prompts

## 🔍 Troubleshooting

### **Common Performance Issues**

#### **Slow API Response**
```bash
# Check Application Insights
1. Navigate to Performance section
2. Review slow requests
3. Check database query performance
4. Verify OpenAI API response times
```

#### **High Error Rate**
```bash
# Check Application Insights  
1. Navigate to Failures section
2. Review error details and stack traces
3. Check dependency failures
4. Verify configuration settings
```

#### **Cost Spike**
```bash
# Check custom metrics
1. Review openai_api_calls metric
2. Check openai_api_cost trends
3. Analyze usage patterns by role/department
4. Review API efficiency
```

### **Dashboard Access Issues**
```bash
# Verify Application Insights setup
az monitor app-insights component show \
  --app hr-onboarding-dev-insights \
  --resource-group hr-onboarding-dev-rg
```

---

📊 **Next Steps:** See [PERFORMANCE.md](./PERFORMANCE.md) for detailed performance optimization guidelines.