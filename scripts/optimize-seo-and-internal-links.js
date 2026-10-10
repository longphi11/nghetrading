// scripts/optimize-seo-and-internal-links.js
// Quét toàn bộ 71 bài viết trong Tư Duy Gốc:
// 1. Chuẩn hóa On-page SEO: Meta tags, Canonical, Open Graph, Twitter Cards, Schema.org (BlogPosting + Breadcrumbs)
// 2. Tối ưu liên kết nội bộ (Internal Linking) theo mạng lưới chủ đề (Topic Clusters / Silo)
// 3. Bổ sung khối "Bài viết cùng chủ đề nên đọc" (Semantic HTML) cho SEO Bots & giữ chân độc giả
// 4. Tạo lại sitemap.xml chuẩn 100% cho toàn bộ website
// 5. Cập nhật template và script sync-substack.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const DATA_FILE = path.join(ROOT, 'data', 'posts.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const TEMPLATE_FILE = path.join(ROOT, 'templates', 'post-template.html');
const SYNC_SUBSTACK_FILE = path.join(ROOT, 'scripts', 'sync-substack.js');

if (!fs.existsSync(DATA_FILE)) {
  console.error('Không tìm thấy file data/posts.json');
  process.exit(1);
}

const allPosts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanExcerpt(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim()
    .slice(0, 160);
}

