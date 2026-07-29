# 🤖 TELEGRAM BOT NGHỀ TRADING - BẮT BỆNH TÂM LÝ & ĐẶT LỊCH COACHING 1-1

Bot được thiết kế theo đúng phễu chuyển đổi & chiến lược chốt sale của ĐẠI KA.

---

## 🌟 CÁC TÍNH NĂNG CỐT LÕI

1. **Đón tiếp & Thấu cảm:** Giải tỏa áp lực cho độc giả mệt mỏi/tuyệt vọng khi mới vào. Mời độc giả tự bóc tách bế tắc lớn nhất của họ.
2. **Trắc nghiệm Mark Douglas (8 câu ngẫu nhiên):** Chẩn đoán chính xác tính cách & tâm lý trading (Gồng lỗ, Trả thù thị trường, Sợ bỏ lỡ, Thiếu kỷ luật...).
3. **Báo cáo dữ liệu riêng cho ĐẠI KA (Admin Alert):** 
   - Đẩy thẳng **lý do bế tắc + kết quả trắc nghiệm + username Telegram** của khách về Telegram cá nhân ĐẠI KA.
   - Gợi ý hướng tiếp cận chốt sale riêng cho từng khách.
4. **Đặt lịch Hẹn Cafe / Coaching 1-1:** Cho phép khách gửi số điện thoại + khung thời gian rảnh trực tiếp cho ĐẠI KA.
5. **Anti-Spam:** Định hướng kết nối xem Phân Tích Vàng (XAU/USD) & Tư Duy Gốc trên website mà không làm rác tin nhắn.

---

## 🛠️ HƯỚNG DẪN CẤU HÌNH DỄ DÀNG (3 BƯỚC)

### **Bước 1: Tạo Bot trên Telegram (Lấy Bot Token)**
1. Mở Telegram, tìm kiếm bot **`@BotFather`**.
2. Gõ `/newbot`, đặt tên cho bot (VD: `Nghề Trading Support Bot`) và username (VD: `NgheTrading_Bot`).
3. BotFather sẽ cấp cho ĐẠI KA 1 chuỗi **Token** (Dạng: `7123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### **Bước 2: Lấy Chat ID Telegram cá nhân của ĐẠI KA**
1. Mở Telegram, tìm kiếm **`@userinfobot`** hoặc **`@raw_data_bot`**.
2. Bấm `/start`, bot sẽ hiển thị `Id: 123456789`. Đó chính là **ADMIN_CHAT_ID** của ĐẠI KA.

### **Bước 3: Điền vào cấu hình & Chạy Bot**
1. Trong thư mục `telegram-bot/`, tạo file `.env` (bằng cách sao chép từ `.env.example`).
2. Điền thông tin Token & Chat ID vào `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=7123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ADMIN_CHAT_ID=123456789
   ```
3. Chạy lệnh cài đặt thư viện & khởi động bot:
   ```bash
   cd telegram-bot
   npm install
   npm start
   ```

---

## 🔗 KẾT NỐI VỚI NÚT TELEGRAM TRÊN WEBSITE

ĐẠI KA gắn đường link bot của mình vào nút hỗ trợ trên Website:
```html
<a href="https://t.me/NgheTrading_Bot" target="_blank" class="telegram-btn">
  💬 Tư Vấn 1-1 Cùng ĐẠI KA
</a>
```
