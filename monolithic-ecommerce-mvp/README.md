# Monolithic E-commerce RESTful API (Thực hành 2)

Bài theo sơ đồ 7 bảng `Role`, `MemberShip`, `User`, `Product`, `Order`, `OrderDetail`, `Shipment`.
**Tech:** Node.js 22, Express 4, Prisma 6, PostgreSQL 16, JWT, Docker Compose.

## Chạy lần đầu (Git Bash / PowerShell trên Windows)

1. Giải nén dự án, mở terminal trong thư mục có `docker-compose.yml`.
2. Sao chép `.env.example` thành `.env` (`cp .env.example .env` bằng Git Bash, `Copy-Item .env.example .env` bằng PowerShell). Đổi `JWT_SECRET` trong `.env` thành chuỗi ngẫu nhiên từ 32 ký tự trở lên.
3. Bật Docker Desktop đến khi Docker Engine chạy.
4. Chạy `docker compose up -d --build` (lần đầu cần Internet để kéo image/npm packages).
5. Chạy `docker compose ps` và `docker compose logs -f api` để xác nhận khởi động. Thoát logs bằng Ctrl+C (không tắt container).
6. Mở http://localhost:3000/health, kỳ vọng `status=ok`, `database=connected`.
7. Tạo hai sản phẩm thông qua **CLI**: `docker compose exec api node scripts/create-products.js`.
8. Kiểm tra qua GET http://localhost:3000/api/products.

> PostgreSQL ở **localhost:5433** (host) hoặc `db:5432` (bên trong Docker). API ở `localhost:3000`.
> Nếu sửa `POSTGRES_PASSWORD` sau lần khởi tạo volume, cần đặt lại theo tài liệu PostgreSQL, không chỉ sửa `.env`.

## Postman – thứ tự demo trên phiếu chấm

### Đăng ký (không cần token)
`POST http://localhost:3000/api/auth/register` → Body > raw > JSON:
```json
{"username":"phat_demo","fullname":"Nguyen Thanh Phat","password":"12345678"}
```
Dự kiến HTTP 201, `role=normal`, `membership.score=10`. Nếu đã từng đăng ký username này, dùng tên mới (VD. `phat_demo2`), hoặc nhận HTTP 409.

### Đăng nhập
`POST http://localhost:3000/api/auth/login` → Body > raw > JSON:
```json
{"username":"phat_demo","password":"12345678"}
```
Dự kiến HTTP 200 + JWT `token`. **Không đăng công khai token thật.**

### Test chặn không có token
`POST http://localhost:3000/api/orders` với body phía dưới và **không có** Authorization.
Dự kiến HTTP 401 `Thiếu token`.

### Mua X=2, Y=5
Trước tiên `GET /api/products` để đọc đúng `pid` của X và Y (thường là 1 và 2 khi DB mới).
`POST http://localhost:3000/api/orders` → Authorization > Bearer Token > dán JWT → Body > raw > JSON:
```json
{"items":[{"pid":1,"qty":2},{"pid":2,"qty":5}]}
```
Dự kiến HTTP 201, trả về `order.oid`, `order.createat` (giờ từ DB hiện tại), `order.details`, `order.shipments[0].status=PENDING`, `total`.

### Xem lịch sử & shipment (có JWT)
- `GET http://localhost:3000/api/orders`
- `GET http://localhost:3000/api/orders/1` (đổi 1 thành `oid` thật)
- `GET http://localhost:3000/api/shipments`
- `GET http://localhost:3000/api/shipments/1` (đổi 1 thành `shipid` thật)
- `GET http://localhost:3000/api/auth/me`

## CLI kiểm tra PostgreSQL cho mục 5 và 8

Mở PostgreSQL console:
```bash
docker compose exec db psql -U ecommerce -d ecommerce
```
Trong `psql`, chạy lần lượt:
```sql
\dt
SELECT roleid, rolename FROM "Role";
SELECT mid, mname, score FROM "MemberShip";
SELECT uid, username, roleid, mid FROM "User";
SELECT pid, pname, price, quantity FROM "Product" ORDER BY pid;
SELECT oid, uid, createat FROM "Order" ORDER BY oid DESC;
SELECT oid, pid, qty, unit_price FROM "OrderDetail" ORDER BY oid DESC;
SELECT shipid, oid, status FROM "Shipment" ORDER BY shipid DESC;
\q
```
**Lưu ý:** PostgreSQL phân biệt chữ hoa/chữ thường với tên bảng có dấu nháy kép. `"Order"` cần quote.

## Cấu trúc Monolithic

