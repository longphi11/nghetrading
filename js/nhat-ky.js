// ===========================================================
//  NGHỀ TRADING – nhat-ky.js
//  nhat-ky.html: Tab lọc (Tất cả / Phân tích / Lệnh đã vào)
//  phan-tich.html: Chi tiết bài phân tích
//  Dữ liệu: data/journal.json (phân tích) + data/trades.json (lệnh)
// ===========================================================

const TAG_LABEL = { bitcoin: 'Bitcoin', vang: 'Vàng' };
const PER_PAGE = 6;

let allJournalPosts = [];
let allTrades = [];
let activeTag = 'Tất cả';
let currentPage = 1;

// Tab đang active: 'all' | 'analysis' | 'lenh'
let activeNkTab = 'all';

// ID lệnh đang xem chi tiết (nếu có)
let activeTradeId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Đọc URL params
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const idParam = params.get('id');

  activeNkTab = (tabParam === 'lenh') ? 'lenh' : 'analysis';
  if (idParam) activeTradeId = idParam;

  // Load dữ liệu song song
  await Promise.all([loadJournalPosts(), loadTrades()]);

  // Trang danh sách
  if (document.getElementById('journal-grid')) {
    renderTabBar();
    applyTab();
  }

  // Trang chi tiết phân tích
  if (document.getElementById('pt-content-header')) {
    initPostDetail();
  }
});

async function loadJournalPosts() {
  try {
    const res = await fetch('data/journal.json?v=' + Date.now(), { cache: 'no-store' });
    allJournalPosts = await res.json();
    allJournalPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Không tải được data/journal.json:', err);
    allJournalPosts = [];
  }
}

async function loadTrades() {
  try {
    const res = await fetch('data/trades.json?v=' + Date.now(), { cache: 'no-store' });
    allTrades = await res.json();
    allTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.error('Không tải được data/trades.json:', err);
    allTrades = [];
  }
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ============================================================
   TAB BAR
   ============================================================ */

function renderTabBar() {
  const bar = document.getElementById('nk-tab-bar');
  if (!bar) return;
  bar.querySelectorAll('.nk-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeNkTab);
  });
}

function setNkTab(tab) {
  activeNkTab = tab;
  activeTradeId = null;
  activeTag = 'Tất cả';
  currentPage = 1;
  // Cập nhật URL param không reload
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  url.searchParams.delete('id');
  window.history.replaceState({}, '', url);
  renderTabBar();
  applyTab();
}

function applyTab() {
  const journalGrid = document.getElementById('journal-grid');
  const tradesGrid = document.getElementById('trades-grid');
  const tradeDetail = document.getElementById('trade-detail');
  const catBox = document.getElementById('category-sidebar-box');

  if (activeNkTab === 'lenh') {
    journalGrid.style.display = 'none';
    if (catBox) catBox.style.display = 'none';
    if (activeTradeId) {
      tradesGrid.style.display = 'none';
      tradeDetail.style.display = 'block';
      renderTradeDetail(activeTradeId);
    } else {
      tradesGrid.style.display = 'block';
      tradeDetail.style.display = 'none';
      renderTradesGrid();
    }
  } else {
    // Tab 'analysis'
    journalGrid.style.display = '';
    tradesGrid.style.display = 'none';
    tradeDetail.style.display = 'none';
    if (catBox) catBox.style.display = '';
    renderTagFilter();
    renderPage(currentPage);
  }
}

/* ============================================================
   TAB PHÂN TÍCH (journal-grid)
   ============================================================ */

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

/* ============================================================
   TAB LỆNH ĐÃ VÀO (trades-grid)
   ============================================================ */

function resultBadge(trade) {
  if (trade.result === 'pending') return `<span class="result pending">Đang chờ</span>`;
  if (trade.result === 'win') return `<span class="result win">Thắng</span>`;
  if (trade.result === 'loss') return `<span class="result loss">Thua</span>`;
  if (trade.result === 'be') return `<span class="result be">Hòa</span>`;
  return `<span class="result pending">—</span>`;
}

function directionBadge(dir) {
  const isLong = dir === 'LONG';
  return `<span class="trade-dir ${isLong ? 'long' : 'short'}">${dir}</span>`;
}