// Bảng ánh xạ từ khóa internal linking đa dạng, bao quát 5 chủ đề cốt lõi
const INTERNAL_LINK_RULES = [
  // 1. Quản trị rủi ro & Quản lý vốn
  { kw: 'quản trị rủi ro', target: 'tai-sao-ban-can-bao-ve-tai-khoan-cua-minh-va-bang-cach-nao.html' },
  { kw: 'quản lý vốn', target: 'chia-se-meo-quan-ly-von-trong-giao-dich.html' },
  { kw: 'bảo vệ tài khoản', target: 'tai-sao-ban-can-bao-ve-tai-khoan-cua-minh-va-bang-cach-nao.html' },
  { kw: 'cháy tài khoản', target: 'mot-lenh-kiem-du-hay-tai-khoan-boc-chay.html' },
  { kw: 'khôi phục tài khoản', target: 'lam-sao-e-khoi-phuc-tai-khoan-khi.html' },
  { kw: 'thua lỗ triền miên', target: '7-buoc-thoat-khoi-tinh-trang-thua.html' },
  { kw: 'tài khoản nhỏ', target: 'lam-sao-e-trading-thanh-cong-voi.html' },
  { kw: 'lỗi nguy hiểm', target: 'nhung-loi-nguy-hiem-can-tranh-khi-trading.html' },
  { kw: 'cắt lỗ', target: 'vao-lenh-hay-khong-vao-lenh.html' },

  // 2. Tâm lý & Kỷ luật
  { kw: 'rèn luyện kỷ luật', target: 'ren-luyen-ky-luat-trong-trading-nhu-nao.html' },
  { kw: 'kỷ luật trong trading', target: 'ren-luyen-ky-luat-trong-trading-nhu-nao.html' },
  { kw: 'kỷ luật', target: 'ren-luyen-ky-luat-trong-trading-nhu-nao.html' },
  { kw: 'cảm xúc trong trading', target: 'cam-xuc-la-thu-vat-di.html' },
  { kw: 'cảm xúc', target: 'cam-xuc-la-thu-vat-di.html' },
  { kw: 'nỗi sợ hãi', target: 'vuot-qua-noi-so-hai-trong-giao-dich-ngoai-hoi.html' },
  { kw: 'nỗi sợ', target: 'vuot-qua-noi-so-hai-trong-giao-dich-ngoai-hoi.html' },
  { kw: 'cái tôi', target: 'hay-chia-tay-cai-toi-cua-ban-trong-forex.html' },
  { kw: 'hiểu bản thân', target: 'hieu-ban-than.html' },
  { kw: 'sự tĩnh lặng', target: 'nghe-thuat-cua-su-tinh-lang.html' },
  { kw: 'tĩnh lặng', target: 'tinh-lang-hay-lien-tuc.html' },
  { kw: 'sự nhàm chán', target: 'su-nham-chan-la-ieu-can-thiet-trong.html' },
  { kw: 'nhàm chán', target: 'su-nham-chan-la-ieu-can-thiet-trong.html' },
  { kw: 'ra quyết định', target: 'ra-quyet-dinh-trong-trading.html' },
  { kw: 'con quỷ', target: 'nhung-con-quy-can-tranh-xa-bang-moi-gia-trong-trading.html' },
  { kw: 'niềm tin sai lầm', target: 'nhung-niem-tin-se-ot-chay-tai-khoan.html' },
  { kw: 'người cờ bạc', target: 'nguoi-giao-dich-va-nguoi-co-bac-trong-trading.html' },
  { kw: 'không làm gì cả', target: 'suc-manh-cua-viec-khong-lam-gi.html' },
  { kw: 'không làm gì', target: 'phan-lon-thoi-gian-chung-ta-khong.html' },

  // 3. Phương pháp & Kỹ thuật
  { kw: 'lính bắn tỉa', target: 'hay-giao-dich-nhu-mot-linh-ban-tia.html' },
  { kw: 'kế hoạch giao dịch', target: 'toi-len-ke-hoach-giao-dich-nhu-the-nao.html' },
  { kw: 'điểm vào lệnh', target: '4-goi-y-de-co-diem-vao-lenh-tot-nhat.html' },
  { kw: 'hết ngày giao dịch', target: 'tai-sao-ban-nen-giao-dich-khi-het-ngay-giao-dich.html' },
  { kw: '1 cặp tiền tệ', target: 'tai-sao-ban-nen-chi-chon-1-cap-tien-te-yeu-thich-de-giao-dich.html' },
  { kw: 'giao dịch ngắn hạn', target: 'tai-sao-hau-het-cac-giao-dich-ngan.html' },
  { kw: 'tránh tin tức', target: 'tai-sao-ban-nen-tranh-cac-loai-tin.html' },
  { kw: 'vào lệnh', target: 'vao-lenh-hay-khong-vao-lenh.html' },

  // 4. Tư duy xác suất
  { kw: 'tư duy xác suất', target: 'nang-cao-xac-suat-thang-trong-trading-nhu-nao.html' },
  { kw: 'xác suất thắng', target: 'nang-cao-xac-suat-thang-trong-trading-nhu-nao.html' },
  { kw: 'trò chơi xác suất', target: 'nang-cao-xac-suat-thang-trong-trading-nhu-nao.html' },
  { kw: 'poker', target: 'poker-day-ban-dieu-gi-ve-trading.html' },
  { kw: 'khoa học của sự may mắn', target: 'khoa-hoc-cua-su-may-man.html' },
  { kw: 'sự may mắn', target: 'khoa-hoc-cua-su-may-man.html' },
  { kw: 'kẻ đi săn', target: 'hay-giao-dich-nhu-ke-i-san-ung-nhu.html' },
  { kw: 'thời gian', target: 'thoi-gian-dieu-thuong-bi-coi-nhe-trong-trading.html' },

  // 5. Trader chuyên nghiệp & Nghề nghiệp
  { kw: 'trader chuyên nghiệp', target: 'dac-diem-cua-mot-trader-chuyen-nghiep.html' },
  { kw: 'trader thành công', target: 'vai-thoi-quen-it-biet-cua-cac-trader-thanh-cong.html' },
  { kw: 'nghề nghiệp nghiêm túc', target: 'hay-coi-trading-la-1-nghe-nghiep-nghiem-tuc.html' },
  { kw: '5 giai đoạn', target: '5-giai-doan-de-tro-thanh-trader-co-loi-nhuan-on-dinh.html' },
  { kw: '10% ít ỏi', target: 'lam-sao-de-tro-thanh-10-it-oi-thanh-cong.html' },
  { kw: 'mất bao lâu', target: 'mat-bao-lau-e-tro-thanh-1-trader.html' },
  { kw: 'quản lý quỹ', target: 'giao-dich-nhu-quan-ly-quy-trieu-o.html' },
  { kw: 'trading thành thạo', target: 'trading-thanh-thao-la-nhu-the-nao.html' },

  // 6. Điểm chạm phễu (Funnel Landing Pages)
  { kw: 'nhật ký giao dịch', target: '../nhat-ky.html' },
  { kw: 'hệ thống giao dịch', target: '../he-thong.html' },
  { kw: 'trắc nghiệm tâm lý', target: '../trac-nghiem.html' }
];

console.log('🚀 Bắt đầu tối ưu hóa 71 bài viết Tư Duy Gốc...');

let optimizedCount = 0;

