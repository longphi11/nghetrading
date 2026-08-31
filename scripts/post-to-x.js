/**
 * scripts/post-to-x.js
 * Script tự động đăng bài & Thread lên X (Twitter) qua API v2 Free Tier
 * Không cần cài thêm thư viện (Zero Dependencies - Pure Node.js)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.x_api');
const DATA_FILE = path.join(ROOT, 'data', 'journal.json');

// Đọc biến môi trường từ file .env.x_api
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*["']?(.*?)["']?$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
  }
  return {
    apiKey: process.env.X_API_KEY || env.X_API_KEY || '',
    apiSecret: process.env.X_API_KEY_SECRET || env.X_API_KEY_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || env.X_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || env.X_ACCESS_TOKEN_SECRET || '',
    bearerToken: process.env.X_BEARER_TOKEN || env.X_BEARER_TOKEN || '',
  };
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// Tạo OAuth 1.0a Header chuẩn Twitter API v2
function getOAuthHeader(method, url, credentials) {
  const oauthParams = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

// Gửi Tweet lên Twitter API v2 (/2/tweets)
function sendTweetRequest(payload, credentials) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.twitter.com/2/tweets';
    const authHeader = getOAuthHeader('POST', url, credentials);
    const postData = JSON.stringify(payload);

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'NgheTrading-Bot/1.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`API Error [HTTP ${res.statusCode}]: ${JSON.stringify(parsed)}`));
            }
          } catch (e) {
            reject(new Error(`Invalid response [HTTP ${res.statusCode}]: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Đăng 1 tweet đơn
async function postSingleTweet(text, replyToId = null) {
  const credentials = loadEnv();
  if (!credentials.apiKey || !credentials.apiSecret || !credentials.accessToken || !credentials.accessTokenSecret) {
    throw new Error('Thiếu thông tin X API Keys trong .env.x_api!');
  }

  const payload = { text };
  if (replyToId) {
    payload.reply = { in_reply_to_tweet_id: replyToId };
  }

  const res = await sendTweetRequest(payload, credentials);
  return res.data;
}

// Đăng 1 chuỗi Thread (tự động nối tiếp các tweet)
async function postThread(tweetsArray) {
  if (!Array.isArray(tweetsArray) || tweetsArray.length === 0) {
    throw new Error('Danh sách tweets rỗng!');
  }

  console.log(`\n🚀 Bắt đầu đăng Thread gồm ${tweetsArray.length} bài lên X...`);
  let lastTweetId = null;
  const postedTweets = [];

  for (let i = 0; i < tweetsArray.length; i++) {
    const text = tweetsArray[i].trim();
    if (!text) continue;

    console.log(`\n[${i + 1}/${tweetsArray.length}] Đang đăng tweet: "${text.slice(0, 40)}..."`);
    const tweetData = await postSingleTweet(text, lastTweetId);
    lastTweetId = tweetData.id;
    postedTweets.push(tweetData);
    console.log(`✓ Đã đăng thành công! Tweet ID: ${tweetData.id}`);

    // Nghỉ 1-2 giây giữa các tweet để tránh rate-limit
    if (i < tweetsArray.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\n🎉 THREAD ĐÃ ĐĂNG HOÀN TẤT! Link: https://x.com/i/web/status/${postedTweets[0].id}\n`);
  return postedTweets;
}

// Tự động tạo bài tweet từ bài viết mới nhất trong data/journal.json
async function autoPostLatestJournal() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Không tìm thấy file data: ${DATA_FILE}`);
  }
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!posts || posts.length === 0) {
    throw new Error('Không có bài viết nào trong data/journal.json');
  }

  const latest = posts[0];
  const tagStr = latest.tag === 'bitcoin' ? '#Bitcoin #BTC' : '#Vang #XAUUSD';
  
  // Tạo Thread chuẩn tối ưu reach:
  // Tweet 1: Hook + Tóm tắt
  const tweet1 = `📊 [NHẬT KÝ THỰC CHIẾN] ${latest.title}\n\n${latest.excerpt}\n\n${tagStr} #Trading #NgheTrading`;
  
  // Tweet 2: Phân tích & Kêu gọi xem web + Test tâm lý
  const tweet2 = `Chi tiết kịch bản điểm vào lệnh & quản trị rủi ro đã được cập nhật đầy đủ tại:\n🔗 https://nghetrading.com/nhat-ky.html\n\nKiểm tra lại hệ thống & tâm lý trước khi vào lệnh: https://nghetrading.com/trac-nghiem.html`;

  return await postThread([tweet1, tweet2]);
}

// CLI Runner
async function main() {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--auto-journal')) {
      await autoPostLatestJournal();
    } else if (args.includes('--text')) {
      const textIdx = args.indexOf('--text');
      const text = args[textIdx + 1];
      if (!text) throw new Error('Vui lòng nhập nội dung sau --text "Nội dung"');
      const res = await postSingleTweet(text);
      console.log(`✓ Đã đăng thành công Tweet: https://x.com/i/web/status/${res.id}`);
    } else if (args.includes('--thread-file')) {
      const fileIdx = args.indexOf('--thread-file');
      const filePath = path.resolve(args[fileIdx + 1]);
      if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy file: ${filePath}`);
      const threadData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      await postThread(threadData);
    } else {
      console.log(`
Hướng dẫn sử dụng post-to-x.js:
1. Đăng 1 tweet đơn:
   node scripts/post-to-x.js --text "Nội dung tweet của ĐẠI KA"

2. Tự động lấy bài mới nhất từ Nhật ký web đăng thành Thread:
   node scripts/post-to-x.js --auto-journal

3. Đăng Thread từ file json:
   node scripts/post-to-x.js --thread-file path/to/thread.json
`);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  postSingleTweet,
  postThread,
  autoPostLatestJournal,
};
