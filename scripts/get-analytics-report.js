// scripts/get-analytics-report.js
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const path = require('path');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '547085712';
const KEY_FILE = path.join(__dirname, '..', 'ga-credentials.json');

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: KEY_FILE,
});

async function runReport() {
  console.log(`Đang truy vấn số liệu Google Analytics cho Property: ${PROPERTY_ID}...`);

  // 1. Tổng quan traffic tháng 10/2026
  const overviewResponse = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [
      {
        startDate: '2026-10-01',
        endDate: 'today',
      },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
  });

  console.log('\n=== TỔNG QUAN THÁNG 10 ===');
  if (overviewResponse.rows && overviewResponse.rows.length > 0) {
    const row = overviewResponse.rows[0];
    const metricHeaders = overviewResponse.metricHeaders;
    metricHeaders.forEach((header, index) => {
      console.log(`${header.name}: ${row.metricValues[index].value}`);
    });
  } else {
    console.log('Chưa có dữ liệu tổng quan.');
  }

  // 2. Nguồn truy cập (Session Source / Medium)
  const sourceResponse = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '2026-10-01', endDate: 'today' }],
    dimensions: [{ name: 'sessionSourceMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    limit: 10,
  });

  console.log('\n=== NGUỒN TRUY CẬP (TRAFFIC SOURCES) ===');
  if (sourceResponse.rows && sourceResponse.rows.length > 0) {
    sourceResponse.rows.forEach(r => {
      console.log(`${r.dimensionValues[0].value} -> Sessions: ${r.metricValues[0].value}, Users: ${r.metricValues[1].value}`);
    });
  } else {
    console.log('Chưa có dữ liệu nguồn.');
  }

  // 3. Các trang được xem nhiều nhất (Top Pages)
  const pagesResponse = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '2026-10-01', endDate: 'today' }],
    dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15,
  });

  console.log('\n=== TOP TRANG ĐƯỢC XEM NHIỀU NHẤT ===');
  if (pagesResponse.rows && pagesResponse.rows.length > 0) {
    pagesResponse.rows.forEach(r => {
      console.log(`[${r.metricValues[0].value} views] ${r.dimensionValues[0].value} (${r.dimensionValues[1].value})`);
    });
  } else {
    console.log('Chưa có dữ liệu trang.');
  }

  // 4. Thiết bị (Device Category) & Quốc gia / Thành phố
  const deviceResponse = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '2026-10-01', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'activeUsers' }],
  });

  console.log('\n=== THIẾT BỊ ===');
  if (deviceResponse.rows && deviceResponse.rows.length > 0) {
    deviceResponse.rows.forEach(r => {
      console.log(`${r.dimensionValues[0].value}: ${r.metricValues[0].value} users`);
    });
  }

  // 5. Thành phố (Top Cities)
  const cityResponse = await analyticsDataClient.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '2026-10-01', endDate: 'today' }],
    dimensions: [{ name: 'city' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 5,
  });

  console.log('\n=== TOP THÀNH PHỐ ===');
  if (cityResponse.rows && cityResponse.rows.length > 0) {
    cityResponse.rows.forEach(r => {
      console.log(`${r.dimensionValues[0].value}: ${r.metricValues[0].value} users`);
    });
  }
}

runReport().catch(err => {
  console.error('Lỗi khi truy vấn GA4:', err);
});
