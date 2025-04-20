import type { Product } from '../types/product';

function ProductNotification({ data }: { data: Product }) {
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

export default ProductNotification; 