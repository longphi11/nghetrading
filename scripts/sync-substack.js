// scripts/sync-substack.js
// Tự động đồng bộ bài viết từ Substack (Instant JSON API + RSS Fallback) vào website.
// Chạy bởi GitHub Actions (xem .github/workflows/sync-substack.yml)

const fs = require("fs");
const path = require("path");

const SUBSTACK_DOMAIN = "neointhezone.substack.com";
const API_URL = `https://${SUBSTACK_DOMAIN}/api/v1/posts?limit=20`;
const FEED_URL = `https://${SUBSTACK_DOMAIN}/feed`;

const ROOT = path.join(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const DATA_FILE = path.join(ROOT, "data", "posts.json");
const TEMPLATE_FILE = path.join(ROOT, "templates", "post-template.html");
const OVERRIDES_FILE = path.join(ROOT, "data", "category-overrides.json");

function loadCategoryOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

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

function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  const months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  return `${d.getDate()} Tháng ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function extractFirstImage(html) {
  const match = html && html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

function extractExcerpt(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 160) + (text.length > 160 ? "..." : "");
}

async function fetchFromSubstackApi() {
  console.log(`Đang lấy bài từ Substack Instant API: ${API_URL}`);
  const res = await fetch(API_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`API status ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Dữ liệu API không phải mảng");

  return data.map((item) => ({
    title: item.title,
    slug: item.slug || slugify(item.title),
    pubDate: item.post_date || item.published_at || new Date().toISOString(),
    content: item.body_html || item.description || "",
    link: item.canonical_url || `https://${SUBSTACK_DOMAIN}/p/${item.slug}`,
    cover_image: item.cover_image || "",
    categories: (item.postTags || []).map((t) => t.name || t.slug),
  }));
}

function autoDetectCategory(title, content, categories) {
  const catText = (categories || []).join(" ").toLowerCase();
  if (catText.includes("tâm lý") || catText.includes("kỷ luật")) return "Tâm lý & Kỷ luật";
  if (catText.includes("rủi ro") || catText.includes("quản lý vốn")) return "Quản trị rủi ro";
  if (catText.includes("kỹ thuật") || catText.includes("phương pháp")) return "Phương pháp & Kỹ thuật";
  if (catText.includes("xác suất")) return "Tư duy xác suất";

  const text = `${title} ${content.slice(0, 500)}`.toLowerCase();
  if (/rủi ro|quản lý vốn|cháy tài khoản|cắt lỗ|bảo vệ tài khoản|vốn/i.test(text)) {
    return "Quản trị rủi ro";
  }
  if (/tâm lý|cảm xúc|kỷ luật|cái tôi|nỗi sợ|con quỷ|quyết định|cờ bạc|hiểu bản thân|hoang đường|tĩnh lặng/i.test(text)) {
    return "Tâm lý & Kỷ luật";
  }
  if (/điểm vào lệnh|kỹ thuật|kế hoạch|lính bắn tỉa|cặp tiền|hết ngày|vào lệnh/i.test(text)) {
    return "Phương pháp & Kỹ thuật";
  }
  if (/xác suất|poker|may mắn/i.test(text)) {
    return "Tư duy xác suất";
  }
  return "Nghề trading";
}

async function fetchFromSubstackRss() {
  console.log(`Đang lấy bài từ Substack RSS Feed: ${FEED_URL}`);
  const res = await fetch(FEED_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/xml,application/xml,application/rss+xml",
    },
  });
  if (!res.ok) throw new Error(`RSS status ${res.status}`);
  const xml = await res.text();
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemMatches.map((itemXml) => {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const contentMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i) || itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const coverMatch = itemXml.match(/<enclosure[^>]+url="([^">]+)"/i) || itemXml.match(/<media:content[^>]+url="([^">]+)"/i);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const link = linkMatch ? linkMatch[1].trim() : "";
    const slugMatch = link.match(/\/p\/([a-zA-Z0-9-]+)/);
    const slug = slugMatch ? slugMatch[1] : slugify(title);
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
    const content = contentMatch ? contentMatch[1].trim() : "";
    const cover_image = coverMatch ? coverMatch[1] : "";

    return {
      title,
      slug,
      pubDate,
      content,
      link: link || `https://${SUBSTACK_DOMAIN}/p/${slug}`,
      cover_image,
      categories: [],
    };
  });
}

async function main() {
  let items = [];
  try {
    items = await fetchFromSubstackApi();
  } catch (err) {
    console.warn(`Lỗi Instant API (${err.message}). Chuyển sang RSS Feed fallback...`);
    try {
      items = await fetchFromSubstackRss();
    } catch (rssErr) {
      console.warn(`Tạm thời không kết nối được Substack API & RSS (${rssErr.message}). Sẽ tự thử lại vào lần quét tiếp theo.`);
      fs.writeFileSync(path.join(ROOT, ".sync-result"), "unchanged");
      return;
    }
  }

  const overrides = loadCategoryOverrides();

  let existingPosts = [];
  if (fs.existsSync(DATA_FILE)) {
    existingPosts = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  const existingSlugs = new Set(existingPosts.map((p) => p.slug));
  const existingTitles = new Set(existingPosts.map((p) => p.title.toLowerCase().trim()));
  const template = fs.readFileSync(TEMPLATE_FILE, "utf-8");
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  let addedCount = 0;

  for (const item of items) {
    const slug = item.slug || slugify(item.title);
    const contentHtml = item.content || "";
    const thumb = item.cover_image || extractFirstImage(contentHtml) || "";

    const existingIndex = existingPosts.findIndex(
      (p) => p.slug === slug || p.title.toLowerCase().trim() === item.title.toLowerCase().trim()
    );

    if (existingIndex !== -1) {
      if (thumb && existingPosts[existingIndex].thumb !== thumb) {
        existingPosts[existingIndex].thumb = thumb;
        console.log(`✓ Đã cập nhật thumb mới cho bài: ${item.title}`);
      }
      continue;
    }

    const excerpt = extractExcerpt(contentHtml);
    const category = overrides[slug] || autoDetectCategory(item.title, contentHtml, item.categories);
    const dateVN = formatDateVN(item.pubDate);

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
      pubDate: item.pubDate,
      category,
      excerpt,
      link: `posts/${slug}.html`,
      thumb,
      slug,
    });
    existingSlugs.add(slug);
    addedCount++;
  }

  existingPosts.forEach((p) => {
    if (overrides[p.slug]) p.category = overrides[p.slug];
  });

  existingPosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingPosts, null, 2), "utf-8");

  applyAutoInternalLinks();

  console.log(`Hoàn tất. Thêm mới ${addedCount} bài viết Substack.`);
  fs.writeFileSync(path.join(ROOT, ".sync-result"), addedCount > 0 ? "changed" : "unchanged");
}

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