function pnlText(trade) {
  if (trade.result === 'pending') return `<span class="trade-pnl neutral">Chờ kết quả</span>`;
  const cls = trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'neutral';
  return `<span class="trade-pnl ${cls}">${trade.pnl_r || '0R'}</span>`;
}

function renderTradesGrid() {
  const grid = document.getElementById('trades-grid');
  if (!grid) return;

  if (allTrades.length === 0) {
    grid.innerHTML = `<div class="journal-empty">Chưa có lệnh nào được ghi lại.</div>`;
    return;
  }

  // Stats summary
  const completed = allTrades.filter(t => t.result !== 'pending');
  const wins = completed.filter(t => t.result === 'win').length;
  const losses = completed.filter(t => t.result === 'loss').length;
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;

  grid.innerHTML = `
    <div class="trades-stats-bar">
      <div class="trades-stat">
        <span class="trades-stat-label">Tổng lệnh</span>
        <span class="trades-stat-value">${allTrades.length}</span>
      </div>
      <div class="trades-stat">
        <span class="trades-stat-label">Thắng</span>
        <span class="trades-stat-value" style="color:#27ae60">${wins}</span>
      </div>
      <div class="trades-stat">
        <span class="trades-stat-label">Thua</span>
        <span class="trades-stat-value" style="color:#e74c3c">${losses}</span>
      </div>
      <div class="trades-stat">
        <span class="trades-stat-label">Win rate</span>
        <span class="trades-stat-value">${winRate}%</span>
      </div>
    </div>

    <div class="trades-list">
      ${allTrades.map((t, i) => `
        <article class="trade-card" onclick="openTradeDetail('${t.id}')" role="button" tabindex="0">
          <div class="trade-card-img">
            <img src="${t.chart_image}" alt="Chart ${t.pair}" onerror="this.src='https://placehold.co/600x400?text=Chart'"/>
            ${directionBadge(t.direction)}
          </div>
          <div class="trade-card-body">
            <div class="trade-card-meta">${formatDate(t.date)} • ${t.pair}</div>
            <div class="trade-card-stats">
              <div class="trade-stat-row">
                <span>Entry</span><strong>${t.entry}</strong>
              </div>
              <div class="trade-stat-row">
                <span>SL</span><strong style="color:#e74c3c">${t.sl}</strong>
              </div>
              <div class="trade-stat-row">
                <span>TP</span><strong style="color:#27ae60">${t.tp}</strong>
              </div>
              <div class="trade-stat-row">
                <span>RR mục tiêu</span><strong>1:${t.rr_target}</strong>
              </div>
            </div>
            <div class="trade-card-footer">
              ${resultBadge(t)}
              ${pnlText(t)}
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function openTradeDetail(id) {
  activeTradeId = id;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'lenh');
  url.searchParams.set('id', id);
  window.history.pushState({}, '', url);

  const journalGrid = document.getElementById('journal-grid');
  const tradesGrid = document.getElementById('trades-grid');
  const tradeDetail = document.getElementById('trade-detail');

  journalGrid.style.display = 'none';
  tradesGrid.style.display = 'none';
  tradeDetail.style.display = 'block';
  renderTradeDetail(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTradeDetail(id) {
  const tradeDetail = document.getElementById('trade-detail');
  const t = allTrades.find(t => t.id === id);

  if (!t) {
    tradeDetail.innerHTML = `<div class="journal-empty">Không tìm thấy lệnh này. <a href="nhat-ky.html?tab=lenh" style="text-decoration:underline;">Quay lại</a></div>`;
    return;
  }

  tradeDetail.innerHTML = `
    <div class="trade-detail-wrap">
      <a href="nhat-ky.html?tab=lenh" class="trade-detail-back" onclick="handleBackToList(event)">← Quay lại danh sách lệnh</a>

      <div class="trade-detail-header">
        <div class="trade-detail-meta">${formatDate(t.date)} • ${t.pair}</div>
        <div class="trade-detail-title">
          ${directionBadge(t.direction)}
          <span>Lệnh ${t.direction} ${t.pair}</span>
        </div>
      </div>

      <div class="trade-detail-chart">
        <img src="${t.chart_image}" alt="Chart lệnh ${t.pair}" onerror="this.src='https://placehold.co/900x500?text=Chart'"/>
      </div>

      <div class="trade-detail-grid">
        <div class="trade-detail-box">
          <div class="trade-detail-box-title">THÔNG SỐ LỆNH</div>
          <div class="trade-detail-stats">
            <div class="tds-row"><span>Cặp tiền</span><strong>${t.pair}</strong></div>
            <div class="tds-row"><span>Hướng</span>${directionBadge(t.direction)}</div>
            <div class="tds-row"><span>Entry</span><strong>${t.entry}</strong></div>
            <div class="tds-row"><span>Stop Loss</span><strong style="color:#e74c3c">${t.sl}</strong></div>
            <div class="tds-row"><span>Take Profit</span><strong style="color:#27ae60">${t.tp}</strong></div>
            <div class="tds-row"><span>RR mục tiêu</span><strong>1:${t.rr_target}</strong></div>
          </div>
        </div>

        <div class="trade-detail-box">
          <div class="trade-detail-box-title">KẾT QUẢ</div>
          <div class="trade-detail-result-wrap">
            ${t.result === 'pending' ? `
              <div class="trade-result-pending">
                <div class="trade-result-icon">⏳</div>
                <div class="trade-result-label">Đang chờ kết quả</div>
                <div class="trade-result-sub">Sẽ được cập nhật sau khi lệnh kết thúc</div>
              </div>
            ` : `
              <div class="trade-result-done ${t.result}">
                <div class="trade-result-icon">${t.result === 'win' ? '✅' : t.result === 'loss' ? '❌' : '⚖️'}</div>
                <div class="trade-result-pnl">${t.pnl_r}</div>
                <div class="trade-result-label">${t.result === 'win' ? 'Thắng' : t.result === 'loss' ? 'Thua' : 'Hòa'}</div>
              </div>
            `}
          </div>
        </div>
      </div>

      ${t.note ? `
        <div class="trade-detail-note">
          <div class="trade-detail-box-title">GHI CHÚ</div>
          <p>${t.note}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function handleBackToList(e) {
  e.preventDefault();
  activeTradeId = null;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'lenh');
  url.searchParams.delete('id');
  window.history.pushState({}, '', url);
  const journalGrid = document.getElementById('journal-grid');
  const tradesGrid = document.getElementById('trades-grid');
  const tradeDetail = document.getElementById('trade-detail');
  journalGrid.style.display = 'none';
  tradesGrid.style.display = 'block';
  tradeDetail.style.display = 'none';
  renderTradesGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Xử lý nút back trình duyệt
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const idParam = params.get('id');
  activeNkTab = tabParam || 'all';
  activeTradeId = idParam || null;
  renderTabBar();
  applyTab();
});

/* ============================================================
   TRANG CHI TIẾT PHÂN TÍCH (phan-tich.html)
   ============================================================ */

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
  const descEl = document.getElementById('pageDescription') || document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute('content', post.excerpt || '');

  const tagText = TAG_LABEL[post.tag] || post.tag || 'Phân tích';

  headerEl.innerHTML = `
    <div class="pt-meta">${formatDate(post.date)} • ${tagText}</div>
    <h1 class="pt-title">${post.title}</h1>
  `;

  if (embedContainer) {
    embedContainer.innerHTML = post.cover_image
      ? `<div class="pt-hero-image"><img src="${post.cover_image}" alt="${post.title}" onerror="this.src='https://placehold.co/1000x600?text=Nghề+Trading'"/></div>`
      : '';
  }

  if (bodyContainer) {
    let bodyHtml = post.content_html || '';
    if (post.source_link) {
      bodyHtml += `<p class="pt-source-link"><a href="${post.source_link}" target="_blank" rel="noopener noreferrer">Xem bài phân tích gốc trên TradingView →</a></p>`;
    }
    bodyContainer.innerHTML = bodyHtml ? `<div class="pt-body">${bodyHtml}</div>` : '';
  }

  shareContainer.innerHTML = buildShareHtml(post);
  bindShareCopyButton();

  if (document.getElementById('disqus_thread')) {
    window.disqus_config = function () {
      this.page.url = window.location.href;
      this.page.identifier = post.id;
      this.page.title = post.title;
      this.language = "vi";
    };
    if (!document.getElementById('disqus-embed-script')) {
      const script = document.createElement('script');
      script.id = 'disqus-embed-script';
      script.src = `https://nghetrading.disqus.com/embed.js`;
      script.setAttribute('data-timestamp', +new Date());
      document.body.appendChild(script);
    }
  }
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
