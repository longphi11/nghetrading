---
name: technical-chart-analysis
description: >-
  Phân tích kỹ thuật chart Vàng (XAU/USD) và Bitcoin (BTC/USD) theo trường phái Price Action thực chiến của Nghề Trading.
  Sử dụng khi cần soi chart, phân tích nến và cấu trúc đỉnh đáy H4/H1, lập kế hoạch giao dịch 2 kịch bản hoặc xuất bản bài vào Nhật ký giao dịch.
---

# Kỹ Năng Phân Tích Kỹ Thuật Thực Chiến (Nghề Trading)

Kỹ năng này hướng dẫn quy trình soi chart và viết bài phân tích kỹ thuật theo chuẩn phong cách của ĐẠI KA (`longphibtc`) trên website Nghề Trading.

---

## 1. Triết Lý Cốt Lõi

- **Đơn giản hóa tuyệt đối:** Chỉ tập trung vào hành vi giá (Price Action), cấu trúc thị trường (Market Structure) và các vùng cản then chốt ("Đường băng").
- **Tư duy xác suất:** Không đoán mò đỉnh đáy. Chờ xác nhận từ chối giá (rejection) hoặc phá vỡ kèm retest.
- **Tỷ lệ RR cao:** Không giao dịch nếu điểm vào lệnh không mang lại tỷ lệ lời/lỗ hấp dẫn.
- **Kỷ luật đứng ngoài:** Khi thị trường sideway biên hẹp hoặc không có xu hướng, đứng ngoài quan sát là một vị thế.

---

## 2. Các Bước Phân Tích Chart

### Bước 1: Khung thời gian H4 (Khung xu hướng lớn)
- Xác định trạng thái: Đang trong xu hướng tăng (Uptrend), xu hướng giảm (Downtrend), hay Sideway biên độ rộng?
- Xác định các đỉnh (Swing High) và đáy (Swing Low) quan trọng nhất.

### Bước 2: Khung thời gian H1 (Khung chiến thuật & Tương quan Bò/Gấu)
- Đánh giá lực nến: Có râu nến dài từ chối giá (pinbar/rejection) không? Có nến nhấn chìm (engulfing) hay break dứt khoát không?
- Phe nào đang áp đảo? Các đợt hồi phục/phản công có bị dập tắt nhanh chóng không?
- Đánh dấu các mốc cản/hỗ trợ quan trọng ("Đường băng").

### Bước 3: Lập kế hoạch 2 kịch bản hành động
Mỗi bài phân tích luôn đưa ra 2 hướng rõ ràng cho trader:
1. **Tôi sẽ Short khi:** Nêu rõ mốc giá hoặc tín hiệu xác nhận (VD: Giá tiếp tục thất bại tại 414x, hoặc tạo đỉnh thấp dần, hoặc break mốc 411x rồi pullback).
2. **Tôi sẽ Long khi:** Nêu rõ điều kiện hỗ trợ vững chắc, hoặc thẳng thắn tuyên bố: *"Hôm nay tôi sẽ Không Long"* nếu xu hướng giảm đang quá mạnh.

---

## 3. Quy Chuẩn Xuất Bản Vào `data/journal.json`

Khi tạo bài viết mới trong `data/journal.json`:
1. Mở file `data/journal.json`.
2. Lấy `entry_no` của bài đầu tiên cộng thêm 1 (hoặc tính theo số thứ tự tiếp theo).
3. Đặt id theo mẫu: `vang-YYYY-MM-DD-ke-hoach-giao-dich-vang-ngay-DDMM`.
4. Trong `content_html`:
   - Dòng 1: Cặp tiền tệ và sàn (VD: `<p>Gold \t OANDA:XAUUSD</p>`).
   - Dòng 2: Tên tác giả (`<p>longphibtc</p>`).
   - Đoạn phân tích: Các đoạn văn ngắn giải thích bối cảnh H4, diễn biến nến H1.
   - Các kịch bản vào lệnh: Bắt buộc dùng thẻ `<p class="pt-bullet">- Tôi sẽ Short ...</p>` và `<p class="pt-bullet">- Tôi sẽ Long ...</p>`.
   - Lời kết: `<p>Chúc các bạn 1 ngày giao dịch thật thuận lợi với kế hoạch của mình.</p>`.
   - Hashtag: `<p class="pt-hashtag">#nghetrading</p>`.
5. Đảm bảo file `data/journal.json` luôn là JSON hợp lệ.
