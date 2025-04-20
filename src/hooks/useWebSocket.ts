import {useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import type { Product } from '../types/product';

interface WebSocketMessage {
  type: 'connected' | 'new-product';
  product?: Product;
  message?: string;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  connectionStatus: string;
}

export const useProductWebSocket = (onNewProduct: (product: Product) => void): WebSocketHookReturn => {
  const { lastJsonMessage, readyState } = useWebSocket<WebSocketMessage>('ws://127.0.0.1:3001/ws', {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  const isConnected = readyState === ReadyState.OPEN;

  const handleNewProduct = useCallback((message: WebSocketMessage) => {
    if (message.type === 'new-product' && message.product) {
      onNewProduct(message.product);
    }
  }, [onNewProduct]);

  // Handle incoming messages
  if (lastJsonMessage) {
    handleNewProduct(lastJsonMessage);
  }

  return { isConnected, connectionStatus };
}; 