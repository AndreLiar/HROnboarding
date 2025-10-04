#!/bin/bash

# Azure App Service startup script for HR Onboarding API
echo "🚀 Starting HR Onboarding API..."

# Display environment info
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Environment: ${NODE_ENV:-production}"

# Ensure npm cache directory exists
mkdir -p /tmp/npm-cache

# Install production dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing production dependencies..."
    npm ci --only=production --no-audit --no-fund --progress=false
fi

# Start the application
echo "🎯 Starting server..."
npm start