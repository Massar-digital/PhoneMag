"""
WSGI config for Phone Magazine Management App project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# Start auto-sync when Django starts
from apps.core.sync_manager import sync_manager
sync_manager.start_auto_sync()
