// scripts/get-search-console-report.js
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const KEY_FILE = path.join(__dirname, '..', 'ga-credentials.json');
const SITE_URL = 'sc-domain:nghetrading.com';

async function getSearchAnalytics() {
  console.log(`Đang truy vấn dữ liệu Google Search Console cho: ${SITE_URL}...`);
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const client = await auth.getClient();

  // Truy vấn 30 ngày qua
  const today = new Date();
  const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = past30.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  try {
    const res = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 20,
      },
    });

    console.log(`\n=== HIỆU SUẤT TÌM KIẾM GOOGLE (30 NGÀY QUA: ${startDate} -> ${endDate}) ===`);
    if (res.data.rows && res.data.rows.length > 0) {
      console.log('Top từ khóa tìm kiếm:');
      res.data.rows.forEach((r, idx) => {
        console.log(`${idx + 1}. "${r.keys[0]}" | Clicks: ${r.clicks} | Impressions: ${r.impressions} | CTR: ${(r.ctr * 100).toFixed(1)}% | Vị trí: ${r.position.toFixed(1)}`);
      });
    } else {
      console.log('Chưa có từ khóa tìm kiếm nào ghi nhận clicks/impressions trong 30 ngày qua.');
    }

    // Top Pages trên Google Search
    const pagesRes = await client.request({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 10,
      },
    });

    console.log('\n=== TOP TRANG XUẤT HIỆN TRÊN GOOGLE SEARCH ===');
    if (pagesRes.data.rows && pagesRes.data.rows.length > 0) {
      pagesRes.data.rows.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.keys[0]} | Clicks: ${r.clicks} | Impressions: ${r.impressions}`);
      });
    } else {
      console.log('Chưa có trang nào có lượt hiển thị tìm kiếm.');
    }

  } catch (err) {
    console.error('Lỗi khi truy vấn Search Console:', err.message);
  }
}

getSearchAnalytics();
