import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';
import cors from 'cors';

dotenv.config();

const PORT = process.env.PORT || 3001;
const HOME_URL = process.env.UNIFI_HOME_URL || 'https://store.ui.com/us/en';
const PRODUCTS_FILE = path.resolve(__dirname, 'products.json');

const knownProducts: Record<string, Product> = {};

interface Product {
  id: string;
  title: string;
  shortDescription: string;
  slug: string;
  thumbnail: { url: string };
  variants: Array<{
    id: string;
    displayPrice: { amount: number; currency: string };
  }>;
  // Add other fields as needed
}

interface SubCategory {
  products: Product[];
}

interface ApiResponse {
  pageProps: {
    subCategories: SubCategory[];
  };
}

// Load known products from products.json
function loadKnownProducts() {
  if (fs.existsSync(PRODUCTS_FILE)) {
    try {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      const products = JSON.parse(data) as Product[];
      for (const product of products) {
        if (isValidProduct(product)) {
          knownProducts[product.id] = product;
        } else {
          console.error('Invalid product in products.json:', product);
        }
      }
      console.log(`Loaded ${Object.keys(knownProducts).length} known products`);
    } catch (err) {
      console.error('Failed to load products.json:', err);
    }
  }
}

// Save all known products to products.json
function saveKnownProducts() {
  try {
    console.log(`Saving ${Object.keys(knownProducts).length} known products`);
    const allProducts = Object.values(knownProducts).filter(isValidProduct);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(allProducts, null, 2));
  } catch (err) {
    console.error('Failed to save products.json:', err);
  }
}

// Util: Fetch build ID from Unifi store HTML
async function fetchBuildID(): Promise<string> {
  const html = (await axios.get(HOME_URL)).data as string;
  const match = html.match(/https:\/\/[^/]+\/_next\/static\/([a-zA-Z0-9]+)\/_ssgManifest\.js/);
  if (!match) throw new Error('Build ID not found');
  return match[1];
}

// Util: Fetch products for a category
async function fetchProducts(buildID: string, category: string): Promise<Product[]> {
  const url = `https://store.ui.com/_next/data/${buildID}/us/en.json?category=${category}&store=us&language=en`;
  // console.log('Fetching products from:', url);
  const { data } = await axios.get<ApiResponse>(url);
  const subCategories = data?.pageProps?.subCategories || [];
  
  return subCategories.flatMap((sc: SubCategory) => 
    (sc.products || []).map(product => ({
      id: product.id,
      title: product.title,
      shortDescription: product.shortDescription || '',
      slug: product.slug,
      thumbnail: {
        url: product.thumbnail?.url || ''
      },
      variants: (product.variants || []).map(variant => ({
        id: variant.id,
        displayPrice: {
          amount: variant.displayPrice?.amount || 0,
          currency: variant.displayPrice?.currency || 'USD'
        }
      }))
    }))
  );
}

// Periodic monitor loop
async function monitor() {
  try {
    console.log('Fetching build ID');
    const buildID = await fetchBuildID();
    const categories = [
      'all-switching',
      'all-unifi-cloud-gateways',
      'all-wifi',
      'all-cameras-nvrs',
      'all-door-access',
      'all-cloud-keys-gateways',
      'all-power-tech',
      'all-integrations',
      'accessories-cables-dacs',
    ];
    
    const newProducts: Product[] = [];
    console.log('Fetching products');
    
    for (const category of categories) {
      try {
        const products = await fetchProducts(buildID, category);
        for (const product of products) {
          if (!knownProducts[product.id]) {
            knownProducts[product.id] = product;
            newProducts.push(product);
            console.log('Broadcasting new product:', product.title);
            broadcastNewProduct(product);
          }
        }
      } catch (err) {
        console.error(`Error fetching category ${category}:`, err);
        continue;
      }
    }
    
    if (newProducts.length > 0) {
      saveKnownProducts();
    }
  } catch (err) {
    console.error('Monitor error:', err);
  }
}

// Load known products on startup
loadKnownProducts();

// Start monitor loop every 30 seconds
setInterval(monitor, 30 * 1000);
monitor(); // Initial run

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function isValidProduct(product: unknown): product is Product {
  if (!product || typeof product !== 'object') return false;
  
  const p = product as Record<string, unknown>;
  
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.shortDescription === 'string' &&
    typeof p.slug === 'string' &&
    typeof (p.thumbnail as any)?.url === 'string' &&
    Array.isArray(p.variants) &&
    p.variants.length > 0 &&
    typeof (p.variants[0] as any)?.displayPrice?.amount === 'number' &&
    typeof (p.variants[0] as any)?.displayPrice?.currency === 'string'
  );
}

function broadcastNewProduct(product: Product) {
  // Ensure the product data matches our interface
  const formattedProduct: Product = {
    id: product.id,
    title: product.title,
    shortDescription: product.shortDescription || '',
    slug: product.slug,
    thumbnail: {
      url: product.thumbnail?.url || ''
    },
    variants: (product.variants || []).map(variant => ({
      id: variant.id,
      displayPrice: {
        amount: variant.displayPrice?.amount || 0,
        currency: variant.displayPrice?.currency || 'USD'
      }
    }))
  };

  const message = JSON.stringify({ 
    type: 'new-product', 
    product: formattedProduct 
  });
  
  console.log('Broadcasting message:', message);
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

app.get('/api/products', (req, res) => {
  try {
    const products = Object.values(knownProducts).filter(isValidProduct);
    console.log('Sending products:', products.length);
    res.json(products);
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`API endpoints available:`);
  console.log(`- GET /api/products`);
});