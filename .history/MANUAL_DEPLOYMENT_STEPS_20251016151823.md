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
