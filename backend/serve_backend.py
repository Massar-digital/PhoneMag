import multiprocessing
import os
import sys
import django
from waitress import serve
from django.core.wsgi import get_wsgi_application
from django.core.management import call_command

# Add the current directory to sys.path to allow imports of 'config' and 'apps'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Run migrations automatically at startup (useful for new users)
print("Checking/Running migrations...")
try:
    call_command('migrate', interactive=False)
    print("Migrations completed successfully.")
    
    # Patch for case sensitivity issue: fix any 'ADMIN' roles to 'admin'
    from apps.authentication.models import UserRole
    updated_count = UserRole.objects.filter(role='ADMIN').update(role=UserRole.ADMIN)
    if updated_count > 0:
        print(f"Fixed {updated_count} admin roles (case sensitivity patch).")
except Exception as e:
    print(f"Error during startup tasks: {e}")

application = get_wsgi_application()

if __name__ == '__main__':
    multiprocessing.freeze_support()

    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, base)

    port = 8000
    print(f"Starting Django backend with Waitress on http://0.0.0.0:{port}")
    serve(application, host='0.0.0.0', port=port)
