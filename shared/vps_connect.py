# =============================================================================
# shared/vps_connect.py - Kết nối VPS qua port knock + SSH (dùng biến môi trường)
# =============================================================================

import os
import sys
import time
import urllib.request
import paramiko
from dotenv import load_dotenv

load_dotenv()

VPS_HOST = os.getenv("VPS_HOST", "103.157.218.111")
VPS_PORT = int(os.getenv("VPS_PORT", "11985"))
VPS_USER = os.getenv("VPS_USER", "root")
VPS_PASS = os.getenv("VPS_PASS")
KNOCK_URL = os.getenv("PORT_KNOCK_URL", f"http://{VPS_HOST}:60000/C1sco1234")


def knock(port_knock_url: str = KNOCK_URL, attempts: int = 4, delay: float = 2.0) -> bool:
    """Knock port để mở cổng SSH trên VPS. Trả về True nếu thành công ít nhất 1 lần."""
    for i in range(attempts):
        try:
            req = urllib.request.Request(port_knock_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                body = r.read().decode().strip()[:50]
                print(f"Knock {i}: {r.status} {body}")
                return True
        except Exception as e:
            print(f"Knock {i} thất bại: {e}")
            time.sleep(delay)
    return False


def connect_ssh(
    host: str = VPS_HOST,
    port: int = VPS_PORT,
    user: str = VPS_USER,
    password: str = VPS_PASS,
    timeout: int = 25,
) -> paramiko.SSHClient:
    """Kết nối SSH vào VPS sau khi đã knock port."""
    if not password:
        raise ValueError("VPS_PASS chưa được cấu hình trong biến môi trường / file .env")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=port, username=user, password=password, timeout=timeout)
    print(f">>> SSH KẾT NỐI THÀNH CÔNG {host}:{port} <<<")
    return client


def exec_command(client: paramiko.SSHClient, command: str, timeout: int = 30):
    """Chạy lệnh trên VPS và trả về (stdout, stderr)."""
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


if __name__ == "__main__":
    # Ví dụ chạy độc lập: knock + SSH + uptime
    if not VPS_PASS:
        print("Lỗi: VPS_PASS chưa cấu hình trong .env")
        sys.exit(1)

    knock()
    time.sleep(4)
    client = connect_ssh()
    out, err = exec_command(client, "uptime")
    print(out)
    if err.strip():
        print("STDERR:", err)
    client.close()
