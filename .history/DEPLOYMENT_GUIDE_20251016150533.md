# DCB POS Deployment Guide

## Server Information
- **IP Address**: 31.97.202.119
- **Operating System**: Ubuntu 24.04 LTS
- **SSH Access**: `ssh root@31.97.202.119`

## Quick Deployment Steps

### Option 1: Automated Deployment (Recommended)
1. **Upload deployment files to server:**
   ```bash
   scp deploy.sh ecosystem.config.js root@31.97.202.119:/root/
   ```

2. **SSH into the server and run deployment:**
   ```bash
   ssh root@31.97.202.119
   chmod +x deploy.sh
   ./deploy.sh
   ```

### Option 2: Manual Deployment
1. **SSH into the server:**
   ```bash
   ssh root@31.97.202.119
   ```

2. **Run the following commands manually:**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install dependencies
   apt install -y nodejs npm git
   
   # Create deployment directory
   mkdir -p /opt/dcb-pos
   cd /opt/dcb-pos
   
   # Clone repository
   git clone https://github.com/roydigital/dcb_pos_final.git .
   
   # Install dependencies
   npm install
   
   # Create environment file (copy from your local .env)
   nano .env
   
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

## Application Details

- **Port**: 8080
- **Process Manager**: PM2
- **Environment**: Production
- **Repository**: https://github.com/roydigital/dcb_pos_final.git

## Environment Variables Required

Make sure these environment variables are set in the `.env` file on the server:

```env
RAZORPAY_KEY_ID=rzp_live_RTIjrVzqllzDJd
RAZORPAY_KEY_SECRET=8h66Z3HNXjWcJtFz4UXNRbRX
SUPABASE_URL=https://kjbelegkbusvtvtcgwhq.supabase.co
