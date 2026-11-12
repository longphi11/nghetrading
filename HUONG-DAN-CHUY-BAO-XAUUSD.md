# HƯỚNG DẪN CÀI ĐẶT CHỈ BÁO XAU/USD (MIỄN PHÍ)

## 1. Cài đặt chỉ báo trên TradingView (miễn phí)

1. Mở TradingView → chọn chart **XAU/USD (OANDA)**.
2. MENU **Pine Editor** (dưới cùng màn hình).
3. Copy toàn bộ nội dung file `indicators/xauusd-signal-indicator.pine` dán vào Pine Editor.
4. Nhấn **Save** → đặt tên `Nghê Trading - XAU/USD Signal`.
5. Nhấn **Add to Chart**.

Chỉ báo sẽ hiển thị:
- EMA nhanh (xanh lá) & EMA chậm (đỏ).
- Biểu tượng tam giác mũi tên lên/lệnh LONG, xuống/lệnh SHORT.
- Table góc trên phải hiển thị Entry / SL / TP.

---

## 2. Tạo Alert trên TradingView (miễn phí)

1. Nhấn nút **Alert** (đồng hồ đồng hồ) trên thanh công cụ TradingView.
2. Trong dropdown **Condition**, chọn chỉ báo `Nghê Trading - XAU/USD Signal`.
3. Chọn sự kiện:
   - `XAUUSD_LONG` → khi có tín hiệu Long
   - `XAUUSD_SHORT` → khi có tín hiệu Short
4. Chọn **Webhook URL**: dán URL webhook từ n8n (xem bước 3).
5. Trong ô **Message** (payload), dán chuỗi sau (chính xác để n8n parse):

```json
{
  "type": "{{strategy.order.action}}",
  "symbol": "XAU/USD",
  "entry": {{close}},
  "sl": {{strategy.position_avg_price}},  // sau khi có SL/TP từ chỉ báo, bạn điều chỉnh theo message alert
  "tp": {{strategy.position_avg_price}},
  "time": "{{time}}",
  "chart": "https://vn.tradingview.com/chart/XAUUSD/?symbol=OANDA:XAUUSD"
}
```

> **Lưu ý:** Pine Script trên đã cấu hình `alert()` với định dạng:
> `XAUUSD_LONG|entry|sl|tp` hoặc `XAUUSD_SHORT|entry|sl|tp`.
> Nếu bạn dùng alert của Pine Script (không phải strategy alert), message sẽ là chuỗi đó. Bạn có thể cấu hình n8n parse theo dấu `|`.

---

## 3. Cấu hình n8n (sửa workflow CŨ, KHÔNG tạo mới)

Theo quy tắc dự án: **EDIT TRỰC TIẾP luồng cũ `nCdYu9TcfeITfJ7q`, TUYỆT ĐỐI KHÔNG tạo workflow mới.**

1. Mở n8n → workflow `nCdYu9TcfeITfJ7q` (Facebook Fanpage AutoPost).
2. Thêm node **Webhook** (HTTP Request) ở đầu luồng mới hoặc tạo nhánh mới:
   - Method: `POST`
   - Path: `/xauusd-signal` (hoặc tùy chọn)
3. Thêm node **Function** để parse message từ TradingView:
   ```javascript
   // Ví dụ parse: "XAUUSD_LONG|2650.50|2640.00|2671.00"
   const msg = $json.body || $json.message || "";
   const parts = msg.split("|");
   if (parts.length >= 4) {
     return [{
       type: parts[0],           // XAUUSD_LONG / XAUUSD_SHORT
       entry: parts[1],          // Entry giá
       sl: parts[2],             // Stop Loss
       tp: parts[3],             // Take Profit
       symbol: "XAU/USD",
       time: new Date().toISOString()
     }];
   }
   return [];
   ```
4. Thêm node **Telegram** (sử dụng credentials của `@NgheTradingSupport_Bot` hoặc `@longphibtc`):
   - Chat ID: `488901419` (ĐẠI KA) hoặc ID nhóm tín hiệu.
   - Text:
     ```
     🚀 XAU/USD SIGNAL
     Loại: {{ $json.type }}
     Entry: {{ $json.entry }}
     SL: {{ $json.sl }}
     TP: {{ $json.tp }}
     Thời gian: {{ $json.time }}
     ```

5. Kích hoạt lại workflow (Active).

---

## 4. Lưu ý

- Chỉ báo **HOÀN TOÀN MIỄN PHÍ**, chạy trên TradingView Free.
- Không cần VPS, không cần server riêng, n8n đã có sẵn trong hệ thống.
- Dữ liệu tín hiệu chỉ gửi đến Telegram, không lưu vào database website (trừ khi DẠI KA muốn sau này).

---

## 5. File trong repo

| File | Mục đích |
|------|----------|
| `indicators/xauusd-signal-indicator.pine` | Mã chỉ báo Pine Script |
| `HUONG-DAN-CHUY-BAO-XAUUSD.md` | Hướng dẫn cài đặt (file này) |
