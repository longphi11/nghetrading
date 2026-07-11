// ===========================================================
//  NGHỀ TRADING – nhat-ky.js
//  Dùng chung cho nhat-ky.html (danh sách) và phan-tich.html (chi tiết)
//  Dữ liệu lấy từ data/journal.json
// ===========================================================

const TAG_LABEL = { bitcoin: 'Bitcoin', vang: 'Vàng' };
const PER_PAGE = 6;

let allJournalPosts = [];
let activeTag = 'Tất cả';
let currentPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data/journal.json', { cache: 'no-store' });
    allJournalPosts = await res.json();
    allJournalPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Không tải được data/journal.json:', err);
    allJournalPosts = [];
  }

  if (document.getElementById('journal-grid')) {
    renderTagFilter();
    renderPage(currentPage);
  }
  if (document.getElementById('pt-content-header')) {
    initPostDetail();
  }
});

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ---------------- Trang danh sách (nhat-ky.html) ---------------- */

function renderTagFilter() {
  const filterBar = document.getElementById('category-filter');
  if (!filterBar) return;

  const tags = ['Tất cả', 'Bitcoin', 'Vàng'];
  filterBar.innerHTML = tags.map(label => {
    const count = label === 'Tất cả'
      ? allJournalPosts.length
      : allJournalPosts.filter(p => TAG_LABEL[p.tag] === label).length;
    return `
      <button class="${label === activeTag ? 'active' : ''}" onclick="setJournalTag('${label}')">
        <span>${label}</span>
        <span class="count">${count}</span>
      </button>
    `;
  }).join('');
}

function setJournalTag(label) {
  activeTag = label;
  currentPage = 1;
  renderTagFilter();
  renderPage(currentPage);
}

function getFilteredJournalPosts() {
  if (activeTag === 'Tất cả') return allJournalPosts;
  return allJournalPosts.filter(p => TAG_LABEL[p.tag] === activeTag);
}

function renderPage(page) {
  const grid = document.getElementById('journal-grid');
  if (!grid) return;

  const filtered = getFilteredJournalPosts();

  if (filtered.length === 0) {
    const msg = allJournalPosts.length === 0
      ? 'Chưa có bài phân tích nào.'
      : `Chưa có bài nào trong chủ đề "${activeTag}".`;
    grid.innerHTML = `<div class="journal-empty">${msg}</div>`;
    return;
  }

  const startIndex = (page - 1) * PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + PER_PAGE);

  let html = paginated.map(post => `
    <article class="journal-card">
      <div class="journal-thumb">
        <a href="phan-tich.html?id=${encodeURIComponent(post.id)}">
          <img src="${post.cover_image}" alt="${post.title}" onerror="this.src='https://placehold.co/600x400?text=Nghề+Trading'"/>
        </a>
      </div>
      <div class="meta">${formatDate(post.date)} • ${TAG_LABEL[post.tag]}</div>
      <h2><a href="phan-tich.html?id=${encodeURIComponent(post.id)}">${post.title}</a></h2>
      <p>${post.excerpt}</p>
      <a href="phan-tich.html?id=${encodeURIComponent(post.id)}" class="read-more">Đọc phân tích →</a>
    </article>
  `).join('');

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (totalPages > 1) {
    let paginationHtml = `<div class="pagination" style="grid-column: 1/-1; text-align: center; margin-top: 50px; display: flex; flex-direction: column; align-items: center; gap: 12px;">`;
    paginationHtml += `<div style="font-size: 12px; color: #999;">Trang ${page} / ${totalPages} • ${filtered.length} bài viết</div>`;
    paginationHtml += `<div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">`;
    paginationHtml += `<button onclick="changeJournalPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>← Trước</button>`;

    getPageNumbers(page, totalPages).forEach(item => {
      if (item === '...') {
        paginationHtml += `<span style="padding: 8px 4px; color: #ccc;">…</span>`;
      } else {
        paginationHtml += `<button onclick="changeJournalPage(${item})" class="${item === page ? 'active' : ''}">${item}</button>`;
      }
    });

    paginationHtml += `<button onclick="changeJournalPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Sau →</button>`;
    paginationHtml += `</div></div>`;

    html += paginationHtml;
  }

  grid.innerHTML = html;
  window.scrollTo({ top: document.querySelector('.page-header').offsetTop, behavior: 'smooth' });
}

