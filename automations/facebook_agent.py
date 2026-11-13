import os
from dotenv import load_dotenv
load_dotenv()
import re
import json
import time
import sqlite3
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from google import genai

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("FacebookAgent")

# ================= CẤU HÌNH CỐT LÕI FANPAGE =================
PAGE_ID = "1103661363146221"
PAGE_ACCESS_TOKEN = os.getenv("FB_PAGE_TOKEN")
TELEGRAM_GROUP_URL = "https://t.me/nhatkytradingvn"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "facebook.db")

# Bể chứa API Key Gemini (Multi-Key Pool tự động Failover) — đọc từ biến môi trường
def _load_gemini_keys():
    keys = []
    idx = 1
    while True:
        k = os.getenv(f"GEMINI_API_KEY_{idx}")
        if not k:
            break
        keys.append(k)
        idx += 1
    return keys

GEMINI_API_KEYS = _load_gemini_keys()

MODELS_TO_TRY = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash"]

def get_vn_time():
    vn_tz = timezone(timedelta(hours=7))
    return datetime.now(vn_tz)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS posted_facebook (
            id TEXT PRIMARY KEY,
            type TEXT,
            title TEXT,
            fb_post_id TEXT,
            posted_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def is_already_posted(item_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT 1 FROM posted_facebook WHERE id = ?", (item_id,))
    row = c.fetchone()
    conn.close()
    return row is not None

def mark_as_posted(item_id, item_type, title, fb_post_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now_str = get_vn_time().strftime("%Y-%m-%d %H:%M:%S")
    c.execute("INSERT OR REPLACE INTO posted_facebook VALUES (?, ?, ?, ?, ?)",
              (item_id, item_type, title, fb_post_id, now_str))
    conn.commit()
    conn.close()

def generate_gemini_content(prompt):
    """Gọi Gemini Multi-Key xoay vòng tự động failover"""
    for key_idx, api_key in enumerate(GEMINI_API_KEYS):
        client = genai.Client(api_key=api_key)
        for model in MODELS_TO_TRY:
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                if resp and resp.text:
                    return resp.text.strip()
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "403" in err_str:
                    logger.warning(f"Key #{key_idx+1} ({api_key[:12]}...) error {model}: {err_str[:80]}. Trying next...")
                    break
                else:
                    logger.warning(f"Model {model} failed: {err_str[:80]}")
    return None

def post_photo_to_facebook(image_url, caption):
    """Đăng bài dạng ảnh kèm nội dung lên Fanpage Nghề Trading"""
    url = f"https://graph.facebook.com/v21.0/{PAGE_ID}/photos"
    params = {
        "url": image_url,
        "caption": caption,
        "access_token": PAGE_ACCESS_TOKEN
    }
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            photo_id = res.get("id")
            post_id = res.get("post_id") or f"{PAGE_ID}_{photo_id}"
            logger.info(f"Đăng bài lên Facebook thành công! Post ID: {post_id}")
            return post_id
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        logger.error(f"Lỗi đăng ảnh Facebook: {err_msg}")
        return None
    except Exception as e:
        logger.error(f"Lỗi kết nối Facebook: {e}")
        return None

def like_facebook_post(post_id):
    """Like bài đăng Facebook ngay sau khi đăng thành công"""
    url = f"https://graph.facebook.com/v21.0/{post_id}/likes"
    params = {
        "access_token": PAGE_ACCESS_TOKEN
    }
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if res.get("success"):
                logger.info(f"Đã Like bài viết Facebook thành công! Post ID: {post_id}")
                return True
    except Exception as e:
        logger.error(f"Lỗi Like bài viết Facebook: {e}")
    return False

def add_comments_to_post(post_id, comments_list, delay_seconds=2):
    """
    Tạo danh sách các bình luận vào bài viết vừa đăng:
    - Comment 1: Kéo vào Website
    - Comment 2: Kéo vào Kênh Telegram phân tích & tin tức
    - Comment 3: Kéo vào Telegram tư vấn / tâm sự 1-1 với ĐẠI KA
    """
    results = []
    for idx, comment_text in enumerate(comments_list, 1):
        url = f"https://graph.facebook.com/v21.0/{post_id}/comments"
        params = {
            "message": comment_text,
            "access_token": PAGE_ACCESS_TOKEN
        }
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                comment_id = res.get('id')
                logger.info(f"Tạo comment #{idx} thành công! Comment ID: {comment_id}")
                results.append(comment_id)
        except Exception as e:
            logger.error(f"Lỗi tạo comment #{idx}: {e}")
            results.append(None)
        if idx < len(comments_list):
            time.sleep(delay_seconds)
    return results

def add_first_comment_to_post(post_id, comment_text):
    """Hàm tương thích cũ - thêm 1 bình luận vào bài viết"""
    return bool(add_comments_to_post(post_id, [comment_text]))

# ================= 1. BÀI TỐI 20H30: MỤC TƯ DUY GỐC =================
def run_evening_mindset_post():
    """Chạy lúc 20h30 tối hàng ngày: Biên tập 200 từ dẫn vào bài viết Tư Duy Gốc"""
    logger.info("=== BẮT ĐẦU CHẠY BÀI TỐI 20H30 (TƯ DUY GỐC) ===")
    init_db()

    # Tải danh sách bài viết Tư Duy Gốc từ web
    url_posts = "https://nghetrading.com/data/posts.json"
    try:
        req = urllib.request.Request(url_posts, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            posts = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Không thể tải posts.json: {e}")
        return False

    # Chọn 1 bài chưa từng đăng
    selected_post = None
    for p in posts:
        slug = p.get("slug")
        if slug and not is_already_posted(f"mindset_{slug}"):
            selected_post = p
            break

    # Nếu đã đăng hết, chọn ngẫu nhiên 1 bài
    if not selected_post and posts:
        import random
        selected_post = random.choice(posts)

    if not selected_post:
        logger.warning("Không tìm thấy bài viết tư duy nào phù hợp.")
        return False

    title = selected_post.get("title", "")
    slug = selected_post.get("slug", "")
    excerpt = selected_post.get("excerpt", "")
    image_url = selected_post.get("thumb") or "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080"
    article_link = f"https://nghetrading.com/posts/{slug}.html"

    # Gọi Gemini viết bài diễn giải ~200 từ
    prompt = f"""Bạn là Admin kiêm trader thực chiến của trang 'Nghề Trading' (nghetrading.com).
Hãy viết một bài chia sẻ tâm lý & kỷ luật trading sâu sắc trên Facebook Fanpage (khoảng 180 - 220 từ) dựa trên chủ đề: "{title}".
Tóm tắt nội dung bài viết gốc: "{excerpt}".

YÊU CẦU BIÊN TẬP:
1. Giọng văn: Đanh thép, điềm tĩnh, thấu cảm sâu sắc nỗi đau của trader ("Nói chuyện cà phê nhưng tư duy viện nghiên cứu").
2. Chỉ ra điểm mù tâm lý hoặc sai lầm cờ bạc chí mạng mà hầu hết trader đều mắc phải.
3. Cuối bài, khéo léo dẫn người đọc bấm vào link bài viết gốc trên website để đọc đầy đủ:
👉 Đọc bài phân tích chi tiết tại: {article_link}
4. Kèm 3-4 hashtag: #nghetrading #tuduytrading #tamlygiaodich #quantriruiro
5. Trình bày ngắt dòng thoáng, rõ ràng, KHÔNG dùng thẻ HTML phức tạp (Facebook chỉ hỗ trợ text thường)."""

    caption = generate_gemini_content(prompt)
    if not caption:
        caption = f"💡 {title.upper()}\n\n{excerpt}\n\nTrading không phải là cờ bạc may rủi, đó là bài toán về xác suất, quản trị rủi ro và sự kiên nhẫn tích lũy lợi thế qua hàng nghìn lệnh.\n\n👉 Đọc trọn vẹn bài viết tại: {article_link}\n\n#nghetrading #tuduytrading #tamlygiaodich"

    # Đăng bài lên Facebook
    post_id = post_photo_to_facebook(image_url, caption)
    if post_id:
        mark_as_posted(f"mindset_{slug}", "mindset", title, post_id)
        # 1. Like bài đăng ngay khi đăng xong
        like_facebook_post(post_id)
        # 2. Tạo 3 bình luận điều hướng: Website, Kênh Telegram, Telegram tư vấn 1-1
        comments = [
            f"💡 Đọc trọn bộ các bài viết phân tích tư duy xác suất, tâm lý hành vi và kỷ luật quản trị vốn thực chiến tại website Nghề Trading:\n👉 {article_link}",
            "📊 Tham gia Kênh Telegram cập nhật liên tục kế hoạch giao dịch Vàng (XAU/USD), tin tức vĩ mô và phân tích kỹ thuật mỗi ngày:\n👉 https://t.me/nhatkytradingvn",
            "☕ Trading là hành trình cô độc. Nếu anh em đang bế tắc tâm lý, gồng lỗ hay cần tháo gỡ điểm mù trong hệ thống, cứ nhắn riêng mình tại đây (mình đọc và trao đổi trực tiếp, không qua bot):\n👉 https://t.me/longphibtc"
        ]
        add_comments_to_post(post_id, comments, delay_seconds=2)
        return True
    return False

# ================= 2. BÀI SÁNG 10H00: KẾ HOẠCH GIAO DỊCH VÀNG NGÀY =================
def clean_html_to_facebook_text(html_content):
    """
    Chuyển đổi HTML của nhật ký thành định dạng văn bản sạch, tinh tế cho Facebook:
    - Loại bỏ hoàn toàn các dòng kỹ thuật rác: 'Gold   OANDA:XAUUSD', 'longphibtc'
    - Loại bỏ hashtag bị lặp ở thân bài
    - Chuẩn hóa bullet list thoáng đãng
    """
    text = html_content.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = re.sub(r'<p class="pt-bullet">-?\s*', '\n• ', text)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'<p[^>]*>', '', text)
    text = re.sub(r'<[^>]+>', '', text)

    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append('')
            continue

        # 1. Bỏ dòng mã cặp tiền / sàn / ticker kỹ thuật
        if re.search(r'^(gold|bitcoin|btc|xau)\s+.*(oanda|binance|tradingview|xauusd|btcusd)', stripped, re.IGNORECASE):
            continue
        if re.match(r'^(gold|xau/usd|xauusd|oanda:xauusd)$', stripped, re.IGNORECASE):
            continue

        # 2. Bỏ tên tác giả / username cá nhân
        if re.match(r'^longphibtc$', stripped, re.IGNORECASE):
            continue

        # 3. Bỏ hashtag đơn lẻ ở thân bài
        if re.match(r'^#\w+$', stripped):
            continue

        cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)
    # Dọn dẹp khoảng trắng dư thừa
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


def run_morning_gold_plan_post():
    """Chạy lúc 10h00 sáng từ Thứ 2 đến Thứ 6: Đăng kế hoạch giao dịch Vàng ngày"""
    logger.info("=== BẮT ĐẦU CHẠY BÀI SÁNG 10H00 (KẾ HOẠCH VÀNG NGÀY) ===")
    init_db()

    # Tải danh sách nhật ký từ web
    url_journal = "https://nghetrading.com/data/journal.json"
    try:
        req = urllib.request.Request(url_journal, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            journal_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Không thể tải journal.json: {e}")
        return False

    entries = journal_data if isinstance(journal_data, list) else journal_data.get("entries", [])

    # Lọc bài: Chỉ lấy các bài "Kế hoạch giao dịch vàng ngày...", BỎ bài "tuần"
    selected_plan = None
    for entry in entries:
        title = entry.get("title", "")
        title_lower = title.lower()

        # Bắt buộc chứa "kế hoạch giao dịch vàng ngày" và KHÔNG chứa "tuần"
        if ("kế hoạch giao dịch vàng ngày" in title_lower or "ke hoach giao dich vang ngay" in title_lower) and \
           ("tuần" not in title_lower and "tuan" not in title_lower):
            entry_id = entry.get("id")
            if not is_already_posted(f"gold_{entry_id}"):
                selected_plan = entry
                break

    if not selected_plan:
        logger.info("Không có bài Kế hoạch giao dịch vàng ngày mới nào chưa đăng hôm nay.")
        return False

    title = selected_plan.get("title", "")
    entry_id = selected_plan.get("id", "")
    content_html = selected_plan.get("content_html", "")
    cover_image = selected_plan.get("cover_image") or "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080"
    article_link = f"https://nghetrading.com/phan-tich.html?id={entry_id}"

    # Chuyển đổi nội dung bài viết sang text sạch
    body_text = clean_html_to_facebook_text(content_html)

    # Đóng gói bài viết đầy đủ theo đúng yêu cầu
    caption = f"""📊 {title.upper()}

{body_text}

----------------------------------------
👉 Xem chi tiết biểu đồ nến, góc nhìn kỹ thuật H4/H1 và các kịch bản tiếp theo tại website:
🔗 {article_link}

#nghetrading #kehoachgiaodich #vang #xauusd #priceaction"""

    # Đăng bài lên Facebook
    post_id = post_photo_to_facebook(cover_image, caption)
    if post_id:
        mark_as_posted(f"gold_{entry_id}", "gold_plan", title, post_id)
        # 1. Like bài đăng ngay khi đăng xong
        like_facebook_post(post_id)
        # 2. Tạo 3 bình luận điều hướng: Website, Kênh Telegram, Telegram tư vấn 1-1
        comments = [
            f"📌 Xem biểu đồ nến chi tiết, các kịch bản H4/H1 và vùng kích hoạt lệnh hôm nay tại website Nghề Trading:\n👉 {article_link}",
            "📊 Tham gia Kênh Telegram cập nhật liên tục biến động thị trường & kế hoạch giao dịch Vàng (XAU/USD) hàng ngày:\n👉 https://t.me/nhatkytradingvn",
            "☕ Anh em cần trao đổi thêm về các kịch bản vào lệnh hoặc chia sẻ về tâm lý giao dịch, nhắn riêng mình ở đây nhé (trao đổi trực tiếp người thật):\n👉 https://t.me/longphibtc"
        ]
        add_comments_to_post(post_id, comments, delay_seconds=2)
        return True
    return False

# ================= ĐIỀU PHỐI THỜI GIAN (DAEMON LOOP) =================
def main():
    logger.info("Starting Facebook Fanpage Automation Daemon for 'Nghề Trading'...")
    logger.info("Lịch chạy: 10:00 sáng Thứ 2-6 (Kế hoạch Vàng ngày) | 20:30 tối hàng ngày (Tư Duy Gốc)")
    init_db()

    last_morning_date = None
    last_evening_date = None

    while True:
        time.sleep(30) # Quét mỗi 30 giây
        now_vn = get_vn_time()
        current_date = now_vn.strftime("%Y-%m-%d")
        current_hour = now_vn.hour
        current_minute = now_vn.minute
        weekday = now_vn.weekday() # 0 = Thứ 2, 4 = Thứ 6, 6 = Chủ Nhật

        # 1. NHÁNH SÁNG: 10h00 sáng Thứ 2 - Thứ 6 (10:00 - 10:05)
        if weekday < 5 and current_hour == 10 and current_minute >= 0 and current_minute <= 5:
            if last_morning_date != current_date:
                logger.info(f"[{now_vn.strftime('%H:%M:%S')} VN] Kích hoạt bài sáng 10h00: Kế hoạch giao dịch vàng ngày...")
                try:
                    run_morning_gold_plan_post()
                except Exception as e:
                    logger.error(f"Lỗi bài sáng: {e}")
                last_morning_date = current_date

        # 2. NHÁNH TỐI: 20h30 tối hàng ngày (20:30 - 20:35)
        if current_hour == 20 and current_minute >= 30 and current_minute <= 35:
            if last_evening_date != current_date:
                logger.info(f"[{now_vn.strftime('%H:%M:%S')} VN] Kích hoạt bài tối 20h30: Tư duy gốc...")
                try:
                    run_evening_mindset_post()
                except Exception as e:
                    logger.error(f"Lỗi bài tối: {e}")
                last_evening_date = current_date

if __name__ == "__main__":
    import sys
    if "--trigger" in sys.argv:
        idx = sys.argv.index("--trigger")
        mode = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else ""
        if mode == "evening":
            run_evening_mindset_post()
        elif mode == "morning":
            run_morning_gold_plan_post()
        else:
            print("Usage: python facebook_agent.py [--trigger evening|morning]")
    else:
        main()
