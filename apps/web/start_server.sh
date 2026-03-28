#!/bin/bash

# Try to load user shell configuration to find npm
if [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: 'npm' command not found."
    echo "Please ensure Node.js is installed and in your PATH."
    echo "You can download it from: https://nodejs.org/"
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Starting development server..."
npm run dev
