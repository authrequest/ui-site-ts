export interface Product {
    id: string;
    title: string;
    shortDescription: string;
    slug: string;
    thumbnail: {
      url: string;
    };
    variants: Array<{
      id: string;
      displayPrice: {
        amount: number;
        currency: string;
      };
    }>;
}