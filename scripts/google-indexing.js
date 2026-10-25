// scripts/google-indexing.js
// Tự động thông báo Google Indexing API khi có bài viết mới hoặc cập nhật nội dung.
// Giúp bài viết xuất hiện trên kết quả tìm kiếm Google trong vòng 5-15 phút.

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const ROOT = path.join(__dirname, '..');
const KEY_FILE = path.join(ROOT, 'ga-credentials.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

async function getAuthClient() {
  if (process.env.GA_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GA_CREDENTIALS_JSON);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    return await auth.getClient();
  }
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`Không tìm thấy file credentials tại ${KEY_FILE}`);
  }
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  return await auth.getClient();
}

/**
 * Gửi yêu cầu lập chỉ mục cho 1 URL cụ thể
 * @param {string} url - Địa chỉ URL cần index
 * @param {'URL_UPDATED'|'URL_DELETED'} type - Loại thông báo
 */
async function indexUrl(client, url, type = 'URL_UPDATED') {
  const endpoint = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
  const res = await client.request({
    url: endpoint,
    method: 'POST',
    data: { url, type },
  });
  return res.data;
}

/**
 * Lấy toàn bộ danh sách URLs từ sitemap.xml
 */
function getUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_FILE)) return [];
  const xml = fs.readFileSync(SITEMAP_FILE, 'utf-8');
  const matches = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
  return matches.map(m => m[1].trim()).filter(Boolean);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let urlsToIndex = [];

  if (args.includes('--all')) {
    console.log('📖 Đang đọc danh sách tất cả các trang từ sitemap.xml...');
    urlsToIndex = getUrlsFromSitemap();
  } else if (args.length > 0 && args[0].startsWith('http')) {
    urlsToIndex = [args[0]];
  } else {
    // Mặc định: index các trang chính và 10 bài viết mới nhất
    const all = getUrlsFromSitemap();
    const mainPages = all.filter(u => !u.includes('/posts/'));
    const posts = all.filter(u => u.includes('/posts/')).slice(0, 15);
    urlsToIndex = [...mainPages, ...posts];
  }

  console.log(`🚀 Bắt đầu gửi yêu cầu Google Indexing cho ${urlsToIndex.length} URLs...`);

  let client;
  try {
    client = await getAuthClient();
  } catch (err) {
    console.error('❌ Lỗi xác thực Google Indexing:', err.message);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < urlsToIndex.length; i++) {
    const url = urlsToIndex[i];
    try {
      const result = await indexUrl(client, url, 'URL_UPDATED');
      const time = result.urlNotificationMetadata?.latestUpdate?.notifyTime || new Date().toISOString();
      console.log(`✓ [${i + 1}/${urlsToIndex.length}] Đã gửi: ${url}`);
      successCount++;
    } catch (err) {
      failCount++;
      const msg = err.response?.data?.error?.message || err.message;
      console.error(`✗ [${i + 1}/${urlsToIndex.length}] Thất bại (${url}): ${msg}`);
      if (msg.includes('Permission denied')) {
        console.log('\n⚠️ CẢNH BÁO: Service Account chưa được thêm làm Owner trong Google Search Console!');
        console.log('👉 Vui lòng thêm email sau vào Search Console với quyền "Owner":');
        console.log('   bot-analytics@nghetrading-analytics.iam.gserviceaccount.com\n');
        break;
      }
    }
    // Nghỉ nhẹ 300ms giữa các request để tránh rate limit
    await sleep(300);
  }

  console.log(`\n🎉 Hoàn tất! Thành công: ${successCount}, Thất bại: ${failCount}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { indexUrl, getAuthClient };
