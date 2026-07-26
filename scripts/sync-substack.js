// scripts/sync-substack.js
// Tự động đồng bộ bài viết từ Substack RSS feed vào website.
// Chạy bởi GitHub Actions (xem .github/workflows/sync-substack.yml)

const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");

// ⚙️ CẤU HÌNH — đổi feed URL nếu bạn đổi tên Substack
const FEED_URL = "https://neointhezone.substack.com/feed";
const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const DATA_FILE = path.join(ROOT, "data", "posts.json");
const TEMPLATE_FILE = path.join(ROOT, "templates", "post-template.html");
const OVERRIDES_FILE = path.join(ROOT, "data", "category-overrides.json");

// Đọc bảng phân loại thủ công (nếu có). Dạng: { "slug-bai-viet": "Tâm Lý" }
function loadCategoryOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

// Bỏ dấu tiếng Việt + tạo slug URL-friendly
function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Định dạng ngày kiểu "10 Tháng 7, 2026"
function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  const months = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  ];
  return `${d.getDate()} Tháng ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

// Lấy ảnh cover đầu tiên trong nội dung bài viết (nếu có)
function extractFirstImage(html) {
  const match = html && html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

// Cắt đoạn tóm tắt ngắn (bỏ thẻ HTML) từ nội dung
function extractExcerpt(html, maxLen = 200) {
  const text = (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen).trim() + "..." : text;
}

async function fetchViaRss2Json() {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "rss2json báo lỗi");
  return {
    items: data.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      isoDate: item.pubDate,
      categories: item.categories,
      contentEncoded: item.content || item.description || "",
      content: item.content || item.description || "",
    })),
  };
}

async function fetchFeed() {
  // 1. Thử gọi thẳng trước
  try {
    return await parser.parseURL(FEED_URL);
  } catch (err) {
    console.log(`Gọi thẳng thất bại (${err.message}), thử qua rss2json...`);
  }

  // 2. Thử dịch vụ chuyên đọc RSS (thường vượt chặn tốt hơn proxy CORS thông thường)
  try {
    return await fetchViaRss2Json();
  } catch (err) {
    console.log(`rss2json thất bại (${err.message}), thử qua proxy CORS...`);
  }

  // 3. Danh sách proxy CORS dự phòng — thử lần lượt cho tới khi có cái chạy được
  const proxies = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  let lastError;
  for (const buildProxyUrl of proxies) {
    const proxyUrl = buildProxyUrl(FEED_URL);
    try {
      console.log(`Đang thử proxy: ${proxyUrl}`);
      const res = await fetch(proxyUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NgheTradingBot/1.0)" },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const xml = await res.text();
      if (!xml || !xml.includes("<rss") && !xml.includes("<feed")) {
        throw new Error("phản hồi không phải XML hợp lệ");
      }
      return await parser.parseString(xml);
    } catch (err) {
      console.log(`Proxy này thất bại: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`Tất cả các cách lấy feed đều thất bại. Lỗi cuối cùng: ${lastError && lastError.message}`);
}

// Tự động phân loại bài viết Substack theo từ khóa thông minh
function autoDetectCategory(title, content, categories) {
  const catText = (categories || []).join(' ').toLowerCase();
  if (catText.includes('tâm lý') || catText.includes('kỷ luật')) return 'Tâm lý & Kỷ luật';
  if (catText.includes('rủi ro') || catText.includes('quản lý vốn')) return 'Quản trị rủi ro';
  if (catText.includes('kỹ thuật') || catText.includes('phương pháp')) return 'Phương pháp & Kỹ thuật';
  if (catText.includes('xác suất')) return 'Tư duy xác suất';

  const text = `${title} ${content.slice(0, 500)}`.toLowerCase();
  if (/rủi ro|quản lý vốn|cháy tài khoản|cắt lỗ|bảo vệ tài khoản|vốn/i.test(text)) {
    return 'Quản trị rủi ro';
  }
  if (/tâm lý|cảm xúc|kỷ luật|cái tôi|nỗi sợ|con quỷ|quyết định|cờ bạc|hiểu bản thân|hoang đường/i.test(text)) {
    return 'Tâm lý & Kỷ luật';
  }
  if (/điểm vào lệnh|kỹ thuật|kế hoạch|lính bắn tỉa|cặp tiền|hết ngày/i.test(text)) {
    return 'Phương pháp & Kỹ thuật';
  }
  if (/xác suất|poker|may mắn/i.test(text)) {
    return 'Tư duy xác suất';
  }
  return 'Nghề trading';
}

