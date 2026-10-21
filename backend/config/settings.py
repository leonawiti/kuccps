"""Settings for the KUCCPS API.

A stateless advisory tool for now: it keeps no learner data and needs no database tables, but Django wants
a database setting, so a local SQLite file is configured. Everything that differs between a laptop and the
server comes from environment variables, so no secret lives in the code.
"""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TESTING = 'test' in sys.argv
DEBUG = os.environ.get('DEBUG') == '1'

SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = 'insecure-development-key-never-used-on-the-server'
    else:
        raise RuntimeError('SECRET_KEY is not set. Put it in the environment.')

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'rest_framework',
    'catalogue',
    'advisor',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'Africa/Nairobi'

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'advisor.errors.handler',
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '100000/min' if TESTING else '60/min'},
    # One nginx sits in front. The rate limiter then counts each visitor by the address nginx recorded (the last
    # entry of X-Forwarded-For) instead of nginx's own address, and ignores anything the visitor put in the header.
    'NUM_PROXIES': 1,
}

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # nginx terminates HTTPS and says so
