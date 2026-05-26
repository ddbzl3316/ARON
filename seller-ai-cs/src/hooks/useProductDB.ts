import { useState, useEffect } from 'react';

export interface InquiryHistory {
  id: string;
  date: string;
  customerInquiry: string;
  sellerMemo: string;
  csReply: string;
}

export interface Product {
  productId: string;
  name: string;
  url: string;
  info: string;
  createdAt: string;
  updatedAt: string;
  inquiries: InquiryHistory[];
  internalMemo?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  reviewStatus?: 'auto_draft' | 'needs_review' | 'blocked';
}

export function useProductDB() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('seller-ai-product-db');
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch (e) {
        console.error('Product DB parsing failed', e);
      }
    }
  }, []);

  const saveProductAndInquiry = (
    name: string,
    url: string,
    info: string,
    customerInquiry: string,
    sellerMemo: string,
    csReply: string
  ) => {
    const productId = `prod_${name}_${url}`.replace(/[^a-zA-Z0-9]/g, '_');
    
    setProducts((prevProducts) => {
      let productExists = false;
      const newInquiry: InquiryHistory = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('ko-KR'),
        customerInquiry,
        sellerMemo,
        csReply,
      };

      let updatedProducts = prevProducts.map((p) => {
        if ((name && p.name === name) || (url && p.url === url)) {
          productExists = true;
          return {
            ...p,
            name: name || p.name,
            url: url || p.url,
            info: info || p.info,
            updatedAt: new Date().toLocaleString('ko-KR'),
            inquiries: customerInquiry ? [newInquiry, ...p.inquiries] : p.inquiries
          };
        }
        return p;
      });

      if (!productExists && (name || url)) {
        const newProduct: Product = {
          productId,
          name: name || '이름 없음',
          url: url || '',
          info,
          createdAt: new Date().toLocaleString('ko-KR'),
          updatedAt: new Date().toLocaleString('ko-KR'),
          inquiries: customerInquiry ? [newInquiry] : [],
        };
        updatedProducts = [newProduct, ...updatedProducts];
      }

      localStorage.setItem('seller-ai-product-db', JSON.stringify(updatedProducts));
      return updatedProducts;
    });
  };

  const findProduct = (name: string, url: string): Product | undefined => {
    if (!name && !url) return undefined;
    return products.find(p => (name && p.name === name) || (url && p.url === url));
  };

  const clearProductDB = () => {
    setProducts([]);
    localStorage.removeItem('seller-ai-product-db');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter(p => p.productId !== productId);
      localStorage.setItem('seller-ai-product-db', JSON.stringify(updated));
      return updated;
    });
  };

  const updateInternalMemo = (productId: string, memo: string) => {
    setProducts((prev) => {
      const updated = prev.map(p => p.productId === productId ? { ...p, internalMemo: memo, updatedAt: new Date().toLocaleString('ko-KR') } : p);
      localStorage.setItem('seller-ai-product-db', JSON.stringify(updated));
      return updated;
    });
  };

  const importProductDB = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const isValid = parsed.every(p => p.productId !== undefined && p.name !== undefined);
        if (isValid) {
          setProducts(parsed);
          localStorage.setItem('seller-ai-product-db', JSON.stringify(parsed));
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to import DB', e);
      return false;
    }
  };

  return { 
    products, 
    saveProductAndInquiry, 
    findProduct, 
    clearProductDB,
    deleteProduct,
    updateInternalMemo,
    importProductDB
  };
}