```text
src/server.js              # Điểm chạy, kiểm tra JWT_SECRET
src/app.js                 # Express app, routes, /health (kiểm tra DB)
src/lib/prisma.js          # Kết nối ORM
src/middleware/auth.js     # Middleware xác minh JWT
src/routes/auth.js         # Register/Login/Me
src/routes/products.js     # Danh sách / chi tiết sản phẩm
src/routes/orders.js       # Đặt hàng transaction + xem lịch sử
src/routes/shipments.js    # Xem thông tin giao hàng
prisma/schema.prisma       # 7 model theo ERD
prisma/seed.js             # Seed normal, admin, Basic score 10
scripts/create-products.js # Tạo 2 sản phẩm qua CLI, không reset tồn kho
Dockerfile                 # Đóng gói Node application
.dockerignore              # Loại trừ file không cần trong build context
docker-compose.yml         # API + Postgres + 2 healthchecks
.env.example               # Cấu hình mẫu, KHÔNG commit .env
.gitignore                 # Chặn node_modules, secrets, log
```

## Giải thích quan trọng
- `MemberShip.score = 10` gắn với User qua `mid`; schema không có `User.score`.
- Mật khẩu được hash bằng bcryptjs, token ký JWT.
- `/health` kiểm tra ứng dụng lẫn kết nối DB (`SELECT 1`); Compose dùng healthcheck cho cả API và Postgres.
- Đặt đơn và trừ số lượng tồn kho trong một **Prisma transaction**, kiểm tra tồn kho qua `updateMany` có điều kiện `quantity >= qty`; không đủ hàng sẽ rollback toàn bộ. Đồng thời tạo `Shipment` trạng thái `PENDING`.
- Prisma Decimal bảo toàn số thập phân để lưu tiền; phản hồi JSON thường trả giá tiền dạng chuỗi.
- `prisma db push` phù hợp demo MVP; chưa thay thế một chiến lược migrations được duyệt trong production.
- `Order.createat` giữ đúng cách đặt tên trong ERD; datetime trả về JSON theo UTC (`Z`), Postman/JS có thể quy đổi sang giờ Việt Nam GMT+7.

## Git/GitHub (làm trên máy của bạn)
```bash
npm install                # tạo package-lock.json trước commit, cần Internet
# Nếu muốn, lặp lại docker compose up -d --build để dùng npm ci

git init
git add .
git commit -m "feat: initialize monolithic ecommerce api"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main

git log --oneline -5
git status
```
Không đẩy `.env`, `node_modules` lên GitHub. `git status` nên là `nothing to commit, working tree clean`.

## Dừng môi trường
- `docker compose down` dừng container, **giữ data** trong volume.
- `docker compose down -v` **xóa data PostgreSQL**; chỉ dùng khi chủ động muốn reset.

## Bộ Postman import sẵn

Trong Postman chọn **Import** → file `postman/Monolithic-Ecommerce-Demo.postman_collection.json`.
Chạy yêu cầu số 01 → dùng CLI tạo X/Y → chạy 02 (lấy tự động pid X/Y) → 03 Đăng ký → 04 Login (tự lưu token) → 05 (401) → 06 (tạo order, tự lưu oid và shipid) → 07–12.
Nếu tên `phat_demo_001` đã tồn tại, mở collection Variables đổi `username` thành tên mới trước khi chạy đăng ký. Chỉ chạy yêu cầu 06 khi muốn đặt thêm đơn thật vì mỗi lần đều trừ kho.

## Cách tạo X/Y trực tiếp từ PostgreSQL CLI (rất phù hợp mục 5)

Nếu giảng viên yêu cầu gõ SQL trong container PostgreSQL thay vì chạy script Node, mở:

```bash
docker compose exec db psql -U ecommerce -d ecommerce
```

Tại dấu nhắc `ecommerce=#` gõ:

```sql
INSERT INTO "Product" (pname, price, quantity)
VALUES ('X', 100000.00, 20), ('Y', 50000.00, 30)
ON CONFLICT (pname) DO NOTHING;
SELECT pid, pname, price, quantity FROM "Product" ORDER BY pid;
\q
```

Chỉ cần chạy **một** trong hai cách (PostgreSQL CLI hoặc Node CLI). Có `ON CONFLICT` để tránh tạo trùng hoặc reset tồn kho.

SQL chứng minh user vừa đăng ký nhận role normal + Basic(score 10):

```sql
SELECT u.uid, u.username, r.rolename, m.mname, m.score
FROM "User" u
JOIN "Role" r ON r.roleid = u.roleid
JOIN "MemberShip" m ON m.mid = u.mid
ORDER BY u.uid DESC;
```

SQL chứng minh đơn hàng – chi tiết – shipment:

```sql
SELECT o.oid, o.createat, p.pname, d.qty, d.unit_price, s.shipid, s.status
FROM "Order" o
JOIN "OrderDetail" d ON d.oid = o.oid
JOIN "Product" p ON p.pid = d.pid
LEFT JOIN "Shipment" s ON s.oid = o.oid
ORDER BY o.oid DESC, p.pname;
```
