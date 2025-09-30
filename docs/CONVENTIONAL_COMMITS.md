# HR Onboarding - Conventional Commits Guide

## 📝 Overview

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic semantic versioning and release note generation.

## 🏷️ Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## 🚀 Commit Types

### Version Impact

| Type | Version Bump | Description | Example |
|------|--------------|-------------|---------|
| `fix:` | **Patch** (1.0.1) | Bug fixes | `fix: resolve authentication timeout` |
| `feat:` | **Minor** (1.1.0) | New features | `feat: add role-based templates` |
| `BREAKING CHANGE:` | **Major** (2.0.0) | Breaking changes | See example below |
| Other types | **Patch** (1.0.1) | Documentation, refactoring, etc. | `docs: update API guide` |

### Standard Types

- **feat:** New feature for the user
- **fix:** Bug fix for the user
- **docs:** Documentation changes
- **style:** Code style changes (formatting, missing semicolons, etc.)
- **refactor:** Code change that neither fixes a bug nor adds a feature
- **test:** Adding missing tests or correcting existing tests
- **chore:** Changes to build process or auxiliary tools

## 📋 Examples

### Patch Version (1.0.0 → 1.0.1)

```bash
# Bug fixes
git commit -m "fix: resolve checklist generation timeout issue"
git commit -m "fix: correct French accent display in templates"
git commit -m "fix: handle empty department selection gracefully"

# Documentation updates
git commit -m "docs: update installation guide with Node.js 20 requirements"
git commit -m "docs: add troubleshooting section to README"

# Code improvements
git commit -m "refactor: simplify database connection logic"
git commit -m "style: apply consistent formatting to all API routes"
```

### Minor Version (1.0.0 → 1.1.0)

```bash
# New features
git commit -m "feat: add export to PDF functionality"
git commit -m "feat: implement checklist templates by department"
git commit -m "feat: add user authentication with Microsoft Entra ID"

# Feature improvements
git commit -m "feat: enhance AI prompts for better French HR context"
git commit -m "feat: add checklist item priority levels"
```

### Major Version (1.0.0 → 2.0.0)

```bash
# Breaking changes (any commit with BREAKING CHANGE footer)
git commit -m "feat: redesign API response structure

BREAKING CHANGE: API now returns checklist items as objects with 
{id, title, priority, completed} instead of simple strings. 
Frontend integration will need to be updated."

git commit -m "refactor: migrate to new database schema

BREAKING CHANGE: Database tables have been restructured. 
Existing data will need migration script to maintain compatibility."
```

## 🔧 Scope Examples (Optional)

Add scope to provide more context:

```bash
git commit -m "feat(api): add health check endpoint"
git commit -m "fix(frontend): resolve mobile responsive layout issues"
git commit -m "docs(deployment): update Azure configuration guide"
git commit -m "test(integration): add end-to-end checklist generation tests"
```

### Recommended Scopes
- `api` - Backend API changes
- `frontend` - React frontend changes
- `deployment` - CI/CD and infrastructure
- `docs` - Documentation
- `test` - Testing
- `security` - Security-related changes

## 📊 Impact on Versioning

### Current Version: v1.2.3

```bash
# Next commit determines version bump:

# fix: → v1.2.4 (patch)
git commit -m "fix: handle null values in checklist generation"

# feat: → v1.3.0 (minor) 
git commit -m "feat: add multi-language support"

# feat: with BREAKING CHANGE → v2.0.0 (major)
git commit -m "feat: implement new authentication system

BREAKING CHANGE: All API endpoints now require authentication headers"
```

## 🚦 Best Practices

### ✅ Good Commit Messages

```bash
# Clear, concise, actionable
git commit -m "feat: add role selection validation"
git commit -m "fix: prevent duplicate checklist items"
git commit -m "docs: clarify deployment environment setup"

# Includes context when helpful
git commit -m "feat(api): implement rate limiting for OpenAI calls"
git commit -m "fix(frontend): resolve Azure Static Apps routing issues"
```

### ❌ Avoid These Patterns

```bash
# Too vague
git commit -m "fix: stuff"
git commit -m "feat: improvements"
git commit -m "update: changes"

# Not following convention
git commit -m "Fixed the bug with authentication"
git commit -m "Added new feature"
git commit -m "WIP: working on user management"
```

## 🔄 Multi-part Changes

For large features spanning multiple commits:

```bash
# Each commit should be atomic and follow convention
git commit -m "feat: add user model and database schema"
git commit -m "feat: implement user registration API endpoint"  
git commit -m "feat: add user authentication middleware"
git commit -m "feat: integrate user auth with frontend login form"
git commit -m "docs: update API documentation with auth examples"
```

## 🤖 Automatic Release Notes

Based on conventional commits, releases automatically include:

```markdown
## 🚀 Release v1.3.0

### ✨ Features
- add role selection validation
- implement rate limiting for OpenAI calls
- add multi-language support

### 🐛 Bug Fixes  
- prevent duplicate checklist items
- resolve Azure Static Apps routing issues

### 📝 Documentation
- clarify deployment environment setup
- update API documentation with auth examples
```

## 🛠️ IDE Integration

### VS Code Extension
Install: "Conventional Commits" extension
- Provides commit message templates
- Validates commit format
- Shows version impact preview

### Git Hooks (Optional)
```bash
# Add commit message validation
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# .commitlintrc.json
{
  "extends": ["@commitlint/config-conventional"]
}
```

## 🔍 Checking Version Impact

Before committing, check what version bump your change will trigger:

```bash
# View unreleased commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Analyze version impact
# - Any "feat:" → Minor bump
# - Any "BREAKING CHANGE:" → Major bump  
# - Only "fix:", "docs:", etc. → Patch bump
```

## 📚 Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

💡 **Tip:** Start each development session by reviewing the last few commits to understand the current version trajectory and maintain consistency.