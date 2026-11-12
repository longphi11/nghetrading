# 🔒 Hướng Dẫn Bảo Mật & Kết Nối Dự Án Nghề Trading

Tài liệu này hướng dẫn các mô hình AI khác (hoặc nhân viên mới) cách kết nối, vận hành và bảo mật hệ thống tự động của website **Nghề Trading** (`nghetrading.com`).

---

## 1. Môi trường vận hành

| Thành phần | Địa chỉ | Cổng | Ghi chú |
|------------|---------|------|---------|
| VPS Linux (Nghề Trading) | `103.157.218.111` | `11985` (SSH) | **Không dùng domain** `vnl.1921992.xyz` vì trỏ về Cloudflare |
| Port Knock | `http://103.157.218.111:60000/C1sco1234` | HTTP | Phải knock trước khi SSH |
| Website | `https://nghetrading.com` | 443 | Kiểm tra health (mã 200) |
| n8n DB | `/root/n8n_data/database.sqlite` | - | Chỉ lưu trên VPS, không commit lên repo |

---

## 2. Kết nối SSH an toàn

### Quy trình
1. **Knock port** để mở cổng SSH:
   ```bash
   curl -s -A "Mozilla/5.0" http://103.157.218.111:60000/C1sco1234
   ```
2. **Đợi 2–3 giây** sau đó SSH:
   ```bash
   ssh root@103.157.218.111 -p 11985
   ```

### Sử dụng biến môi trường (không hardcode)
Tạo file `.env` ở thư mục làm việc:
```bash
VPS_HOST=103.157.218.111
VPS_PORT=11985
VPS_USER=root
VPS_PASS=__________          # <-- giá trị thực, không commit lên git
N8N_WORKFLOW_ID=nCdYu9TcfeITfJ7q
```

Script Python mẫu (xem `scratch/try_ssh_vps.py` đã được cập nhật):
```python
import os
import paramiko
import urllib.request
import time

VPS_HOST = os.getenv("VPS_HOST", "103.157.218.111")
VPS_PORT = int(os.getenv("VPS_PORT", "11985"))
VPS_USER = os.getenv("VPS_USER", "root")
VPS_PASS = os.getenv("VPS_PASS")

# 1. Knock port
urllib.request.urlopen(
    urllib.request.Request(
        f"http://{VPS_HOST}:60000/C1sco1234",
        headers={"User-Agent": "Mozilla/5.0"}
    ),
    timeout=8
)
time.sleep(4)

# 2. SSH
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=25)
```

---

## 3. Quản lý secrets (BẮT BUỘC)

### Quy tắc cốt lõi
- **TUYỆT ĐỐI KHÔNG** commit token, API key, mật khẩu vào git/repo.
- Các file chứa secret thực: `.env` (local) và các file credentials trên VPS (`/root/telegram_assistant/ga-credentials.json`, biến môi trường systemd, v.v.).
- Repo chỉ chứa `.env.example` (mẫu, không có giá trị thực).

### Cách các AI model khác sử dụng
1. Clone repo về local.
2. Sao chép `.env.example` → `.env`.
3. Điền giá trị thực vào `.env` (lấy từ ĐẠI KA hoặc quản trị viên VPS).
4. Chạy script đọch `.env` qua `os.getenv()` hoặc `python-dotenv`.

### Danh sách secret cần thiết (tham khảo `.env.example`)
| Biến | Mô tả | Nơi dùng |
|------|-------|----------|
| `FB_PAGE_ID` | ID Fanpage Facebook | facebook_agent, daily_reporter |
| `FB_PAGE_TOKEN` | Access token Meta Fanpage | facebook_agent, daily_reporter |
| `TELEGRAM_BOT_TOKEN` | Token bot `@NgheTradingSupport_Bot` | assistant_bot, daily_reporter, news_bot, quote_bot |
| `ADMIN_CHAT_ID` | Telegram chat ID ĐẠI KA | assistant_bot, daily_reporter |
| `GEMINI_API_KEY_1..N` | API Key Gemini (multi-key pool) | facebook_agent, daily_reporter, news_bot, quote_bot, assistant_bot |
| `GA_PROPERTY_ID` | ID tài sản Google Analytics 4 | daily_reporter |
| `GA_KEY_FILE` | Đường dẫn file service account GA4 | daily_reporter |
| `N8N_DB_PATH` | Đường dẫn database.sqlite n8n | daily_reporter |
| `N8N_WORKFLOW_ID` | ID workflow n8n Nghề Trading | daily_reporter |
| `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PASS` | Kết nối SSH VPS | scratch scripts |

