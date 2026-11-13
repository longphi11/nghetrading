# LUỒNG 03: TỰ ĐỘNG HÓA FANPAGE FACEBOOK NGHỀ TRADING

> Quản lý chi tiết cấu hình, prompt AI, lịch đăng bài và tự động ghim bình luận nhóm Telegram trên Fanpage Nghề Trading.

---

## 1. THÔNG TIN TỔNG QUAN

- **Mã luồng:** `FLOW-03`
- **Tên luồng:** Facebook Fanpage Auto-Posting System
- **Trang tiếp nhận:** Fanpage **Nghề Trading** (Page ID: `1103661363146221`)
- **Link Fanpage:** `https://www.facebook.com/1103661363146221`
- **Công nghệ điều phối:** Hỗ trợ song song cả **N8N Workflow** (`facebook_fanpage_autopost_workflow.json`) và **Native Python Daemon** (`facebook-agent.service`).

---

## 2. LỊCH CHẠY & KỊCH BẢN NỘI DUNG CHI TIẾT

Luồng hoạt động theo 2 kịch bản cố định trong ngày:

### 2.1. Nhánh Sáng: Kế Hoạch Giao Dịch Vàng Ngày (Thứ 2 - Thứ 6)
- **Thời gian:** **10:00 sáng** từ **Thứ Hai đến Thứ Sáu** hàng tuần (`0 10 * * 1-5`).
- **Nguồn dữ liệu:** `https://nghetrading.com/data/journal.json` (Mục Nhật Ký Giao Dịch).
- **Bộ lọc bài:**
  - Bắt buộc chứa tiêu đề: `"Kế hoạch giao dịch vàng ngày..."`
  - **LOẠI BỎ TRIỆT ĐỂ** các bài *"Kế hoạch giao dịch vàng tuần..."*.
- **Cấu trúc bài đăng:**
  - Copy toàn bộ nội dung phân tích kế hoạch vàng ngày trên web.
  - Đính kèm lời kêu gọi hành động (CTA) hướng độc giả vào link bài viết gốc trên website để xem đồ thị chi tiết: `https://nghetrading.com/phan-tich.html?id={id}`.
  - Hình ảnh đăng kèm: Chính là hình ảnh đồ thị chart TradingView HD của bài viết.
- **Tự động Like bài đăng:** Ngay khi bài viết đăng thành công, hệ thống tự động Like bài viết qua Facebook Graph API.
- **Tự động bình luận 3 Comment điều hướng (Thay vì 1 comment):**
  - **Comment 1 (Website):** Dẫn độc giả xem chi tiết kế hoạch nến H4/H1, vùng kích hoạt lệnh tại website `https://nghetrading.com`.
  - **Comment 2 (Kênh Telegram):** Dẫn vào Kênh Telegram phân tích & tin tức vĩ mô `https://t.me/nhatkytradingvn`.
  - **Comment 3 (Telegram 1-1):** Dẫn vào Telegram cá nhân ĐẠI KA `https://t.me/longphibtc` để trao đổi trực tiếp người thật hoặc hẹn tư vấn 1-1.

---

### 2.2. Nhánh Tối: Bài Viết Tư Duy Gốc (Hàng Ngày)
- **Thời gian:** **20:30 tối** hàng ngày (`30 20 * * *`).
- **Nguồn dữ liệu:** `https://nghetrading.com/data/posts.json` (Mục Tư Duy Gốc).
- **Cơ chế chọn bài:** Lần lượt chọn bài viết tư duy chưa từng đăng (quản lý trạng thái qua SQLite `facebook.db`).
- **Cấu trúc bài đăng (Gemini Multi-Key AI):**
  - AI viết một đoạn phân tích khoảng **200 từ** diễn giải sâu sắc về tư duy/tâm lý giao dịch thực chiến.
  - Giọng văn điềm tĩnh, đanh thép, thấu cảm ("Nói chuyện cà phê nhưng tư duy viện nghiên cứu").
  - Kêu gọi độc giả đọc trọn vẹn bài viết trên web: `https://nghetrading.com/posts/{slug}.html`.
  - Hình ảnh đăng kèm: Ảnh minh họa bài viết chất lượng cao từ website.
- **Tự động Like bài đăng:** Tự động Like bài viết ngay sau khi đăng thành công.
- **Tự động bình luận 3 Comment điều hướng (Thay vì 1 comment):**
  - **Comment 1 (Website):** Dẫn độc giả đọc trọn bộ bài viết tư duy xác suất và quản trị vốn tại `https://nghetrading.com/bai-viet.html`.
  - **Comment 2 (Kênh Telegram):** Dẫn vào Kênh Telegram thảo luận & nhận định thị trường `https://t.me/nhatkytradingvn`.
  - **Comment 3 (Telegram 1-1):** Dẫn vào Telegram cá nhân ĐẠI KA `https://t.me/longphibtc` dành cho anh em bế tắc tâm lý hoặc hẹn cafe 1-1.

---

## 3. VỊ TRÍ TÀI NGUYÊN TRÊN VPS

- **Thư mục mã nguồn:** `/root/facebook_agent/`
- **Mã nguồn Agent:** `/root/facebook_agent/facebook_agent.py`
- **Cơ sở dữ liệu lịch sử:** `/root/facebook_agent/facebook.db`
- **File nhật ký (Log):** `/root/facebook_agent/facebook.log`
- **File Workflow N8N:** `/root/facebook_agent/facebook_fanpage_autopost_workflow.json`
- **Dịch vụ hệ thống:** `facebook-agent.service` (`/etc/systemd/system/facebook-agent.service`)

---

## 4. HƯỚNG DẪN TEST VÀ VẬN HÀNH

```bash
# Chạy thử nghiệm ngay lập tức bài sáng (Kế hoạch Vàng)
python3 /root/facebook_agent/facebook_agent.py --trigger morning

# Chạy thử nghiệm ngay lập tức bài tối (Tư Duy Gốc)
python3 /root/facebook_agent/facebook_agent.py --trigger evening

# Xem log hoạt động theo thời gian thực
tail -f /root/facebook_agent/facebook.log

# Kiểm tra trạng thái service
systemctl status facebook-agent.service --no-pager
```
