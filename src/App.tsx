import { useState, useEffect, useCallback, useMemo } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'

import type { Product } from './types/product'
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import LoadingScreen from './components/LoadingScreen';
import ProductNotification from './components/ProductNotification';
import { useProductWebSocket } from './hooks/useWebSocket';

interface LoadingState {
  isLoading: boolean;
  products: Product[];
}

function App() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    products: []
  });
  const [currentTime, setCurrentTime] = useState<string>('');

  // Show notification for new product
  const showNotification = useCallback((product: Product) => {
    toast(ProductNotification, {
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

  // Use websocket and handle new products
  const { isConnected } = useProductWebSocket((product) => {
    setLoadingState(prev => ({
      ...prev,
      products: [product, ...prev.products]
    }));
    showNotification(product);
  });

  const connectionState = {
    status: (isConnected ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'reconnecting',
    error: null
  };

  // Load initial products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/products', {
          credentials: 'include'
        });
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

    fetchProducts();
  }, []);

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
    return <LoadingScreen />;
  }

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <Header connectionState={connectionState} />

        <div className="max-w-[800px] w-full space-y-5 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        </div>
      </div>
      <ToastContainer />
      <Footer currentTime={currentTime} />
    </main>
  );
}

export default App;
