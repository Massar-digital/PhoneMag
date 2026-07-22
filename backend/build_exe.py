import os
import subprocess
import sys
from pathlib import Path


def build():
    root = Path(__file__).resolve().parent

    print("Upgrading pip and installing pinned requirements...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(root / "requirements.txt")])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "pyinstaller-hooks-contrib"])

    print("Building Django backend executable...")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--console",
        "--name", "serve_backend",

        "--collect-all", "django",
        "--collect-all", "rest_framework",
        "--collect-all", "rest_framework_simplejwt",
        "--collect-all", "corsheaders",
        "--collect-all", "django_filters",
        "--collect-all", "drf_spectacular",
        "--collect-all", "waitress",

        "--hidden-import", "django.contrib.staticfiles",
        "--hidden-import", "django.contrib.contenttypes",
        "--hidden-import", "django.contrib.auth",
        "--hidden-import", "django.contrib.sessions",
        "--hidden-import", "django.contrib.messages",
        "--hidden-import", "django.db.backends.sqlite3",
        "--hidden-import", "django.template.loaders.filesystem",
        "--hidden-import", "django.template.loaders.app_directories",
        "--hidden-import", "PIL._imaging",
        "--hidden-import", "pkg_resources.py2_warn",

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
