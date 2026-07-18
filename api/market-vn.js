export default async function handler(req, res) {
  const GOLD_KEY = process.env.VNAPPMOB_GOLD_KEY;
  const FX_KEY = process.env.VNAPPMOB_FX_KEY;

  try {
    const [goldRes, fxRes] = await Promise.all([
      fetch('https://api.vnappmob.com/api/v2/gold/pnj', {
        headers: { Authorization: `Bearer ${GOLD_KEY}` }
      }),
      fetch('https://api.vnappmob.com/api/v2/exchange_rate/vcb?currency=USD', {
        headers: { Authorization: `Bearer ${FX_KEY}` }
      })
    ]);

    const gold = await goldRes.json();
    const fx = await fxRes.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800');
    res.status(200).json({
      goldPNJ: gold.results ? gold.results[0] : null,
      usdVCB: fx.results ? fx.results[0] : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Không lấy được dữ liệu giá trong nước' });
  }
}
