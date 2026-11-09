---
name: daily-reporting-automation
description: >-
  Vận hành hệ thống báo cáo định kỳ tự động (06h00 Sáng & 22h00 Tối VN) trên Telegram Topic 💡 Nghề Trading,
  theo dõi chỉ số tăng trưởng Google Analytics 4, Telegram member count, chiến lược tăng trưởng AI, và giám sát các luồng tự động n8n/Systemd.
---

# Kỹ Năng Vận Hành Báo Cáo Định Kỳ & Tự Động Hóa (Nghề Trading)

Kỹ năng này chuẩn hóa toàn bộ quy trình vận hành hệ thống báo cáo tự động, giám sát hạ tầng và quản lý các luồng tự động (n8n, Systemd, Linux Crontab) phục vụ ĐẠI KA.

---

## 1. Mục Tiêu & Điểm Chạm Telegram

- **Mục tiêu tối thượng:** Đem lại cái nhìn minh bạch, chính xác tuyệt đối về tiến độ vận hành và đà tăng trưởng của dự án Nghề Trading mỗi ngày mà không làm phiền ĐẠI KA với các thông số rác.
- **Kênh tiếp nhận báo cáo:**
  + **Group Telegram:** Supergroup `Hội Đồng Quản Trị` (`chat_id: -1004401199553`).
  + **Topic độc quyền:** **`💡 Nghề Trading`** (`message_thread_id: 22`).
  + **Bot gửi tin:** `@NgheTradingSupport_Bot`.
  + **Quy tắc cách ly:** Tuyệt đối chỉ gửi và lắng nghe tin nhắn trong Topic 22, không gửi nhầm sang Topic 19 (`🔥 Trại Cai Nghiện`) hoặc Topic 1 (`General`).

---

## 2. Chi Tiết Lịch Trình Báo Cáo Hàng Ngày

### 🌅 06h00 Sáng VN — Báo Cáo Sẵn Sàng Vận Hành & Tự Động Phục Hồi (Auto-Heal)

- **Mục đích:** Đảm bảo toàn bộ hạ tầng công nghệ và luồng xuất bản nội dung của Nghề Trading đã thức giấc, chạy trơn tru 100% trước giờ thị trường hoạt động.
- **Quy trình thực thi:**
  1. Kiểm tra trạng thái HTTP của website: `https://nghetrading.com` (Yêu cầu mã 200 OK).
  2. Kiểm tra trạng thái 3 dịch vụ Systemd cốt lõi:
     - `news-agent.service` (Cào & cập nhật tin tức ForexFactory / TradingView).
     - `quote-agent.service` (Châm ngôn & tâm lý trading).
     - `nghetrading-telegram-bot.service` (Trợ lý bot trực Topic 22).
  3. **Cơ chế Auto-Heal (Tự phục hồi):** Nếu phát hiện bất kỳ dịch vụ nào bị lỗi hoặc dừng (`inactive` / `failed`), script tự động kích hoạt `systemctl restart <service>` và tái kiểm tra trước khi lập báo cáo.
  4. Lấy kế hoạch giao dịch Vàng mới nhất trong `data/journal.json`.
  5. Xuất bản báo cáo chào buổi sáng xác nhận hệ sinh thái sẵn sàng 100% kèm lịch trình các luồng tự động sẽ chạy trong ngày.

---

### 🌙 22h00 Tối VN — Báo Cáo Chỉ Số Tăng Trưởng & Phát Triển Kênh Thực Tế

