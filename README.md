# Restaurant Serverless API (Backend)

Hệ thống backend serverless cho ứng dụng đặt món F&B, xây dựng trên AWS Lambda + API Gateway + DynamoDB.

## Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Runtime | Node.js 20.x |
| Framework | Serverless Framework 3 |
| Language | TypeScript |
| Database | DynamoDB (PAY_PER_REQUEST) |
| Messaging | SNS → SQS (fan-out) |
| Email | AWS SES |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Bundler | esbuild |

## Kiến trúc

```
src/
├── functions/           # Lambda handlers
│   ├── auth/            # register, login, profile
│   ├── menu/            # list (public), seed
│   ├── order/           # create, list, get, updateStatus
│   ├── inventory/       # processQueue (SQS consumer)
│   └── admin/
│       ├── menu/        # CRUD menu (admin only)
│       └── inventory/   # list, update, summary
├── services/            # Business logic
│   ├── AuthService.ts
│   ├── MenuService.ts
│   ├── OrderService.ts
│   ├── InventoryService.ts
│   └── EmailService.ts
├── repositories/        # DynamoDB data access
├── models/              # TypeScript interfaces
├── utils/               # auth, errors, logger, responseBuilder
└── libs/                # AWS SDK clients (dynamo, ses, sns, sqs)
```

## API Endpoints

### Public
| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/menu` | Danh sách menu (available only) |
| `POST` | `/menu/seed` | Seed data mẫu |

### Authentication
| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/auth/register` | Đăng ký tài khoản |
| `POST` | `/auth/login` | Đăng nhập, trả JWT |
| `GET` | `/auth/me` | Thông tin user hiện tại |

### User (Bearer Token)
| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/orders` | Tạo đơn hàng |
| `GET` | `/orders` | Danh sách đơn của user |
| `GET` | `/orders/{id}` | Chi tiết đơn |

### Admin (Bearer Token + role=ADMIN)
| Method | Path | Mô tả |
|--------|------|-------|
| `PATCH` | `/orders/{id}/status` | Cập nhật trạng thái đơn |
| `GET` | `/admin/menu` | Danh sách menu (bao gồm ẩn) |
| `POST` | `/admin/menu` | Tạo món mới |
| `PATCH` | `/admin/menu/{id}` | Cập nhật món |
| `DELETE` | `/admin/menu/{id}` | Xóa món |
| `GET` | `/admin/inventory` | Danh sách tồn kho |
| `PATCH` | `/admin/inventory/{id}` | Cập nhật tồn kho |
| `GET` | `/admin/inventory/summary` | Thống kê tồn kho |

## AWS Resources (tự động tạo khi deploy)

- **5 DynamoDB Tables**: Orders, MenuItems, Inventory, InventoryHistory, Users
- **1 SNS Topic**: NewOrderTopic (fan-out khi có đơn mới)
- **1 SQS Queue**: InventoryQueue (xử lý trừ kho bất đồng bộ)
- **1 SNS Subscription (Email)**: Thông báo đơn mới qua email

## Cài đặt & Chạy

### Yêu cầu
- Node.js >= 20
- AWS CLI đã cấu hình credentials
- Serverless Framework 3

### Cài đặt dependencies

```bash
npm install
```

### Biến môi trường

Tạo file `.env` (optional, có giá trị mặc định cho dev):

```env
JWT_SECRET=your-secret-key
EMAIL_SOURCE=verified@email.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com
DEFAULT_ADMIN_EMAIL=admin@demo.local
DEFAULT_ADMIN_PASSWORD=Admin@123456
DEFAULT_ADMIN_NAME=Default Admin
```

### Chạy local

```bash
npm run dev
# API chạy tại http://localhost:3001
```

### Deploy lên AWS

```bash
npm run deploy
# hoặc deploy stage cụ thể:
npx sls deploy --stage prod --config serverless.ts
```

### Xóa stack

```bash
npm run remove
```

### Type check

```bash
npm run typecheck
```

## Luồng xử lý chính

```
User đặt hàng
  → POST /orders
  → Lưu DynamoDB (status=PENDING)
  → Publish SNS
  → SQS trừ kho (async)
  → Email thông báo admin

Admin duyệt đơn
  → PATCH /orders/{id}/status
  → Cập nhật DynamoDB
  → Gửi email cho user (SES)
```

## Admin mặc định

Khi login lần đầu bằng `DEFAULT_ADMIN_EMAIL`, hệ thống tự tạo tài khoản admin nếu chưa tồn tại.

- Email: `admin@demo.local`
- Password: `Admin@123456`
