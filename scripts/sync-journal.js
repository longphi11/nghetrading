// scripts/sync-journal.js
// Đọc nội dung 1 GitHub Issue (tạo từ template "📊 Bài Nhật Ký Mới"),
// chèn thành 1 bài mới vào data/journal.json.
// Chạy bởi GitHub Actions (xem .github/workflows/sync-journal.yml)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "journal.json");

// Nhãn (label) của mỗi ô trong file .github/ISSUE_TEMPLATE/nhat-ky-moi.yml —
// PHẢI khớp chính xác với "label:" khai báo trong file yml đó.
const LABELS = {
  tag: "Chủ đề",
  title: "Tiêu đề bài viết",
  date: "Ngày đăng (định dạng YYYY-MM-DD)",
  cover: "Link ảnh bìa (upload lên imgur.com rồi dán link vào đây)",
  excerpt: "Tóm tắt ngắn (1-2 câu, hiện ở box ngoài trang danh sách)",
  content: "Nội dung phân tích đầy đủ (mỗi đoạn cách nhau 1 dòng trống)",
  sourceLink: "Link bài gốc trên TradingView (không bắt buộc)",
};

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
    .slice(0, 50);
}

// GitHub Issue Forms render mỗi ô thành:  ### <label>\n\n<value>\n\n
function parseIssueBody(body) {
  const map = {};
  const parts = body.split(/\n### /);
  parts.forEach((part) => {
    const cleaned = part.replace(/^### /, "");
    const newlineIdx = cleaned.indexOf("\n");
    if (newlineIdx === -1) return;
    const label = cleaned.slice(0, newlineIdx).trim();
    let value = cleaned.slice(newlineIdx + 1).trim();
    if (value === "_No response_") value = "";
    map[label] = value;
  });
  return map;
}

function toParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, " ").trim()}</p>`)
    .join("");
}

function validate(fields) {
  const missing = [];
  // "sourceLink" không bắt buộc (validations.required: false trong yml) nên không kiểm tra ở đây
  ["tag", "title", "date", "cover", "excerpt", "content"].forEach((key) => {
    if (!fields[LABELS[key]]) missing.push(LABELS[key]);
  });
  if (fields[LABELS.date] && !/^\d{4}-\d{2}-\d{2}$/.test(fields[LABELS.date])) {
    missing.push(`${LABELS.date} (sai định dạng, cần YYYY-MM-DD)`);
  }
  return missing;
}

function main() {
  const issueBody = process.env.ISSUE_BODY || "";
  const fields = parseIssueBody(issueBody);

  const missing = validate(fields);
  if (missing.length > 0) {
    console.error("THIẾU HOẶC SAI ĐỊNH DẠNG các ô sau:\n- " + missing.join("\n- "));
    process.exit(1);
  }

  const tagRaw = fields[LABELS.tag];
  const tag = tagRaw === "Bitcoin" ? "bitcoin" : "vang";
  const ticker = tag === "bitcoin" ? "BTC/USD" : "XAU/USD";
  const title = fields[LABELS.title];
  const date = fields[LABELS.date];
  const cover_image = fields[LABELS.cover];
  const excerpt = fields[LABELS.excerpt];
  const content_html = toParagraphs(fields[LABELS.content]);
  const source_link = fields[LABELS.sourceLink] || "";

  let posts = [];
  if (fs.existsSync(DATA_FILE)) {
    posts = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }

  const maxEntryNo = posts.reduce((max, p) => Math.max(max, p.entry_no || 0), 0);
  const idPrefix = tag === "bitcoin" ? "btc" : "xau";
  let id = `${idPrefix}-${date}-${slugify(title)}`;

  // Tránh trùng id nếu robot chạy 2 lần cho cùng 1 bài
  if (posts.some((p) => p.id === id)) {
    console.log(`Bài "${id}" đã tồn tại trong journal.json — bỏ qua, không thêm trùng.`);
    fs.writeFileSync(path.join(ROOT, ".sync-journal-result"), "unchanged");
    return;
  }

  const entry = {
    id,
    entry_no: maxEntryNo + 1,
    title,
    tag,
    ticker,
    date,
    cover_image,
    excerpt,
    content_html,
    source_link,
  };

  posts.unshift(entry);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), "utf-8");

  console.log(`✓ Đã thêm bài "${title}" (${id}) vào data/journal.json`);
  fs.writeFileSync(path.join(ROOT, ".sync-journal-result"), "changed");
  // Ghi title ra để workflow dùng làm nội dung commit message + comment
  fs.writeFileSync(path.join(ROOT, ".sync-journal-title"), title);
}

main();
