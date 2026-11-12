# =============================================================================
# shared/db_wrapper.py - Wrapper SQLite đơn giản, tái sử dụng cho tất cả bot
# =============================================================================

import os
import sqlite3
import logging
from contextlib import contextmanager

logger = logging.getLogger("DbWrapper")


class SqliteDb:
    """
    Wrapper chọn connection SQLite.
    Cách dùng:
        db = SqliteDb("/path/to/db.sqlite")
        with db.connection() as conn:
            c = conn.cursor()
            c.execute("SELECT ...")
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

    @contextmanager
    def connection(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            conn.commit()
            return c

    def fetchone(self, sql: str, params: tuple = ()):
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            return c.fetchone()

    def fetchall(self, sql: str, params: tuple = ()):
        with self.connection() as conn:
            c = conn.cursor()
            c.execute(sql, params)
            return c.fetchall()
