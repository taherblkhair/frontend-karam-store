<?php
/**
 * Product Open Graph shim for shared hosting (cPanel / Apache).
 *
 * Browsers never hit this (humans get the SPA via index.html).
 * Social crawlers (Instagram, WhatsApp, Facebook, …) are rewritten here by .htaccess
 * so link previews show product title + image (SPA alone cannot).
 *
 * Query: share-product.php?slug=black-leather-bag
 */
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');

$slug = isset($_GET['slug']) ? trim((string) $_GET['slug']) : '';
if ($slug === '' || strlen($slug) > 255) {
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="ar"><head><meta charset="UTF-8"><title>غير موجود</title></head><body>المنتج غير موجود</body></html>';
    exit;
}

// Allow optional override via env var if host injects it; default production API.
$apiBase = getenv('KARAM_API_PUBLIC_URL') ?: 'https://api.karamstore.ly';
$apiBase = rtrim($apiBase, '/');

$https =
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
$scheme = $https ? 'https' : 'https'; // store is always HTTPS publicly
$host = $_SERVER['HTTP_HOST'] ?? 'karamstore.ly';
$front = $scheme . '://' . $host;

$target =
    $apiBase
    . '/share/product/'
    . rawurlencode($slug)
    . '?front='
    . rawurlencode($front);

$html = null;
$err = null;

if (function_exists('curl_init')) {
    $ch = curl_init($target);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER => [
            'Accept: text/html',
            'User-Agent: KaramStore-ShareBot/1.0',
        ],
    ]);
    $html = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($html === false || $status >= 400) {
        $err = curl_error($ch) ?: ('HTTP ' . $status);
        $html = null;
    }
    curl_close($ch);
} elseif (ini_get('allow_url_fopen')) {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'header' => "Accept: text/html\r\nUser-Agent: KaramStore-ShareBot/1.0\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $html = @file_get_contents($target, false, $ctx);
}

if (!$html) {
    // Soft fallback: still redirect humans; crawler may show site default only once.
    $fallbackUrl = $front . '/product/' . rawurlencode($slug);
    echo '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'
        . '<meta http-equiv="refresh" content="0;url=' . htmlspecialchars($fallbackUrl, ENT_QUOTES, 'UTF-8') . '">'
        . '<title>كرم للحقائب</title></head><body>'
        . '<p><a href="' . htmlspecialchars($fallbackUrl, ENT_QUOTES, 'UTF-8') . '">فتح المنتج</a></p>'
        . ($err ? '<!-- ' . htmlspecialchars($err, ENT_QUOTES, 'UTF-8') . ' -->' : '')
        . '</body></html>';
    exit;
}

echo $html;
