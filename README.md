## Role-based Food Ordering Backend (Assignment)

This is a small Node.js + Express + TypeScript backend that implements the assignment:

- **Roles**: Admin, Manager, Member
- **Countries**: India, America
- **Features**:
  - **View restaurants & menu items** (all roles, country-scoped for Manager/Member)
  - **Create order (cart)** (all roles, country-scoped)
  - **Place order (checkout & pay)** (Admin, Manager only)
  - **Cancel order** (Admin, Manager only)
  - **Update payment methods** (Admin only)
  - **Relational access model**: non-admin users are restricted to data in their own country

All data (users, restaurants, menu items, orders, payment methods) is kept in-memory and mocked for demo purposes.

### Tech Stack

- **Runtime**: Node.js (>= 18 recommended)
- **Language**: TypeScript
- **Framework**: Express
- **Auth**: Simple JWT-based authentication with hardcoded users

### Installation

1. Open a terminal in the project root (`c:\Work\Web Project\test`).
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

If `npm run dev` fails in your environment (some Windows setups block process spawning), use:

```bash
npm run build
npm start
```

The app will be available at `http://localhost:3000`:

- **Frontend UI**: `GET /` (served from `public/`)
- **Backend API**: `/api/*`

### Frontend (minimal UI)

This repo includes a simple **HTML/CSS/vanilla JS** frontend served by Express (no extra installs needed).

- Open `http://localhost:3000`
- Login using one of the mock users
- Browse restaurants/menus, build a cart, create an order
- Checkout/cancel is enabled only for Admin/Manager (Members will see disabled buttons / get 403)
- Admin can also replace payment methods via the Admin panel in the UI

### Mock Users

These users are hardcoded (based on the assignment):

- **Admin**
  - `id`: `1`, `name`: `Nick Fury`, `role`: `ADMIN`, `country`: `INDIA`
- **Managers**
  - `id`: `2`, `name`: `Captain Marvel`, `role`: `MANAGER`, `country`: `INDIA`
  - `id`: `3`, `name`: `Captain America`, `role`: `MANAGER`, `country`: `AMERICA`
- **Members**
  - `id`: `4`, `name`: `Thanos`, `role`: `MEMBER`, `country`: `INDIA`
  - `id`: `5`, `name`: `Thor`, `role`: `MEMBER`, `country`: `INDIA`
  - `id`: `6`, `name`: `Travis`, `role`: `MEMBER`, `country`: `AMERICA`

### Basic Flow / Example Usage

Use any HTTP client (Postman, Insomnia, curl).

1. **Login to get a JWT**

`POST /api/auth/login`

```json
{
  "userId": "1"
}
```

Response contains:

```json
{
  "token": "<JWT_TOKEN>",
  "user": { "...": "..." }
}
```

Use the token in the `Authorization` header for all subsequent requests:

```text
Authorization: Bearer <JWT_TOKEN>
```

2. **View restaurants (country-scoped)**

`GET /api/restaurants`

- Admin sees all restaurants.
- Manager/Member see only restaurants in their own country.

3. **View menu for a restaurant**

`GET /api/restaurants/:id/menu`

Country restriction is enforced for Manager/Member.

4. **Create order (cart)**

`POST /api/orders`

```json
{
  "restaurantId": "r1",
  "items": [
    { "menuItemId": "m1", "quantity": 2 },
    { "menuItemId": "m2", "quantity": 3 }
  ]
}
```

All roles can create an order (with country checks).

5. **Place order (checkout & pay)**

`POST /api/orders/:id/checkout`

```json
{
  "paymentMethodId": "pm1"
}
```

- Only Admin and Manager can place orders.
- Members will get `403 Forbidden`.

6. **Cancel order**

`POST /api/orders/:id/cancel`

- Only Admin and Manager can cancel (and only `PLACED` orders).

7. **Payment methods**

- `GET /api/payment-methods`: everyone can view available methods.
- `PUT /api/payment-methods`: only Admin can update methods.

Body example:

```json
{
  "methods": [
    { "id": "pm1", "type": "CARD", "details": "VISA **** 1111" },
    { "id": "pm2", "type": "UPI", "details": "nick@newupi" }
  ]
}
```

### Country-based Access Model

- **Admin**: can see and act on all data (India + America).
- **Manager/Member**: can only:
  - See restaurants and menus in their own country.
  - Create orders tied to restaurants in their own country.
  - View/cancel/place orders only for orders belonging to their own country.

This implements the required relational access model between role and country.