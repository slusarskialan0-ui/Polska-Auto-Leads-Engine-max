"""Backend configuration — reads from environment variables for production deploy."""
import os

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower() or "development"
APP_VERSION = "3.1.0"

# Railway / production: set DATABASE_URL env var (e.g. postgresql://...)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./polska_leads.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
DB_CONNECT_ARGS = {"check_same_thread": False} if IS_SQLITE else {}
DB_ENGINE_OPTIONS = {"pool_pre_ping": True}
if IS_SQLITE:
    DB_ENGINE_OPTIONS["connect_args"] = DB_CONNECT_ARGS
else:
    DB_ENGINE_OPTIONS.update(
        {
            "pool_size": int(os.getenv("DB_POOL_SIZE", "20")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "40")),
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
        }
    )

_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

PROJECT_ID_HEADER = "X-Project-Id"
DEFAULT_PROJECT_ID = os.getenv("DEFAULT_PROJECT_ID", "default")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "30"))
PIPELINE_WORKER_CAPACITY = int(os.getenv("PIPELINE_WORKER_CAPACITY", "3"))
THRESHOLD_PIPELINE_STALL_SECONDS = int(os.getenv("THRESHOLD_PIPELINE_STALL_SECONDS", "900"))
THRESHOLD_SLOW_QUERY_MS = int(os.getenv("THRESHOLD_SLOW_QUERY_MS", "750"))
THRESHOLD_RATE_LIMIT_PER_MIN = int(os.getenv("THRESHOLD_RATE_LIMIT_PER_MIN", "100"))
THRESHOLD_CACHE_TARGET_PCT = int(os.getenv("THRESHOLD_CACHE_TARGET_PCT", "80"))
