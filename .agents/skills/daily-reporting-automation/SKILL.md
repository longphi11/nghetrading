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

### 🌅 06h00 Sáng VN — Báo Cáo Sẵn Sàng Vận Hành, n8n Active, API Nền Tảng & Tự Động Phục Hồi (Auto-Heal)

- **Mục đích:** Đảm bảo toàn bộ luồng n8n, API kết nối các nền tảng và dịch vụ hệ thống của Nghề Trading đều ở trạng thái ACTIVE và sẵn sàng 100% trước giờ thị trường hoạt động.
- **Quy trình thực thi:**
  1. **Đảm bảo các luồng n8n ở trạng thái Active:**
     - Truy vấn trực tiếp trạng thái workflow `nCdYu9TcfeITfJ7q` (`Nghề Trading - Facebook Fanpage AutoPost System`) trong cơ sở dữ liệu `/root/n8n_data/database.sqlite`.
     - **Cơ chế Auto-Heal cho n8n:** Nếu phát hiện `active == 0` (inactive), tự động thực thi lệnh publish kích hoạt lại (`docker exec n8n n8n publish:workflow --id=nCdYu9TcfeITfJ7q`) và tái kiểm tra.
  2. **Đảm bảo kết nối API tới các nền tảng:**
     - **Facebook Graph API:** Kiểm tra Meta Fanpage Token (endpoint `https://graph.facebook.com/v19.0/1103661363146221`), xác thực quyền quản trị Fanpage Nghề Trading.
     - **Telegram Bot API:** Gọi `getMe` với token bot, đảm bảo bot trợ lý `@NgheTradingSupport_Bot` kết nối bình thường.
     - **Google Analytics 4 API:** Kiểm tra tệp Service Account `ga-credentials.json` và yêu cầu OAuth2 token với quyền truy cập Property `547085712`.
     - **Gemini AI API Pool:** Gửi ping thử nghiệm qua multi-key pool, xác nhận model AI sẵn sàng phục vụ phân tích.
  3. **Kiểm tra trạng thái HTTP của website:** `https://nghetrading.com` (yêu cầu mã 200 OK kèm thời gian phản hồi ping).
  4. **Kiểm tra 3 dịch vụ Systemd cốt lõi:**
     - `news-agent.service` (Cào & cập nhật tin tức ForexFactory / TradingView).
     - `quote-agent.service` (Châm ngôn & tâm lý trading).
     - `nghetrading-telegram-bot.service` (Trợ lý bot trực Topic 22).
     - *Cơ chế Auto-Heal:* Nếu phát hiện dịch vụ nào bị dừng, tự động `systemctl restart <service>` ngay lập tức.
  5. Lấy kế hoạch giao dịch Vàng mới nhất trong `data/journal.json`.
  6. Xuất bản báo cáo chào buổi sáng xác nhận toàn bộ luồng n8n, API nền tảng và dịch vụ đã sẵn sàng 100% kèm lịch trình vận hành trong ngày vào Topic 22.

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
       - Đưa toàn bộ metrics hôm nay vào Gemini để phân tích điểm nghẽn (bottleneck) và đề xuất đúng 1-2 hành động cụ thể để kéo thêm user vào ngày mai.

---

## 3. Bản Đồ Các Luồng Tự Động (Automated Workflows)

### A. Luồng n8n AutoPost Fanpage (`nCdYu9TcfeITfJ7q`)
- **Tên Workflow:** `Nghề Trading - Facebook Fanpage AutoPost System`.
- **Nguyên tắc bất di bất dịch:** BẮT BUỘC SỬA TRỰC TIẾP TRÊN WORKFLOW NÀY, TUYỆT ĐỐI KHÔNG TẠO MỚI.
- **Yêu cầu trạng thái:** BẮT BUỘC LUÔN Ở TRẠNG THÁI ACTIVE. Hệ thống báo cáo 06h00 sáng tự động kiểm tra và kích hoạt lại nếu bị Inactive.
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
  python3 /root/telegram_assistant/daily_reporter.py --report morning

  # Chạy báo cáo tăng trưởng tối (22h00):
  python3 /root/telegram_assistant/daily_reporter.py --report evening
  ```
- **Lệnh kiểm tra crontab:**
  ```bash
  crontab -l
  # Kết quả chuẩn:
  # 0 6 * * * python3 /root/telegram_assistant/daily_reporter.py --report morning >> /root/telegram_assistant/cron.log 2>&1
  # 0 22 * * * python3 /root/telegram_assistant/daily_reporter.py --report evening >> /root/telegram_assistant/cron.log 2>&1
  ```
