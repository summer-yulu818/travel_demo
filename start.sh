#!/bin/bash

# Navigate to the correct directory (travel_demo)
# Since this script is intended to be in the root of travel_demo
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Node modules already present."
fi

# Start the development server
echo "🚀 Starting AI Companion (travel_demo) development server..."
npm run dev
