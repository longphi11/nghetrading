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

// (Đã bỏ đoạn xử lý form đăng ký giả — ô "ĐĂNG KÝ NHẬN BÀI VIẾT" giờ dùng iframe
// đăng ký thật của Substack, Substack tự xử lý toàn bộ phần lưu email và gửi mail.)

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

  // ----- 2. BÀI VIẾT LIÊN QUAN (cùng chủ đề) -----
  try {
    const res = await fetch('/data/posts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Không tải được posts.json: status ${res.status}`);
    const allPosts = await res.json();

    // Ưu tiên lấy category của chính bài đang xem từ dữ liệu JSON (chính xác hơn đọc chữ trên trang,
    // vì trang tĩnh có thể chưa cập nhật category mới nhất nếu bạn vừa đổi trong category-overrides.json)
    const currentPostData = allPosts.find(p => p.slug === slug);
    const effectiveCategory = (currentPostData && currentPostData.category) || category;

    const related = allPosts
      .filter(p => p.category === effectiveCategory && p.slug !== slug)
      .slice(0, 3);

    console.log(`[Bài liên quan] slug hiện tại: "${slug}", chủ đề: "${effectiveCategory}", tìm thấy ${related.length} bài liên quan.`);

    if (related.length > 0) {
      const relatedSection = document.createElement('section');
      relatedSection.className = 'related-posts';
      relatedSection.innerHTML = `
        <h3>Bài viết liên quan</h3>
        <div class="related-grid">
          ${related.map(p => `
            <a class="related-card" href="/${p.link}">
              <div class="related-thumb">
                <img src="${p.thumb}" alt="${p.title}" onerror="this.src='https://placehold.co/500x320?text=Nghề+Trading'"/>
              </div>
              <div class="related-meta">${p.date}</div>
              <div class="related-title">${p.title}</div>
            </a>
          `).join('')}
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
    commentSection.innerHTML = `<h3>Bình luận</h3><div id="disqus_thread"></div>`;
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
  widget.innerHTML = `
    <button class="cafe-close" aria-label="Đóng">✕</button>
    <span class="cafe-icon">☕</span>
    <p>Mời tôi 1 cốc cafe, cùng trao đổi chiến lược trading 1-1</p>
    <a href="tu-van.html" class="btn-primary">MỜI CAFE NGAY</a>
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
