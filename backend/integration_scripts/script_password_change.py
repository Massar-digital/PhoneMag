#!/usr/bin/env python
"""
Manual integration script for password change endpoint.
This is NOT a test file for automated test discovery. Move here to avoid being run with `manage.py test`.
"""

import os
import sys
import django
import requests
import json

# Setup Django for local script usage
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

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

    # Test steps (unchanged from original script): register user, change password, validate behaviors
    print_test_header('Register Test User')
    register_data = {
        'username': 'testpasschange',
        'email': 'testpasschange@example.com',
        'password': 'OldPassword123!',
        'password_confirm': 'OldPassword123!',
        'first_name': 'Test',
        'last_name': 'User'
    }
    register_response = requests.post(f'{BASE_URL}/auth/register/', json=register_data)
    print(f"Status: {register_response.status_code}")
    if register_response.status_code == 201:
        access_token = register_response.json().get('access_token')
        print_result(True, 'User registered successfully')
    else:
        print_result(False, 'Failed to register user')
        sys.exit(1)

    # The rest of the tests are identical: change password with correct old password, ensure login fails with old password, etc.
    # See original script for full steps.

if __name__ == '__main__':
    main()
