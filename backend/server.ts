import { Hono } from 'hono';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

dotenv.config();

const HOME_URL = process.env.UNIFI_HOME_URL || 'https://store.ui.com/us/en';
const PRODUCTS_FILE = path.resolve(__dirname, 'products.json');

// Interfaces
interface Thumbnail {
  url: string;
}

interface DisplayPrice {
  value: number;
  currency: string;
}

interface Variant {
  id: string;
  displayPrice: DisplayPrice;
}

interface Product {
  id: string;
  title: string;
  shortDescription: string;
  slug: string;
  thumbnail: Thumbnail;
  variants: Variant[];
}

// Extended interface with timestamp properties
interface ProductWithTimestamp extends Product {
  addedAt: string;
  _discoveredAt: number;
}

interface SubCategory {
  products: Product[];
}

interface ApiResponse {
  pageProps: {
    subCategories: SubCategory[];
  };
}

// Function to validate a product has required fields
function isValidProduct(product: unknown): product is Product {
  return (
    product !== null &&
    typeof product === 'object' &&
    'id' in product &&
    'title' in product &&
    'shortDescription' in product &&
    'slug' in product &&
    'thumbnail' in product &&
    'variants' in product &&
    typeof (product as Product).id === 'string' &&
    typeof (product as Product).title === 'string' &&
    typeof (product as Product).shortDescription === 'string' &&
    typeof (product as Product).slug === 'string' &&
    (product as Product).thumbnail && typeof (product as Product).thumbnail.url === 'string' &&
    Array.isArray((product as Product).variants)
  );
}

const knownProducts: Record<string, Product> = {};

// Create an HTTP server for both Hono and WebSocket
const httpServer = http.createServer();
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws',
  perMessageDeflate: true
});

// Define WebSocket message types as a discriminated union
type WebSocketMessage = 
  | { type: 'connected'; message: string }
  | { type: 'new-product'; product: ProductWithTimestamp };

// Send the new product to all connected WebSocket clients
function broadcastNewProduct(product: Product): void {
  const timestamp = new Date().toISOString();
  const productWithTimestamp: ProductWithTimestamp = {
    ...product,
    addedAt: timestamp,
    _discoveredAt: Date.now()
  };

  const message: WebSocketMessage = {
    type: 'new-product',
    product: productWithTimestamp
  } as const;

  console.log(`Broadcasting new product to ${wss.clients.size} clients:`, product.title);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Set up WebSocket server
wss.on('connection', (ws: WebSocket, req) => {
  console.log('Client connected from:', req.socket.remoteAddress);
  
  // Add isAlive property to track connection health
  let isAlive = true;
  let pingInterval: NodeJS.Timeout | null = null;
  
  // Send initial connection confirmation
  const connectMessage: WebSocketMessage = {
    type: 'connected',
    message: 'Connected to product notification server'
  };
  
  try {
    ws.send(JSON.stringify(connectMessage));
  } catch (error) {
    console.error('Failed to send initial connection message:', error);
    ws.terminate();
    return;
  }

  // Set up ping interval
  pingInterval = setInterval(() => {
    if (!isAlive) {
      console.log('Client connection dead, terminating');
      if (pingInterval) clearInterval(pingInterval);
      ws.terminate();
      return;
    }
    
    isAlive = false;
    try {
      ws.ping();
    } catch (error) {
      console.error('Failed to send ping:', error);
      if (pingInterval) clearInterval(pingInterval);
      ws.terminate();
    }
  }, 30000); // Check every 30 seconds
  
  // Handle pong responses
  ws.on('pong', () => {
    isAlive = true;
  });
  
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error.message);
    if (pingInterval) clearInterval(pingInterval);
    ws.terminate();
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    if (pingInterval) clearInterval(pingInterval);
  });
});

// Add error handler for the WebSocket server
wss.on('error', (error: Error) => {
  console.error('WebSocket server error:', error.message);
});

// Add CORS headers to all responses
const hono = new Hono();
hono.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  c.header('Access-Control-Allow-Credentials', 'true');
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  await next();
});

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
  const html = (await axios.get(HOME_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })).data as string;
  const match = html.match(/https:\/\/[^/]+\/_next\/static\/([a-zA-Z0-9]+)\/_ssgManifest\.js/);
  if (!match) throw new Error('Build ID not found');
  return match[1];
}

// Util: Fetch products for a category
async function fetchProducts(buildID: string, category: string): Promise<Product[]> {
  try {
    const url = `https://store.ui.com/_next/data/${buildID}/us/en.json?category=${category}&store=us&language=en`;
    
    const { data } = await axios.get<ApiResponse>(url, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://store.ui.com/us/en',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
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
            value: variant.displayPrice?.value || 0,
            currency: variant.displayPrice?.currency || 'USD'
          }
        }))
      }))
    );
  } catch (error) {
    console.error(`Error fetching products for category ${category}:`, error);
    return [];
  }
}

// Add a timestamp when a new product is discovered
function addProductWithTimestamp(product: Product) {
  // Attach a timestamp if not already present
  const withTimestamp = {
    ...product,
    _discoveredAt: Date.now(),
  };
  knownProducts[product.id] = withTimestamp as ProductWithTimestamp;
}

// Update monitor function to broadcast new products
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
            addProductWithTimestamp(product);
            newProducts.push(product);
            console.log('New product found:', product.title);
            // Broadcast each new product
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

// Hono app
hono.get('/api/products', (c) => {
  console.log(c);
  try {
    // Return the known products as ProductWithTimestamp objects
    const productsWithTimestamps = Object.values(knownProducts)
      .filter(isValidProduct)
      .map(product => ({
        ...product,
        addedAt: (product as ProductWithTimestamp).addedAt || new Date().toISOString(),
        _discoveredAt: (product as ProductWithTimestamp)._discoveredAt || Date.now()
      }))
      .sort((a, b) => {
        return (b._discoveredAt || 0) - (a._discoveredAt || 0);
      });
    
    return c.json(productsWithTimestamps);
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});
export type AppType = typeof hono;

// Attach Hono to the HTTP server
httpServer.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
  console.log(req.headers);
  try {
    // Convert Node.js request to fetch-compatible request
    const fetchHeaders: HeadersInit = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        fetchHeaders[key] = value;
      } else if (Array.isArray(value)) {
        fetchHeaders[key] = value.join(', ');
      }
    });

    const url = `http://${req.headers.host || 'localhost'}${req.url || '/'}`;
    
    // Create a proper Request object instead of just RequestInit
    const request = new Request(url, {
      method: req.method || 'GET',
      headers: fetchHeaders
    });

    const honoRes = await hono.fetch(request);
    
    res.statusCode = honoRes.status;
    
    honoRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const buffer = await honoRes.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error('Error handling request:', error instanceof Error ? error.message : String(error));
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Ensure proper server startup
const PORT = process.env.PORT || 3001;

httpServer.on('error', (error: Error) => {
  console.error('HTTP server error:', error.message);
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready for connections`);
});

// Start the monitor
loadKnownProducts();
setInterval(monitor, 30 * 1000);
monitor(); // Initial run