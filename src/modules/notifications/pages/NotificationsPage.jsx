import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellOff, BellRing, CheckCircle2, Download, Laptop, Send, Share, Smartphone, SquarePlus, Trash2, TriangleAlert,
} from 'lucide-react';
import { LoadingSpinner } from '@shared/ui';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useAuth } from '@core/auth/AuthContext';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { pushApi } from '@modules/notifications/api/push.api';
import {
  PushPermissionError,
  currentSubscription,
  deviceSupport,
  endpointHash,
  isIOS,
  subscribeDevice,
} from '@modules/notifications/utils/pushDevice';

const keys = {
  config: ['push', 'config'],
  devices: ['push', 'devices'],
  logs: ['push', 'logs'],
};

const dateTime = (v) =>
  v ? new Date(v).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const STATUS_LABEL = {
  sent: { text: 'أُرسل', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  failed: { text: 'فشل', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  expired: { text: 'انتهى الاشتراك', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  pending: { text: 'قيد الإرسال', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
};

/** iPhone / iPad: push needs the app added to the Home Screen (iOS 16.4+) and opened from its icon. */
function IosInstallGuide() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
      <p className="font-bold">على iPhone تعمل الإشعارات من تطبيق المتجر المثبّت فقط</p>
      <ol className="mt-2 list-decimal space-y-1 ps-5">
        <li>افتح لوحة التحكم في <strong>Safari</strong>.</li>
        <li>اضغط زر المشاركة <Share size={15} className="inline align-text-bottom" aria-hidden /> أسفل الشاشة.</li>
        <li>اختر «إضافة إلى الشاشة الرئيسية» <SquarePlus size={15} className="inline align-text-bottom" aria-hidden /> ثم «إضافة».</li>
        <li>افتح التطبيق من أيقونة «لوحة كرم» على الشاشة الرئيسية، وارجع إلى هذه الصفحة واضغط «تفعيل الإشعارات».</li>
      </ol>
      <p className="mt-2 text-xs opacity-80">يتطلب iOS 16.4 أو أحدث.</p>
    </div>
  );
}

function DeniedHelp() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
      <p className="font-bold">تم رفض الإشعارات لهذا الجهاز</p>
      {isIOS() ? (
        <p>افتح «الإعدادات» ← «الإشعارات» ← «لوحة كرم» وفعّل «السماح بالإشعارات»، ثم ارجع لهذه الصفحة.</p>
      ) : (
        <p>اضغط أيقونة القفل بجانب عنوان الموقع ← «الأذونات» أو «إعدادات الموقع» ← «الإشعارات» ← «سماح»، ثم حدّث الصفحة.</p>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canSeeLogs = hasPermission('settings.manage');

  const [support, setSupport] = useState(() => deviceSupport());
  const [thisHash, setThisHash] = useState(null);
  const [busy, setBusy] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  const configQuery = useQuery({ queryKey: keys.config, queryFn: () => pushApi.config() });
  const devicesQuery = useQuery({ queryKey: keys.devices, queryFn: () => pushApi.subscriptions() });
  const logsQuery = useQuery({ queryKey: keys.logs, queryFn: () => pushApi.logs(), enabled: canSeeLogs });

  const config = configQuery.data?.data || {};
  const devices = devicesQuery.data?.data || [];
  const logs = logsQuery.data?.data || [];
  const thisDevice = thisHash ? devices.find((d) => d.endpoint_hash === thisHash) : null;

  const refreshLocal = useCallback(async () => {
    setSupport(deviceSupport());
    try {
      const sub = await currentSubscription();
      setThisHash(sub ? await endpointHash(sub.endpoint) : null);
    } catch {
      setThisHash(null);
    }
  }, []);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  // Android / desktop Chrome: offer "install app" when the browser allows it
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: keys.devices });
    if (canSeeLogs) queryClient.invalidateQueries({ queryKey: keys.logs });
  };

  const enable = async () => {
    if (!config.public_key) return;
    setBusy('enable');
    try {
      const sub = await subscribeDevice(config.public_key); // asks permission first (needs this tap)
      await pushApi.subscribe(sub.toJSON());
      notifySuccess({ message: 'تم تفعيل الإشعارات على هذا الجهاز' });
      await refreshLocal();
      reload();
    } catch (err) {
      if (err instanceof PushPermissionError) {
        setSupport(deviceSupport());
        notifyError({ message: err.permission === 'denied' ? 'تم رفض إذن الإشعارات' : 'لم يتم السماح بالإشعارات' });
      } else {
        notifyError(err?.message ? err : { message: 'تعذّر تفعيل الإشعارات على هذا الجهاز' });
      }
    } finally {
      setBusy(null);
    }
  };

  const disableHere = async () => {
    setBusy('disable');
    try {
      const sub = await currentSubscription();
      if (sub) {
        await pushApi.removeByEndpoint(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      notifySuccess({ message: 'تم إيقاف الإشعارات على هذا الجهاز' });
      await refreshLocal();
      reload();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(null);
    }
  };

  const removeDevice = async (device) => {
    const ok = await confirm({
      title: 'إلغاء اشتراك جهاز',
      message: `لن تصل إشعارات الطلبات إلى «${device.device_label || 'هذا الجهاز'}» بعد الآن. يمكن تفعيلها لاحقاً من الجهاز نفسه.`,
      confirmText: 'إلغاء الاشتراك',
    });
    if (!ok) return;
    try {
      if (device.endpoint_hash === thisHash) {
        await disableHere();
        return;
      }
      await pushApi.removeById(device.id);
      notifySuccess({ message: 'تم إلغاء اشتراك الجهاز' });
      reload();
    } catch (err) {
      notifyError(err);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const res = await pushApi.test();
      const r = res?.data || {};
      if (r.sent) notifySuccess({ message: `تم إرسال إشعار تجريبي إلى ${r.sent} ${r.sent === 1 ? 'جهاز' : 'أجهزة'}` });
      else notifyError({ message: 'تعذّر الإرسال — راجع سجل الإشعارات' });
      reload();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(null);
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  };

  if (configQuery.isLoading) return <LoadingSpinner />;

  const subscribedHere = Boolean(thisDevice);

  return (
    <div className="max-w-4xl pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-sm text-gray-500 mt-1">
          يصلك إشعار فوري على هاتفك أو حاسوبك عند كل طلب جديد من المتجر، حتى والتطبيق مغلق.
        </p>
      </div>

      {!config.configured ? (
        <div className="card p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
          <TriangleAlert size={20} className="shrink-0" />
          <p>
            الإشعارات غير مفعّلة على الخادم بعد. يجب إضافة مفاتيح VAPID إلى إعدادات الخادم
            (<code className="font-mono">npm run push:vapid</code>) ثم إعادة تشغيله.
          </p>
        </div>
      ) : null}

      {/* This device */}
      <section className="card p-5 space-y-4" aria-labelledby="this-device">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${subscribedHere ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
              {subscribedHere ? <BellRing size={22} /> : <BellOff size={22} />}
            </span>
            <div>
              <h2 id="this-device" className="font-bold">هذا الجهاز</h2>
              <p className="text-sm text-gray-500">
                {subscribedHere
                  ? `الإشعارات مفعّلة (${thisDevice.device_label || 'هذا الجهاز'})`
                  : support === 'ready'
                    ? 'الإشعارات غير مفعّلة على هذا الجهاز'
                    : support === 'denied'
                      ? 'الإشعارات مرفوضة'
                      : support === 'ios-install'
                        ? 'يلزم تثبيت التطبيق أولاً'
                        : 'هذا المتصفح لا يدعم الإشعارات'}
              </p>
            </div>
          </div>
          {subscribedHere ? (
            <span className="badge bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 inline-flex items-center gap-1">
              <CheckCircle2 size={14} /> مفعّلة
            </span>
          ) : null}
        </div>

        {support === 'ios-install' ? <IosInstallGuide /> : null}
        {support === 'denied' ? <DeniedHelp /> : null}
        {support === 'unsupported' ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            استخدم Chrome أو Edge أو Firefox على Android أو الحاسوب، أو تطبيق المتجر المثبّت على iPhone (iOS 16.4 أو أحدث).
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {support === 'ready' && !subscribedHere ? (
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={enable} disabled={!config.configured || busy === 'enable'}>
              <Bell size={18} /> {busy === 'enable' ? 'جاري التفعيل...' : 'تفعيل الإشعارات على هذا الجهاز'}
            </button>
          ) : null}
          {subscribedHere ? (
            <>
              <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={sendTest} disabled={busy === 'test'}>
                <Send size={18} /> {busy === 'test' ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
              </button>
              <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={disableHere} disabled={busy === 'disable'}>
                <BellOff size={18} /> إيقاف على هذا الجهاز
              </button>
            </>
          ) : null}
          {installPrompt ? (
            <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={install}>
              <Download size={18} /> تثبيت التطبيق على هذا الجهاز
            </button>
          ) : null}
        </div>
      </section>

      {/* Devices of this account */}
      <section className="card p-5" aria-labelledby="my-devices">
        <h2 id="my-devices" className="font-bold">
          أجهزتك المرتبطة <span className="text-gray-500 font-normal">({devices.length})</span>
        </h2>
        {devicesQuery.isLoading ? (
          <LoadingSpinner />
        ) : devices.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">لا يوجد جهاز مشترك بعد.</p>
        ) : (
          <ul className="mt-3 divide-y dark:divide-gray-700">
            {devices.map((d) => {
              const here = d.endpoint_hash === thisHash;
              const Icon = /iPhone|iPad|Android/.test(d.device_label || '') ? Smartphone : Laptop;
              return (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <Icon size={20} className="shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium flex flex-wrap items-center gap-2">
                      {d.device_label || 'جهاز'}
                      {here ? <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">هذا الجهاز</span> : null}
                    </p>
                    <p className="text-xs text-gray-500">
                      أضيف {dateTime(d.created_at)}
                      {d.last_success_at ? ` · آخر إشعار ${dateTime(d.last_success_at)}` : ''}
                      {d.failure_count ? ` · ${d.failure_count} محاولة فاشلة` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDevice(d)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={`إلغاء اشتراك ${d.device_label || 'الجهاز'}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Send log (managers) */}
      {canSeeLogs ? (
        <section className="card p-5" aria-labelledby="push-log">
          <h2 id="push-log" className="font-bold">سجل الإشعارات المرسلة</h2>
          {logsQuery.isLoading ? (
            <LoadingSpinner />
          ) : logs.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">لم يُرسل أي إشعار بعد.</p>
          ) : (
            <ul className="mt-3 divide-y dark:divide-gray-700 text-sm">
              {logs.map((l) => {
                const st = STATUS_LABEL[l.status] || STATUS_LABEL.pending;
                return (
                  <li key={l.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`badge ${st.cls}`}>{st.text}</span>
                    <span className="font-medium">
                      {l.event === 'test' ? 'إشعار تجريبي' : `طلب جديد ${l.order_number ? `#${l.order_number}` : ''}`}
                    </span>
                    <span className="text-gray-500">{l.device_label || 'جهاز'}{l.user_name ? ` · ${l.user_name}` : ''}</span>
                    <span className="text-gray-400 text-xs ms-auto">{dateTime(l.created_at)}</span>
                    {l.status === 'failed' && l.error_message ? (
                      <span className="basis-full text-xs text-red-600 dark:text-red-300 break-words">
                        {l.status_code ? `(${l.status_code}) ` : ''}{l.error_message}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
