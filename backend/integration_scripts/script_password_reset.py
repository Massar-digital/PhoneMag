#!/usr/bin/env python
"""
Manual integration script for password reset endpoint.
This is NOT a test file for automated test discovery. Move here to avoid being run with `manage.py test`.
"""

import os
import sys
import django
import requests
import json
import time

# Setup Django for local script usage
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.authentication.models import PasswordResetToken
from django.contrib.auth.models import User

# Base URL for API
BASE_URL = 'http://127.0.0.1:8000/api'

def main():
    def print_test_header(test_name):
        print(f"\n{'='*70}")
        print(f"TEST: {test_name}")
        print(f"{'='*70}")

    def print_result(passed, message):
        status = '✓' if passed else '✗'
        print(f"{status} {message}")

    # Register user and execute password reset manual steps here.
    print_test_header('Register Test User for Password Reset')
    register_data = {
        'username': 'testpassreset',
        'email': 'testpassreset@example.com',
        'password': 'OriginalPassword123!',
        'password_confirm': 'OriginalPassword123!',
        'first_name': 'Reset',
        'last_name': 'Test'
    }
    register_response = requests.post(f'{BASE_URL}/auth/register/', json=register_data)
    print(f"Status: {register_response.status_code}")
    if register_response.status_code == 201:
        print_result(True, 'User registered successfully')
    else:
        print_result(False, 'Failed to register user')
        print(json.dumps(register_response.json(), indent=2))
        sys.exit(1)

    # Additional steps omitted for brevity; see original script for full steps.

if __name__ == '__main__':
    main()
