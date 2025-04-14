# Read the products.json file
$productsJson = Get-Content -Path "backend/products.json" -Raw

# Escape the JSON for environment variable
$escapedJson = $productsJson -replace '"', '\"'

# Create a .env file for Vercel
"PRODUCTS_JSON=`"$escapedJson`"" | Out-File -FilePath ".env.production" -Encoding utf8