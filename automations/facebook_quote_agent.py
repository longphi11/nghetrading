import os
import re
import sys
import json
import time
import sqlite3
import logging
import random
import hashlib
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("FacebookQuoteAgent")

# ================= CẤU HÌNH FANPAGE THỨ 2 =================
PAGE_ID_2 = os.getenv("FB_PAGE_ID_2")
PAGE_ACCESS_TOKEN_2 = os.getenv("FB_PAGE_ACCESS_TOKEN_2")
TELEGRAM_GROUP_URL = "https://t.me/nhatkytradingvn"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "facebook_quote.db")

# ================= CTA & COMMENT ĐẦU TIÊN =================
CTA_FOOTER = "\n\n----------------------------------------\nĐừng học thêm một mô hình nến nữa. Bạn đã học đủ rồi. Vấn đề nằm ở chỗ khác, và nó ở đây → nghetrading.com/bai-viet.html\nĐã đến lúc coi trading là 1 nghề nghiệp thật sự nghiêm túc."

FIRST_COMMENT = "👉 Anh em tham gia nhóm Telegram cập nhật phân tích thị trường & nhận định về Vàng (XAU/USD) hàng ngày tại đây nhé: https://t.me/nhatkytradingvn"

# ================= POOL ẢNH UNIQUE =================
THEMATIC_IMAGE_POOLS = {
    "discipline_risk": [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1080&auto=format&fit=crop&q=80",
    ],
    "journal_study": [
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1080&auto=format&fit=crop&q=80",
    ],
    "zen_mindset": [
        "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1610375461369-d613b564f4c4?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1589758438368-0ad531db3366?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1080&auto=format&fit=crop&q=80",
    ],
    "wall_street_history": [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1080&auto=format&fit=crop&q=80",
    ],
    "casino_probability": [
        "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&auto=format&fit=crop&q=80",
    ],
    "chess_strategy": [
        "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1080&auto=format&fit=crop&q=80",
    ],
    "tam-ly-ky-luat": [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1080&auto=format&fit=crop&q=80",
    ],
    "phuong-phap-ky-thuat": [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1080&auto=format&fit=crop&q=80",
    ],
    "tu-duy-xac-suat": [
        "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&auto=format&fit=crop&q=80",
    ],
}

DEFAULT_THEME = "discipline_risk"


def get_canonical_image_id(url):
    m = re.search(r'(photo-[a-zA-Z0-9_-]+)', url)
    if m:
        return f"unsplash:{m.group(1)}"
    return f"url_hash:{hashlib.md5(url.encode('utf-8')).hexdigest()}"


class SqliteDb:
    def __init__(self, db_path):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

    def connection(self):
        conn = sqlite3.connect(self.db_path)
        return conn

    def execute(self, sql, params=()):
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            conn.commit()
            return c

    def fetchone(self, sql, params=()):
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            return c.fetchone()

    def fetchall(self, sql, params=()):
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            return c.fetchall()


