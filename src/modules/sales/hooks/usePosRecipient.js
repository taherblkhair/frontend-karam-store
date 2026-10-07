import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@modules/sales/api/sales.api';
import { resolveQuickFill } from '@modules/store/utils/quickFill';
import {
  isValidLibyaMobile,
  normalizeLibyaPhone,
  sanitizePhoneInput,
  LIBYA_PHONE_MESSAGE,
} from '@shared/utils/phone';

export const EMPTY_RECIPIENT = { name: '', phone: '', city_id: '', area_id: '', address: '' };

const LOCATION_STALE_MS = 10 * 60 * 1000;
const toOption = (row) => ({ value: row.id, label: row.name_ar });

/** The API rejects anything that isn't a Libyan mobile, so the phone is mandatory here too. */
export function recipientPhoneError(phone) {
  const value = normalizeLibyaPhone(phone);
  if (!value) return 'رقم هاتف المستلم مطلوب';
  if (!value.startsWith('09')) return 'رقم الهاتف يجب أن يبدأ بـ 09';
  if (value.length !== 10) return `رقم الهاتف يجب أن يتكون من 10 أرقام (أدخلت ${value.length})`;
  if (!isValidLibyaMobile(value)) return LIBYA_PHONE_MESSAGE;
  return '';
}

export function usePosRecipient({ canLookupCustomers = false } = {}) {
  const queryClient = useQueryClient();
  const [recipient, setRecipient] = useState(EMPTY_RECIPIENT);
  const [error, setError] = useState(null);
  const [dismissedCustomerId, setDismissedCustomerId] = useState(null);
  const refs = {
    phone: useRef(null),
    name: useRef(null),
    city_id: useRef(null),
    area_id: useRef(null),
  };

  const { data: citiesData } = useQuery({
    queryKey: ['pos-cities'],
    queryFn: () => salesApi.cities(),
    staleTime: LOCATION_STALE_MS,
  });
  const areasQueryOptions = (cityId) => ({
    queryKey: ['pos-areas', String(cityId)],
    queryFn: () => salesApi.areas(cityId),
    staleTime: LOCATION_STALE_MS,
  });
  const { data: areasData, isFetching: areasLoading } = useQuery({
    ...areasQueryOptions(recipient.city_id),
    enabled: Boolean(recipient.city_id),
  });

  const phone = normalizeLibyaPhone(recipient.phone);
  const phoneValid = isValidLibyaMobile(phone);
  const { data: customersData, isFetching: customerLoading } = useQuery({
    queryKey: ['pos-customer-lookup', phone],
    queryFn: () => salesApi.findCustomers(phone),
    enabled: canLookupCustomers && phoneValid,
    staleTime: 60 * 1000,
    retry: false,
  });

  const cityOptions = useMemo(
    () =>
      (citiesData?.data || []).map((c) => ({
        ...toOption(c),
        hint: c.shipping_price != null ? `شحن ${c.shipping_price} د.ل` : undefined,
      })),
    [citiesData]
  );
  const areaOptions = useMemo(
    () => (recipient.city_id ? (areasData?.data || []).map(toOption) : []),
    [areasData, recipient.city_id]
  );

  const matchedCustomer = useMemo(() => {
    if (!phoneValid) return null;
    const list = Array.isArray(customersData?.data) ? customersData.data : [];
    return list.find((c) => normalizeLibyaPhone(c.phone) === phone) || null;
  }, [customersData, phone, phoneValid]);

  const customerSuggestion =
    matchedCustomer && matchedCustomer.id !== dismissedCustomerId ? matchedCustomer : null;

  const clearErrorFor = (fields) => {
    if (error && fields.includes(error.field)) setError(null);
  };

  const update = (field, value) => {
    const patch = { [field]: field === 'phone' ? sanitizePhoneInput(value) : value };
    if (field === 'city_id') patch.area_id = '';
    setRecipient((prev) => ({ ...prev, ...patch }));
    if (error?.field === field) {
      const message = field === 'phone' ? recipientPhoneError(patch.phone) : '';
      setError(message ? { field, message } : null);
    }
  };

  const applyCustomer = (customer) => {
    setRecipient((prev) => ({
      ...prev,
      name: customer.name || prev.name,
      city_id: customer.city_id ? String(customer.city_id) : prev.city_id,
      area_id: customer.city_id ? (customer.area_id ? String(customer.area_id) : '') : prev.area_id,
      address: customer.address || prev.address,
    }));
    setDismissedCustomerId(customer.id);
    clearErrorFor(['name', 'city_id', 'area_id']);
  };

  /** Returns `{ filled, missing }` or `null` when nothing in the text was recognised. */
  const quickFill = async (text) => {
    const { updates } = await resolveQuickFill(text, {
      cities: cityOptions,
      currentCityId: recipient.city_id,
      currentAreas: areaOptions,
      loadAreas: async (cityId) => {
        const res = await queryClient.fetchQuery(areasQueryOptions(cityId));
        return (res?.data || []).map(toOption);
      },
    });
    if (Object.keys(updates).length === 0) return null;

    if (updates.phone) updates.phone = sanitizePhoneInput(updates.phone);
    const next = { ...recipient, ...updates };
    setRecipient(next);
    setError(null);
    setDismissedCustomerId(null);

    const missing = [];
    if (!next.name.trim()) missing.push('الاسم');
    if (recipientPhoneError(next.phone)) missing.push('رقم الهاتف');
    if (!next.city_id) missing.push('المدينة');
    return { filled: Object.keys(updates), missing };
  };

  /** First problem in screen order, or `null`. Also marks the field. */
  const validate = () => {
    const message = recipientPhoneError(recipient.phone);
    const problem = message ? { field: 'phone', message } : null;
    setError(problem);
    return problem;
  };

  const focusField = (field) => {
    const el = refs[field]?.current;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus?.({ preventScroll: true });
  };

  const reset = () => {
    setRecipient(EMPTY_RECIPIENT);
    setError(null);
    setDismissedCustomerId(null);
  };

  const toPayload = () => {
    const payload = {
      customer_name: recipient.name.trim() || 'عميل POS',
      customer_phone: phone,
    };
    if (recipient.city_id) payload.city_id = parseInt(recipient.city_id, 10);
    if (recipient.area_id) payload.area_id = parseInt(recipient.area_id, 10);
    if (recipient.address.trim()) payload.address = recipient.address.trim();
    return payload;
  };

  const isDirty = Object.values(recipient).some((v) => String(v).trim());
  const cityLabel = cityOptions.find((o) => String(o.value) === String(recipient.city_id))?.label;
  const areaLabel = areaOptions.find((o) => String(o.value) === String(recipient.area_id))?.label;

  return {
    recipient,
    update,
    error,
    refs,
    phoneValid,
    cityOptions,
    areaOptions,
    areasLoading: Boolean(recipient.city_id) && areasLoading,
    cityLabel,
    areaLabel,
    customerSuggestion,
    customerLoading: canLookupCustomers && phoneValid && customerLoading,
    applyCustomer,
    dismissCustomer: () => setDismissedCustomerId(matchedCustomer?.id ?? null),
    quickFill,
    validate,
    focusField,
    reset,
    toPayload,
    isDirty,
  };
}
