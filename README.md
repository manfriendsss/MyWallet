# MyWallet — Ứng Dụng Quản Lý Chi Tiêu Thông Minh với Trợ Lý AI

<p align="center">
  <img src="public/logo.webp" alt="MyWallet Logo" width="128" />
</p>

**MyWallet** là ứng dụng web & PWA tài chính cá nhân, kết hợp giao diện Bento Grid hiện đại, quản lý đa tiền tệ với tỷ giá tự động và trợ lý AI (Gemini & DeepSeek) ghi giao dịch bằng giọng nói, văn bản hoặc ảnh chụp hóa đơn.

---

## Tính năng nổi bật

### 1. Trợ lý chi tiêu AI (giọng nói, chat, ảnh hóa đơn)
- **Giọng nói**: bấm micro để nói tiếng Việt (Web Speech API, `vi-VN`).
- **Ảnh hóa đơn**: chụp hoặc tải ảnh lên, ảnh được nén sang **WebP chất lượng 85%** rồi Gemini đọc và bóc tách.
- **Phản hồi ngắn gọn**: bot chỉ trả lời một câu, ví dụ *"Đã phân loại: Chi tiêu 65.000 đ (Ăn uống) từ Ví tiền mặt."*
- **Xem trước và sửa lại**: hiển thị thẻ xem trước trước khi lưu; chat tiếp để yêu cầu AI chỉnh sửa.
- **Chạy được khi không có key**: câu đơn giản vẫn được phân tích bằng bộ phân tích có sẵn trên thiết bị.
- **Nhà cung cấp và mô hình**:
  - Gemini: `gemini-3.8-flash` (mặc định), ngoài ra có 3.7 và 3.6 Flash.
  - DeepSeek: `deepseek-flash` (V4.1 Flash, mặc định) và `deepseek-v4-pro`.
- **Hai cách giữ API key** (Cài đặt → Trợ lý AI → Nơi giữ API key):
  - **Máy chủ Cloudflare** (khuyến nghị): key là bí mật của Cloudflare. App gọi `/api/ai/gemini` và `/api/ai/deepseek` (Cloudflare Pages Function tại `functions/api/ai/[provider].ts`), trình duyệt không bao giờ thấy key. Chỉ người đã đăng nhập qua Cloudflare Access và có email trong `ALLOWED_EMAILS` mới gọi được; hàm xác minh JWT của Access (chữ ký, audience, issuer, hạn dùng).
  - **Trình duyệt này**: key lưu cục bộ, **không được mã hóa**, có thể chọn chỉ lưu trong phiên.

### 2. Đa tiền tệ với tỷ giá tự động
- Hỗ trợ mọi loại tiền tệ (~166) với tỷ giá trực tiếp từ open.er-api.com, làm mới khi mở app và sau mỗi 6 giờ; không cần chỉnh tỷ giá thủ công.
- Số tiền luôn viết đầy đủ kèm ký hiệu tiền tệ, VND hiển thị là "đ" (ví dụ `2.175.000 đ`, `$585`, `735 zł`). Ngày theo dạng dd/mm/yyyy.

### 3. Dashboard Bento Grid
- **Tổng số dư**: kèm thu, chi và chênh lệch của tháng này.
- **Nguồn tiền (Ví)**: thêm ví, sửa tên và số dư ban đầu.
- **10 giao dịch gần nhất**: tab lọc full-width có hiệu ứng (Tất cả màu cam, Thu màu xanh, Chi màu đỏ); xóa giao dịch với xác nhận ngay tại chỗ.
- **Danh mục**: thêm và sửa tên, biểu tượng, màu sắc.

### 4. Lịch thu chi
- Lịch tháng hiển thị số tiền **+** / **−** theo ngày (dạng chấm trên điện thoại); bấm vào ngày để xem chi tiết.

### 5. Thống kê
- Theo **ngày**, **tuần**, **tháng**, **năm**, với thanh tỷ trọng theo từng danh mục.

