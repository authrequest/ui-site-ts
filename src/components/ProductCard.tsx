import type { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  onClick: (id: string) => void;
}

function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div 
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <figure className="px-2 pt-2">
        <img 
          src={product.thumbnail.url} 
          alt={product.title} 
          className="rounded-xl h-40 w-full object-contain" 
        />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-center text-base mb-1 justify-center w-full">
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
            onClick={() => onClick(product.id)}
          >
            View Product
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard; 