async function main() {
  console.log(`Đang lấy feed: ${FEED_URL}`);
  const feed = await fetchFeed();
  const overrides = loadCategoryOverrides();

  // Đọc danh sách bài viết đã có
  let existingPosts = [];
  if (fs.existsSync(DATA_FILE)) {
    existingPosts = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  const existingSlugs = new Set(existingPosts.map((p) => p.slug));

  const template = fs.readFileSync(TEMPLATE_FILE, "utf-8");
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  let addedCount = 0;

  for (const item of feed.items) {
    const slug = slugify(item.title);
    if (existingSlugs.has(slug)) continue; // đã có rồi, bỏ qua

    const contentHtml = item.contentEncoded || item.content || item.contentSnippet || "";
    const thumb = extractFirstImage(contentHtml) || "";
    const excerpt = extractExcerpt(contentHtml);
    const category = overrides[slug] || autoDetectCategory(item.title, contentHtml, item.categories);
    const dateVN = formatDateVN(item.pubDate || item.isoDate);

    // Tạo trang bài viết từ template
    const postHtml = template
      .replace(/{{TITLE}}/g, item.title || "")
      .replace(/{{DATE}}/g, dateVN)
      .replace(/{{CATEGORY}}/g, category)
      .replace(/{{CONTENT}}/g, contentHtml)
      .replace(/{{SUBSTACK_LINK}}/g, item.link || "");

    fs.writeFileSync(path.join(POSTS_DIR, `${slug}.html`), postHtml, "utf-8");
    console.log(`✓ Đã tạo posts/${slug}.html`);

    existingPosts.unshift({
      title: item.title,
      date: dateVN,
      pubDate: item.pubDate || item.isoDate,
      category,
      excerpt,
      link: `posts/${slug}.html`,
      thumb,
      slug,
    });
    existingSlugs.add(slug);
    addedCount++;
  }

  // Áp lại bảng phân loại thủ công cho cả những bài đã có sẵn (phòng khi bạn vừa sửa category-overrides.json)
  existingPosts.forEach((p) => {
    if (overrides[p.slug]) p.category = overrides[p.slug];
  });

  // Sắp xếp mới nhất lên đầu, lưu lại
  existingPosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingPosts, null, 2), "utf-8");

  // Tự động tạo liên kết nội bộ chéo cho bài viết mới và bài cũ
  applyAutoInternalLinks();

  console.log(`Hoàn tất. ${addedCount} bài viết mới được thêm.`);
  // Ghi cờ để workflow biết có thay đổi hay không
  fs.writeFileSync(
    path.join(ROOT, ".sync-result"),
    addedCount > 0 ? "changed" : "unchanged"
  );
}

// Tự động tạo liên kết nội bộ chéo cho toàn bộ bài viết
function applyAutoInternalLinks() {
  const linkRules = [
    { kw: 'quản trị rủi ro', target: 'quan-tri-rui-ro.html' },
    { kw: 'quản lý vốn', target: 'chia-se-meo-quan-ly-von-trong-giao-dich.html' },
    { kw: 'tâm lý giao dịch', target: 'cam-xuc-la-thu-vat-di.html' },
    { kw: 'tâm lý', target: 'cam-xuc-la-thu-vat-di.html' },
    { kw: 'nỗi sợ hãi', target: 'vuot-qua-noi-so-hai-trong-giao-dich-ngoai-hoi.html' },
    { kw: 'nỗi sợ', target: 'vuot-qua-noi-so-hai-trong-giao-dich-ngoai-hoi.html' },
    { kw: 'kỷ luật', target: 'ren-luyen-ky-luat-trong-trading-nhu-nao.html' },
    { kw: 'xác suất', target: 'trading-la-tro-choi-xac-suat.html' },
    { kw: 'lính bắn tỉa', target: 'hay-giao-dich-nhu-mot-linh-ban-tia.html' },
    { kw: 'điểm vào lệnh', target: '4-goi-y-de-co-diem-vao-lenh-tot-nhat.html' },
    { kw: 'poker', target: 'poker-day-ban-dieu-gi-ve-trading.html' },
    { kw: 'kế hoạch giao dịch', target: 'toi-len-ke-hoach-giao-dich-nhu-the-nao.html' },
    { kw: 'hiểu bản thân', target: 'hieu-ban-than.html' },
    { kw: 'cái tôi', target: 'hay-chia-tay-cai-toi-cua-ban-trong-forex.html' },
    { kw: 'bảo vệ tài khoản', target: 'tai-sao-ban-can-bao-ve-tai-khoan-cua-minh-va-bang-cach-nao.html' },
    { kw: '5 giai đoạn', target: '5-giai-doan-de-tro-thanh-trader-co-loi-nhuan-on-dinh.html' },
    { kw: 'trader chuyên nghiệp', target: 'dac-diem-cua-mot-trader-chuyen-nghiep.html' },
    { kw: 'thời gian', target: 'thoi-gian-dieu-thuong-bi-coi-nhe-trong-trading.html' },
    { kw: 'trader thành công', target: 'vai-thoi-quen-it-biet-cua-cac-trader-thanh-cong.html' }
  ];

  const files = fs.readdirSync(POSTS_DIR);
  files.forEach(file => {
    if (file.endsWith('.html') && file !== 'test.html' && file !== 'test2.html' && file !== 'post-sample.html') {
      const filePath = path.join(POSTS_DIR, file);
      let content = fs.readFileSync(filePath, 'utf8');

      let linksInFile = 0;
      const usedTargets = new Set([file]);

      content = content.replace(/<p>(.*?)<\/p>/gs, (match, pText) => {
        if (linksInFile >= 3 || pText.includes('<a ') || pText.includes('<img')) {
          return match;
        }

        let newPText = pText;
        for (const rule of linkRules) {
          if (usedTargets.has(rule.target)) continue;
          if (linksInFile >= 3) break;

          const kwIndex = newPText.toLowerCase().indexOf(rule.kw.toLowerCase());
          if (kwIndex !== -1) {
            const actualKw = newPText.substr(kwIndex, rule.kw.length);
            const linkHtml = `<a href="${rule.target}" class="internal-link">${actualKw}</a>`;
            newPText = newPText.substring(0, kwIndex) + linkHtml + newPText.substring(kwIndex + rule.kw.length);
            usedTargets.add(rule.target);
            linksInFile++;
            break;
          }
        }
        return `<p>${newPText}</p>`;
      });

      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
