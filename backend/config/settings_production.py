"""
Production Django settings for Phone Magazine Management App.
This file contains production-specific security configurations.
"""

from .settings import *

# =============================================================================
# PRODUCTION SECURITY SETTINGS
# =============================================================================

# Override development settings for production
DEBUG = False

# Production secret key must be set via environment variable
SECRET_KEY = config('SECRET_KEY')
if not SECRET_KEY or SECRET_KEY == 'django-insecure-your-secret-key-change-in-production':
    raise ValueError('SECRET_KEY must be set in production environment')

# Production allowed hosts
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    raise ValueError('DJANGO_ALLOWED_HOSTS must be configured in production')

# =============================================================================
# HTTPS SECURITY SETTINGS
# =============================================================================

# Force HTTPS redirect in production
SECURE_SSL_REDIRECT = True

# HTTP Strict Transport Security (HSTS)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Secure cookie settings for HTTPS
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# =============================================================================
# PRODUCTION CORS SETTINGS
# =============================================================================

# Disable CORS allow all origins in production
CORS_ALLOW_ALL_ORIGINS = False

# Configure specific production origins
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')
if not CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS == ['']:
    CORS_ALLOWED_ORIGINS = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
    ]

# CSRF trusted origins for production
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='').split(',')
if not CSRF_TRUSTED_ORIGINS or CSRF_TRUSTED_ORIGINS == ['']:
    CSRF_TRUSTED_ORIGINS = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
    ]

# =============================================================================
# PRODUCTION LOGGING
# =============================================================================

# Override development logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django_error.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# =============================================================================
# PRODUCTION DATABASE SETTINGS
# =============================================================================

# For production, consider using PostgreSQL instead of SQLite
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': config('DB_NAME'),
#         'USER': config('DB_USER'),
#         'PASSWORD': config('DB_PASSWORD'),
#         'HOST': config('DB_HOST'),
#         'PORT': config('DB_PORT', default='5432'),
#         'OPTIONS': {
#             'sslmode': 'require',
#         },
#     }
# }

# =============================================================================
# PRODUCTION EMAIL SETTINGS
# =============================================================================

# Ensure email backend is properly configured for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# =============================================================================
# PRODUCTION STATIC FILES
# =============================================================================

# Use WhiteNoise for serving static files in production
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# WhiteNoise settings
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

# =============================================================================
# PRODUCTION MONITORING & SECURITY HEADERS
# =============================================================================

# Additional security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Permissions policy for additional security
SECURE_PERMISSIONS_POLICY = {
    'geolocation': '()',
    'microphone': '()',
    'camera': '()',
    'payment': '()',
    'usb': '()',
    'magnetometer': '()',
    'accelerometer': '()',
    'gyroscope': '()',
    'speaker': '()',
    'fullscreen': '()',
    'interest-cohort': '()',
}

# =============================================================================
# PRODUCTION PERFORMANCE SETTINGS
# =============================================================================

# Cache settings (consider Redis in production)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Gzip compression
USE_GZIP = True

# =============================================================================
# PRODUCTION ADMIN SETTINGS
# =============================================================================

# Admin URL configuration for security
ADMIN_URL = config('ADMIN_URL', default='admin/')

# =============================================================================
# ENVIRONMENT VALIDATION
# =============================================================================

# Validate required production environment variables
required_env_vars = [
    'SECRET_KEY',
    'DJANGO_ALLOWED_HOSTS',
    'CORS_ALLOWED_ORIGINS',
    'CSRF_TRUSTED_ORIGINS',
]

missing_vars = []
for var in required_env_vars:
    if not config(var, default=''):
        missing_vars.append(var)

if missing_vars:
    raise ValueError(f'Missing required environment variables: {", ".join(missing_vars)}')