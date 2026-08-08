import { createContext, useContext, useState, useEffect } from 'react';
import { buildLineItem } from '@modules/store/utils/lineItem.js';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant = null, quantity = 1) => {
    const stock = variant?.stock ?? product.total_stock ?? 0;
    if (stock <= 0) {
      return { ok: false, message: 'المنتج غير متوفر' };
    }

    const line = buildLineItem(product, variant, quantity);
    if (!line) {
      return { ok: false, message: 'يرجى اختيار اللون والمقاس' };
    }

    let added = true;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === line.key);
      const newQty = existing ? existing.quantity + quantity : quantity;

      if (newQty > stock) {
        added = false;
        return prev;
      }

      if (existing) {
        // Preserve original variant snapshot; only update quantity
        return prev.map((i) =>
          i.key === line.key ? { ...i, quantity: newQty } : i
        );
      }

      return [...prev, { ...line, quantity }];
    });

    return added ? { ok: true } : { ok: false, message: 'الكمية المطلوبة غير متاحة' };
  };

  const updateQuantity = (key, quantity) => {
    if (quantity <= 0) {
      removeItem(key);
      return;
    }
    setItems((prev) => prev.map((i) => {
      if (i.key !== key) return i;
      if (quantity > i.stock) return i;
      return { ...i, quantity };
    }));
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