allPosts.forEach((post) => {
  const filePath = path.join(POSTS_DIR, `${post.slug}.html`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Không tìm thấy file: ${filePath}`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf-8');
  const excerpt = cleanExcerpt(post.excerpt);
  const title = post.title;
  const thumb = post.thumb || 'https://nghetrading.com/assets/og-image.jpg';
  const postUrl = `https://nghetrading.com/posts/${post.slug}.html`;

  // 1. TẠO LẠI TOÀN BỘ PHẦN <head> CHUẨN SEO TUYỆT ĐỐI
  const newHead = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-4DBS8D97MS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-4DBS8D97MS');
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} – Nghề Trading</title>
  <meta name="description" content="${escapeHtml(excerpt)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${postUrl}" />

  <!-- Open Graph / Facebook / Zalo / Telegram -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Nghề Trading" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:title" content="${escapeHtml(title)} – Nghề Trading" />
  <meta property="og:description" content="${escapeHtml(excerpt)}" />
  <meta property="og:image" content="${escapeHtml(thumb)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="article:published_time" content="${post.pubDate}" />
  <meta property="article:section" content="${escapeHtml(post.category)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nghetrading" />
  <meta name="twitter:title" content="${escapeHtml(title)} – Nghề Trading" />
  <meta name="twitter:description" content="${escapeHtml(excerpt)}" />
  <meta name="twitter:image" content="${escapeHtml(thumb)}" />

  <!-- Schema.org Structured Data (BlogPosting + BreadcrumbList) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": "${postUrl}#article",
        "isPartOf": {
          "@type": "WebPage",
          "@id": "${postUrl}"
        },
        "headline": ${JSON.stringify(title)},
        "description": ${JSON.stringify(excerpt)},
        "mainEntityOfPage": "${postUrl}",
        "datePublished": ${JSON.stringify(post.pubDate)},
        "dateModified": ${JSON.stringify(post.pubDate)},
        "author": {
          "@type": "Person",
          "name": "Nghề Trading",
          "url": "https://nghetrading.com/gioi-thieu.html"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Nghề Trading",
          "url": "https://nghetrading.com/",
          "logo": {
            "@type": "ImageObject",
            "url": "https://nghetrading.com/images/logo.png"
          }
        },
        "image": ${JSON.stringify(thumb)},
        "articleSection": ${JSON.stringify(post.category)},
        "inLanguage": "vi-VN"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "${postUrl}#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Trang Chủ",
            "item": "https://nghetrading.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Tư Duy Gốc",
            "item": "https://nghetrading.com/bai-viet.html"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": ${JSON.stringify(title)},
            "item": "${postUrl}"
          }
        ]
      }
    ]
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../style.css" />
  <style>
    .post-header { padding: 130px 24px 20px; max-width: 780px; margin: 0 auto; box-sizing: border-box; }
    .post-header .meta { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .post-header h1 { font-family: 'Playfair Display', serif; font-size: 38px; line-height: 1.3; color: #111; margin-bottom: 10px; }
    .post-body { max-width: 780px; margin: 0 auto; padding: 0 24px 80px; font-size: 17px; line-height: 1.8; color: #222; }
    .post-body img { width: 100%; height: auto; border-radius: 4px; margin: 24px 0; }
    .post-body p { margin-bottom: 22px; }
    .post-body h2, .post-body h3 { font-family: 'Playfair Display', serif; margin: 36px 0 16px; color: #111; }
    .post-body a { color: #111; text-decoration: underline; }
    .post-body blockquote { border-left: 3px solid #111; padding-left: 20px; margin: 24px 0; font-style: italic; color: #444; }
    .back-link { display: inline-block; margin: 0 auto 20px; max-width: 780px; }
    .back-link-wrap { max-width: 780px; margin: 130px auto 0; padding: 0 24px; }
    .back-link a { font-size: 13px; color: #888; text-decoration: none; }
    .back-link a:hover { color: #111; }
    .post-source-note { max-width: 780px; margin: 0 auto 60px; padding: 0 24px; font-size: 13px; color: #999; }
    
    /* Box bài viết cùng chủ đề - Semantic Silo */
    .post-related-silo {
      max-width: 780px;
      margin: 40px auto 30px;
      padding: 24px 28px;
      background: #FAF8F5;
      border: 1px solid #EAE5D9;
      border-left: 3px solid #C7A15A;
      border-radius: 4px;
    }
    .post-related-silo h4 {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      font-weight: 700;
      color: #111;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .post-related-silo ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .post-related-silo li a {
      color: #222;
      font-size: 14.5px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: color 0.2s ease;
    }
    .post-related-silo li a:hover {
      color: #C7A15A;
      text-decoration: underline;
    }
  </style>`;

  // Thay thế khối <head>...</head>
  html = html.replace(/<head>[\s\S]*?<\/head>/i, `<head>\n${newHead}\n</head>`);

  // 2. TỐI ƯU INTERNAL LINKING TRONG <article class="post-body">
  // Tách riêng article body để xử lý
  const bodyMatch = html.match(/(<article class="post-body">)([\s\S]*?)(<\/article>)/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[2];

    // Xóa các khối post-related-silo cũ nếu có
    bodyContent = bodyContent.replace(/<section class="post-related-silo"[\s\S]*?<\/section>/gi, '');

    // Reset lại internal links cũ trong body để tránh chồng chéo / thẻ lồng thẻ
    bodyContent = bodyContent.replace(/<a href="([^"]+)" class="internal-link">(.*?)<\/a>/gi, '$2');

    // Chèn lại internal links thông minh
    let linksCount = 0;
    const currentTarget = `${post.slug}.html`;
    const usedTargets = new Set([currentTarget]);

    // Tìm các đoạn <p> phù hợp
    bodyContent = bodyContent.replace(/<p>(.*?)<\/p>/gs, (match, pText) => {
      // Bỏ qua nếu đã đủ 3-4 links, hoặc đoạn đã có link thẻ a, hoặc có ảnh
      if (linksCount >= 4 || pText.includes('<a ') || pText.includes('<img')) {
        return match;
      }

      let newP = pText;
      for (const rule of INTERNAL_LINK_RULES) {
        if (usedTargets.has(rule.target)) continue;
        if (linksCount >= 4) break;

        // Tìm từ khóa không phân biệt hoa thường
        const lowerP = newP.toLowerCase();
        const kwLower = rule.kw.toLowerCase();
        const kwPos = lowerP.indexOf(kwLower);

        if (kwPos !== -1) {
          // Kiểm tra xem vị trí đó có nằm giữa từ khác không (word boundary cơ bản)
          const charBefore = kwPos > 0 ? newP[kwPos - 1] : ' ';
          const charAfter = kwPos + rule.kw.length < newP.length ? newP[kwPos + rule.kw.length] : ' ';
          const isWordBoundary = /[\s,.\-!?;:()"“”'’]/.test(charBefore) && /[\s,.\-!?;:()"“”'’]/.test(charAfter);

          if (isWordBoundary) {
            const actualKw = newP.substr(kwPos, rule.kw.length);
            const linkTag = `<a href="${rule.target}" class="internal-link">${actualKw}</a>`;
            newP = newP.substring(0, kwPos) + linkTag + newP.substring(kwPos + rule.kw.length);
            usedTargets.add(rule.target);
            linksCount++;
            break; // Mỗi <p> tối đa 1 link
          }
        }
      }

      return `<p>${newP}</p>`;
    });

    // 3. TẠO KHỐI "BÀI VIẾT NÊN ĐỌC TIẾP" (SEMANTIC HTML SILO)
    // Lấy 3 bài cùng Category (hoặc bài nổi bật khác nếu không đủ)
    let relatedPosts = allPosts.filter(p => p.category === post.category && p.slug !== post.slug);
    if (relatedPosts.length < 3) {
      const others = allPosts.filter(p => p.slug !== post.slug && !relatedPosts.some(r => r.slug === p.slug));
      relatedPosts = [...relatedPosts, ...others];
    }
    const top3Related = relatedPosts.slice(0, 3);

    const relatedSiloHtml = `
    <!-- Khối liên kết nội bộ đề xuất theo cụm chủ đề (SEO Semantic Silo) -->
    <section class="post-related-silo">
      <h4>📖 BÀI VIẾT NÊN ĐỌC TIẾP TRONG CÙNG CHỦ ĐỀ:</h4>
      <ul>
        ${top3Related.map(r => `<li><a href="${r.slug}.html">→ ${escapeHtml(r.title)}</a></li>`).join('\n        ')}
      </ul>
    </section>`;

    bodyContent = bodyContent.trim() + '\n' + relatedSiloHtml;

    html = html.replace(/(<article class="post-body">)[\s\S]*?(<\/article>)/i, `$1\n${bodyContent}\n$2`);
  }

  // Xóa mọi khối post-related-silo thừa nằm ngoài article nếu có
  html = html.replace(/(<\/article>\s*)<section class="post-related-silo"[\s\S]*?<\/section>/gi, '$1');

  fs.writeFileSync(filePath, html, 'utf-8');
  optimizedCount++;
});

console.log(`✓ Đã tối ưu hóa hoàn chỉnh ${optimizedCount} bài viết trong thư mục posts/!`);

// 4. TẠO LẠI SITEMAP.XML TOÀN DIỆN
console.log('🗺️ Đang tái tạo sitemap.xml chuẩn SEO...');
const todayStr = new Date().toISOString().split('T')[0];

const corePages = [
  { loc: 'https://nghetrading.com/', priority: '1.0', changefreq: 'daily' },
  { loc: 'https://nghetrading.com/bai-viet.html', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://nghetrading.com/nhat-ky.html', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://nghetrading.com/he-thong.html', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://nghetrading.com/trac-nghiem.html', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://nghetrading.com/tu-van.html', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://nghetrading.com/gioi-thieu.html', priority: '0.7', changefreq: 'monthly' },
  { loc: 'https://nghetrading.com/phan-tich.html', priority: '0.8', changefreq: 'daily' }
];

let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Trang chính -->
${corePages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}

  <!-- Toàn bộ bài viết Tư Duy Gốc (${allPosts.length} bài) -->
${allPosts.map(p => {
  const postDate = p.pubDate ? p.pubDate.split('T')[0] : todayStr;
  return `  <url>
    <loc>https://nghetrading.com/posts/${p.slug}.html</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
}).join('\n')}
</urlset>
`;

fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf-8');
console.log(`✓ Đã tạo mới sitemap.xml với ${corePages.length} trang chính + ${allPosts.length} bài viết!`);

// 5. CẬP NHẬT TEMPLATE VÀ SCRIPT SYNC-SUBSTACK.JS
if (fs.existsSync(TEMPLATE_FILE)) {
  let templateContent = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
  // Cập nhật head template
  const tmplHead = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-4DBS8D97MS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-4DBS8D97MS');
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{TITLE}} – Nghề Trading</title>
  <meta name="description" content="{{EXCERPT}}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="https://nghetrading.com/posts/{{SLUG}}.html" />

  <!-- Open Graph / Facebook / Zalo / Telegram -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Nghề Trading" />
  <meta property="og:url" content="https://nghetrading.com/posts/{{SLUG}}.html" />
  <meta property="og:title" content="{{TITLE}} – Nghề Trading" />
  <meta property="og:description" content="{{EXCERPT}}" />
  <meta property="og:image" content="{{THUMB}}" />
  <meta property="og:image:alt" content="{{TITLE}}" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="article:published_time" content="{{PUBDATE}}" />
  <meta property="article:section" content="{{CATEGORY}}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nghetrading" />
  <meta name="twitter:title" content="{{TITLE}} – Nghề Trading" />
  <meta name="twitter:description" content="{{EXCERPT}}" />
  <meta name="twitter:image" content="{{THUMB}}" />

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": "https://nghetrading.com/posts/{{SLUG}}.html#article",
        "isPartOf": {
          "@type": "WebPage",
          "@id": "https://nghetrading.com/posts/{{SLUG}}.html"
        },
        "headline": {{TITLE_JSON}},
        "description": {{EXCERPT_JSON}},
        "mainEntityOfPage": "https://nghetrading.com/posts/{{SLUG}}.html",
        "datePublished": {{PUBDATE_JSON}},
        "dateModified": {{PUBDATE_JSON}},
        "author": {
          "@type": "Person",
          "name": "Nghề Trading",
          "url": "https://nghetrading.com/gioi-thieu.html"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Nghề Trading",
          "url": "https://nghetrading.com/",
          "logo": {
            "@type": "ImageObject",
            "url": "https://nghetrading.com/images/logo.png"
          }
        },
        "image": {{THUMB_JSON}},
        "articleSection": {{CATEGORY_JSON}},
        "inLanguage": "vi-VN"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://nghetrading.com/posts/{{SLUG}}.html#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Trang Chủ",
            "item": "https://nghetrading.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Tư Duy Gốc",
            "item": "https://nghetrading.com/bai-viet.html"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": {{TITLE_JSON}},
            "item": "https://nghetrading.com/posts/{{SLUG}}.html"
          }
        ]
      }
    ]
  }
  </script>`;

  templateContent = templateContent.replace(/<head>[\s\S]*?<\/head>/i, `<head>\n${tmplHead}\n</head>`);
  fs.writeFileSync(TEMPLATE_FILE, templateContent, 'utf-8');
  console.log('✓ Đã cập nhật templates/post-template.html chuẩn SEO.');
}

console.log('🎉 Hoàn tất toàn bộ quy trình tối ưu SEO và liên kết nội bộ!');