### 6. Giao diện và trải nghiệm
- Bảng màu chủ đạo cam kèm điểm nhấn xanh lá từ logo; chế độ sáng và tối (xám than dịu, không dùng đen/trắng tuyệt đối); ánh sáng nền, hình minh họa.
- Dropdown tùy biến có tìm kiếm, skeleton loading theo từng màn hình, màn hình tải lười (lazy-load) kèm prefetch khi rảnh.
- Thanh điều hướng dưới trên di động với nút + dạng khoét gradient. Cho phép phóng to (hỗ trợ tiếp cận).

### 7. Bảo mật
- CSP và các header bảo mật (`public/_headers`, cùng thẻ CSP meta tạo lúc build trong `vite.config.ts`).
- Key gửi qua header, không bao giờ nằm trên URL; phản hồi từ AI và tỷ giá đều được kiểm tra hợp lệ.
- Dữ liệu nằm trong `localStorage` của trình duyệt; có xuất bản sao lưu JSON.

---

## Công nghệ sử dụng

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide, date-fns.
- **Xử lý ảnh**: nén WebP 85 bằng Canvas.
- **AI**: Google Gemini và DeepSeek, cộng bộ phân tích cục bộ dự phòng.
- **Backend**: Cloudflare Pages + Pages Functions.

---

## Cài đặt và phát triển cục bộ

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy dev server
npm run dev

# 3. Build kiểm tra production
npm run build
```

`npm run dev` chỉ chạy giao diện. Để thử route máy chủ ở local, chạy `npm run build` rồi `wrangler pages dev dist`; đặt các bí mật trong file `.dev.vars` (tự tạo, không commit file này).

---

## Triển khai lên Cloudflare Pages (giữ API key trên máy chủ)

1. Đăng nhập Wrangler:
```bash
npm install -g wrangler
wrangler login
```
2. Build và tạo project Pages (lần đầu):
```bash
npm run build
wrangler pages deploy dist --project-name mywallet
```
   Chạy lệnh deploy từ thư mục gốc của repo để Wrangler đóng gói luôn thư mục `functions/`.
3. Bật Cloudflare Access cho tên miền của app: Cloudflare Dashboard → Zero Trust → Access → Applications → Add an application → Self-hosted, nhập tên miền app (cả `mywallet.pages.dev` và tên miền riêng nếu có), policy Allow với email của bạn, phương thức đăng nhập One-time PIN. Sao chép "Application Audience (AUD) Tag" và tên team (`<team>.cloudflareaccess.com`).
4. Thêm biến và bí mật cho project:
```bash
wrangler pages secret put GEMINI_API_KEY --project-name mywallet
wrangler pages secret put DEEPSEEK_API_KEY --project-name mywallet
wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name mywallet
wrangler pages secret put ACCESS_AUD --project-name mywallet
wrangler pages secret put ALLOWED_EMAILS --project-name mywallet
```
   `ACCESS_TEAM_DOMAIN` ví dụ `yourteam.cloudflareaccess.com`; `ALLOWED_EMAILS` là danh sách email cách nhau bằng dấu phẩy.
5. Deploy lại (`wrangler pages deploy dist --project-name mywallet`), mở app, vào Cài đặt → Trợ lý AI → Nơi giữ API key → "Máy chủ Cloudflare" → Lưu → Kiểm tra kết nối.

Nếu thiếu một trong các biến Access, máy chủ từ chối mọi yêu cầu (an toàn mặc định). Đặt giới hạn chi tiêu cho key ở Google AI Studio và DeepSeek.

### Tự động deploy từ GitHub

Mỗi lần push lên nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ chạy và deploy lên project Cloudflare Pages `mywallet`.

Repository GitHub cần có hai secret:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token có quyền `Cloudflare Pages: Edit`.
- `CLOUDFLARE_ACCOUNT_ID`: `73b80a210bebde9342f2e0665beb84d9`.

Website được cấu hình `noindex`, nên sẽ không hiển thị trên các công cụ tìm kiếm.

---

*Thiết kế & phát triển với tiêu chuẩn khắt khe về UI/UX và bảo mật.*
