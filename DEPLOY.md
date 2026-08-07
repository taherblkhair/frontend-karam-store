# نشر الواجهة (Frontend) — Production

## API

الواجهة مربوطة بـ:

```
https://api.karamstore.ly
```

- الطلبات: `https://api.karamstore.ly/api/...`
- الصور: `https://api.karamstore.ly/uploads/...`

تحقق من الـ API:

```bash
curl -s https://api.karamstore.ly/api/health
# {"success":true,"message":"Karam Store API is running"}
```

## بناء النسخة

```bash
cd frontend
npm install
npm run build:prod
```

المخرجات في: `frontend/dist/`

ارفع **محتويات** مجلد `dist/` إلى جذر موقع الويب (مثل `public_html` أو `/var/www/html`).

## إعدادات CORS على الـ Backend

في `backend/.env` على السيرفر أضف دومين الواجهة:

```env
CORS_ORIGIN=https://karamstore.ly,https://www.karamstore.ly,http://localhost:5173
```

ثم أعد تشغيل الـ API.

## Nginx (اختياري)

استخدم `deploy/nginx/frontend-prod.conf` كمرجع لـ SPA + Gzip.

## معاينة محلية لنسخة Production

```bash
cd frontend
npm run build:prod
npm run preview:prod
# افتح http://localhost:4173
```
