# =============================================================================
# shared/telegram_sender.py - Gửi tin nhắn Telegram chung cho tất cả bot
# =============================================================================

import os
import json
import logging
import urllib.request
import urllib.parse

logger = logging.getLogger("TelegramSender")


class TelegramSender:
    """
    Gửi tin nhắn / ảnh lên Telegram.
    Cách dùng:
        sender = TelegramSender(token=os.getenv("TELEGRAM_BOT_TOKEN"))
        sender.send_text(chat_id="-1004401199553", text="...", thread_id=22)
    """

    def __init__(self, token: str = None):
        self.token = token or os.getenv("TELEGRAM_BOT_TOKEN")
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN chưa được cấu hình.")

    def _api_url(self, method: str) -> str:
        return f"https://api.telegram.org/bot{self.token}/{method}"

    def send_text(
        self,
        chat_id: str | int,
        text: str,
        thread_id: int | None = None,
        parse_mode: str = "Markdown",
        disable_web_page_preview: bool = True,
    ) -> bool:
        """Gửi tin nhắn văn bản. Tự động fallback bỏ parse_mode nếu lỗi."""
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview,
        }
        if thread_id:
            payload["message_thread_id"] = thread_id

        return self._request("sendMessage", payload)

    def send_photo(
        self,
        chat_id: str | int,
        photo_bytes: bytes,
        filename: str,
        caption: str = "",
        thread_id: int | None = None,
        parse_mode: str = "HTML",
    ) -> bool:
        """Gửi ảnh kèm caption (multipart/form-data)."""
        import requests

        url = self._api_url("sendPhoto")
        data = {
            "chat_id": chat_id,
            "caption": caption,
            "parse_mode": parse_mode,
        }
        if thread_id:
            data["message_thread_id"] = thread_id
        files = {"photo": (filename, photo_bytes, "image/jpeg")}
        try:
            r = requests.post(url, data=data, files=files, timeout=20)
            if r.status_code == 200:
                return True
            logger.warning(f"sendPhoto lỗi HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            logger.error(f"Lỗi gửi ảnh Telegram: {e}")
        return False

    def send_article_with_preview(
        self,
        chat_id: str | int,
        caption: str,
        image_url: str,
        thread_id: int | None = None,
        max_chars: int = 4096,
    ) -> bool:
        """Gửi bài viết kèm link preview ảnh (dùng cho tin tức / quote)."""
        full_text = f'<a href="{image_url}">&#8203;</a>{caption}'.strip()
        if len(full_text) > max_chars:
            full_text = full_text[: max_chars - 20].strip() + "..."

        payload = {
            "chat_id": chat_id,
            "text": full_text,
            "parse_mode": "HTML",
            "link_preview_options": {
                "url": image_url,
                "is_disabled": False,
                "prefer_large_media": True,
                "show_above_text": True,
            },
        }
        if thread_id:
            payload["message_thread_id"] = thread_id

        return self._request("sendMessage", payload)

    def get_chat_member_count(self, chat_id: str | int) -> int | None:
        """Lấy số thành viên kênh / group."""
        url = f"{self._api_url('getChatMemberCount')}?chat_id={chat_id}"
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=8
            ) as r:
                data = json.loads(r.read().decode("utf-8"))
                return data.get("result")
        except Exception as e:
            logger.warning(f"Lỗi getChatMemberCount: {e}")
            return None

    def _request(self, method: str, payload: dict) -> bool:
        url = self._api_url(method)
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status == 200
        except Exception as e:
            logger.warning(f"Telegram {method} lỗi: {e}. Thử lại không parse_mode...")
            payload.pop("parse_mode", None)
            data = urllib.parse.urlencode(payload).encode("utf-8")
            try:
                with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=15) as r:
                    return r.status == 200
            except Exception as e2:
                logger.error(f"Telegram {method} lỗi lần 2: {e2}")
                return False
