import { createContext, useContext, useState, useEffect } from 'react';

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

    let added = true;
    setItems((prev) => {
      const key = variant ? `${product.id}-${variant.id}` : `${product.id}`;
      const existing = prev.find((i) => i.key === key);
      const newQty = existing ? existing.quantity + quantity : quantity;

      if (newQty > stock) {
        added = false;
        return prev;
      }

      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: newQty } : i
        );
      }

      const price = variant?.price || product.price;
      return [...prev, {
        key,
        product_id: product.id,
        variant_id: variant?.id || null,
        name: product.name_ar,
        variant_info: variant ? [variant.color_name, variant.size_name].filter(Boolean).join(' - ') : null,
        price: parseFloat(price),
        compare_price: parseFloat(variant?.compare_price || product.compare_price || 0),
        image: variant?.image || product.primary_image || product.images?.[0]?.url,
        quantity,
        stock,
      }];
    });

    return added ? { ok: true } : { ok: false, message: `الحد الأقصى للمخzون: ${stock}` };
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
