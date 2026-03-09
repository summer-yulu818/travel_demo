#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Navigate to the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🧹 Cleaning up old build artifacts..."
rm -rf dist

echo "🏗️ Building the application..."
npm run build

echo "🚀 Deploying to Firebase Hosting..."
npx firebase-tools deploy --only hosting --project traveldemo-64ab2

echo "✨ Deployment finished successfully!"