- **Mục đích:** Đo lường chính xác hiệu quả tăng trưởng của website và cộng đồng, chỉ ra điểm nghẽn và đề xuất hành động thực chiến cho ngày hôm sau.
- **QUY TẮC CỐT LÕI (CHỈ THỊ TỪ ĐẠI KA):**
  - **TUYỆT ĐỐI BỎ QUA** các chỉ số nội bộ hoặc mang tính khoe khoang nội bộ:
    ❌ Không báo cáo uptime / thời gian hoạt động.
    ❌ Không báo cáo số lượng bài viết đã đăng hay chất lượng bài viết.
    ❌ Không báo cáo số lượng comment seeding.
  - **TẬP TRUNG 100% VÀO CHỈ SỐ PHÁT TRIỂN THỰC TẾ:**
    ✅ **Google Analytics 4 API (Property ID: 547085712):**
       - Số User mới (`newUsers`).
       - Tổng User truy cập (`activeUsers`).
       - Tổng số lượt xem trang (`screenPageViews`).
       - Số phiên truy cập (`sessions`).
       - Thời lượng tương tác trung bình (`userEngagementDuration`).
       - Top 3 bài viết / trang được xem nhiều nhất trong ngày.
    ✅ **Cộng đồng Kênh Telegram:**
       - Tổng số thành viên Kênh `@nhatkytradingvn` (gọi Telegram API `getChatMemberCount`).
    ✅ **Chiến Lược Tăng Trưởng AI (AI Growth Strategy):**
       - Đưa toàn bộ metrics hôm nay vào Gemini 2.5 Flash để phân tích điểm nghẽn (bottleneck) và đề xuất đúng 1-2 hành động cụ thể để kéo thêm user vào ngày mai.

---

## 3. Bản Đồ Các Luồng Tự Động (Automated Workflows)

### A. Luồng n8n AutoPost Fanpage (`nCdYu9TcfeITfJ7q`)
- **Tên Workflow:** `Nghề Trading - Facebook Fanpage AutoPost System`.
- **Nguyên tắc bất di bất dịch:** BẮT BUỘC SỬA TRỰC TIẾP TRÊN WORKFLOW NÀY, TUYỆT ĐỐI KHÔNG TẠO MỚI.
- **Lịch kích hoạt:**
  - **10:00 Sáng VN (Thứ 2 - Thứ 6):** Lấy bài phân tích Vàng mới nhất từ `data/journal.json` đăng Fanpage.
  - **20:30 Tối VN (Hàng ngày):** Lấy bài viết tư duy gốc từ `data/posts.json` đăng Fanpage.
- **Backend Runner:** `python3 /root/facebook_agent/facebook_agent.py --trigger [morning|evening]`

### B. Các Dịch Vụ Systemd
- `news-agent.service`: Quét tin tức kinh tế 24/7.
- `quote-agent.service`: Phát hành châm ngôn giao dịch (08:30 & 20:30).
- `nghetrading-telegram-bot.service`: Assistant Bot chạy liên tục:
  - Nhận diện lệnh nhanh: `/check`, `/vang`, `/baocao`.
  - Bắn thông báo bình luận mới trên website về Topic 22 và Telegram cá nhân ĐẠI KA.

---

## 4. Quản Trị & Lệnh Nhanh Trên VPS

- **Đường dẫn script báo cáo:** `/root/telegram_assistant/daily_reporter.py`
- **Đường dẫn Assistant Bot:** `/root/telegram_assistant/assistant_bot.py`
- **File credentials GA4:** `/root/telegram_assistant/ga-credentials.json`
- **Lệnh chạy báo cáo thủ công ngay lập tức:**
  ```bash
  # Chạy báo cáo vận hành sáng (06h00):
  python3 /root/telegram_assistant/daily_reporter.py morning

  # Chạy báo cáo tăng trưởng tối (22h00):
  python3 /root/telegram_assistant/daily_reporter.py evening
  ```
- **Lệnh kiểm tra crontab:**
  ```bash
  crontab -l
  # Kết quả chuẩn:
  # 0 6 * * * python3 /root/telegram_assistant/daily_reporter.py morning >> /root/telegram_assistant/cron.log 2>&1
  # 0 22 * * * python3 /root/telegram_assistant/daily_reporter.py evening >> /root/telegram_assistant/cron.log 2>&1
  ```
