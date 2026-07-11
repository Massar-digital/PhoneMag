# Phone Magazine Management App - Backend

Django REST API backend for managing phone magazine sales.

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create `.env` file:
   ```
   copy .env.example .env
   ```

4. Run migrations:
   ```
   python manage.py migrate
   ```

5. Create superuser:
   ```
   python manage.py createsuperuser
   ```

6. Start development server:
   ```
   python manage.py runserver
   ```

Server will run on: http://localhost:8000
