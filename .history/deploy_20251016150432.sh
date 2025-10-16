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
