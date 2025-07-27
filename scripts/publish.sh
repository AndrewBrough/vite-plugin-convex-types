#!/bin/bash

# Script to publish vite-plugin-convex-types to npm

set -e

echo "🚀 Publishing vite-plugin-convex-types to npm..."


# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the plugin
echo "🔨 Building the plugin..."
npm run build

# Check if we're logged into npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged into npm. Please run 'npm login' first."
    exit 1
fi

# Check if the package name is available
echo "🔍 Checking if package name is available..."
if npm view vite-plugin-convex-types > /dev/null 2>&1; then
    echo "⚠️  Package 'vite-plugin-convex-types' already exists on npm."
    echo "   You may need to update the version in package.json"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Publish to npm
echo "📤 Publishing to npm..."
npm publish

echo "✅ Successfully published vite-plugin-convex-types to npm!"
echo "🌐 Package URL: https://www.npmjs.com/package/vite-plugin-convex-types" 