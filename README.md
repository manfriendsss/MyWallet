# MyWallet — Ứng Dụng Quản Lý Chi Tiêu Thông Minh với Trợ Lý AI

<p align="center">
  <img src="public/logo.webp" alt="MyWallet Logo" width="128" />
</p>

**MyWallet** là ứng dụng web & PWA tài chính cá nhân thế hệ mới, kết hợp trải nghiệm thiết kế Bento Grid hiện đại, quản lý đa ngoại tệ với tỷ giá tự động và trợ lý AI thông minh (Gemini & DeepSeek) phân tích giao dịch bằng giọng nói, văn bản hoặc ảnh chụp hóa đơn.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🤖 Trợ Lý Chi Tiêu AI Tinh Gọn (Voice, Chat, Bill OCR)
- **Voice-to-Expense**: Bấm nút micro để nói trực tiếp bằng tiếng Việt (Web Speech API).
- **Bill OCR**: Chụp ảnh hoặc tải hóa đơn lên, hệ thống tự động nén sang **WebP chất lượng 85%**, AI đọc bóc tách chi tiết.
- **AI Phản Hồi Ngắn Gọn**: Khóa chặt bot không chào hỏi lan man hay đưa lời khuyên sáo rỗng. Bot chỉ báo kết quả 1 câu ngắn: *"Đã phân loại: Chi tiêu 65.000 đ (Ăn uống) từ Ví tiền mặt."*
- **Sửa Lại Linh Hoạt**: Hiển thị thẻ xem trước giao dịch; người dùng có thể chat tiếp để yêu cầu AI sửa lại ngay trên cửa sổ chat.
- **Bảo Mật Cao**: Tùy chọn lưu API Key cục bộ mã hóa hoặc thông qua Cloudflare Worker Secret Proxy.

### 2. 💱 Quản Lý Đa Ngoại Tệ & Tự Động Quy Đổi VNĐ
- Hỗ trợ nguồn tiền đa dạng: **VND, USD (PayPal), PLN (Złoty Ba Lan), EUR, GBP, JPY**.
- Tự động lấy tỷ giá mới nhất và quy đổi về **VNĐ** để hiển thị tổng số dư và dashboard.
- Cho phép chỉnh sửa tỷ giá thủ công hoặc làm mới trực tuyến bất cứ lúc nào.

### 3. 📊 Dashboard Bento Grid Sang Trọng
- **Tổng số dư khả dụng**: Card kích thước lớn với hiệu ứng ánh sáng gradient, nút ẩn/hiện số dư bảo mật, thống kê tổng thu - tổng chi tháng.
- **Nguồn tiền (Ví)**: Quản lý số dư ban đầu, thêm ví mới, xem số tiền gốc và số quy đổi VNĐ.
- **10 Giao dịch gần nhất**: Lọc nhanh theo Tất cả, Thu nhập, Chi tiêu.
- **Danh mục Thu & Chi**: 2 Tab phân biệt rõ ràng, grid các sub-card nhỏ hiển thị chi tiêu tháng, card viền nét đứt `+` để thêm danh mục mới.

### 4. 📅 Lịch Thu Chi Trực Quan
- Lịch tháng với hiệu ứng chuyển động mượt mà (Framer Motion).
- Hiển thị trực quan con số **Thu nhập (+)** màu xanh và **Chi tiêu (-)** màu đỏ ngay trên từng ô ngày.
- Bấm vào ngày để xem danh sách chi tiết các giao dịch trong ngày đó.

### 5. 📈 Thống Kê & Báo Cáo Chuyên Sâu
- Thống kê theo: **Ngày**, **Tuần**, **Tháng**, **Năm**.
- Xác định ngay danh mục chiếm tỷ trọng chi tiêu lớn nhất.
- Thanh tiến trình trực quan cơ cấu chi tiêu.

### 6. 📱 PWA & Tối Ưu Trải Nghiệm Di Động
- Chống pinch-to-zoom (`user-scalable=no, maximum-scale=1.0`).
- Ẩn hoàn toàn thanh cuộn thô kệch (`no-scrollbar`).
- Bottom Navigation Bar 5 nút trên mobile với nút (+) mở Bottom Sheet Trợ lý AI ở giữa.
- Lazy load, code-splitting (tách nhỏ components, bundle siêu nhẹ).

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Xử lý ảnh**: Canvas WebP 85 compression.
- **AI Engine**: Google Gemini API (`gemini-2.5-flash`), DeepSeek API (`deepseek-chat`) + Local Regex Fallback.
- **Backend / Deployment**: Cloudflare Workers, Cloudflare D1 (SQL Database), Cloudflare R2 (Object Storage).

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển Cục Bộ

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy dev server
npm run dev

# 3. Build kiểm tra production
npm run build
```

---

## ☁️ Triển Khai Lên Cloudflare (Workers, D1, R2)

1. Cài đặt Cloudflare Wrangler CLI:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. Tạo database D1 và chạy migration:
   ```bash
   wrangler d1 create mywallet-db
   wrangler d1 execute mywallet-db --file=./cloudflare/schema.sql
   ```

3. Tạo R2 Bucket để lưu ảnh hóa đơn:
   ```bash
   wrangler r2 bucket create mywallet-receipts
   ```

4. Cài đặt bí mật API Key (không lộ client):
   ```bash
   wrangler secret put GEMINI_API_KEY
   wrangler secret put DEEPSEEK_API_KEY
   ```

5. Deploy toàn bộ frontend và backend:
   ```bash
   npm run build
   cd cloudflare && wrangler deploy
   ```

---

*Thiết kế & phát triển với tiêu chuẩn khắt khe về UI/UX và bảo mật.*
