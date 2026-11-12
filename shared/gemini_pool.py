# =============================================================================
# shared/gemini_pool.py - Multi-key Gemini client với failover tự động
# Dùng chung cho tất cả bot: facebook_agent, daily_reporter, news_bot, quote_bot, assistant_bot
# =============================================================================

import os
import logging
import time
from google import genai

logger = logging.getLogger("GeminiPool")


class GeminiPool:
    """
    Quản lý bể chứa API Key Gemini với cơ chế xoay vòng & failover.
    Cách dùng:
        pool = GeminiPool()
        text = pool.generate(prompt)
    """

    def __init__(self, models=None, keys=None):
        # Đọc keys từ env: GEMINI_API_KEY_1 .. GEMINI_API_KEY_N
        if keys is None:
            keys = []
            idx = 1
            while True:
                key = os.getenv(f"GEMINI_API_KEY_{idx}")
                if not key:
                    break
                keys.append(key)
                idx += 1

        self.keys = keys
        self.models = models or [
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-2.5-flash",
        ]
        self.key_idx = 0
        self.model_idx = 0

        if not self.keys:
            logger.warning("Chưa cấu hình GEMINI_API_KEY_* trong môi trường.")

    def generate(self, prompt: str, system_instruction: str = None) -> str:
        """
        Gọi Gemini với multi-key failover.
        Trả về chuỗi văn bản hoặc rỗng nếu tất cả key/model đều lỗi.
        """
        full_prompt = f"{system_instruction}\n\n[YÊU CẦU / CÂU HỎI]:\n{prompt}" if system_instruction else prompt

        for k in range(len(self.keys)):
            api_key = self.keys[self.key_idx % len(self.keys)]
            self.key_idx += 1
            try:
                client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Không khởi tạo Gemini Client với key #{self.key_idx}: {e}")
                continue

            for m in self.models:
                try:
                    resp = client.models.generate_content(model=m, contents=full_prompt)
                    if resp and resp.text:
                        return resp.text.strip()
                except Exception as model_err:
                    err_str = str(model_err)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "403" in err_str:
                        logger.warning(f"Key #{self.key_idx} ({api_key[:12]}...) hết hạn trên {model}. Sang key tiếp theo...")
                        break
                    else:
                        logger.warning(f"Model {model} lỗi: {err_str[:80]}")
                        time.sleep(0.5)

        return ""

    def ping(self) -> str:
        """Kiểm tra kết nối Gemini, trả về tên model thành công hoặc rỗng."""
        for k in range(len(self.keys)):
            api_key = self.keys[self.key_idx % len(self.keys)]
            self.key_idx += 1
            try:
                client = genai.Client(api_key=api_key)
                for m in self.models:
                    try:
                        resp = client.models.generate_content(model=m, contents="ping")
                        if resp and resp.text:
                            return m
                    except Exception:
                        continue
            except Exception:
                continue
        return ""
