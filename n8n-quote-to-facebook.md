# CẤU HÌNH N8N: QUOTE TELEGRAM → FANPAGE FB

## LUẬN SỬA LUỐNG CŨ
**Workflow ID:** `nCdYu9TcfeITfJ7q` (Facebook Fanpage AutoPost cũ)  
**Quy tắc:** EDIT TRỰC TIẾP luồng cũ, TUYỆT ĐỐI KHÔNG tạo workflow mới.

## LỊCH CHẠY
09h, 15h, 21h VN hàng ngày (cùng khung giờ kênh Telegram)  
Cron n8n: `0 9,15,21 * * *` — múi giờ `Asia/Ho_Chi_Minh`

## CÁC NODE CẦN THÊM VÀO WORKFLOW CŨ

### 1. Cron Trigger
| Trường | Giá trị |
|--------|---------|
| Tên | Chạy quote hàng ngày |
| Cron | `0 9,15,21 * * *` |
| Múi giờ | Asia/Ho_Chi_Minh |

### 2. Telegram Get Updates (lấy bài mới từ kênh)
| Trường | Giá trị |
|--------|---------|
| Phương thức | HTTP Request / Telegram node |
| URL | `https://api.telegram.org/bot{{TELEGRAM_BOT_TOKEN_QUOTE}}/getUpdates` |
| Lọc | Bài mới nhất từ kênh `@quotetradingvn` |

### 3. Function — Định dạng nội dung FB
**Code:**
```javascript
const text = $json.message?.text || $json.channel_post?.text || "";
// Xóa xuống dòng thừa, giữ khoảng cách thoáng
const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
const fbContent = cleaned + "\n\n" +
  "Đừng học thêm một mô hình nến nữa. Bạn đã học đủ rồi. Vấn đề nằm ở chỗ khác, và nó ở đây → nghetrading.com/bai-viet.html\n" +
  "Đã đến lúc coi trading là 1 nghề nghiệp thật sự nghiêm túc.";
return [{ fb_content: fbContent }];
```

### 4. Facebook Graph API — Đăng bài lên Fanpage
| Trường | Giá trị |
|--------|---------|
| Method | POST |
| URL | `https://graph.facebook.com/v18.0/{{FB_PAGE_ID_2}}/feed` |
| Body `message` | `{{ $json.fb_content }}` |
| Body `access_token` | `{{ FB_PAGE_ACCESS_TOKEN_2 }}` (lưu trong n8n Credentials) |

**Output:** `post_id`

### 5. Facebook Graph API — Comment đầu tiên
| Trường | Giá trị |
|--------|---------|
| Method | POST |
| URL | `https://graph.facebook.com/v18.0/{{ $json.post_id }}/comments` |
| Body `message` | `👉 Anh em tham gia nhóm Telegram cập nhật phân tích thị trường & nhận định về Vàng (XAU/USD) hàng ngày tại đây nhé: https://t.me/nhatkytradingvn` |
| Body `access_token` | `{{ FB_PAGE_ACCESS_TOKEN_2 }}` |

### 6. Telegram Notify — Báo vào Topic 22
| Trường | Giá trị |
|--------|---------|
| Nơi gửi | Chat hệ sinh thái, thread `22` |
| Nội dung | `✅ Đã post quote lên Fanpage tamlygiaodich lúc {{ $now }}` |

## LƯU Ý BẢO MẬT
- `FB_PAGE_ACCESS_TOKEN_2` KHÔNG được lưu vào file code, KHÔNG commit lên GitHub.
- Nhập token vào **n8n Credentials** (mã hóa an toàn).
- Chỉ commit file `.env.example` (mẫu không có giá trị thật) và file hướng dẫn này.

## FILE LIÊN QUAN TRONG REPO
| File | Mục đích |
|------|----------|
| `.env.example` | Mẫu cấu hình (không có token thật) |
| `n8n-quote-to-facebook.md` | Hướng dẫn chi tiết (file này) |