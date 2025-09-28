# HR Onboarding - Student-Friendly Terraform

This Terraform configuration is specifically designed for **Azure for Students Starter** subscriptions with their service limitations.

## 🎓 What Works with Azure for Students

- ✅ **App Service Plan** (Free tier F1)
- ✅ **Linux Web App** (API backend)
- ✅ **Static Web App** (React frontend)
- ✅ **Resource Group**
- ✅ **Azure SQL Database** (Serverless, 100k vCore seconds/month)
- ❌ Cosmos DB (not allowed)
- ❌ Azure OpenAI (not allowed)
- ❌ Storage Account (not allowed)
- ❌ Key Vault (not allowed)

## 📁 Simplified Structure

```
terraform/
├── main.tf                   # Core infrastructure (3 resources only)
├── variables.tf              # Simple variables
├── outputs.tf                # Essential outputs
├── backend-local.tf          # Local state storage
├── deploy.sh                 # Deployment script
├── environments/
│   └── dev.tfvars           # Development config only
└── README.md                # This file
```

## 🚀 Quick Deploy

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="environments/dev.tfvars"

# Deploy
terraform apply -var-file="environments/dev.tfvars" -auto-approve
```

## 📋 What Gets Created

1. **Resource Group**: `hr-onboarding-dev-rg`
2. **App Service Plan**: Free tier (F1)
3. **Web App**: API backend with Node.js 18
4. **Azure SQL Server**: Database server
5. **Azure SQL Database**: Serverless database (auto-pause, 32GB storage)
6. **Static Web App**: React frontend hosting

## 🔧 Application Architecture

The app uses student-friendly Azure services:
- **Azure SQL Database**: Serverless with auto-pause (saves money)
- **OpenAI API**: Instead of Azure OpenAI
- **Free tiers**: For all services

## 🌐 Deployment URLs

After deployment, you'll get:
- **API**: `https://hr-onboarding-dev-xxxx-api.azurewebsites.net`
- **Frontend**: `https://hr-onboarding-dev-xxxx-web.staticwebsites.net`

## ⚠️ Limitations

1. **Database auto-pause**: Pauses after 1 hour of inactivity (saves costs)
2. **Always On**: Disabled (free tier limitation)
3. **Custom domains**: Not included
4. **Scaling**: Limited to free tier
5. **SQL credentials**: Stored in app settings (not ideal for production)

## 🔄 Clean Up

```bash
terraform destroy -var-file="environments/dev.tfvars" -auto-approve
```

## 📝 Notes

- This is a **demo/learning** configuration
- For production, upgrade to pay-as-you-go subscription
- **Data persists** in SQL Database (unlike in-memory storage)
- Database auto-pauses to save costs on students subscription
- Perfect for learning and prototyping with real database!