def init_db():
    db = SqliteDb(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS posted_quotes (
            quote_id TEXT PRIMARY KEY,
            author TEXT,
            book TEXT,
            content TEXT,
            posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS used_images (
            canonical_id TEXT PRIMARY KEY,
            image_hash TEXT,
            image_url TEXT,
            theme TEXT,
            quote_id TEXT,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    logger.info(f"DB initialized at {DB_PATH}")


def is_quote_posted(quote_id):
    db = SqliteDb(DB_PATH)
    row = db.fetchone("SELECT 1 FROM posted_quotes WHERE quote_id = ?", (quote_id,))
    return row is not None


def mark_quote_posted(quote_id, author, book, content):
    db = SqliteDb(DB_PATH)
    db.execute("""
        INSERT OR REPLACE INTO posted_quotes (quote_id, author, book, content)
        VALUES (?, ?, ?, ?)
    """, (quote_id, author, book, content))


def is_image_used(image_url, image_hash=None):
    db = SqliteDb(DB_PATH)
    cid = get_canonical_image_id(image_url)
    if image_hash:
        row = db.fetchone(
            "SELECT 1 FROM used_images WHERE canonical_id = ? OR image_hash = ? OR image_url = ?",
            (cid, image_hash, image_url)
        )
    else:
        row = db.fetchone(
            "SELECT 1 FROM used_images WHERE canonical_id = ? OR image_url = ?",
            (cid, image_url)
        )
    return row is not None


def record_used_image(image_url, image_hash, theme, quote_id):
    db = SqliteDb(DB_PATH)
    cid = get_canonical_image_id(image_url)
    db.execute("""
        INSERT OR REPLACE INTO used_images (canonical_id, image_hash, image_url, theme, quote_id)
        VALUES (?, ?, ?, ?, ?)
    """, (cid, image_hash, image_url, theme, quote_id))


def download_and_verify_unique_image(theme, quote_id):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    pool = list(THEMATIC_IMAGE_POOLS.get(theme, THEMATIC_IMAGE_POOLS[DEFAULT_THEME]))
    random.shuffle(pool)

    for candidate_url in pool:
        if is_image_used(candidate_url):
            continue
        try:
            req = urllib.request.Request(candidate_url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                if r.status == 200 and "image" in r.headers.get("Content-Type", ""):
                    img_bytes = r.read()
                    img_hash = hashlib.md5(img_bytes).hexdigest()
                    if is_image_used(candidate_url, img_hash):
                        continue
                    record_used_image(candidate_url, img_hash, theme, quote_id)
                    logger.info(f"Verified unique image for [{theme}]: {candidate_url}")
                    return img_bytes, candidate_url
        except Exception as e:
            logger.warning(f"Error downloading {candidate_url}: {e}")

    return None, None


def format_quote_message(quote_text, author):
    text = f"""📖 <b>TÂM LÝ GIAO DỊCH THỰC CHIẾN</b>

<i>"{quote_text}"</i>
— <b>{author}</b>

👉 Tham gia nhóm Telegram cập nhật phân tích thị trường hàng ngày: {TELEGRAM_GROUP_URL}{CTA_FOOTER}"""
    return text.strip()


class FacebookPoster:
    def __init__(self, page_id, page_token, api_version="v21.0"):
        self.page_id = page_id
        self.page_token = page_token
        self.api_version = api_version

    def _url(self, endpoint):
        return f"https://graph.facebook.com/{self.api_version}/{endpoint}"

    def post_photo(self, image_url, caption, retries=2, timeout=30):
        import urllib.error
        url = self._url(f"{self.page_id}/photos")
        params = {"url": image_url, "caption": caption, "access_token": self.page_token}
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        last_err = None
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    photo_id = res.get("id")
                    post_id = res.get("post_id") or f"{self.page_id}_{photo_id}"
                    logger.info(f"Đăng Facebook thành công! Post ID: {post_id}")
                    return post_id
            except urllib.error.HTTPError as e:
                last_err = e.read().decode("utf-8")
                logger.error(f"Lỗi HTTP đăng Facebook (lần {attempt+1}): {last_err}")
            except Exception as e:
                last_err = str(e)
                logger.error(f"Lỗi kết nối Facebook (lần {attempt+1}): {e}")
            time.sleep(2)
        return None

    def add_first_comment(self, post_id, comment_text, retries=2, timeout=15):
        import urllib.error
        url = self._url(f"{post_id}/comments")
        params = {"message": comment_text, "access_token": self.page_token}
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    logger.info(f"Tạo comment đầu tiên thành công! Comment ID: {res.get('id')}")
                    return True
            except Exception as e:
                logger.error(f"Lỗi tạo comment đầu tiên (lần {attempt+1}): {e}")
                time.sleep(1)
        return False


def run_quote_post():
    if not PAGE_ID_2 or not PAGE_ACCESS_TOKEN_2:
        logger.error("FB_PAGE_ID_2 hoặc FB_PAGE_ACCESS_TOKEN_2 chưa cấu hình trong .env")
        return False

    init_db()

    # Lấy quote từ static pool
    static_quotes = [
        {"id": "sq_001", "quote": "Sự nhất quán không đến từ việc biết trước thị trường, mà từ việc chấp nhận kết quả của mỗi lệnh.", "author": "Mark Douglas", "theme": "discipline_risk"},
        {"id": "sq_002", "quote": "Rủi ro không phải là điều cần tránh, mà là điều cần quản lý một cách chặt chẽ.", "author": "Van Tharp", "theme": "zen_mindset"},
        {"id": "sq_003", "quote": "Thị trường không bao giờ sai, chỉ có người tham gia thị trường mới sai.", "author": "Jesse Livermore", "theme": "wall_street_history"},
        {"id": "sq_004", "quote": "Quyết định tốt không đảm bảo kết quả tốt, và kết quả tốt không đảm bảo quyết định tốt.", "author": "Annie Duke", "theme": "casino_probability"},
        {"id": "sq_005", "quote": "Chỉ vào lệnh khi mọi điều kiện đều có lợi cho bạn, không phải chỉ vì bạn muốn vào lệnh.", "author": "Mark Minervini", "theme": "phuong-phap-ky-thuat"},
        {"id": "sq_006", "quote": "Kiểm soát cảm xúc là kỹ năng cốt lõi phân biệt trader thành công và trader thua lỗ.", "author": "Jared Tendler", "theme": "tam-ly-ky-luat"},
        {"id": "sq_007", "quote": "Price action là ngôn ngữ của thị trường, và những người biết đọc nó sẽ không bao giờ bị mù lòa.", "author": "Bob Volman", "theme": "phuong-phap-ky-thuat"},
        {"id": "sq_008", "quote": "Nhân bản thất bại là điều dễ dàng, nhân bản thành công là điều khó khăn vì thành công đòi hỏi kỷ luật.", "author": "Alexander Elder", "theme": "journal_study"},
        {"id": "sq_009", "quote": "Chấp nhận lỗ là bước đầu tiên để dừng chक्र spiraling xuống lề.", "author": "Mark Douglas", "theme": "discipline_risk"},
        {"id": "sq_010", "quote": "Tâm lý không phải là thứ bạn bù đắp sau khi có lỗ, mà là thứ bạn đầu tư trước khi vào lệnh.", "author": "Jared Tendler", "theme": "tam-ly-ky-luat"},
        {"id": "sq_011", "quote": "Nhà cái không cần biết con tiếp theo ra gì, họ chỉ cần biết họ có lợi thế toán học trên dài hạn.", "author": "Richard Weissman", "theme": "casino_probability"},
        {"id": "sq_012", "quote": "Khi thị trường đi ngược lại với bạn, thị trường luôn đúng. Hãy chịu thua sớm và bảo toàn vốn.", "author": "Jesse Livermore", "theme": "wall_street_history"},
        {"id": "sq_013", "quote": "Ít hơn là nhiều hơn. Tập trung vào 20% yếu tố tạo ra 80% kết quả.", "author": "Nghê Trading", "theme": "discipline_risk"},
        {"id": "sq_014", "quote": "Không vào lệnh đôi khi là lệnh tốt nhất của ngày.", "author": "Nghê Trading", "theme": "zen_mindset"},
        {"id": "sq_015", "quote": "Chart không nói dối, còn tin tức có thể bị distortions.", "author": "Nghê Trading", "theme": "phuong-phap-ky-thuat"},
        {"id": "sq_016", "quote": "Quản trị rủi ro là tường phòng surrounds tài khoản của bạn, không phải là cái gì đó tùy chọn.", "author": "Van Tharp", "theme": "zen_mindset"},
        {"id": "sq_017", "quote": "Tự do trong trading đến từ kỷ luật, không phải từ việc làm theo ý thích của mình.", "author": "Nghê Trading", "theme": "tam-ly-ky-luat"},
        {"id": "sq_018", "quote": "Có kế hoạch trước khi vào lệnh mới là khác biệt lớn nhất giữa trader và cờ bạc.", "author": "Nghê Trading", "theme": "phuong-phap-ky-thuat"},
        {"id": "sq_019", "quote": "Winning rate cao không quan trọng nếu risk/reward không được kiểm soát chặt chẽ.", "author": "Van Tharp", "theme": "casino_probability"},
        {"id": "sq_020", "quote": "Mỗi ngày trong trading đều là một bài học mới, hãy tận hưởng quá trình chứ không chỉ kết quả.", "author": "Nghê Trading", "theme": "tu-duy-xac-suat"},
    ]
    # Chọn static quote chưa đăng
    selected = None
    for sq in static_quotes:
        if not is_quote_posted(sq["id"]):
            selected = sq
            break
    if not selected:
        logger.info("Tất cả static quote đã đăng, bỏ qua lần này.")
        return False
    quote_id = selected["id"]
    quote_text = selected["quote"]
    author = selected["author"]
    theme = selected["theme"]
    logger.info(f"Dùng static quote: [{author} | {theme}]")

    if is_quote_posted(quote_id):
        logger.info(f"Quote {quote_id} đã đăng rồi, bỏ qua.")
        return False

if __name__ == "__main__":
    success = run_quote_post()
    if not success:
        sys.exit(1)
