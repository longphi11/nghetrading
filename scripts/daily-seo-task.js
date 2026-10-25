// scripts/daily-seo-task.js
// Tự động thực hiện các tác vụ SEO và Index hàng ngày để đẩy từ khóa "trading" và "nghề trading" lên Google.

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
const KEY_FILE = process.env.GA_CREDENTIALS_PATH || path.join(ROOT, 'ga-credentials.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const SEO_LOG_FILE = path.join(ROOT, 'data', 'seo-history.json');
const SITE_URL = 'sc-domain:nghetrading.com';

async function getAuthClient() {
  if (process.env.GA_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GA_CREDENTIALS_JSON);
    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/indexing',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ]
    });
    return await auth.getClient();
  }
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`Không tìm thấy file credentials tại ${KEY_FILE}`);
  }
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: [
      'https://www.googleapis.com/auth/indexing',
      'https://www.googleapis.com/auth/webmasters.readonly'
    ]
  });
  return await auth.getClient();
}

async function indexUrl(client, url) {
  const endpoint = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
  const res = await client.request({
    url: endpoint,
    method: 'POST',
    data: { url, type: 'URL_UPDATED' }
  });
  return res.data;
}

function getUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_FILE)) return [];
  const xml = fs.readFileSync(SITEMAP_FILE, 'utf-8');
  const matches = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
  return matches.map(m => m[1].trim()).filter(Boolean);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDailySeo() {
  console.log(`\n======================================================`);
  console.log(`🚀 [DAILY SEO ENGINE] BẮT ĐẦU TÁC VỤ SEO & INDEX HÀNG NGÀY`);
  console.log(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Saigon' })}`);
  console.log(`======================================================\n`);

  let client;
  try {
    client = await getAuthClient();
  } catch (err) {
    console.error('❌ Lỗi xác thực Google Auth:', err.message);
    process.exit(1);
  }

  // 1. TẬP TRUNG BẮN GOOGLE INDEXING CHO CÁC TRANG CỐT LÕI VỀ "TRADING"
  const allUrls = getUrlsFromSitemap();
  const priorityUrls = [
    'https://nghetrading.com/', // Trang chủ - Tối ưu Entity "Trading"
    'https://nghetrading.com/nhat-ky.html', // Nhật ký giao dịch - Freshness hàng ngày
    'https://nghetrading.com/bai-viet.html', // Tư duy gốc
    'https://nghetrading.com/he-thong.html', // Hệ thống trading
  ];

  // Chọn xoay vòng 5 bài viết ngẫu nhiên mỗi ngày để toàn bộ web được Google cào liên tục
  const postUrls = allUrls.filter(u => u.includes('/posts/'));
  const shuffledPosts = postUrls.sort(() => 0.5 - Math.random()).slice(0, 5);
  const targetUrls = [...priorityUrls, ...shuffledPosts];

  console.log(`📡 [1/2] Đang bắn Google Indexing cho ${targetUrls.length} trang trọng điểm...`);
  let successCount = 0;
  for (const url of targetUrls) {
    try {
      await indexUrl(client, url);
      console.log(`   ✓ Đã kích hoạt Google Bot: ${url}`);
      successCount++;
    } catch (e) {
      console.warn(`   ✗ Lỗi index (${url}): ${e.message}`);
    }
    await sleep(400);
  }

  // 2. THEO DÕI THỨ HẠNG TỪ KHÓA TRADING TRÊN GOOGLE SEARCH CONSOLE
  console.log(`\n📊 [2/2] Đang quét chỉ số thứ hạng từ khóa "trading" trên Google...`);
  let rankData = [];
  try {
    const today = new Date();
    const past28 = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);
    const startDate = past28.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 25
      }
    });

    if (res.data.rows && res.data.rows.length > 0) {
      rankData = res.data.rows;
      console.log(`   Tìm thấy ${rankData.length} từ khóa đang được Google ghi nhận:`);
      rankData.forEach(r => {
        const isTradingKeyword = r.keys[0].toLowerCase().includes('trading') || r.keys[0].toLowerCase().includes('trader');
        const badge = isTradingKeyword ? '🔥 [MỤC TIÊU]' : '  ';
        console.log(`   ${badge} "${r.keys[0]}" -> Impressions: ${r.impressions} | Clicks: ${r.clicks} | Vị trí: ${r.position.toFixed(1)}`);
      });
    } else {
      console.log('   Chưa có đủ dữ liệu từ khóa mới trong ngày hôm nay.');
    }

    // Ghi nhật ký vào file seo-history.json
    let history = [];
    if (fs.existsSync(SEO_LOG_FILE)) {
      try { history = JSON.parse(fs.readFileSync(SEO_LOG_FILE, 'utf-8')); } catch(e){}
    }
    history.unshift({
      date: new Date().toISOString().split('T')[0],
      indexedUrlsCount: successCount,
      keywordsCount: rankData.length,
      topKeywords: rankData.slice(0, 5).map(r => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position }))
    });
    // Giữ tối đa 60 ngày gần nhất
    fs.mkdirSync(path.dirname(SEO_LOG_FILE), { recursive: true });
    fs.writeFileSync(SEO_LOG_FILE, JSON.stringify(history.slice(0, 60), null, 2), 'utf-8');
    console.log(`   ✓ Đã cập nhật nhật ký SEO vào data/seo-history.json`);
  } catch (err) {
    console.warn(`   ✗ Lỗi đọc Search Console: ${err.message}`);
  }

  console.log(`\n🎉 Hoàn thành xuất sắc nhiệm vụ SEO hôm nay! Thành công: ${successCount}/${targetUrls.length} URLs.`);
}

if (require.main === module) {
  runDailySeo().catch(console.error);
}

module.exports = { runDailySeo };
