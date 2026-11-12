# Hướng dẫn áp dụng mã tối ưu vào VPS (Nghê Trading)

## 1. Cấu trúc thư mục trên VPS

```
/root/telegram_assistant/
├── daily_reporter.py          (sửa dùng shared modules)
├── assistant_bot.py           (sửa dùng shared modules)
├── ga-credentials.json
└── shared/                    <-- copy từ repo local vào đây
    ├── __init__.py
    ├── gemini_pool.py
    ├── telegram_sender.py
    ├── db_wrapper.py
    └── vps_connect.py

/root/facebook_agent/
├── facebook_agent.py          (sửa dùng shared modules)
├── facebook.db
└── shared/                    <-- copy từ repo local vào đây
    ├── __init__.py
    ├── gemini_pool.py
    ├── facebook_poster.py
    └── vps_connect.py

/root/news_agent/
├── news_bot.py                (sửa dùng shared modules)
├── daemon.py
└── shared/                    <-- copy từ repo local vào đây

/root/quote_agent/
├── quote_bot.py               (sửa dùng shared modules)
├── quote_daemon.py
└── shared/                    <-- copy từ repo local vào đây
```

## 2. Cách cài đặt trên VPS

```bash
# Tạo thư mục shared trên mỗi agent
mkdir -p /root/telegram_assistant/shared
mkdir -p /root/facebook_agent/shared
mkdir -p /root/news_agent/shared
mkdir -p /root/quote_agent/shared

# Copy các file shared từ repo local lên VPS (qua scp / sftp)
# Ví dụ:
scp shared/*.py root@103.157.218.111:/root/telegram_assistant/shared/
scp shared/*.py root@103.157.218.111:/root/facebook_agent/shared/

# Tạo file .env trên VPS (không commit lên git)
cat > /root/telegram_assistant/.env <<'EOF'
TELEGRAM_BOT_TOKEN=...
ADMIN_CHAT_ID=488901419
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...
GA_PROPERTY_ID=547085712
GA_KEY_FILE=/root/telegram_assistant/ga-credentials.json
N8N_DB_PATH=/root/n8n_data/database.sqlite
N8N_WORKFLOW_ID=nCdYu9TcfeITfJ7q
EOF

# Thêm dòng load_dotenv() vào đầu mỗi file .py chính
# Ví dụ đầu file daily_reporter.py:
# import os
# from dotenv import load_dotenv
# load_dotenv()
```

## 3. Lợi ích sau khi refactor

| Vấn đề trước | Giải pháp sau |
|--------------|---------------|
| Hàm Gemini multi-key trùng lặp trong 5 file | Dùng `shared/gemini_pool.py` |
| Hàm gửi Telegram trùng lặp | Dùng `shared/telegram_sender.py` |
| Mở/đóng SQLite lặp lại | Dùng `shared/db_wrapper.py` |
| Facebook API không retry | Dùng `shared/facebook_poster.py` (có retry) |
| Secret hardcode trong code | Dùng `os.getenv()` + file `.env` |
| Script SSH hardcode mật khẩu | Dùng `shared/vps_connect.py` + `.env` |

## 4. Kiểm tra sau khi deploy

```bash
# Kiểm tra các service còn chạy
systemctl is-active news-agent.service
systemctl is-active quote-agent.service
systemctl is-active nghetrading-telegram-bot.service

# Kiểm tra n8n workflow
docker ps | grep n8n

# Chạy thử báo cáo sáng / tối
python3 /root/telegram_assistant/daily_reporter.py --report morning
python3 /root/telegram_assistant/daily_reporter.py --report evening
```
