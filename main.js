// ===========================
//  NGHỀ TRADING – main.js
// ===========================

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Scroll fade-in for sections
const fadeEls = document.querySelectorAll('.pillar, .article-card, .journal-table-wrap, .signup-box, .sidebar-quote, .sidebar-stats');
fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => observer.observe(el));

// Cập nhật tự động bảng giá thị trường (VN-Index, S&P 500, BTC, Vàng, USD)
(async function initVNMarketPrices() {
  const btmcEl = document.getElementById('btmc-vrtl-price');
  const vcbEl = document.getElementById('vcb-usd-price');
  const vnindexEl = document.getElementById('vnindex-price');
  const vnindexChangeEl = document.getElementById('vnindex-change');
  const sp500El = document.getElementById('sp500-price');
  const sp500ChangeEl = document.getElementById('sp500-change');
  const btcEl = document.getElementById('btc-price');
  const goldWorldEl = document.getElementById('gold-world-price');

  if (!btmcEl && !vnindexEl) return;

  try {
    const res = await fetch('data/market-prices.json?v=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (btmcEl && data.btmc_vrtl) btmcEl.textContent = data.btmc_vrtl.price;
      if (vcbEl && data.vcb_usd) vcbEl.textContent = data.vcb_usd.price;
      if (btcEl && data.btc) btcEl.textContent = data.btc.price;
      if (goldWorldEl && data.gold_world) goldWorldEl.textContent = data.gold_world.price;

      if (vnindexEl && data.vnindex) {
        vnindexEl.textContent = data.vnindex.price;
        if (vnindexChangeEl && data.vnindex.change) {
          vnindexChangeEl.textContent = data.vnindex.change;
          vnindexChangeEl.style.color = data.vnindex.isUp ? 'var(--green)' : '#d93025';
        }
      }

      if (sp500El && data.sp500) {
        sp500El.textContent = data.sp500.price;
        if (sp500ChangeEl && data.sp500.change) {
          sp500ChangeEl.textContent = data.sp500.change;
          sp500ChangeEl.style.color = data.sp500.isUp ? 'var(--green)' : '#d93025';
        }
      }
    }
  } catch (err) {}
})();

// ===========================
//  TIỆN ÍCH TRANG BÀI VIẾT
//  (Bài liên quan + Chia sẻ mạng xã hội + Bình luận Disqus)
//  Tự động chạy trên MỌI trang trong thư mục posts/ — kể cả bài cũ đã tạo từ trước,
//  không cần chạy lại robot đồng bộ Substack.
// ===========================

// ⚙️ Điền shortname Disqus của bạn vào đây sau khi đăng ký xong (xem hướng dẫn Claude gửi kèm).
// Để trống ("") thì phần bình luận sẽ không hiển thị.
const DISQUS_SHORTNAME = "nghetrading";

