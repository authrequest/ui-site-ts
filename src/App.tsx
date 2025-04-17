import { useState, useEffect, useCallback, useMemo } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'

import type { Product } from './types/product'
import KoFiButton from './components/KofiButton';

interface ConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting';
  error: string | null;
}

interface LoadingState {
  isLoading: boolean;
  products: Product[];
}

function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    error: null
  });
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    products: []
  });
  const [currentTime, setCurrentTime] = useState<string>('');

  // Load initial products
  useEffect(() => {
    const fetchInitialProducts = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/products');
        const products = await response.json();
        setLoadingState(prev => ({
          ...prev,
          products,
          isLoading: false
        }));
      } catch (error) {
        console.error('Error fetching products:', error);
        setLoadingState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
    };
    
    fetchInitialProducts();
  }, []);

  // Show notification for new product
  const showNotification = useCallback((product: Product) => {
    toast(WithAvatar, {
      closeButton: false,
      className: 'shadow-lg overflow-visible scale-100 ring-1 ring-black/5 rounded-xl flex items-center gap-6 bg-slate-800 highlight-white/5 text-white',
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      data: product
    });
  }, []);

  // Handle WebSocket connection with reconnection logic
  useEffect(() => {
    let socket: WebSocket | null = null;
    
    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${wsProtocol}://${window.location.hostname}:3001`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState(prev => ({
          ...prev,
          status: 'connected',
          error: null
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'new-product') {
            // Update products state first
            setLoadingState(prev => ({
              ...prev,
              products: [data.product, ...prev.products]
            }));
            
            // Then show notification after a small delay
            setTimeout(() => {
              showNotification(data.product);
            }, 100);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          error: 'Connection error. Retrying...'
        }));
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected'
        }));
        setTimeout(connect, 5000);
      };
    };
    
    connect();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [showNotification]);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleProductClick = useCallback((productId: string) => {
    try {
      const product = loadingState.products.find(p => p.id === productId);
      if (product?.slug) {
        const productUrl = `https://store.ui.com/us/en/products/${product.slug}`;
        window.open(productUrl, '_blank');
      } else {
        toast.error('Failed to open product: Product URL not found', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark"
        });
      }
    } catch (error) {
      console.error('Failed to open product:', error);
      toast.error('Failed to open product. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark"
      });
    }
  }, [loadingState.products]);

  const visibleProducts = useMemo(() => loadingState.products.slice(0, 6), [loadingState.products]);

  if (loadingState.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4 animate-pulse">Loading Products</div>
          <DotLottieReact
            src="https://lottie.host/e9cb5930-293a-45b8-8db0-b0c36deb7636/rsePl0BPNl.lottie"
            loop
            autoplay
            style={{ width: 120, height: 120 }}
          />
        </div>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-4xl font-extrabold tracking-tight">Monitor Feed</h1>
              <img src="/favicon.ico" alt="Monitor Icon" className="w-6 h-6" />
            </div>
            <div className={`connection-status ${connectionState.status} text-center mt-2`}>
              {connectionState.status === 'connected' && <span className="text-green-500">🟢 Connected</span>}
              {connectionState.status === 'disconnected' && <span className="text-red-500">🔴 Disconnected</span>}
              {connectionState.error && <span className="text-red-500">{connectionState.error}</span>}
            </div>
          </div>
        </header>

        <div className="max-w-[800px] w-full space-y-5 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((product) => (
              <div 
                key={product.id} 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <figure className="px-2 pt-2">
                  <img 
                    src={product.thumbnail.url} 
                    alt={product.title} 
                    className="rounded-xl h-24 w-full object-cover"
                  />
                </figure>
                <div className="card-body p-3">
                  <h2 className="card-title text-center text-base mb-1">
                    {product.title}
                  </h2>
                  <div className="flex justify-center mb-1">
                    <span className="text-base font-bold text-primary">
                      ${product.variants[0].displayPrice.amount / 100}
                      {' '}
                      {product.variants[0].displayPrice.currency}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/70 text-center mb-2">
                    {product.shortDescription}
                  </p>
                  <div className="card-actions justify-center mt-2">
                    <button 
                      className="btn btn-primary w-full btn-sm"
                      onClick={() => handleProductClick(product.id)}
                    >
                      View Product
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ToastContainer />
      <div className="dock dock-bottom bg-base-200 p-4">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto relative pr-0">
          <div className="flex items-center gap-4">
            <span className="text-lg font-light tracking-wide text-base-content tabular-nums">
              {currentTime.split(' ')[0]}
            </span>
            <span className="text-xs font-medium text-base-content/80">
              {currentTime.split(' ')[1]} {currentTime.split(' ')[2]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <KoFiButton />
          </div>
          <span className="text-sm text-base-content/70 absolute right-4">
            © 2025 SudoShoe, Inc All rights reserved.
          </span>
        </div>
      </div>
    </main>
  );
}

function WithAvatar({ data }: { data: Product }) {
  return (
    <div className="flex flex-col pl-8">
      <div className="grid z-10 place-items-center absolute -left-12 top-1/2 -translate-y-1/2 size-20 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <img src={data.thumbnail.url} alt={data.title} className="rounded-full size-20 object-cover" />
      </div>
      <p className="text-white font-semibold">New Product Added!</p>
      <p className="text-sm text-zinc-400">{data.title}</p>
    </div>
  );
}

export default App;
