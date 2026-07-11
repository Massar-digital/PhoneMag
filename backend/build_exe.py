import os
import subprocess
import sys

def build():
    print("Installing requirements for build...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "waitress", "django-cors-headers", "django-filter", "djangorestframework", "djangorestframework-simplejwt", "drf-spectacular", "python-decouple", "pillow"])

    print("Building Django backend executable...")
    # Using 'python -m PyInstaller' instead of 'pyinstaller' directly to avoid PATH issues
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--console",
        "--name", "serve_backend",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PyQt6",
        "--exclude-module", "PySide2",
        "--exclude-module", "PySide6",
        "--exclude-module", "matplotlib",
        "--exclude-module", "IPython",
        # Add static and media if they exist
        # "--add-data", "staticfiles;staticfiles",
        # "--add-data", "media;media",
        "serve_backend.py"
    ]
    
    subprocess.check_call(cmd)
    print("\nSuccess! Backend built in 'dist/serve_backend'")
    print("Now copy the content of 'dist/serve_backend' to 'frontend-vite/build_backend/'")

if __name__ == "__main__":
    build()
