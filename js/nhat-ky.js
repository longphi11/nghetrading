/* ==========================================================================
   NHẬT KÝ GIAO DỊCH — logic dùng chung cho nhat-ky.html và phan-tich.html
   Dữ liệu lấy từ data/journal.json (chạy được khi deploy qua server/Vercel;
   nếu mở trực tiếp file://  trên máy, hãy chạy qua local server, ví dụ:
   `npx serve .`  hoặc extension "Live Server" trên VS Code — trình duyệt
   chặn fetch() với file JSON khi mở trực tiếp bằng file://).
   ========================================================================== */

const TAG_LABEL = { bitcoin: 'Bitcoin', vang: 'Vàng' };
const PER_PAGE = 6;

let journalState = {
  posts: [],
  tag: 'all',
  page: 1
};

async function loadJournal() {
  const res = await fetch('data/journal.json');
  const posts = await res.json();
  // Mới nhất lên đầu
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ---------------- Trang danh sách (nhat-ky.html) ---------------- */

function initJournalList(posts) {
  journalState.posts = posts;
  renderTagCounts();
  bindTagButtons();
  renderJournal();
}

function renderTagCounts() {
  const all = journalState.posts.length;
  const btc = journalState.posts.filter(p => p.tag === 'bitcoin').length;
  const vang = journalState.posts.filter(p => p.tag === 'vang').length;
  document.getElementById('count-all').textContent = all;
  document.getElementById('count-bitcoin').textContent = btc;
  document.getElementById('count-vang').textContent = vang;
}

function bindTagButtons() {
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      journalState.tag = btn.dataset.tag;
      journalState.page = 1;
      renderJournal();
    });
  });
}

function getFilteredPosts() {
  if (journalState.tag === 'all') return journalState.posts;
  return journalState.posts.filter(p => p.tag === journalState.tag);
}

function renderJournal() {
  const filtered = getFilteredPosts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  journalState.page = Math.min(journalState.page, totalPages);

  const start = (journalState.page - 1) * PER_PAGE;
  const pagePosts = filtered.slice(start, start + PER_PAGE);

  // Label + count
  const labelEl = document.getElementById('activeFilterLabel');
  labelEl.textContent = journalState.tag === 'all'
    ? 'Tất cả bài viết'
    : TAG_LABEL[journalState.tag];
  document.getElementById('resultCount').textContent = `${filtered.length} bài viết`;

  // Grid
  const grid = document.getElementById('journalGrid');
  grid.innerHTML = '';

  if (pagePosts.length === 0) {
    grid.innerHTML = '<p class="journal-empty">Chưa có bài viết nào trong chủ đề này.</p>';
  } else {
    pagePosts.forEach(post => grid.appendChild(renderCard(post)));
  }

  renderPagination(totalPages);
}

function renderCard(post) {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.innerHTML = `
    <a href="phan-tich.html?id=${encodeURIComponent(post.id)}" class="post-card-link">
      <div class="post-card-image"><img src="${post.cover_image}" alt="${post.title}" loading="lazy"></div>
      <div class="post-card-meta">
        <span class="entry-no">${String(post.entry_no).padStart(3, '0')}</span>
        <span class="post-tag tag-${post.tag}">${post.ticker}</span>
        <span class="post-date">${formatDate(post.date)}</span>
      </div>
      <h3 class="post-title">${post.title}</h3>
      <p class="post-excerpt">${post.excerpt}</p>
      <span class="read-more">Đọc phân tích →</span>
    </a>`;
  return article;
}

function renderPagination(totalPages) {
  const nav = document.getElementById('pagination');
  nav.innerHTML = '';
  if (totalPages <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (opts.active) btn.classList.add('active');
    if (opts.disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      journalState.page = page;
      renderJournal();
      document.querySelector('.journal-toolbar').scrollIntoView({ behavior: 'smooth' });
    });
    return btn;
  };

  nav.appendChild(makeBtn('‹', journalState.page - 1, { disabled: journalState.page === 1 }));

  for (let i = 1; i <= totalPages; i++) {
    nav.appendChild(makeBtn(String(i), i, { active: i === journalState.page }));
  }

  nav.appendChild(makeBtn('›', journalState.page + 1, { disabled: journalState.page === totalPages }));
}

/* ---------------- Trang chi tiết (phan-tich.html) ---------------- */

function initPostDetail(posts) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const post = posts.find(p => p.id === id);
  const container = document.getElementById('postContent');

  if (!post) {
    container.innerHTML = `
      <p style="font-family:var(--nk-font-body); color:var(--nk-ink-soft);">
        Không tìm thấy bài viết này. <a href="nhat-ky.html">Quay lại Nhật Ký Giao Dịch</a>.
      </p>`;
    return;
  }

  document.title = `${post.title} – Nghề Trading`;
  document.getElementById('pageDescription').setAttribute('content', post.excerpt);

  container.innerHTML = `
    <header class="post-detail-header">
      <div class="post-detail-meta">
        <span class="entry-no">${String(post.entry_no).padStart(3, '0')}</span>
        <span class="post-tag tag-${post.tag}">${post.ticker}</span>
        <span class="post-date">${formatDate(post.date)}</span>
      </div>
      <h1 class="post-detail-title">${post.title}</h1>
    </header>
    <div class="tv-embed-wrap" id="tvEmbedWrap"></div>
    ${post.note_html ? `<div class="post-detail-body">${post.note_html}</div>` : ''}
    <p class="post-detail-source">Ý tưởng gốc được đăng trên TradingView, hiển thị trực tiếp tại Nghề Trading.</p>
  `;

  // Chèn mã embed TradingView và đảm bảo các thẻ <script> bên trong được thực thi
  // (gán qua innerHTML thì trình duyệt sẽ KHÔNG tự chạy script, nên phải tạo lại thủ công)
  injectEmbedHtml(document.getElementById('tvEmbedWrap'), post.embed_snippet || '');

  renderRelated(posts, post);
}

function injectEmbedHtml(container, html) {
  if (!container || !html) return;
  const temp = document.createElement('div');
  temp.innerHTML = html;

  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
      const script = document.createElement('script');
      Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
      script.text = node.textContent;
      container.appendChild(script);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });

  // Nếu embed có <script> nằm lồng bên trong 1 thẻ khác, thay thế để trình duyệt thực thi
  container.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    newScript.text = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

function renderRelated(posts, current) {
  const related = posts
    .filter(p => p.tag === current.tag && p.id !== current.id)
    .slice(0, 3);

  if (related.length === 0) return;

  document.getElementById('relatedSection').hidden = false;
  const grid = document.getElementById('relatedGrid');
  grid.innerHTML = '';
  related.forEach(post => grid.appendChild(renderCard(post)));
}

/* ---------------- Khởi chạy ---------------- */

document.addEventListener('DOMContentLoaded', async () => {
  const posts = await loadJournal();

  if (document.getElementById('journalGrid')) {
    initJournalList(posts);
  }
  if (document.getElementById('postContent')) {
    initPostDetail(posts);
  }
});
