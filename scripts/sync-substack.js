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

async function fetchFeed() {
  // Thử gọi thẳng trước
  try {
    return await parser.parseURL(FEED_URL);
  } catch (err) {
    console.log(`Gọi thẳng thất bại (${err.message}), thử qua proxy...`);
  }

  // Danh sách proxy dự phòng — thử lần lượt cho tới khi có cái chạy được
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
    const category = overrides[slug] || (item.categories && item.categories[0]) || "Chưa Phân Loại";
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

  console.log(`Hoàn tất. ${addedCount} bài viết mới được thêm.`);
  // Ghi cờ để workflow biết có thay đổi hay không
  fs.writeFileSync(
    path.join(ROOT, ".sync-result"),
    addedCount > 0 ? "changed" : "unchanged"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
