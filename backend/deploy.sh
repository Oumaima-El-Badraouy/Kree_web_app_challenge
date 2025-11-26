#!/bin/bash

# Kree Car Rental - Quick Deployment Script
# This script helps deploy the backend to various platforms

echo "========================================="
echo "Kree Car Rental - Deployment Helper"
echo "========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo "Error: Please run this script from the backend directory"
    exit 1
fi

echo "Select deployment platform:"
echo "1) Railway (Recommended - Free MongoDB included)"
echo "2) Render"
echo "3) Heroku"
echo "4) Manual setup (show instructions)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "=== Railway Deployment ==="
        echo "1. Install Railway CLI:"
        echo "   npm install -g @railway/cli"
        echo ""
        echo "2. Login to Railway:"
        echo "   railway login"
        echo ""
        echo "3. Initialize project:"
        echo "   railway init"
        echo ""
        echo "4. Add MongoDB:"
        echo "   railway add -d mongodb"
        echo ""
        echo "5. Set environment variables:"
        echo "   railway variables set CLIENT_URL=https://8817d6vgibpd.space.minimax.io"
        echo "   railway variables set JWT_SECRET=your-secret-key"
        echo "   railway variables set NODE_ENV=production"
        echo ""
        echo "6. Deploy:"
        echo "   railway up"
        echo ""
        echo "7. Get your URL:"
        echo "   railway domain"
        ;;
    
    2)
        echo ""
        echo "=== Render Deployment ==="
        echo "1. Go to https://render.com"
        echo "2. Create new Web Service"
        echo "3. Connect your GitHub repository"
        echo "4. Settings:"
        echo "   - Build Command: npm install --prefix ."
        echo "   - Start Command: npm start"
        echo "5. Add environment variables in dashboard"
        echo "6. Deploy"
        ;;
    
    3)
        echo ""
        echo "=== Heroku Deployment ==="
        echo "1. Install Heroku CLI"
        echo "2. Run: heroku login"
        echo "3. Run: heroku create kree-car-rental"
        echo "4. Add MongoDB: heroku addons:create mongolab:sandbox"
        echo "5. Set variables:"
        echo "   heroku config:set CLIENT_URL=https://8817d6vgibpd.space.minimax.io"
        echo "   heroku config:set JWT_SECRET=your-secret"
        echo "6. Deploy: git push heroku main"
        ;;
    
    4)
        echo ""
        echo "=== Manual Setup Instructions ==="
        echo "1. Setup MongoDB Atlas:"
        echo "   - Go to https://mongodb.com/cloud/atlas"
        echo "   - Create free cluster"
        echo "   - Create database user"
        echo "   - Whitelist IP: 0.0.0.0/0"
        echo "   - Get connection string"
        echo ""
        echo "2. Required Environment Variables:"
        echo "   NODE_ENV=production"
        echo "   PORT=3000"
        echo "   MONGODB_URI=your-mongodb-connection-string"
        echo "   JWT_SECRET=your-secret-key"
        echo "   JWT_EXPIRES_IN=7d"
        echo "   CLIENT_URL=https://8817d6vgibpd.space.minimax.io"
        echo "   PLATFORM_COMMISSION_RATE=0.10"
        echo ""
        echo "3. Run locally:"
        echo "   npm install --prefix ."
        echo "   npm start"
        ;;
    
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "After deployment:"
echo "1. Update frontend .env.production with backend URL"
echo "2. Rebuild frontend: cd ../kree-car-rental-frontend && pnpm build"
echo "3. Redeploy frontend"
echo "4. Test at: https://8817d6vgibpd.space.minimax.io"
echo "========================================="