(async function initPostPageExtras() {
  const postBody = document.querySelector('.post-body');
  const metaEl = document.querySelector('.post-header .meta');
  const sourceNote = document.querySelector('.post-source-note');

  // Không phải trang bài viết (posts/*.html) thì bỏ qua, không chạy gì cả
  if (!postBody || !metaEl || !sourceNote) return;

  const metaParts = (metaEl.textContent || '').split('•');
  const category = metaParts.length > 1 ? metaParts[1].trim() : '';
  const slug = location.pathname.split('/').filter(Boolean).pop().replace(/\.html$/, '');
  const pageUrl = location.href;
  const pageTitle = document.title.replace(/\s*–\s*Nghề Trading\s*$/, '');

  let lastInsertedEl = sourceNote;
  function insertAfter(newEl) {
    lastInsertedEl.insertAdjacentElement('afterend', newEl);
    lastInsertedEl = newEl;
  }

  // ----- 1. NÚT CHIA SẺ MẠNG XÃ HỘI -----
  const shareWrap = document.createElement('div');
  shareWrap.className = 'post-share';
  shareWrap.innerHTML = `
    <span class="post-share-label">Chia sẻ bài viết</span>
    <div class="post-share-buttons">
      <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Facebook" title="Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95Z"/></svg>
      </a>
      <a class="share-btn" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên X (Twitter)" title="X (Twitter)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.6 22H1.5l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"/></svg>
      </a>
      <a class="share-btn" href="https://www.threads.net/intent/post?text=${encodeURIComponent(pageTitle + ' ' + pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Threads" title="Threads">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 2C7 2 3.3 5.2 3.3 10.6c0 3.1 1.3 5.5 3.6 7.2 2 1.4 4.6 1.4 6.1.4.9-.6 1.5-1.5 1.7-2.6-1.1.5-2.5.7-3.7.2-1.3-.5-2.1-1.6-2.1-3 0-1.9 1.5-3.2 3.9-3.2.6 0 1.2.1 1.7.2-.1-1-.5-1.8-1.2-2.3-.8-.6-1.9-.8-3.1-.5-.5.1-.9.3-1.3.6L7.6 6c.6-.4 1.3-.7 2-.9 1.7-.5 3.4-.2 4.7.8 1.3 1 2 2.5 2.1 4.4 1.2.7 2 1.9 2 3.4 0 3-2.4 5-6.2 5.3 3.7-.1 6.8-2.6 6.8-7.4C19 5.3 16.1 2 12.2 2Z"/></svg>
      </a>
      <a class="share-btn" href="https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Telegram" title="Telegram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.02c-.12.56-.46.7-.93.43l-2.57-1.89-1.24 1.19c-.14.14-.25.25-.51.25l.18-2.61 4.7-4.25c.2-.18-.04-.28-.32-.1L7.38 15.3l-2.52-.79c-.55-.17-.56-.55.12-.81l9.85-3.8c.45-.17.85.11.81.1z"/></svg>
      </a>
      <button class="share-btn share-copy" type="button" aria-label="Copy đường dẫn" title="Copy link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
  `;
  insertAfter(shareWrap);

  const copyBtn = shareWrap.querySelector('.share-copy');
  if (copyBtn) {
    const originalHTML = copyBtn.innerHTML;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        copyBtn.innerHTML = '<span style="font-size:11px;">Đã copy!</span>';
        setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
      } catch (err) {
        console.error('Không copy được link:', err);
      }
    });
  }

  // ----- BANNER MỜI CAFE & TRÒ CHUYỆN (CHỈ HIỂN THỊ TRÊN MOBILE TRONG BÀI VIẾT TƯ DUY GỐC) -----
  const coffeeBanner = document.createElement('section');
  coffeeBanner.className = 'post-coffee-banner mobile-only-coffee';
  coffeeBanner.style.cssText = 'max-width: 780px; margin: 30px auto 40px; padding: 24px 28px; background: #FAF8F5; border: 1px solid #EAE5D9; border-left: 3px solid #C7A15A; border-radius: 4px;';
  const tuVanUrl = window.location.pathname.includes('/posts/') ? '../tu-van.html' : 'tu-van.html';
  coffeeBanner.innerHTML = `
    <h3 style="font-family: var(--font-heading, serif); font-size: 15px; font-weight: 700; color: #111; margin-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase;">☕ MỜI CAFE & TRÒ CHUYỆN</h3>
    <p style="font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 16px;">
      Một buổi cafe trao đổi trực tiếp về chiến lược, quản trị rủi ro và tháo gỡ khó khăn trong trading.
    </p>
    <a href="${tuVanUrl}" class="btn-dark" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; font-weight: 600; text-decoration: none; padding: 10px 20px; background: #111; color: #fff; border-radius: 2px;">
      <span>ĐĂNG KÝ CAFE VỚI TÔI →</span>
    </a>
  `;
  insertAfter(coffeeBanner);

  // ----- 2. BÀI VIẾT LIÊN QUAN (Tối ưu giữ chân độc giả) -----
  try {
    const dataPath = window.location.pathname.includes('/posts/') ? '../data/posts.json' : 'data/posts.json';
    const res = await fetch(dataPath + '?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Không tải được posts.json: status ${res.status}`);
    const allPosts = await res.json();

    const currentPostData = allPosts.find(p => p.slug === slug);
    const effectiveCategory = (currentPostData && currentPostData.category) || category;

    // Lấy bài cùng chủ đề trước
    let related = allPosts.filter(p => p.category === effectiveCategory && p.slug !== slug);

    // Nếu chưa đủ 3 bài cùng chủ đề, điền bổ sung các bài mới nhất khác để LUÔN ĐỦ 3 BÀI
    if (related.length < 3) {
      const otherPosts = allPosts.filter(p => p.slug !== slug && !related.some(r => r.slug === p.slug));
      related = [...related, ...otherPosts];
    }
    related = related.slice(0, 3);

    if (related.length > 0) {
      const relatedSection = document.createElement('section');
      relatedSection.className = 'related-posts';
      relatedSection.innerHTML = `
        <h3>Bài viết liên quan</h3>
        <div class="related-grid">
          ${related.map(p => {
            const relHref = p.link.startsWith('posts/') ? `../${p.link}` : `../posts/${p.slug}.html`;
            return `
              <a class="related-card" href="${relHref}">
                <div class="related-thumb">
                  <img src="${p.thumb}" alt="${p.title}" loading="lazy" onerror="this.src='https://placehold.co/500x320?text=Nghề+Trading'"/>
                </div>
                <div class="related-meta">
                  <span style="background:#111; color:#fff; padding:2px 6px; border-radius:2px; font-size:10px; font-weight:600; margin-right:6px;">${p.category || 'Nghề trading'}</span>
                  <span>${p.date}</span>
                </div>
                <div class="related-title">${p.title}</div>
              </a>
            `;
          }).join('')}
        </div>
      `;
      insertAfter(relatedSection);
    }
  } catch (err) {
    console.error('Không tải được bài viết liên quan:', err);
  }

  // ----- 3. BÌNH LUẬN (Disqus — hỗ trợ đăng nhập Gmail/Facebook/X) -----
  if (DISQUS_SHORTNAME) {
    const commentSection = document.createElement('section');
    commentSection.className = 'post-comments';
    commentSection.innerHTML = `<h3>Bình luận</h3><p style="font-size: 14px; color: #666; margin-bottom: 20px;">Hãy cho tôi biết bạn nghĩ gì về bài viết?</p><div id="disqus_thread"></div>`;
    insertAfter(commentSection);

    window.disqus_config = function () {
      this.page.url = pageUrl;
      this.page.identifier = slug;
      this.page.title = pageTitle;
      this.language = "vi"; // Thử hiển thị giao diện Disqus bằng tiếng Việt (nếu Disqus hỗ trợ đủ)
    };

    const script = document.createElement('script');
    script.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
    script.setAttribute('data-timestamp', +new Date());
    document.body.appendChild(script);
  }
})();

