import type { Product } from '../types/product';

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('http://localhost:8080/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
}