# Nghề Trading Website

Website tĩnh (HTML/CSS/JS) cho nghetrading.com — được deploy tự động qua GitHub + Vercel.

## Cấu trúc dự án

```
nghetrading/
├── index.html        ← Trang chủ
├── css/
│   └── style.css     ← Toàn bộ styling
├── js/
│   └── main.js       ← Tương tác, animation
└── README.md
```

---

## 🚀 Hướng dẫn deploy lên GitHub + Vercel

### Bước 1 — Tạo GitHub Repository

1. Vào [github.com](https://github.com) → đăng nhập
2. Nhấn **"New repository"** (nút dấu `+` góc trên phải)
3. Đặt tên repo: `nghetrading` (hoặc bất kỳ tên nào)
4. Chọn **Public** → nhấn **"Create repository"**

### Bước 2 — Push code lên GitHub

Cài Git nếu chưa có: [git-scm.com](https://git-scm.com)

Mở terminal trong thư mục dự án và chạy:

```bash
git init
git add .
git commit -m "Initial commit – Nghề Trading website"
git branch -M main
git remote add origin https://github.com/TÊN_BẠN/nghetrading.git
git push -u origin main
```

> Thay `TÊN_BẠN` bằng username GitHub của bạn.

### Bước 3 — Kết nối Vercel

1. Vào [vercel.com](https://vercel.com) → đăng nhập bằng tài khoản GitHub
2. Nhấn **"Add New… → Project"**
3. Chọn repo `nghetrading` vừa tạo → nhấn **"Import"**
4. Vercel tự nhận dạng là static site — **không cần cấu hình gì thêm**
5. Nhấn **"Deploy"** — Vercel sẽ build và deploy trong vài giây
6. Bạn sẽ nhận được link dạng `nghetrading.vercel.app`

> Từ giờ, mỗi khi bạn `git push` lên GitHub, Vercel sẽ tự động build lại.

### Bước 4 — Gắn domain nghetrading.com

1. Trong Vercel → vào project → tab **"Settings" → "Domains"**
2. Nhập `nghetrading.com` → nhấn **"Add"**
3. Vercel sẽ hiện 2 bản ghi DNS cần thêm vào nhà cung cấp domain của bạn:

| Type  | Name | Value                  |
|-------|------|------------------------|
| A     | @    | 76.76.21.21            |
| CNAME | www  | cname.vercel-dns.com   |

4. Vào trang quản lý DNS của domain (Namecheap, GoDaddy, Cloudflare...) → thêm 2 bản ghi trên
5. Chờ 5–30 phút để DNS propagate
6. Vercel tự cấp SSL (HTTPS) miễn phí ✓

---

## ✏️ Chỉnh sửa nội dung

- **Bài viết, văn bản**: sửa trong `index.html`
- **Màu sắc, font, khoảng cách**: sửa trong `css/style.css`
- **Animation, logic**: sửa trong `js/main.js`

Sau khi sửa, chỉ cần:
```bash
git add .
git commit -m "Cập nhật nội dung"
git push
```
Vercel sẽ tự deploy lại trong ~30 giây.
