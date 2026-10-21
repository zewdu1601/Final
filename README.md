# AI Store System — Store Management & Recommendation Platform

An end-to-end full-stack e-commerce and store management platform with an integrated AI-driven product recommendation engine.

## System Architecture

```
AI Store System/
├── backend/                        # FastAPI REST API & AI Recommendation Engine
│   ├── app/
│   │   ├── main.py                 # FastAPI application root & middleware
│   │   ├── core/                   # Security (JWT/bcrypt), Config, Database
│   │   ├── api/                    # Versioned REST endpoints (v1)
│   │   │   └── v1/endpoints/       # Auth, Products, Categories, Orders, Recs, Admin
│   │   ├── models/                 # SQLAlchemy database models
│   │   ├── schemas/                # Pydantic data schemas
│   │   ├── services/               # Business logic services
│   │   ├── ai_engine/              # Scikit-learn TF-IDF & Cosine Similarity ML Recommender
│   │   └── utils/                  # Logging and common helpers
│   ├── data/                       # Initial seed datasets & seed runner
│   ├── tests/                      # Automated test suite (Pytest)
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Backend environment template
│   └── package.json                # npm scripts for starting/seeding the Python API
│
├── frontend/                       # React.js SPA (Storefront & Admin UI)
│   ├── public/                     # Static HTML & assets
│   ├── src/
│   │   ├── components/             # Reusable UI components (ProductCard, Navbar, etc.)
│   │   ├── pages/                  # Route views (Home, Products, Cart, Checkout, Admin)
│   │   ├── services/               # Axios API client integrations
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── context/                # React Contexts
│   │   ├── redux/                  # Redux Toolkit store & slices
│   │   ├── routes/                 # App routing & protected route wrappers
│   │   └── styles/                 # Global, theme, and animation styles
│   ├── package.json                # Frontend dependencies
│   └── .env                        # Frontend environment settings (pointing to backend:8000)
│
├── .gitignore                      # Git ignore rules for Python & Node
└── README.md                       # Project documentation
```

## Quick Start

### 1. Backend Setup
```bash
cd backend
py -3.11 -m venv .venv      # Use Python 3.11 for the pinned ML dependencies
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run seed
npm start                   # Starts FastAPI on port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on [http://localhost:3000](http://localhost:3000) and communicates with backend on [http://localhost:8000](http://localhost:8000).

## Store and Admin Flow

1. Browse products and add items to the persistent cart.
2. Create an account, then log in; the API issues a JWT used for protected requests.
3. Proceed to checkout, enter a delivery address, and choose Cash on Delivery, Telebirr, CBE payment, or Bank Card in the payment-method preview.
4. Choosing Telebirr, CBE, or card does not initiate a real payment: no payment gateway is connected. The API verifies product availability, calculates prices from the database, reserves stock, and creates a `Pending` order with an independent `Pending` payment status and the selected method.
5. Store staff progress orders through `Pending` → `Confirmed` → `Processing` → `Shipped` → `Delivered`; eligible orders can be cancelled, and delivered orders can be marked returned. Cancellation before dispatch restores reserved stock.
6. Customers and staff receive order notifications. Revenue reports count completed sales only when an order is both `Delivered` and `Paid`.
7. View order status and items on the signed-in user's **My Orders** page.

See [CUSTOMER_FUNCTIONS.md](./CUSTOMER_FUNCTIONS.md) for the complete customer page structure and use-case sequence.

### User Management API

The Django REST Framework user-management endpoints use the existing PostgreSQL
`users` table. Admin requests require a bearer token and are restricted to
active administrator accounts. The admin user API at `/api/admin/users`
supports search, role and status filters, pagination, create, details, update,
activation, profile-photo upload, and guarded deletion. User passwords are
bcrypt-hashed and are never included in API responses. Keep the same
`SECRET_KEY` in the root and backend environment files so JWT sessions work
across both services.

The frontend uses `http://localhost:8000/api` by default. Set `REACT_APP_API_URL` before starting the frontend to use a different API base URL. Card payments are not enabled because no payment gateway is configured.

Sign in with the seeded admin account (`admin@aistore.com` / `admin123`) to access `/admin`. Admin tools include database-backed dashboard and recommendation activity metrics, date-filtered CSV sales reports, catalog and order management, searchable/filtered/paginated user management with Admin/Store Manager/Customer roles, profile photo upload, profile editing, password changes, and store contact settings. Store Manager accounts also land at `/admin`, with a store-operations dashboard, catalog/category/inventory/order management, sales analytics, and reports. User/role administration, recommendation activity monitoring, administrator profile, and store settings remain administrator-only. The customer dashboard explains how these roles collaborate through shared store data. APIs enforce these role boundaries; password change and logout revoke existing tokens. Profile photos are size- and image-validated and stored under `backend/media`. Change the seeded password before using the app outside local development.

### Chat

Signed-in customers can choose separate support conversations with a Store Manager or an Admin. Each role sees only its own customer-support inbox; Admins and Store Managers also use a separate shared staff room. Messages are stored in the application database, access is checked per role and conversation, and the web client refreshes active conversations automatically.
