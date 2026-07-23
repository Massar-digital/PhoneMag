"""
Django settings for Phone Magazine Management App.
"""

from pathlib import Path
import os
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=True, cast=bool)

# Allow connections from local network for mobile testing
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',                                      
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'apps.core',
    'apps.authentication',
    'apps.phones',
    'apps.sales',
    'apps.inventory',
    'apps.shop',
    'apps.licensing',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration
# In Electron production, we use the path provided by the Electron app (AppData)
ELECTRON_DB_PATH = os.environ.get('ELECTRON_DB_PATH')

if ELECTRON_DB_PATH:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ELECTRON_DB_PATH,
            'CONN_MAX_AGE': 0,
            'OPTIONS': {
                'timeout': 20,
            }
        }
    }
else:
    # Production uses PostgreSQL (automatically via DATABASE_URL from Render)
    # Local development uses SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'timeout': 20,
            }
        }
    }

# Database Router for dual database
# DATABASE_ROUTERS = ['apps.core.db_router.DualDatabaseRouter']

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'fr-fr'

TIME_ZONE = 'Africa/Algiers'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
# In Electron production, we use the path provided by the Electron app (AppData)
if os.environ.get('ELECTRON_DB_PATH'):
    # ELECTRON_DB_PATH is the path to the DB file, MEDIA_ROOT should be a folder in the same directory
    MEDIA_ROOT = Path(os.path.dirname(os.environ.get('ELECTRON_DB_PATH'))) / 'media'
else:
    MEDIA_ROOT = BASE_DIR / 'media'

# Ensure the media directory exists
if not os.path.exists(MEDIA_ROOT):
    try:
        os.makedirs(MEDIA_ROOT, exist_ok=True)
    except Exception:
        pass

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# SQL query logging for debugging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # In case React runs on different port
    "http://127.0.0.1:3001",
    "http://192.168.100.110:3000",  # Network access from phone
    "http://192.168.100.110:3001",
]

# CORS and CSRF Configuration
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000').split(',')
if config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool):
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# CSRF Protection Configuration
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000').split(',')

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.CustomPageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.authentication.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],

    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JTI_CLAIM': 'jti',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_IN_BLACKLIST_CLAIM': 'jti',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'AUTH_REFRESH_CLASSES': ('rest_framework_simplejwt.tokens.RefreshToken',),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    # Cookie settings
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_REFRESH': 'refresh_token',
    'AUTH_COOKIE_DOMAIN': None,
    'AUTH_COOKIE_SECURE': True,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'None',
}

# CSRF Protection Configuration
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000').split(',')
CSRF_COOKIE_HTTPONLY = False  # Allow frontend to read CSRF token
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SECURE = not DEBUG

# Email Configuration for Password Reset
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@phonemagasine.com')

# Frontend URL for password reset link
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')
PASSWORD_RESET_LINK_EXPIRES_HOURS = 24

# CSRF cookie settings for secure transmission
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)  # True in HTTPS
CSRF_COOKIE_HTTPONLY = False  # Must be False so JavaScript can read token for AJAX requests
CSRF_COOKIE_SAMESITE = 'Strict'  # Only send cookie with same-site requests
CSRF_COOKIE_AGE = 31449600  # 1 year in seconds

# Custom CSRF failure view (optional)
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'

# Allow CSRF token from custom headers in AJAX requests
# DRF uses X-CSRFToken header for CSRF token validation
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'

# Session cookie security settings
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)  # True in HTTPS
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
SESSION_COOKIE_SAMESITE = 'Strict'  # Only send with same-site requests

# Security Headers Configuration
# ==========================================
# Prevent clickjacking attacks
X_FRAME_OPTIONS = 'DENY'  # Prevent embedding in frames (strict security)

# Content Security Policy - strict headers
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevent MIME type sniffing
X_CONTENT_TYPE_OPTIONS = 'nosniff'

# XSS Protection
X_XSS_PROTECTION = '1; mode=block'  # Enable XSS protection in browsers

# HTTPS/TLS Configuration (for production)
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)  # True in production
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)  # 31536000 (1 year) in production
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Referrer Policy - prevent leaking referrer information
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Feature Policy / Permissions Policy
SECURE_PERMISSIONS_POLICY = {
    'geolocation': '()',
    'microphone': '()',
    'camera': '()',
    'payment': '()',
}

# DRF Spectacular Configuration for API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'Phone Magazine Management API',
    'DESCRIPTION': 'A comprehensive API for managing phone inventory, sales, and customer data for a phone magazine business.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
    'TAGS': [
        {'name': 'Authentication', 'description': 'User authentication and authorization'},
        {'name': 'Phones', 'description': 'Phone inventory management'},
        {'name': 'Sales', 'description': 'Sales and transaction management'},
        {'name': 'Inventory', 'description': 'Stock and inventory tracking'},
        {'name': 'Customers', 'description': 'Customer management'},
        {'name': 'Reports', 'description': 'Business analytics and reporting'},
        {'name': 'Shop', 'description': 'Shop settings and configuration'},
    ],
    'EXTERNAL_DOCS': {
        'description': 'Find more info here',
        'url': 'https://github.com/rh0kzy/PhoneMagasineManagementApp',
    },
    'SECURITY': [
        {
            'Bearer': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    ],
    'SECURITY_REQUIREMENTS': [
        {
            'Bearer': [],
        }
    ],
}

# IMEI Validation API integration configuration
# Set these via environment variables in production to enable API checks.
IMEI_VALIDATION_ENABLED = config('IMEI_VALIDATION_ENABLED', default=False, cast=bool)
IMEI_VALIDATION_API_URL = config('IMEI_VALIDATION_API_URL', default='')
IMEI_VALIDATION_API_KEY = config('IMEI_VALIDATION_API_KEY', default='')
