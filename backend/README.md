# AI Store — Backend API & Recommendation Engine

Production-ready REST API and AI Recommendation Engine built with **FastAPI**, **SQLAlchemy**, and **Scikit-learn**.

## Architecture & Folder Structure

```
backend/
├── app/
│   ├── main.py                     # Application entry point, CORS, lifespan startup
│   ├── core/                       # Configuration, Security (JWT/bcrypt), Database setup
│   ├── api/                        # API routes and dependencies
│   │   ├── deps.py                 # Dependency injection (Auth, DB session)
│   │   └── v1/
│   │       ├── api_router.py       # Central v1 Router
│   │       └── endpoints/          # Route handlers (auth, products, orders, recs, admin)
│   ├── models/                     # SQLAlchemy ORM models (User, Product, Order, etc.)
│   ├── schemas/                    # Pydantic schemas (Validation & serialization)
│   ├── services/                   # Business logic layer
│   ├── ai_engine/                  # AI/ML Recommender System (TF-IDF, Cosine Similarity)
│   │   ├── recommender.py          # Personalized & content-based algorithms
│   │   ├── data_pipeline.py        # Matrix synchronization
│   │   └── training/               # Offline training pipelines
│   └── utils/                      # Logging and string helpers
├── data/                           # Seed datasets and seeding script
├── tests/                          # Automated tests (Pytest)
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment template
└── .env                            # Local configuration
```

## Setup Instructions

### 1. Create and Activate Virtual Environment
```bash
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
python3.11 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure PostgreSQL

Start PostgreSQL and create a database named `ai_store_db`. Copy `.env.example`
to `.env`, then set `DATABASE_URL` to the credentials for your local server:

```text
DATABASE_URL=postgresql+psycopg://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/ai_store_db
```

Keep `.env` private; it is excluded from version control. The API creates any
missing application tables when it starts.

If running the Django REST user-management API from the project root as well,
use the same `SECRET_KEY` in both environment files so bearer tokens are valid
for either service.

### 4. Seed Database & Train AI Recommender
```bash
python -m data.seed_db
```
> Default Admin credentials: `admin@aistore.com` / `admin123`

To create a separate administrator account, run this from the `backend`
directory. The command prompts for the account details and a hidden password;
it validates the password, rejects duplicate email addresses/usernames, and
stores only a password hash:

```bash
npm run create-admin
```

You can also run `python -m data.create_admin` directly in the configured
Python environment.

### 5. Run the API Server
```bash
npm start
```

On Windows, the npm scripts use the project's `.venv` Python directly. Install
`requirements.txt` in that environment before starting the API.

Admin APIs provide role-filtered paginated user management, profile editing
and photo uploads, password changes, database-backed dashboard/reporting
metrics, and store contact settings. Password changes and logout revoke the
user's existing JWTs. Profile images are limited to 5 MB and stored in
`media/profile-photos` under the backend folder. Admin reports support date
filters and CSV export; recommendation monitoring reports recorded API
requests and does not claim to persist errors that the service does not log.

- **Interactive API Docs (Swagger UI)**: http://localhost:8000/api/docs
- **Alternative ReDoc Docs**: http://localhost:8000/api/redoc
- **API Base URL**: http://localhost:8000/api
