#!/bin/bash
# deploy.sh - Automates deployment of a React project to my PythonAnywhere server
# Usage: ./deploy.sh <project-name>

# Steps:
# 1) Run the frontend build (npm run build)
# 2) Zip contents of generated dist into dist.zip
# 3) Upload dist.zip to server via POST request
# 4) Verify response (operation = success && available[] includes project-name)
# 5) Clean up local generated dist folder if deployment is successful

# Exit immediately if any command fails
set -e

# === CONFIGURATION ===
DIST_DIR="./dist"
ZIP_FILE="dist.zip"
BASE_URL="https://akshaynile.pythonanywhere.com"
PROJECT_NAME="$1"

# === Check if project name is available ===
if [ -z "$1" ]; then
  echo "❌ Project name not provided"
  PROJECT_NAME=$(powershell.exe -Command "(Get-Content .\package.json | ConvertFrom-Json).name" | tr -d '\r')
  if [ -z "$PROJECT_NAME" ]; then
    exit 1
  fi
  echo "✅ Using project name from package.json"
fi

echo "🚀 Starting project deployment: /$PROJECT_NAME"

# === STEP 0: Remove old dist folder if any ===
echo "🗑️  Removing old dist folder..."
rm -rf "$DIST_DIR" 

# === STEP 1: Build React project ===
echo "⚙️  Running fontend build..."
npm run build -- --base ./

# === STEP 2: Zip the dist folder ===
echo ""
echo "💾 Zipping dist folder..."
# Check if bestzip is installed
if ! command -v bestzip &> /dev/null; then
  echo "bestzip not found! installing..."
  npm install -g bestzip
fi
bestzip "$DIST_DIR/$ZIP_FILE" "$DIST_DIR/*"

# === STEP 3: Upload to server ===
echo "📤 Uploading dist.zip file..."
HARDWARE=$(powershell.exe -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID" | tr -d '\r')
RESPONSE=$(curl -s -X "POST" -H "X-Hardware: $HARDWARE" -F "dist=@$DIST_DIR/$ZIP_FILE" "$BASE_URL/deploy/$PROJECT_NAME")

# === STEP 4: Verify response status ===
echo "🔍 Verifying operation status..."
OPERATION=$(powershell.exe -Command "('$RESPONSE' | ConvertFrom-Json).operation")
echo "   operation: $OPERATION"

# === STEP 5: Verify project available ===
echo "🔍 Verifying project availability..."
RESPONSE=$(curl -s "$BASE_URL/deploy")
AVAILABLE=$(powershell.exe -Command "('$RESPONSE' | ConvertFrom-Json).available -join ', '")
echo "   available: [$AVAILABLE]"

if [ "$OPERATION" == "success" ] && echo "$AVAILABLE" | grep -q "$PROJECT_NAME"; then
  echo "✅ Deployment Successful !"
  echo "🌐 $BASE_URL/projects/$PROJECT_NAME"

  # === STEP 6: Clean up dist folder ===
  echo "🧹 Removing the dist folder..."
  rm -rf "$DIST_DIR"
  echo "✨ Clean-Up Done !"
else
  echo "❌ Deployment Failed !"
  exit 1
fi
