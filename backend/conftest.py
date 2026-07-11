import pytest
from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    """
    Fixture to provide an API client for DRF testing.
    """
    return APIClient()

# No need to override django_db_setup with a dict, 
# as it prevents pytest-django from running migrations properly.
# pytest-django will automatically create and migrate a test database.

