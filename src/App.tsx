import { useState, useEffect, useCallback } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'

import type { Product } from './types/product'
import { fetchProducts } from './services/api';
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
    const loadProducts = async () => {
      try {
        setLoadingState(prev => ({ ...prev, isLoading: true }));
        const data = await fetchProducts();
        setLoadingState({ isLoading: false, products: data });
        setConnectionState(prev => ({ ...prev, error: null }));
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to load products. Please check your internet connection and try again.';
        
        setConnectionState(prev => ({
          ...prev,
          error: errorMessage
        }));
        
        // Show error toast
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark"
        });
      } finally {
        setLoadingState(prev => ({ ...prev, isLoading: false }));
      }
    };

    void loadProducts();
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

  // Handle SSE connection with reconnection logic
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      try {
        eventSource = new EventSource('http://localhost:8080/api/products/updates');
        
        eventSource.onopen = () => {
          setConnectionState(prev => ({
            ...prev,
            status: 'connected',
            error: null
          }));
          reconnectAttempts = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { type: string; products: Product[] };
            if (data.type === 'heartbeat') return;
            
            if (data.type === 'update') {
              setLoadingState(prev => ({ ...prev, products: data.products }));
              if (data.products.length > 0) {
                showNotification(data.products[0]);
              }
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', parseError);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setConnectionState(prev => ({
            ...prev,
            status: 'disconnected'
          }));

          if (reconnectAttempts < maxReconnectAttempts) {
            setConnectionState(prev => ({
              ...prev,
              status: 'reconnecting'
            }));
            const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts), 10000);
            reconnectTimeout = window.setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, delay);
          } else {
            const errorMessage = 'Connection lost. Please check your internet connection and refresh the page.';
            setConnectionState(prev => ({
              ...prev,
              error: errorMessage
            }));
            toast.error(errorMessage, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: "dark"
            });
          }
        };
      } catch {
        const errorMessage = 'Failed to establish connection. Please check your internet connection.';
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          error: errorMessage
        }));
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark"
        });
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
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

  if (loadingState.isLoading && loadingState.products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4 animate-pulse">Loading Feed</div>
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
              {connectionState.status === 'connected' && <span className="animate-pulse">🟢 Connected</span>}
              {connectionState.status === 'disconnected' && <span className="animate-pulse">🔴 Disconnected</span>}
              {connectionState.status === 'reconnecting' && <span className="animate-pulse">🟡 Reconnecting...</span>}
            </div>
          </div>
        </header>

        {connectionState.error && <div className="error text-red-500">{connectionState.error}</div>}

        <div className="max-w-[800px] w-full space-y-6 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingState.products.map((product) => (
              <div 
                key={product.id} 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <figure className="px-4 pt-4">
                  <img 
                    src={product.thumbnail.url} 
                    alt={product.title} 
                    className="rounded-xl h-48 w-full object-cover"
                  />
                </figure>
                <div className="card-body">
                  <h2 className="card-title text-center">
                    {product.title}
                  </h2>
                  <div className="flex justify-center">
                    <span className="text-lg font-bold text-primary">
                      ${product.variants[0].displayPrice.amount / 100}
                      {' '}
                      {product.variants[0].displayPrice.currency}
                    </span>
                  </div>
                  <p className="text-sm text-base-content/70 text-center">
                    {product.shortDescription}
                  </p>
                  <div className="card-actions justify-center mt-4">
                    <button 
                      className="btn btn-primary w-full"
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
