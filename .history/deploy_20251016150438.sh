#!/bin/bash

# DCB POS Deployment Script for Ubuntu 24.04 LTS
# Server: 31.97.202.119

echo "🚀 Starting DCB POS deployment..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required dependencies
echo "📥 Installing Node.js, npm, and Git..."
apt install -y nodejs npm git

# Verify installations
echo "✅ Verifying installations..."
node --version
npm --version
git --version

# Create deployment directory
echo "📁 Setting up deployment directory..."
DEPLOY_DIR="/opt/dcb-pos"
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# Clone or update the repository
if [ -d ".git" ]; then
    echo "🔄 Updating existing repository..."
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/roydigital/dcb_pos_final.git .
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create environment file
echo "🔧 Setting up environment variables..."
cat > .env << EOF
RAZORPAY_KEY_ID=rzp_live_RTIjrVzqllzDJd
RAZORPAY_KEY_SECRET=8h66Z3HNXjWcJtFz4UXNRbRX
SUPABASE_URL=https://kjbelegkbusvtvtcgwhq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYmVsZWdrYnVzdnR2dGNnd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjI5ODIsImV4cCI6MjA3NDA5ODk4Mn0.-K-rkuJnyDPL5YnkJ62-UG1_mG0BIILMUEZpSTNnq5M
FRONTEND_URL=https://dcbchicken.com
META_PIXEL_ID=1137576755203760
