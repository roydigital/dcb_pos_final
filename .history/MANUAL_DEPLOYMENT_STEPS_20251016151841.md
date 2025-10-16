# Manual Deployment Steps for DCB POS

Since SSH requires password authentication, follow these steps manually:

## Step 1: Connect to Your Server
```bash
ssh root@31.97.202.119
# Enter your password when prompted
```

## Step 2: Run These Commands on the Server

### Update System
```bash
apt update && apt upgrade -y
```

### Install Required Software
```bash
apt install -y nodejs npm git
```

### Verify Installations
```bash
node --version
npm --version
git --version
```

### Create Deployment Directory
```bash
mkdir -p /opt/dcb-pos
cd /opt/dcb-pos
```

### Clone Your Repository
```bash
git clone https://github.com/roydigital/dcb_pos_final.git .
```

### Install Dependencies
```bash
npm install
```

### Create Environment File
```bash
nano .env
```

**Paste this content into the .env file:**
```env
RAZORPAY_KEY_ID=rzp_live_RTIjrVzqllzDJd
RAZORPAY_KEY_SECRET=8h66Z3HNXjWcJtFz4UXNRbRX
SUPABASE_URL=https://kjbelegkbusvtvtcgwhq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYmVsZWdrYnVzdnR2dGNnd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjI5ODIsImV4cCI6MjA3NDA5ODk4Mn0.-K-rkuJnyDPL5YnkJ62-UG1_mG0BIILMUEZpSTNnq5M
FRONTEND_URL=https://dcbchicken.com
META_PIXEL_ID=1137576755203760
META_ACCESS_TOKEN=EAADVQmfSh60BPvFYa3JhAZClcBZBh4v8u1RoYdVSZAbwwLnZCSWKoEmIRLlJXPpwJS0eODiAz7ti4FRnxtwy3ZBt4eJQDSTHZANxd6VZAXAXV0EIsf6u1OuU8K6ExLfWLgZAcZBuu6ArXvGrNqLJdioemtRBXxfnGjy8Xsm0o83clMD4zH9ZCAdpOieyEximExu0v4HAZDZD
```

**Save the file:**
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

### Install PM2 Process Manager
```bash
npm install -g pm2
```

### Start Your Application
```bash
pm2 start server.js --name "dcb-pos" --watch
```

### Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

## Step 3: Verify Deployment

### Check Application Status
```bash
pm2 status
```

### Check if Application is Running
```bash
curl http://localhost:8080
```

### Check Port 8080
```bash
netstat -tulpn | grep 8080
```

## Step 4: Configure Firewall (if needed)

```bash
# Check firewall status
ufw status

# If firewall is active, allow port 8080
ufw allow 8080/tcp
```

## Useful Commands for Future Management

```bash
# View logs
pm2 logs dcb-pos

# Restart application
pm2 restart dcb-pos

# Stop application
pm2 stop dcb-pos

# Update application (when you make changes)
cd /opt/dcb-pos
git pull origin main
npm install
pm2 restart dcb-pos
```

## Troubleshooting

If you encounter any issues:

1. **Check PM2 logs**: `pm2 logs dcb-pos`
2. **Verify environment variables**: Make sure `.env` file exists in `/opt/dcb-pos/`
3. **Check port availability**: Make sure port 8080 is not being used by another application
4. **Verify dependencies**: Run `npm install` again if needed

