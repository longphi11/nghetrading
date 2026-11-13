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
const raw = $input.first().json.data || '';
const wraps = String(raw).split('class="tgme_widget_message_wrap');
if (wraps.length < 2) return [];

const block = wraps[wraps.length - 1];

// 1. Lay message_id tu link bai trong kenh Telegram
let message_id = 0;
const mId = block.match(/t\.me\/[^"'\s]+\/(\d+)/);
if (mId) message_id = parseInt(mId[1], 10);

// 2. Lay noi dung text
const parts = block.split('class="tgme_widget_message_text');
if (parts.length < 2) return [];
let seg = parts[1];
seg = seg.slice(seg.indexOf('>') + 1);
seg = seg.slice(0, seg.indexOf('</div>'));
let text = seg
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const cut = text.indexOf('======');
if (cut > 0) text = text.slice(0, cut).trim();
if (!text) return [];

// 3. Lay anh
let photo_url = '';
const mPhoto = block.match(/background-image:url\('(https:\/\/cdn\d*\.telesco\.pe\/[^']+)'\)/);
if (mPhoto) photo_url = mPhoto[1];

// 4. Chong dang trung (nang cap): luu danh sach message_id da dang + hash noi dung FNV-1a
const store = $getWorkflowStaticData('global') || {};
const postedIds = Array.isArray(store.postedIds) ? store.postedIds : [];

function stableHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

const contentHash = stableHash(text + '|' + photo_url);

// Neu message_id da tung dang -> bo qua
if (message_id && postedIds.includes(message_id)) return [];

// Neu noi dung trung (du id khac, vui repost bai cu) -> bo qua
if (store.lastContentHash === contentHash) return [];

// Luu trang thai moi
postedIds.push(message_id);
if (postedIds.length > 100) postedIds.shift();
store.postedIds = postedIds;
store.lastContentHash = contentHash;
store.lastMessageId = message_id;
$setWorkflowStaticData('global', store);

const cta = '\n\n' +
  'Dung hoc them mot mo hien nen nua. Ban da hoc du roi. Van de nam o cho khac, va no o day -> nghetrading.com/bai-viet.html\n' +
  'Da den luc coi trading la 1 nghiep nghiem that suc nghiem tuc.';
return [{ fb_content: text + cta, photo_url, message_id, content_hash: contentHash }];
```

**Logic chống đăng trùng (mới):**
- Lấy `message_id` bài Telegram từ link trong khung HTML (`t.me/<kenh>/<id>`).
- Lưu **danh sách** `postedIds` (giới hạn 100 bài gần nhất) vào workflow static data (`global`).
- Nếu `message_id` đã từng đăng (trong danh sách) → bỏ qua.
- Tính hash nội dung + ảnh bằng **FNV-1a** (ổn định, không overflow). Nếu `lastContentHash` trùng (dù id khác, vui repost bài cũ) → bỏ qua.
- Chỉ đăng khi cả hai điều kiện đều mới.

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