function getPageNumbers(current, total) {
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
  const result = [1];
  if (range[0] > 2) result.push('...');
  result.push(...range);
  if (range[range.length - 1] < total - 1) result.push('...');
  if (total > 1) result.push(total);
  return [...new Set(result)];
}

function changeJournalPage(page) {
  const totalPages = Math.ceil(getFilteredJournalPosts().length / PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage(currentPage);
}

/* ---------------- Trang chi tiết (phan-tich.html) ---------------- */

function initPostDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const post = allJournalPosts.find(p => p.id === id);

  const headerEl = document.getElementById('pt-content-header');
  const embedContainer = document.getElementById('pt-embed-container');
  const bodyContainer = document.getElementById('pt-body-container');
  const shareContainer = document.getElementById('pt-share-container');

  if (!post) {
    headerEl.innerHTML = `<p style="font-family:var(--font-body); color:var(--muted); font-size:14px;">Không tìm thấy bài viết này. <a href="nhat-ky.html" style="text-decoration:underline;">Quay lại Nhật Ký Giao Dịch</a>.</p>`;
    return;
  }

  document.title = `${post.title} – Nghề Trading`;
  document.getElementById('pageDescription').setAttribute('content', post.excerpt);

  headerEl.innerHTML = `
    <div class="pt-meta">${formatDate(post.date)} • ${TAG_LABEL[post.tag]}</div>
    <h1 class="pt-title">${post.title}</h1>
  `;

  embedContainer.innerHTML = `<div class="pt-embed-wrap" id="tvEmbedWrap"></div>`;
  injectEmbedHtml(document.getElementById('tvEmbedWrap'), post.embed_snippet || '');

  if (post.note_html) {
    bodyContainer.innerHTML = `<div class="pt-body">${post.note_html}</div>`;
  }

  shareContainer.innerHTML = buildShareHtml(post);
  bindShareCopyButton();

  renderRelated(post);
}

function buildShareHtml(post) {
  const pageUrl = window.location.href;
  const pageTitle = post.title;
  return `
    <div class="post-share">
      <span class="post-share-label">Chia sẻ bài viết</span>
      <div class="post-share-buttons">
        <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Facebook" title="Facebook">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95Z"/></svg>
        </a>
        <a class="share-btn" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên X (Twitter)" title="X (Twitter)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.6 22H1.5l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"/></svg>
        </a>
        <a class="share-btn" href="https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ lên Telegram" title="Telegram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.02c-.12.56-.46.7-.93.43l-2.57-1.89-1.24 1.19c-.14.14-.25.25-.51.25l.18-2.61 4.7-4.25c.2-.18-.04-.28-.32-.1L7.38 15.3l-2.52-.79c-.55-.17-.56-.55.12-.81l9.85-3.8c.45-.17.85.11.81.1z"/></svg>
        </a>
        <button class="share-btn share-copy" type="button" aria-label="Copy đường dẫn" title="Copy link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
  `;
}

function bindShareCopyButton() {
  const copyBtn = document.querySelector('.share-copy');
  if (!copyBtn) return;
  const originalHTML = copyBtn.innerHTML;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyBtn.innerHTML = '<span style="font-size:11px;">Đã copy!</span>';
      setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
    } catch (err) {
      console.error('Không copy được link:', err);
    }
  });
}

function renderRelated(current) {
  const related = allJournalPosts
    .filter(p => p.tag === current.tag && p.id !== current.id)
    .slice(0, 3);

  if (related.length === 0) return;

  document.getElementById('relatedSection').hidden = false;
  document.getElementById('relatedGrid').innerHTML = related.map(p => `
    <a class="related-card" href="phan-tich.html?id=${encodeURIComponent(p.id)}">
      <div class="related-thumb">
        <img src="${p.cover_image}" alt="${p.title}" onerror="this.src='https://placehold.co/500x320?text=Nghề+Trading'"/>
      </div>
      <div class="related-meta">${formatDate(p.date)}</div>
      <div class="related-title">${p.title}</div>
    </a>
  `).join('');
}

// Chèn mã Embed TradingView và đảm bảo thẻ <script> bên trong được thực thi
// (gán qua innerHTML thì trình duyệt KHÔNG tự chạy script, phải tạo lại thủ công)
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

  container.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    newScript.text = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}
