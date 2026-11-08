# LUỒNG 02: QUOTE TÂM LÝ & KỶ LUẬT TRADING THỰC CHIẾN

> Quản lý chi tiết cấu hình, prompt AI, động cơ chống trùng ảnh 3 tầng và vận hành của bot Quote Tâm Lý Nghề Trading.

---

## 1. THÔNG TIN TỔNG QUAN

- **Mã luồng:** `FLOW-02`
- **Tên luồng:** Quote Tâm Lý, Quản Trị Rủi Ro & Kỷ Luật Trading
- **Kênh tiếp nhận:** `@quotetradingvn` (Telegram Channel ID: `-1004367907410`)
- **Tần suất hoạt động:** Định kỳ hàng ngày.
- **Mục tiêu:** Cảnh tỉnh tâm lý cờ bạc, gỡ rối bế tắc cho trader thua lỗ, định hình tư duy giao dịch chuyên nghiệp và dẫn phễu về buổi tư vấn/tâm sự trực tiếp với ĐẠI KA qua `@longphibtc`.

---

## 2. VỊ TRÍ TÀI NGUYÊN TRÊN VPS

- **Thư mục gốc:** `/root/quote_agent/`
- **Mã nguồn Daemon (Điều phối):** `/root/quote_agent/quote_daemon.py`
- **Mã nguồn Logic Bot (AI + Unsplash + Telegram):** `/root/quote_agent/quote_bot.py`
- **Cơ sở dữ liệu lịch sử:** `/root/quote_agent/quote.db` (SQLite)
- **Blacklist hình ảnh chống trùng:** `/root/quote_agent/used_images_blacklist.json`
- **File nhật ký (Log):** `/root/quote_agent/quote.log`
- **Dịch vụ hệ thống:** `quote-agent.service` (`/etc/systemd/system/quote-agent.service`)

---

## 3. CẤU TRÚC BÀI VIẾT QUOTE

Mỗi bài đăng gồm 3 thành phần hài hòa:
1. **Hình ảnh nghệ thuật chất lượng cao (Unsplash):** Tông màu trầm tĩnh, chiều sâu, thể hiện sự tĩnh lặng, kỷ luật, thị trường tài chính hoặc chiến binh.
2. **Nội dung Quote tâm lý đanh thép:**
   - Đánh trúng nỗi đau trader (gồng lỗ, cắt lãi non, FOMO, overtrading, all-in).
   - Câu từ ngắn gọn, giàu sức gợi, chuẩn chất Nghề Trading ("Nói chuyện cà phê nhưng tư duy viện nghiên cứu").
3. **Khối chữ ký thương hiệu:**
   - Dẫn link đọc bài phân tích Vàng: `@nhatkytradingvn`
   - Dẫn link tâm sự trực tiếp 1-1 với ĐẠI KA: `@longphibtc`
   - Website chính thức: `https://nghetrading.com`

---

## 4. ĐỘNG CƠ CHỐNG TRÙNG ẢNH 3 TẦNG (ANTI-DUPLICATION ENGINE)

Để giải quyết triệt để vấn đề Unsplash trả về ảnh trùng lặp (đặc biệt là ảnh lâu đài `photo-1518709268805-4e9042af9f23`), hệ thống triển khai cơ chế lọc 3 tầng nghiêm ngặt:

1. **Tầng 1 - Blacklist vĩnh viễn (Permanent JSON Blacklist):**
   - Danh sách các ID ảnh lỗi thời/trùng lặp được lưu cứng trong file `/root/quote_agent/used_images_blacklist.json`.
   - Bot lập tức loại bỏ các ID này trước khi xử lý.
2. **Tầng 2 - Canonical Photo ID & URL trong Database SQLite:**
   - Trích xuất mã ID chuẩn của ảnh từ URL Unsplash.
   - Kiểm tra đối soát với bảng `used_images` trong `quote.db`. Nếu đã từng xuất hiện thì tự động bỏ qua và lấy ảnh tiếp theo.
3. **Tầng 3 - Content MD5 Hash:**
   - Băm nhỏ nội dung quote và ảnh để đảm bảo không có hai thông điệp giống nhau được xuất bản trong vòng 90 ngày.

---

## 5. CƠ CHẾ AI GEMINI MULTI-KEY

- Hệ thống sử dụng Multi-Key Pool 4 API Keys của ĐẠI KA.
- Model sử dụng: `gemini-3.1-flash-lite`.
- Tự động fallback và xoay vòng key khi gặp sự cố mạng hoặc hạn mức quota.

---

## 6. HƯỚNG DẪN CUSTOMIZE CHI TIẾT

### 6.1. Thêm ảnh vào Blacklist chặn vĩnh viễn
Nếu phát hiện một ảnh không phù hợp trên Unsplash, lấy ID ảnh (ví dụ: `photo-1518709268805-4e9042af9f23`) và bổ sung vào `/root/quote_agent/used_images_blacklist.json`:
```json
[
  "photo-1518709268805-4e9042af9f23",
  "<ID_ANH_MOI>"
]
```

### 6.2. Thay đổi từ khóa tìm kiếm ảnh Unsplash
Trong file `/root/quote_agent/quote_bot.py`, tìm mảng `SEARCH_TOPICS` hoặc hàm `get_unsplash_image()` để bổ sung các từ khóa mới:
```python
KEYWORDS = ["trading discipline", "minimalist architecture", "deep focus", "solitude chess", "financial charts"]
```

### 6.3. Điều chỉnh phong cách Prompt Quote
Trong file `quote_bot.py`, tìm hàm `generate_trading_quote()` để tinh chỉnh prompt:
- Nhấn mạnh vào quản trị vốn (Risk Management).
- Nhấn mạnh vào tâm lý phiên Mỹ / phiên Á.
- Thay đổi độ dài danh ngôn (1-2 câu súc tích).

---

## 7. LỆNH ĐIỀU HÀNH & KIỂM TRA

```bash
# Kiểm tra trạng thái service
systemctl status quote-agent.service --no-pager

# Xem log hoạt động theo thời gian thực
tail -f /root/quote_agent/quote.log

# Khởi động lại service
systemctl restart quote-agent.service

# Chạy thử sinh 1 quote kiểm tra ngay lập tức
python3 -c "from quote_bot import run_single_quote; run_single_quote()"
```
