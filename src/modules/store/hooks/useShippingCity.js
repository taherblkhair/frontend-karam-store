import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';

/**
 * Delivery price by city — one source for the whole storefront.
 *
 * Prices come only from GET /store/cities (the same rates the order is charged; managed in
 * admin → settings → shipping). Same query key as checkout, so it is fetched once per visit.
 * The shopper's city is remembered in this browser, so the product page, cart, shipping page
 * and checkout all show their city's price without asking twice.
 */
const STORAGE_KEY = 'karam-shipping-city';
const CHANGE_EVENT = 'karam:shipping-city';

export const storeCitiesQuery = {
  queryKey: ['cities'],
  queryFn: () => storeApi.cities(),
  staleTime: 10 * 60_000,
};

function readSavedCity() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/** Remembered city id ('' when none), for prefilling forms. */
export const savedShippingCityId = readSavedCity;

export function rememberShippingCity(cityId) {
  const id = cityId ? String(cityId) : '';
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked (some in-app browsers) — the choice still applies on this page
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
}

/** "25" / "22.5" — short like the product page price. */
export function formatShippingAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Options for SearchableSelect: city name + its price as a hint. */
export function cityPriceOptions(cities) {
  return cities.map((c) => ({
    value: c.id,
    label: c.name_ar,
    hint: c.shipping_price != null ? `${formatShippingAmount(c.shipping_price)} د.ل` : undefined,
  }));
}

export function useShippingCity() {
  const { data, isLoading, isError } = useQuery(storeCitiesQuery);
  const [cityId, setCityId] = useState(readSavedCity);

  useEffect(() => {
    const onChange = (e) => setCityId(e.detail || '');
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setCityId(e.newValue || '');
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const cities = data?.data || [];
  // A remembered city that is no longer offered is simply ignored
  const city = cities.find((c) => String(c.id) === String(cityId)) || null;
  const price = city && city.shipping_price != null ? Number(city.shipping_price) : null;

  return {
    cities,
    city,
    cityId: city ? String(city.id) : '',
    price,
    setCityId: rememberShippingCity,
    isLoading,
    isError,
  };
}
