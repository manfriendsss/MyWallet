# MyWallet cho Android

Nhánh `apk` đóng gói nguyên giao diện React/Vite và animation Framer Motion vào một ứng dụng Android bằng Capacitor. Backend Cloudflare Pages hiện tại tại `https://mywallet.momia.top` được giữ nguyên.

## Kiến trúc

- Frontend nằm trong APK, nên ứng dụng khởi động được từ bundle cục bộ và vẫn dùng cache/offline hiện có.
- Các route `/api` được gọi bằng HTTP native tới backend hiện tại. Cookie phiên HttpOnly, đồng bộ D1, R2 và trợ lý AI vẫn dùng chung với web.
- Origin bảo mật của WebView là `https://mywallet.momia.top`, giữ điều kiện HTTPS cho passkey và cookie `Secure`.
- Widget Android gửi deep link `mywallet://quick-add`, mở trực tiếp biểu mẫu **Thêm giao dịch** sau khi người dùng đăng nhập.

## Build APK

Yêu cầu:

- Node.js 24+
- JDK 21
- Android SDK Platform 36 và Build Tools 36

Trên Windows:

```powershell
npm ci
npm run android:apk
```

APK debug được tạo tại:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Để mở project trong Android Studio:

```powershell
npm run android:open
```

## Thêm widget

Sau khi cài APK: nhấn giữ màn hình chính → **Widgets** → **MyWallet** → kéo widget **Thêm giao dịch** ra màn hình. Chạm vào widget sẽ mở thẳng form ghi thu/chi.

## Tạo bản phát hành

Bản release cần keystore riêng. Không commit file keystore hoặc mật khẩu vào Git; cấu hình ký bản phát hành bằng Android Studio hoặc secret của CI trước khi chạy `assembleRelease`.
