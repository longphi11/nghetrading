# =============================================================================
# shared/facebook_poster.py - Đăng bài lên Fanpage Facebook (có retry)
# =============================================================================

import os
import json
import logging
import urllib.request
import urllib.parse
import time

logger = logging.getLogger("FacebookPoster")


class FacebookPoster:
    """
    Đăng ảnh + caption lên Fanpage Facebook.
    Cách dùng:
        poster = FacebookPoster(page_id=os.getenv("FB_PAGE_ID"), token=os.getenv("FB_PAGE_TOKEN"))
        post_id = poster.post_photo(image_url, caption)
        if post_id:
            poster.add_comment(post_id, comment_text)
    """

    def __init__(self, page_id: str = None, page_token: str = None, api_version: str = "v21.0"):
        self.page_id = page_id or os.getenv("FB_PAGE_ID")
        self.page_token = page_token or os.getenv("FB_PAGE_TOKEN")
        self.api_version = api_version

    def _url(self, endpoint: str) -> str:
        return f"https://graph.facebook.com/{self.api_version}/{endpoint}"

    def post_photo(self, image_url: str, caption: str, retries: int = 2, timeout: int = 30):
        """
        Đăng ảnh kèm caption. Trả về post_id hoặc None.
        Tự động retry nếu lỗi tạm thời.
        """
        url = self._url(f"{self.page_id}/photos")
        params = {
            "url": image_url,
            "caption": caption,
            "access_token": self.page_token,
        }
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

    def like_post(self, post_id: str, retries: int = 2, timeout: int = 15) -> bool:
        """Like bài viết Facebook ngay sau khi đăng thành công."""
        url = self._url(f"{post_id}/likes")
        params = {"access_token": self.page_token}
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(url, data=data)

        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    if res.get("success"):
                        logger.info(f"Đã Like bài viết Facebook thành công! Post ID: {post_id}")
                        return True
            except Exception as e:
                logger.error(f"Lỗi Like bài viết Facebook (lần {attempt+1}): {e}")
                time.sleep(1)
        return False

    def add_comment(self, post_id: str, comment_text: str, retries: int = 2, timeout: int = 15) -> bool:
        """Thêm 1 bình luận vào bài viết."""
        url = self._url(f"{post_id}/comments")
        params = {
            "message": comment_text,
            "access_token": self.page_token,
        }
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(url, data=data)

        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    logger.info(f"Thêm comment thành công! Comment ID: {res.get('id')}")
                    return True
            except Exception as e:
                logger.error(f"Lỗi thêm comment (lần {attempt+1}): {e}")
                time.sleep(1)
        return False

    def add_comments(self, post_id: str, comments: list, delay: float = 2.0) -> list:
        """Thêm danh sách nhiều bình luận vào bài viết có delay chống spam."""
        results = []
        for idx, text in enumerate(comments, 1):
            ok = self.add_comment(post_id, text)
            results.append(ok)
            if idx < len(comments):
                time.sleep(delay)
        return results
