# HỆ THỐNG QUẢN LÝ CÁC LUỒNG TỰ ĐỘNG HÓA VPS - NGHỀ TRADING

> Tài liệu chuẩn hóa cấu trúc, cấu hình và vận hành các luồng tự động hóa (Automation Pipelines / Workflows) phục vụ phát triển hệ sinh thái **Nghề Trading**.

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN TÁCH PHẠM VI

- **Môi trường vận hành:** VPS Linux (`103.157.218.111`), kiến trúc Native Systemd Daemons & Workflows tự động.
- **Quy tắc phân tách bảo mật (BẮT BUỘC):**
  - **CHỈ TẬP TRUNG 100% VÀO NGHỀ TRADING:** Mọi thao tác, báo cáo, thống kê và tài liệu chỉ gói gọn trong các dịch vụ và tài nguyên của dự án Nghề Trading (`/root/news_agent/`, `/root/quote_agent/`, database và bot liên quan).
  - **TUYỆT ĐỐI KHÔNG CAN THIỆP VÀO CÁC DỰ ÁN KHÁC:** Trên VPS có các dự án khác chạy song song (n8n, traicainghien, may_agent...), tuyệt đối không sửa đổi, không liệt kê hay can thiệp dưới bất kỳ hình thức nào.
  - **NGUYÊN TẮC CẬP NHẬT LUỒNG TỰ ĐỘNG (N8N / SYSTEMD):** Khi chỉnh sửa, cập nhật hoặc nâng cấp các luồng đã có sẵn, **BẮT BUỘC EDIT TRỰC TIẾP LUỒNG CŨ, TUYỆT ĐỐI KHÔNG TẠO RA LUỒNG MỚI** để giữ nguyên ID kết nối, Webhook, file cấu hình và tránh gây trùng lặp/rác tài nguyên VPS.

---

## 2. DANH MỤC CÁC LUỒNG TỰ ĐỘNG (ACTIVE WORKFLOWS)

Hiện tại dự án đang vận hành độc lập **3 luồng tự động hóa cốt lõi**, mỗi luồng có tài liệu cấu hình chi tiết riêng:

| Luồng | Tên Luồng | Kênh / Nền Tảng Tiếp Nhận | Tần Suất Chạy | File Quản Lý Chi Tiết |
|---|---|---|---|---|
| **01** | **Bản Tin Kinh Tế & Vĩ Mô Chiến Lược** | `@tinkinhtenghetrading` | • **Tin lẻ:** 2 tiếng / lần *(08h, 10h, 12h, 14h, 16h, 18h, 20h, 22h)*<br>• **Tin tổng hợp đáng chú ý:** **09:00, 15:00, 21:00** hàng ngày | [`automations/flow-01-economic-news.md`](./automations/flow-01-economic-news.md) |
| **02** | **Quote Tâm Lý & Kỷ Luật Thực Chiến** | `@quotetradingvn` | **09:00, 15:00, 21:00** hàng ngày *(9h sáng, 15h chiều, 21h tối)* | [`automations/flow-02-trading-quotes.md`](./automations/flow-02-trading-quotes.md) |
| **03** | **Đăng Bài Tự Động Fanpage Facebook** | Fanpage `Nghề Trading`<br>*(ID: 1103661363146221)* | • **10:00 sáng Thứ 2-6:** Kế hoạch Vàng ngày (ảnh chart + full bài)<br>• **20:30 tối hàng ngày:** Bài viết Tư Duy Gốc (~200 từ AI)<br>• **First Comment:** Kêu gọi vào nhóm Telegram | [`automations/flow-03-facebook-page.md`](./automations/flow-03-facebook-page.md) |

---

## 3. TÀI NGUYÊN DÙNG CHUNG CỦA CÁC LUỒNG

### 3.1. Bể chứa API Key Gemini (Multi-Key Pool & Failover)
Các luồng AI của Nghề Trading sử dụng chung cơ chế bể chứa API Key tự động xoay vòng để giải quyết triệt để lỗi hạn mức `429 RESOURCE_EXHAUSTED`:
- **Model ưu tiên:** `gemini-3.1-flash-lite` (Hạn mức 1.500 requests/ngày).
- **Cơ chế xoay vòng:** Tự động bắt lỗi HTTP 429 hoặc lỗi quota để chuyển đổi tức thì sang API Key kế tiếp mà không làm gián đoạn luồng chạy.
- **Danh sách Key Pool hiện tại:** Bể chứa 6 API Keys của ĐẠI KA được lưu trữ và tự động failover trong mã nguồn các bot.

### 3.2. Hệ thống Chữ ký Chuyển đổi Thương hiệu (Cross-Promotion Footers)
Tất cả các luồng xuất bản nội dung ra Telegram đều đính kèm chữ ký đồng bộ để dẫn phễu độc giả:
- **Kênh Phân Tích & Kèo Vàng:** `Nhật Ký Giao Dịch` (`@nhatkytradingvn`)
- **Tâm Sự & Đặt Hẹn 1-1:** `Tâm Sự Trading` (`@longphibtc`)
- **Website Chính Thức:** `Nghề Trading` (`https://nghetrading.com`)

---

## 4. BẢNG TRA CỨU LỆNH ĐIỀU KHIỂN NHANH TRÊN VPS

### 4.1. Quy trình kết nối an toàn (Port Knocking)
Trước khi kết nối SSH vào VPS, luôn thực hiện mở cổng:
```powershell
curl.exe -s -A "Mozilla/5.0" http://103.157.218.111:60000/C1sco1234
# Đợi 2-3 giây sau đó SSH port 11985
```

### 4.2. Quản lý trạng thái và Log dịch vụ

| Thao tác | Luồng 01 (Tin Kinh Tế) | Luồng 02 (Quote Tâm Lý) |
|---|---|---|
| **Xem trạng thái** | `systemctl status news-agent.service --no-pager` | `systemctl status quote-agent.service --no-pager` |
| **Khởi động lại** | `systemctl restart news-agent.service` | `systemctl restart quote-agent.service` |
| **Tạm dừng** | `systemctl stop news-agent.service` | `systemctl stop quote-agent.service` |
| **Xem log trực tiếp** | `tail -f /root/news_agent/news.log` | `tail -f /root/quote_agent/quote.log` |
| **Xem 30 dòng log gần nhất** | `tail -n 30 /root/news_agent/news.log` | `tail -n 30 /root/quote_agent/quote.log` |

---

## 5. HƯỚNG DẪN MỞ RỘNG LUỒNG MỚI

Khi bổ sung thêm luồng tự động mới (ví dụ: Bot Báo Tín Hiệu Vàng H4/H1, Bot Tổng Hợp Tin Phiên Sáng, n8n webhook kết nối CRM...):
1. Đặt mã định danh luồng tiếp theo: `flow-03-<ten-luong>.md` trong thư mục `automations/`.
2. Khai báo thêm vào bảng danh mục mục 2 của tài liệu này.
3. Tách biệt hoàn toàn Database (SQLite độc lập), Log file riêng và Service Systemd riêng để không làm ảnh hưởng đến các luồng đang chạy ổn định.
