#!/bin/bash

# Read the products.json file
PRODUCTS_JSON=$(cat backend/products.json)

# Escape the JSON for environment variable
ESCAPED_JSON=$(echo "$PRODUCTS_JSON" | sed 's/"/\\"/g' | tr -d '\n')

# Create a .env file for Vercel
echo "PRODUCTS_JSON=\"$ESCAPED_JSON\"" > .env.production 

chmod +x scripts/prepare-vercel.sh 