import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { buildLineItem } from '@modules/store/utils/lineItem.js';
import { storeCampaignsApi } from '@modules/campaigns/api/campaigns.api';
import { readJSON } from '@core/utils/storageGuard';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = readJSON('cart', []);
    return Array.isArray(saved) ? saved : [];
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  /**
   * Re-read authoritative prices (campaign start/end, price changes) for lines saved in
   * localStorage. Display only — the order total is always recomputed by the API.
   */
  const refreshPrices = useCallback(async () => {
    const current = itemsRef.current;
    if (!current.length) return;
    try {
      const res = await storeCampaignsApi.cartPrices(
        current.map((i) => ({ product_id: Number(i.product_id), variant_id: i.variant_id ?? null }))
      );
      const quotes = Array.isArray(res?.data) ? res.data : [];
      const keyOf = (pid, vid) => `${Number(pid)}-${vid ? Number(vid) : 0}`;
      const byKey = new Map(quotes.map((q) => [keyOf(q.product_id, q.variant_id), q]));
      setItems((prev) =>
        prev.map((item) => {
          const q = byKey.get(keyOf(item.product_id, item.variant_id));
          if (!q?.available) return item;
          const campaign = q.campaign || null;
          if (
            q.price === item.price &&
            q.compare_price === item.compare_price &&
            (campaign?.id ?? null) === (item.campaign?.id ?? null)
          ) {
            return item;
          }
          return { ...item, price: q.price, compare_price: q.compare_price, campaign };
        })
      );
    } catch {
      // Network issue — keep the saved prices; checkout recomputes server-side anyway.
    }
  }, []);

  useEffect(() => {
    refreshPrices();
    const onFocus = () => refreshPrices();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshPrices]);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch {
      // Storage full/blocked — cart still works for this session.
    }
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
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, subtotal, itemCount, refreshPrices }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
