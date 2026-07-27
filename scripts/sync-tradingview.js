// scripts/sync-tradingview.js
// Tự động cào & đồng bộ bài phân tích từ TradingView vào data/journal.json.
// Chạy tự động bởi GitHub Actions (.github/workflows/sync-tradingview.yml)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "journal.json");
const TRADINGVIEW_USERNAME = process.env.TRADINGVIEW_USERNAME || "longphibtc";
const FEED_URL = process.env.TRADINGVIEW_FEED_URL || `https://vn.tradingview.com/feed/?username=${TRADINGVIEW_USERNAME}`;

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
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function extractFirstImage(html) {
  const match = html && html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

async function extractCoverImage(item) {
  const link = item.link || "";
  if (link) {
    const match = link.match(/\/chart\/[^\/]+\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const code = match[1];
      const prefix = code.charAt(0).toLowerCase();
      const s3Url = `https://s3.tradingview.com/${prefix}/${code}_big.png`;
      try {
        const headRes = await fetch(s3Url, { method: "HEAD" });
        if (headRes.ok) return s3Url;
      } catch (e) {}
    }
    try {
      const res = await fetch(link, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (res.ok) {
        const html = await res.text();
        const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
        if (ogMatch && ogMatch[1] && !ogMatch[1].includes("userpics/")) {
          return ogMatch[1];
        }
      }
    } catch (e) {}
  }
  const imgFromContent = extractFirstImage(item.content || item.description || "");
  if (imgFromContent && !imgFromContent.includes("userpics/")) return imgFromContent;
  return "https://placehold.co/1000x600?text=Ngh%E1%BB%81+Trading";
}

function toParagraphs(text, title) {
  if (!text) return "";
  let cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (title) {
    const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp("^" + titleEsc + "\\s*[^\\.]*?longphibtc\\s*", "gi");
    cleaned = cleaned.replace(regex, "").trim();
    cleaned = cleaned.replace(/^(Gold|BTC|Bitcoin|Crypto|FOREXCOM|OANDA|BYBIT|BITSTAMP)[^\\.]*?longphibtc\\s*/gi, "").trim();
  }
  return cleaned
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map((p) => `<p>${p.trim()}</p>`)
    .join("");
}

async function fetchFeed() {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "rss2json báo lỗi");
  return data.items || [];
}

async function main() {
  console.log(`Đang lấy bài phân tích TradingView từ: ${FEED_URL}`);
  let items = [];
  try {
    items = await fetchFeed();
  } catch (err) {
    console.log(`Chưa có feed RSS hoặc gọi feed thất bại (${err.message}). Giữ nguyên dữ liệu hiện tại.`);
    fs.writeFileSync(path.join(ROOT, ".journal-sync-result"), "unchanged");
    return;
  }

  let existingPosts = [];
  if (fs.existsSync(DATA_FILE)) {
    existingPosts = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }

  const existingIds = new Set(existingPosts.map((p) => p.id));
  const existingLinks = new Set(existingPosts.map((p) => p.source_link));
  let addedCount = 0;

  for (const item of items) {
    const link = item.link || "";
    if (existingLinks.has(link)) continue;

    const title = item.title || "Bài phân tích mới";
    const pubDate = new Date(item.pubDate || Date.now());
    const dateStr = pubDate.toISOString().split("T")[0];

    const contentText = item.content || item.description || "";
    const cover_image = await extractCoverImage(item);

    const titleLower = title.toLowerCase();
    const isBtc = titleLower.includes("btc") || titleLower.includes("bitcoin");
    const tag = isBtc ? "bitcoin" : "vang";
    const ticker = isBtc ? "BTC/USD" : "XAU/USD";

    const slug = slugify(title);
    const id = `${tag}-${dateStr}-${slug}`;

    if (existingIds.has(id)) continue;

    const excerpt = title;
    const content_html = toParagraphs(contentText, title);
    const maxEntryNo = existingPosts.reduce((max, p) => Math.max(max, p.entry_no || 0), 0);

    const newPost = {
      id,
      entry_no: maxEntryNo + 1,
      title,
      tag,
      ticker,
      date: dateStr,
      cover_image,
      excerpt,
      content_html: content_html || `<p>${title}</p>`,
      source_link: link,
    };

    existingPosts.unshift(newPost);
    existingIds.add(id);
    existingLinks.add(link);
    addedCount++;
  }

  if (addedCount > 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingPosts, null, 2), "utf-8");
  }

  console.log(`Hoàn tất. Thêm ${addedCount} bài phân tích mới từ TradingView.`);
  fs.writeFileSync(path.join(ROOT, ".journal-sync-result"), addedCount > 0 ? "changed" : "unchanged");
}

main().catch((err) => {
  console.error(err);
  fs.writeFileSync(path.join(ROOT, ".journal-sync-result"), "unchanged");
});