// ===========================
//  TRANG CHỦ: BÀI VIẾT MỚI NHẤT
//  Tự động lấy 3 bài mới nhất từ data/posts.json — chạy trên MỌI trang có
//  khung #latest-articles-grid (hiện tại là index.html), các trang khác bỏ qua.
// ===========================
(async function initLatestArticles() {
  const grid = document.getElementById('latest-articles-grid');
  if (!grid) return; // không phải trang chủ, bỏ qua

  try {
    const res = await fetch('/data/posts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const allPosts = await res.json();

    // data/posts.json đã được robot sắp xếp bài mới nhất lên đầu sẵn
    const latest = allPosts.slice(0, 3);
    if (latest.length === 0) return;

    grid.innerHTML = latest.map(p => `
      <a class="article-card" href="${p.link}">
        <div class="article-img" style="background-image:url('${p.thumb}'); background-size:cover; background-position:center; background-color:#1a1a1a;"></div>
        <div class="article-meta">
          <span class="tag">${(p.category || '').toUpperCase()}</span>
          <h4>${p.title}</h4>
          <p>${p.excerpt}</p>
          <time>${p.date}</time>
        </div>
      </a>
    `).join('');
  } catch (err) {
    console.error('Không tải được bài viết mới nhất cho trang chủ:', err);
  }
})();
// ===========================
//  BANNER NỔI "MỜI TÔI 1 CỐC CAFE"
//  Chỉ hiện trên trang bài viết chi tiết (posts/*.html), trang danh sách
//  bài viết (bai-viet.html) và trang Hệ Thống (he-thong.html).
//  Hiện sau khi cuộn quá 400px, ở lại luôn đó cho tới khi bị đóng.
// ===========================
(function initFloatingCafeCTA() {
  const isPostPage = !!document.querySelector('.post-body');
  const isArticleListPage = location.pathname.endsWith('bai-viet.html');
  const isSystemPage = location.pathname.endsWith('he-thong.html');
  const isJournalPage = location.pathname.endsWith('nhat-ky.html');
  if (!isPostPage && !isArticleListPage && !isSystemPage && !isJournalPage) return;

  if (sessionStorage.getItem('cafeCtaDismissed') === '1') return;

  const widget = document.createElement('div');
  widget.className = 'floating-cafe-cta';
  const tuVanLink = window.location.pathname.includes('/posts/') ? '../tu-van.html' : 'tu-van.html';
  widget.innerHTML = `
    <a href="${tuVanLink}" class="cafe-body-link">
      <span class="cafe-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
      </span>
      <p class="cafe-desc">Nếu bạn vẫn đang<br>loay hoay với trading,<br><strong>TÔI CÓ THỂ<br>GIÚP BẠN</strong></p>
      <span class="cafe-mobile-text">Mời cafe & Trò chuyện</span>
      <span class="btn-primary cafe-btn">MỜI CAFE &amp;<br>TRÒ CHUYỆN</span>
    </a>
    <button class="cafe-close" aria-label="Đóng">✕</button>
  `;
  document.body.appendChild(widget);

  widget.querySelector('.cafe-close').addEventListener('click', () => {
    widget.classList.remove('visible');
    sessionStorage.setItem('cafeCtaDismissed', '1');
  });

  let shown = false;
  window.addEventListener('scroll', () => {
    if (shown) return;
    if (window.scrollY > 400) {
      widget.classList.add('visible');
      shown = true;
    }
  });
})();

// ===========================
//  FLOATING CHAT CTA (DESKTOP ONLY)
// ===========================
(() => {
  // Hiển thị Telegram Float Widget trên cả Mobile và Desktop

  const widget = document.createElement('div');
  widget.className = 'telegram-float-wrapper';
  widget.innerHTML = `
    <a href="https://t.me/NgheTradingSupport_Bot" target="_blank" rel="noopener noreferrer" class="telegram-float-btn" aria-label="Chat Telegram Bot">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </a>
    <div class="telegram-float-text">Hỗ trợ</div>
  `;
  document.body.appendChild(widget);

  let shown = false;
  window.addEventListener('scroll', () => {
    if (shown) return;
    if (window.scrollY > 400) {
      widget.classList.add('visible');
      shown = true;
    }
  });
})();

// ===========================
//  CẬP NHẬT GIÁ VÀNG VRTL BẢO TÍN MINH CHÂU
// ===========================
(function initBtmcGoldPrice() {
  const priceElem = document.getElementById('btmc-vrtl-price');
  if (!priceElem) return;

  fetch('https://api.vnappmob.com/api/v2/gold/btmc')
    .then(res => res.json())
    .then(data => {
      if (data && data.results && Array.isArray(data.results)) {
        const vrtl = data.results.find(item => item.name && (item.name.includes('VRTL') || item.name.includes('Vàng Rồng Thăng Long')));
        if (vrtl && vrtl.sell) {
          priceElem.textContent = `${vrtl.sell} triệu/lượng`;
        }
      }
    })
    .catch(() => {
      // Giữ mức giá hiển thị chuẩn nếu không có kết nối API bên thứ ba
    });
})();

