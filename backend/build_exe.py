import os
import subprocess
import sys
from pathlib import Path


def build():
    root = Path(__file__).resolve().parent

    print("Installing requirements for build...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "waitress", "django-cors-headers", "django-filter", "djangorestframework", "djangorestframework-simplejwt", "drf-spectacular", "python-decouple", "pillow"])

    print("Building Django backend executable...")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--console",
        "--name", "serve_backend",
        "--hidden-import", "django",
        "--hidden-import", "django.conf",
        "--hidden-import", "django.core",
        "--hidden-import", "django.db.backends.sqlite3",
        "--hidden-import", "waitress",
        "--hidden-import", "rest_framework",
        "--hidden-import", "corsheaders",
        "--hidden-import", "django_filters",
        "--hidden-import", "drf_spectacular",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PyQt6",
        "--exclude-module", "PySide2",
        "--exclude-module", "PySide6",
        "--exclude-module", "matplotlib",
        "--exclude-module", "IPython",
        str(root / "serve_backend.py")
    ]

    env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "PYTHONPATH": str(root)}
    subprocess.check_call(cmd, cwd=root, env=env)

    dist_dir = root / "dist" / "serve_backend"
    print(f"\nSuccess! Backend built in '{dist_dir}'")
    print(f"Now copy '{dist_dir}' to '{root.parent / 'frontend-vite' / 'build_backend'}'")


if __name__ == "__main__":
    build()
