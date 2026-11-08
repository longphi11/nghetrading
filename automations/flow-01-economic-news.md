# LUỒNG 01: BẢN TIN KINH TẾ & VĨ MÔ CHIẾN LƯỢC

> Quản lý chi tiết cấu hình, prompt AI, lịch chạy và vận hành của bot Tin Kinh Tế Nghề Trading.

---

## 1. THÔNG TIN TỔNG QUAN

- **Mã luồng:** `FLOW-01`
- **Tên luồng:** Tin tức Kinh tế & Phân tích Vĩ mô Chiến lược
- **Kênh tiếp nhận:** `@tinkinhtenghetrading` (Telegram Channel ID: `-1003558641458`)
- **Tần suất hoạt động:** **2 tiếng / lần** trong khung giờ hoạt động.
- **Khung giờ chạy:** `08:00 - 22:00` (Giờ Việt Nam).
- **Mốc giờ cố định:** `[08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00]`
- **Thời gian im lặng (Quiet Hours):** Sau `22:00` đến trước `08:00` sáng hôm sau không bắn tin để không làm phiền độc giả.

---

## 2. VỊ TRÍ TÀI NGUYÊN TRÊN VPS

- **Thư mục gốc:** `/root/news_agent/`
- **Mã nguồn Daemon (Điều phối lịch):** `/root/news_agent/daemon.py`
- **Mã nguồn Logic Bot (Crawl + AI + Telegram):** `/root/news_agent/news_bot.py`
- **Cơ sở dữ liệu lịch sử:** `/root/news_agent/news.db` (SQLite)
- **File nhật ký (Log):** `/root/news_agent/news.log`
- **Dịch vụ hệ thống:** `news-agent.service` (`/etc/systemd/system/news-agent.service`)

---

## 3. CẤU TRÚC NỘI DUNG BẢN TIN (CHUẨN 5 PHẦN)

Mỗi bài viết được biên tập dưới góc nhìn của chuyên gia vĩ mô thực chiến (không dịch máy thô thiển), tuân thủ nghiêm ngặt 5 phần:

1. **Badge Phân Loại:** `🔴 TIN NÓNG KINH TẾ` / `🌐 BẢN TIN VĨ MÔ CHIẾN LƯỢC` / `🏦 ĐỘNG THÁI NGÂN HÀNG TRUNG ƯƠNG`.
2. **Tiêu Đề (Headline):** Giật tít đanh thép, nêu bật tác động cốt lõi tới thị trường.
3. **Hai Điểm Cốt Lõi:** 2 gạch đầu dòng `➕` tóm tắt súc tích sự kiện và số liệu định lượng.
4. **Phân Tích Chuyên Sâu Tác Động (>200 từ):**
   - Đánh giá trực diện tác động đến dòng tiền, USD, Lợi suất Trái phiếu Chính phủ Mỹ và trực tiếp tới **Vàng (XAU/USD)** hoặc Bitcoin.
   - Luận điểm rõ ràng, chỉ ra phe Bò/Gấu đang chiếm ưu thế ở đâu.
5. **Góc Nhìn Mở & Chữ Ký Chuyển Đổi:**
   - 1 câu hỏi mở kích thích tranh luận của trader.
   - Khối chữ ký cross-promotion thương hiệu chuẩn Nghề Trading.

---

## 4. CƠ CHẾ KỸ THUẬT CỐT LÕI

### 4.1. Định dạng xuất bản chống tràn ký tự Telegram (Rich Article Preview)
- **Vấn đề trước đây:** Sử dụng `sendPhoto` bị giới hạn 1024 ký tự caption, khiến bài phân tích chuyên sâu >200 từ bị cắt cụt đuôi.
- **Giải pháp hiện tại:** Sử dụng phương thức `sendMessage` kết hợp thẻ hình ảnh HTML ẩn:
  ```html
  <a href="{image_url}">&#8203;</a>
  ```
  kèm tham số `link_preview_options: show_above_text=True, prefer_large_media=True`.
- **Ưu điểm:** Tăng hạn mức bài viết lên tới **4096 ký tự**, ảnh to hiển thị đẹp mắt ở đầu bài và bảo toàn 100% nội dung phân tích.

### 4.2. Bể chứa Multi-Key Gemini & Failover
- Tích hợp 4 API Keys Gemini độc lập của ĐẠI KA.
- Model sử dụng: `gemini-3.1-flash-lite` (Hạn mức 1.500 requests/ngày).
- Tự động bắt mã lỗi `429 RESOURCE_EXHAUSTED` và chuyển sang API Key tiếp theo trong mảng, đảm bảo bot hoạt động 24/7 không gián đoạn.

### 4.3. Nguồn tin tức (News Feeds)
- Hệ thống crawl tự động các nguồn uy tín: CNBC Economy, Investing.com, Federal Reserve, Reuters Business.
- Tự động lưu hash tin tức vào `news.db` để chống xuất bản trùng lặp.

---

## 5. HƯỚNG DẪN CUSTOMIZE CHI TIẾT

### 5.1. Thay đổi mốc giờ phát tin
Mở file `/root/news_agent/daemon.py` trên VPS, chỉnh sửa biến:
```python
# Ví dụ đổi sang các mốc khác:
SCHEDULE_HOURS = [7, 9, 11, 13, 15, 17, 19, 21]
```
Sau đó restart service:
```bash
systemctl restart news-agent.service
```

### 5.2. Chỉnh sửa Prompt AI phân tích
Mở file `/root/news_agent/news_bot.py`, tìm hàm `analyze_strategic_news_single()` và tinh chỉnh phần `prompt`:
- Có thể thêm chỉ dẫn nhấn mạnh nhiều hơn vào Vàng (XAU/USD).
- Có thể điều chỉnh văn phong (hàn lâm, đường phố, đanh thép).

### 5.3. Cập nhật chữ ký thương hiệu
Tìm chuỗi `CROSS_PROMOTION_FOOTER` trong `news_bot.py` để cập nhật liên kết hoặc lời kêu gọi hành động (CTA).

---

## 6. LỆNH ĐIỀU HÀNH & XỬ LÝ SỰ CỐ

```bash
# Kiểm tra trạng thái service
systemctl status news-agent.service --no-pager

# Xem log hoạt động theo thời gian thực
tail -f /root/news_agent/news.log

# Khởi động lại khi cập nhật code
systemctl restart news-agent.service

# Chạy thử nghiệm thủ công 1 lần không cần chờ lịch
python3 -c "from news_bot import run_single_strategic_news; run_single_strategic_news()"
```
