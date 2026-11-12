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

# Thêm shared modules vào path
sys.path.insert(0, os.path.join(BASE_DIR, "shared"))

# ================= KHO QUOTE (tương đồng quote_bot trên VPS) =================
MASTER_BOOK_QUOTES = [
    {
        "id": "q_001",
        "author": "Mark Douglas",
        "book": "Trading in the Zone",
        "theme": "discipline_risk",
        "quote": "Sự nhất quán không đến từ việc biết trước thị trường, mà đến từ việc chấp nhận kết quả của mỗi lệnh.",
        "lesson": "Trader chuyên nghiệp không sợ thua một lệnh, họ sợ là không tuân thủ quy trình của mình."
    },
    {
        "id": "q_002",
        "author": "Alexander Elder",
        "book": "Trading for a Living",
        "theme": "journal_study",
        "quote": "Nhân bản thất bại là điều dễ dàng, nhân bản thành công là điều khó khăn vì thành công đòi hỏi kỷ luật.",
        "lesson": "Nhật ký giao dịch là công cụ quan trọng nhất để trader nhìn thấy mô hình hành vi của chính mình."
    },
    {
        "id": "q_003",
        "author": "Van Tharp",
        "book": "Trade Your Way to Financial Freedom",
        "theme": "zen_mindset",
        "quote": "Rủi ro không phải là điều cần tránh, mà là điều cần quản lý một cách chặt chẽ.",
        "lesson": "Quản trị rủi ro là tường防lé surrounds tài khoản của bạn, không phải là cái gì đó tùy chọn."
    },
    {
        "id": "q_004",
        "author": "Jesse Livermore",
        "book": "Cách thức kinh doanh và đầu cơ cổ phiếu",
        "theme": "wall_street_history",
        "quote": "Thị trường không bao giờ sai, chỉ có người tham gia thị trường mới sai.",
        "lesson": "Khi thị trường đi ngược lại với bạn, thị trường luôn đúng. Hãy chịu thua sớm và bảo toàn vốn."
    },
    {
        "id": "q_005",
        "author": "Annie Duke",
        "book": "Tư duy đặt cược (Thinking in Bets)",
        "theme": "casino_probability",
        "quote": "Quyết định tốt không đảm bảo kết quả tốt, và kết quả tốt không đảm bảo quyết định tốt.",
        "lesson": "Trader cần đánh giá quyết định dựa trên quá trình suy nghĩ, không chỉ dựa trên kết quả cuối cùng."
    },
    {
        "id": "q_006",
        "author": "Bob Volman",
        "book": "Understanding Price Action",
        "theme": "discipline_risk",
        "quote": "Price action là ngôn ngữ của thị trường, và những người biết đọc nó sẽ không bao giờ bị mù lòa.",
        "lesson": "Nến từ chối giá, cấu trúc đỉnh đáy và key level là những công cụ cốt lõi mà trader cần nắm vững."
    },
    {
        "id": "q_007",
        "author": "Michael Covel",
        "book": "Trend Following",
        "theme": "chess_strategy",
        "quote": "Xu hướng là bạn của bạn cho đến khi nó thay đổi, và việc thay đổi đó diễn ra nhanh hơn nhiều người nghĩ.",
        "lesson": "Không bao giờ chống lại xu hướng chính, hãy theo dòng chảy của thị trường chứ không phải đi ngang dòng."
    },
    {
        "id": "q_008",
        "author": "Jared Tendler",
        "book": "The Mental Game of Trading",
        "theme": "tam-ly-ky-luat",
        "quote": "Tâm lý không phải là thứ bạn bù đắp sau khi có lỗ, mà là thứ bạn đầu tư trước khi vào lệnh.",
        "lesson": "Kiểm soát cảm xúc là kỹ năng cốt lõi phân biệt trader thành công và trader thua lỗ."
    },
    {
        "id": "q_009",
        "author": "Mark Minervini",
        "book": "Giao Dịch Như Một Phù Thủy Chứng Khoán",
        "theme": "phuong-phap-ky-thuat",
        "quote": "Chỉ vào lệnh khi mọi điều kiện đều có lợi cho bạn, không phải chỉ vì bạn muốn vào lệnh.",
        "lesson": "Đứng ngoài khi thị trường không rõ ràng là một vị thế giao dịch hợp lệ và đáng lượng."
    },
    {
        "id": "q_010",
        "author": "Richard Weissman",
        "book": "Trade Like a Casino",
        "theme": "casino_probability",
        "quote": "Nhà cái không cần biết con tiếp theo ra gì, họ chỉ cần biết họ có lợi thế toán học trên dài hạn.",
        "lesson": "Trader nên tư duy như nhà cái: quản lý rủi ro từng lệnh, để xác suất làm việc cho mình trên hàng nghìn lệnh."
    },
]

# ================= POOL ẢNH UNIQUE (tương tự quote_bot) =================
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
        import sqlite3 as _sqlite3
        conn = _sqlite3.connect(self.db_path)
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
    db.execute("INSERT OR IGNORE INTO posted_quotes (quote_id, author, book, content) VALUES ('__seed__', 'seed', 'seed', 'seed')")
    db.execute("DELETE FROM posted_quotes WHERE quote_id = '__seed__'")
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


def format_quote_message(item):
    text = f"""📖 <b>TÂM LÝ GIAO DỊCH THỰC CHIẾN</b>

<i>"{item['quote']}"</i>
— <b>{item['author']}</b> ({item['book']})

💡 <b>Góc nhìn Nghề Trading:</b>
{item['lesson']}

👉 Tham gia nhóm Telegram cập nhật phân tích thị trường hàng ngày: {TELEGRAM_GROUP_URL}"""
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


def select_next_quote():
    init_db()
    for item in MASTER_BOOK_QUOTES:
        if not is_quote_posted(item["id"]):
            return item
    # Nếu đã đăng hết, chọn ngẫu nhiên 1 quote chưa được dùng ảnh
    return random.choice(MASTER_BOOK_QUOTES)


def run_quote_post():
    if not PAGE_ID_2 or not PAGE_ACCESS_TOKEN_2:
        logger.error("FB_PAGE_ID_2 hoặc FB_PAGE_ACCESS_TOKEN_2 chưa cấu hình trong .env")
        return False

    item = select_next_quote()
    theme = item.get("theme", DEFAULT_THEME)

    img_bytes, img_url = download_and_verify_unique_image(theme, item["id"])
    if not img_url:
        logger.warning("Không tìm thấy ảnh unique nào, sử dụng ảnh mặc định từ pool")
        pool = THEMATIC_IMAGE_POOLS.get(theme, THEMATIC_IMAGE_POOLS[DEFAULT_THEME])
        img_url = random.choice(pool)
        img_bytes = None

    content_html = format_quote_message(item)

    poster = FacebookPoster(PAGE_ID_2, PAGE_ACCESS_TOKEN_2)
    post_id = poster.post_photo(img_url, content_html)

    if post_id:
        mark_quote_posted(item["id"], item["author"], item["book"], content_html)
        logger.info(f"Đăng quote thành công: [{item['author']} | {item['book']}]")
        return True
    return False


if __name__ == "__main__":
    success = run_quote_post()
    if not success:
        sys.exit(1)
