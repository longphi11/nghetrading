async function updateMarketPrices() {
  try {
    // Cập nhật Bitcoin (BTC/USDT)
    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (btcRes.ok) {
      const btcData = await btcRes.json();
      const btcPrice = parseFloat(btcData.lastPrice);
      const btcChange = parseFloat(btcData.priceChangePercent);
      const btcEl = document.getElementById('btc-price');
      const btcChangeEl = btcEl ? btcEl.nextElementSibling : null;
      if (btcEl) btcEl.textContent = '$' + btcPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (btcChangeEl) {
        btcChangeEl.textContent = (btcChange >= 0 ? '▲ ' : '▼ ') + (btcChange >= 0 ? '+' : '') + btcChange.toFixed(2) + '%';
        btcChangeEl.style.color = btcChange >= 0 ? 'var(--green)' : '#e74c3c';
      }
    }

    // Cập nhật Vàng Thế Giới (dùng PAXG/USDT làm tham chiếu)
    const goldRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
    if (goldRes.ok) {
      const goldData = await goldRes.json();
      const goldPrice = parseFloat(goldData.lastPrice);
      const goldChange = parseFloat(goldData.priceChangePercent);
      const goldEl = document.getElementById('gold-world-price');
      const goldChangeEl = goldEl ? goldEl.nextElementSibling : null;
      if (goldEl) goldEl.textContent = '$' + goldPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (goldChangeEl) {
        goldChangeEl.textContent = (goldChange >= 0 ? '▲ ' : '▼ ') + (goldChange >= 0 ? '+' : '') + goldChange.toFixed(2) + '%';
        goldChangeEl.style.color = goldChange >= 0 ? 'var(--green)' : '#e74c3c';
      }
    }
  } catch (err) {
    console.error('Lỗi cập nhật giá tự động:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateMarketPrices();
  setInterval(updateMarketPrices, 60000); // Tự cập nhật 1 phút 1 lần
});
