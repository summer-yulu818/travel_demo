#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Navigate to the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Node modules already present."
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found. The build might fail if environment variables are required."
    if [ -f ".env.example" ]; then
        echo "💡 Tip: You can copy .env.example to .env and fill in the values."
    fi
fi

echo "🧹 Cleaning up old build artifacts..."
rm -rf dist

echo "🏗️ Building the application..."
npm run build

echo "🚀 Deploying to Firebase Hosting..."
npx firebase-tools deploy --only hosting --project traveldemo-64ab2

echo "✨ Deployment finished successfully!"
