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
//  (Bài liên quan + Chia sẻ mạng xã hội + Bình luận Native Seeding & Không cần đăng nhập)
//  Tự động chạy trên MỌI trang trong thư mục posts/ — kể cả bài cũ đã tạo từ trước,
//  không cần chạy lại robot đồng bộ Substack.
// ===========================

(async function initPostPageExtras() {
  const postBody = document.querySelector('.post-body');
  const metaEl = document.querySelector('.post-header .meta');
  const sourceNote = document.querySelector('.post-source-note');

  // Không phải trang bài viết (posts/*.html) thì bỏ qua, không chạy gì cả
  if (!postBody || !metaEl || !sourceNote) return;

  const metaParts = (metaEl.textContent || '').split('•');
  const category = metaParts.length > 1 ? metaParts[1].trim() : '';
  let effectiveCategory = category;
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

    // Nếu chưa đủ 6 bài cùng chủ đề, điền bổ sung các bài mới nhất khác để LUÔN ĐỦ 6 BÀI
    if (related.length < 6) {
      const otherPosts = allPosts.filter(p => p.slug !== slug && !related.some(r => r.slug === p.slug));
      related = [...related, ...otherPosts];
    }
    related = related.slice(0, 6);

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

  // ----- 3. HỆ THỐNG BÌNH LUẬN NATIVE (Không cần đăng nhập, tức thì, bảo mật) -----
  try {
    const commentsDataPath = window.location.pathname.includes('/posts/') ? '../data/comments.json' : 'data/comments.json';
    let commentsData = { general_pool: [], category_pools: {} };
    try {
      const cRes = await fetch(commentsDataPath + '?v=' + Date.now(), { cache: 'no-store' });
      if (cRes.ok) commentsData = await cRes.json();
    } catch (e) {
      console.warn('Không tải được comments.json:', e);
    }

    // Lấy seed comments: Ưu tiên tuyệt đối theo slug riêng của bài viết, sau đó mới đến category hoặc pool chung
    let seedingComments = [];
    if (commentsData.by_slug && Array.isArray(commentsData.by_slug[slug]) && commentsData.by_slug[slug].length > 0) {
      seedingComments = commentsData.by_slug[slug].slice(0, 5);
    } else if (commentsData.category_pools && commentsData.category_pools[effectiveCategory]) {
      seedingComments = commentsData.category_pools[effectiveCategory];
    } else {
      const pool = commentsData.general_pool || [];
      if (pool.length > 0) {
        let hash = 0;
        for (let i = 0; i < slug.length; i++) hash = (hash << 5) - hash + slug.charCodeAt(i);
        const startIndex = Math.abs(hash) % pool.length;
        seedingComments = [
          pool[startIndex],
          pool[(startIndex + 1) % pool.length],
          pool[(startIndex + 2) % pool.length]
        ].filter(Boolean);
      }
    }

    // Lấy local comments của người dùng cho bài viết này
    const localCommentsKey = `nt_comments_${slug}`;
    let userComments = [];
    try {
      userComments = JSON.parse(localStorage.getItem(localCommentsKey) || '[]');
    } catch (e) {
      userComments = [];
    }

    let allComments = [...userComments, ...seedingComments];

    const commentSection = document.createElement('section');
    commentSection.className = 'post-comments';

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function renderCommentItem(c) {
      const initial = (c.name || 'U').trim().charAt(0).toUpperCase();
      const avatarBg = c.avatar_color || '#1e3a8a';
      const replyHtml = c.reply ? `
        <div class="comment-reply">
          <div class="reply-header">
            <span class="author-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              ${escapeHtml(c.reply.author || 'Nghề Trading')}
            </span>
            <span class="reply-date">${escapeHtml(c.reply.date || '')}</span>
          </div>
          <div class="reply-text">${escapeHtml(c.reply.content || '')}</div>
        </div>
      ` : '';

      return `
        <div class="comment-item" id="${c.id || ''}">
          <div class="comment-header">
            <div class="comment-avatar" style="background-color: ${avatarColor(avatarBg)};">${initial}</div>
            <div class="comment-user-info">
              <div class="comment-name">${escapeHtml(c.name || 'Độc giả')}</div>
              <div class="comment-date">${escapeHtml(c.date || 'Gần đây')}</div>
            </div>
          </div>
          <div class="comment-text">${escapeHtml(c.content || '').replace(/\n/g, '<br>')}</div>
          ${replyHtml}
        </div>
      `;
    }

    function avatarColor(color) {
      return color && color.startsWith('#') ? color : '#1e3a8a';
    }

    commentSection.innerHTML = `
      <h3 id="comments-title">Bình luận (<span id="comments-count">${allComments.length}</span>)</h3>
      <p class="comments-sub">Chia sẻ góc nhìn hoặc đặt câu hỏi cùng cộng đồng Nghề Trading. Bình luận của bạn sẽ được hiển thị ngay.</p>
      
      <div class="comments-list" id="comments-list">
        ${allComments.map(renderCommentItem).join('')}
      </div>

      <div class="comment-form-card">
        <h4>Để lại bình luận</h4>
        <p>Không cần đăng nhập tài khoản. Tôn trọng quan điểm và cùng nhau tiến bộ.</p>
        <div class="comment-alert" id="comment-alert"></div>
        <form id="native-comment-form" class="comment-form-grid">
          <div>
            <input type="text" id="comment-author" class="comment-input" placeholder="Họ và tên hoặc biệt danh của bạn..." required maxlength="50" autocomplete="name" />
          </div>
          <div>
            <textarea id="comment-content" class="comment-textarea" rows="3" placeholder="Chia sẻ suy nghĩ, câu hỏi hoặc trải nghiệm của bạn về bài viết..." required maxlength="1000"></textarea>
          </div>
          <div class="comment-form-footer">
            <span class="comment-notice">⚡ Bình luận sẽ xuất hiện ngay sau khi gửi</span>
            <button type="submit" id="comment-submit-btn" class="comment-submit-btn">
              <span>Gửi bình luận</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    insertAfter(commentSection);

    // Xử lý gửi bình luận
    const commentForm = commentSection.querySelector('#native-comment-form');
    const authorInput = commentSection.querySelector('#comment-author');
    const contentInput = commentSection.querySelector('#comment-content');
    const submitBtn = commentSection.querySelector('#comment-submit-btn');
    const alertBox = commentSection.querySelector('#comment-alert');
    const commentsListEl = commentSection.querySelector('#comments-list');
    const commentsCountEl = commentSection.querySelector('#comments-count');

    // Tự động điền tên từ localStorage nếu đã từng comment
    const savedName = localStorage.getItem('nt_comment_author_name');
    if (savedName && authorInput) authorInput.value = savedName;

    if (commentForm) {
      commentForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const author = (authorInput.value || '').trim();
        const content = (contentInput.value || '').trim();

        if (!author || author.length < 2) {
          alert('Vui lòng nhập tên của bạn (tối thiểu 2 ký tự).');
          authorInput.focus();
          return;
        }
        if (!content || content.length < 3) {
          alert('Nội dung bình luận quá ngắn (tối thiểu 3 ký tự).');
          contentInput.focus();
          return;
        }

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';

        // Chọn màu avatar từ danh sách màu sang trọng
        const colors = ['#1e3a8a', '#065f46', '#7c2d12', '#4c1d95', '#831843', '#0f766e', '#b45309', '#374151'];
        let colorHash = 0;
        for (let i = 0; i < author.length; i++) colorHash = (colorHash << 5) - colorHash + author.charCodeAt(i);
        const avatarCol = colors[Math.abs(colorHash) % colors.length];

        const newComment = {
          id: 'nt_' + Date.now(),
          name: author,
          avatar_color: avatarCol,
          date: 'Vừa xong',
          content: content,
          reply: null
        };

        // Lưu vào localStorage
        userComments.unshift(newComment);
        try {
          localStorage.setItem(localCommentsKey, JSON.stringify(userComments));
          localStorage.setItem('nt_comment_author_name', author);
        } catch (err) {}

        // Render lên DOM ngay lập tức
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderCommentItem(newComment);
        if (commentsListEl.firstChild) {
          commentsListEl.insertBefore(tempDiv.firstElementChild, commentsListEl.firstChild);
        } else {
          commentsListEl.appendChild(tempDiv.firstElementChild);
        }

        // Cập nhật số lượng
        allComments.unshift(newComment);
        if (commentsCountEl) commentsCountEl.textContent = allComments.length;

        // Reset ô nhập và báo thành công
        contentInput.value = '';
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = '✓ Cảm ơn bạn! Bình luận đã được đăng thành công.';
          setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
        }

        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';

        // Gửi thông báo tới Telegram của ĐẠI KA & Nhóm Hội Đồng Quản Trị (chạy ngầm không ảnh hưởng UX)
        try {
          const tgToken = '8762904355:AAHStauxcLI-iceQX_OSvu99rQZaE-qYXgY';
          const targetChatIds = ['488901419', '-1004401199553'];
          const tgMsg = `💬 BÌNH LUẬN MỚI TRÊN NGHỀ TRADING\n\n📌 Bài viết: ${pageTitle}\n🔗 Link: ${pageUrl}\n👤 Người gửi: ${author}\n📝 Nội dung:\n"${content}"\n\n⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;
          targetChatIds.forEach(cid => {
            const payload = { chat_id: cid, text: tgMsg };
            if (cid === '-1004401199553') payload.message_thread_id = 22;
            fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(() => {});
          });
        } catch (tgErr) {}
      });
    }
  } catch (commentErr) {
    console.error('Lỗi khởi tạo bình luận:', commentErr);
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
//  TRANG CHỦ: BẢNG LỆNH GIAO DỊCH THỰC TẾ
//  Render động từ data/trades.json — chỉ chạy trên index.html (có #trades-tbody)
// ===========================
(async function initTradesTable() {
  const tbody = document.getElementById('trades-tbody');
  if (!tbody) return;

  function fmtDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function resultBadge(trade) {
    if (trade.result === 'pending') {
      return `<span class="result pending">Đang chờ</span>`;
    }
    if (trade.result === 'win') return `<span class="result win">Thắng</span>`;
    if (trade.result === 'loss') return `<span class="result loss">Thua</span>`;
    if (trade.result === 'be') return `<span class="result be">Hòa</span>`;
    return `<span class="result pending">—</span>`;
  }

  function pnlText(trade) {
    if (trade.result === 'pending') return `<span style="color:#aaa;">—</span>`;
    const cls = trade.result === 'win' ? 'color:#27ae60;font-weight:600;'
              : trade.result === 'loss' ? 'color:#e74c3c;font-weight:600;'
              : 'color:#888;';
    return `<span style="${cls}">${trade.pnl_r || '0R'}</span>`;
  }

  function directionBadge(dir) {
    const isLong = dir === 'LONG';
    return `<span style="font-size:11px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:2px;background:${isLong ? '#e8f5e9' : '#fdecea'};color:${isLong ? '#27ae60' : '#e74c3c'};">${dir}</span>`;
  }

  try {
    const res = await fetch('/data/trades.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const trades = await res.json();

    trades.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = trades.slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px;">Chưa có lệnh nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map((t, i) => `
      <tr style="cursor:pointer;" onclick="window.location='nhat-ky.html?tab=lenh&id=${encodeURIComponent(t.id)}'" title="Xem chi tiết lệnh">
        <td style="color:#aaa;font-size:12px;">#${String(trades.indexOf(t) + 1).padStart(3,'0')}</td>
        <td><strong>${t.pair}</strong></td>
        <td>${directionBadge(t.direction)}</td>
        <td>${resultBadge(t)}</td>
        <td>${pnlText(t)}</td>
        <td style="color:#888;font-size:12px;">${fmtDate(t.date)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px;">Không tải được dữ liệu.</td></tr>`;
    console.error('Không tải được trades.json:', err);
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
    <a href="https://t.me/longphibtc" target="_blank" rel="noopener noreferrer" class="telegram-float-btn" aria-label="Chat Telegram Bot">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </a>
    <a href="https://t.me/longphibtc" target="_blank" rel="noopener noreferrer" class="telegram-float-text" style="text-decoration:none; cursor:pointer;">
      <span class="line-1">Tâm Sự</span>
      <span class="line-2">Trading</span>
    </a>
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