---

## 4. Cấu trúc các luồng tự động (n8n & Systemd)

### n8n (Facebook Fanpage AutoPost)
- **Workflow ID:** `nCdYu9TcfeITfJ7q` (tên: *Nghề Trading - Facebook Fanpage AutoPost System*)
- **Luôn phải ở trạng thái ACTIVE.**
- **Lịch:**
  - `0 10 * * 1-5` → Kế hoạch Vàng ngày (`--trigger morning`)
  - `30 20 * * *` → Tư duy gốc (`--trigger evening`)
- **Backend:** `python3 /root/facebook_agent/facebook_agent.py --trigger [morning|evening]`

### Systemd Services (chạy 24/7)
| Service | Mô tả | File chạy |
|---------|-------|-----------|
| `news-agent.service` | Tin kinh tế & vĩ mô | `/root/news_agent/daemon.py` |
| `quote-agent.service` | Châm ngôn tâm lý | `/root/quote_agent/quote_daemon.py` |
| `nghetrading-telegram-bot.service` | Bot hỗ trợ Telegram | `/root/telegram_assistant/assistant_bot.py` |

Lệnh quản lý nhanh:
```bash
systemctl status news-agent.service --no-pager
systemctl restart news-agent.service
systemctl stop news-agent.service
tail -n 30 /root/news_agent/news.log
```

### Crontab (Báo cáo Telegram)
```
0 6 * * *   python3 /root/telegram_assistant/daily_reporter.py --report morning
0 22 * * *  python3 /root/telegram_assistant/daily_reporter.py --report evening
```

---

## 5. Quy tắc khi chỉnh sửa code

1. **Chỉ tập trung 100% vào Nghề Trading.** Tuyệt đối không can thiệp vào các dự án khác trên VPS (n8n của dự án khác, traicainghien, may_agent...).
2. **Sửa trực tiếp luồng cũ, không tạo luồng mới.** Giữ nguyên Workflow ID, Webhook, file cấu hình.
3. **Không dùng Bootstrap, Tailwind, jQuery, framework JS.** Ưu tiên HTML/CSS/JS thuần.
4. **CSS:** Không tạo CSS trùng, tận dụng class cũ, responsive Desktop (1200px+), Tablet (768px), Mobile (375px).
5. **HTML:** Semantic HTML, Accessibility, SEO & Open Graph Meta Tags.
6. **JS:** Không làm chậm website, không thêm animation nặng, đảm bảo Console sạch lỗi.

---

## 6. Kiểm tra trạng thái nhanh (trên VPS)

```bash
# n8n container & workflow
docker ps | grep n8n
sqlite3 /root/n8n_data/database.sqlite "select id,name,active from workflow_entity where id='nCdYu9TcfeITfJ7q';"

# Dịch vụ hệ thống
systemctl is-active news-agent.service
systemctl is-active quote-agent.service
systemctl is-active nghetrading-telegram-bot.service

# Website
curl -I https://nghetrading.com/index.html | head -1
```

---

## 7. Liên hệ & Xung hô

- Gọi người dùng: **ĐẠI KA** (viết hoa).
- Xưng自己: **EM (CHÓ 🐶)** - Phụ trách Website Nghề Trading.
- Telegram cá nhân ĐẠI KA: `@longphibtc` (chỉ dùng cho điểm chạm đã vào phễu / nhạy cảm).
- Bot hỗ trợ tự động: `@NgheTradingSupport_Bot` (khách chưa vào phễu).

---
