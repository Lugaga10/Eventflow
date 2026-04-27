"""
EventFlow Django Settings
========================
Loads secrets from .env  — run: cp .env.example .env then fill in values.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── SECURITY ───────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "replace-this-secret-key-in-production")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", os.environ.get("ALLOWED_HOST", "")]

# ─── INSTALLED APPS ──────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # Our apps
    "accounts",
    "events",
    "bookings",
    "sms_utils",
    "mpesa", 
    
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
   
]

ROOT_URLCONF = "eventflow.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "eventflow.wsgi.application"

# ─── DATABASE (PostgreSQL) ────────────────────────────────────────────────────
# Replace these with your actual PostgreSQL credentials
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "eventflow_db"),          # <<<REPLACE_ME>>> your db name
        "USER": os.environ.get("DB_USER", "postgres"),               # <<<REPLACE_ME>>> your pg user
        "PASSWORD": os.environ.get("DB_PASSWORD", "yourpassword"),   # <<<REPLACE_ME>>> your pg password
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# ─── AUTH ────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── REST FRAMEWORK ──────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

# ─── M-PESA (Safaricom Daraja API) ───────────────────────────────────────────
# Get these from https://developer.safaricom.co.ke
# 1. Create an app on Safaricom Developer Portal
# 2. Subscribe to Lipa Na M-Pesa Online (STK Push) API
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "<<<REPLACE_ME>>>")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "<<<REPLACE_ME>>>")
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "<<<REPLACE_ME>>>")         # Your till/paybill number
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "<<<REPLACE_ME>>>")             # From Daraja portal
MPESA_CALLBACK_URL = os.environ.get("MPESA_CALLBACK_URL", "https://yourdomain.com/api/mpesa/callback/")
# Environment: "sandbox" for testing, "production" for live
MPESA_ENVIRONMENT = os.environ.get("MPESA_ENVIRONMENT", "sandbox")
MPESA_BASE_URL = "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke"

# ─── SMS (Africa's Talking - widely used in Kenya) ───────────────────────────
# Get these from https://africastalking.com
# 1. Create account at africastalking.com
# 2. Get API Key from Settings > API Key
# 3. For sandbox testing use username "sandbox"
AFRICASTALKING_USERNAME = os.environ.get("AT_USERNAME", "<<<REPLACE_ME>>>")     # Your AT username
AFRICASTALKING_API_KEY = os.environ.get("AT_API_KEY", "<<<REPLACE_ME>>>")       # Your AT API key
AFRICASTALKING_SENDER_ID = os.environ.get("AT_SENDER_ID", "EventFlow")          # Your registered sender ID
# Environment: "sandbox" for testing, "production" for live
AFRICASTALKING_ENVIRONMENT = os.environ.get("AT_ENVIRONMENT", "sandbox")

# ─── STATIC & MEDIA ──────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

import environ
env = environ.Env()
environ.Env.read_env()

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost'])

DATABASES = {
    'default': env.db()
}

# Static files for Render
import os
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'