import pytest
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from apps.phones.models import Phone


@pytest.fixture
def user():
    return User.objects.create_user(username='searcher', password='secret123')


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_product_search_filters_results_by_q(api_client):
    matching_phone = Phone.objects.create(
        product_type='Phone',
        brand='Samsung',
        model='Galaxy S24 Ultra',
        price=Decimal('1200.00'),
        purchase_price=Decimal('900.00'),
        storage='256GB',
        ram='12GB',
        color='Black',
        condition='New',
        description='Flagship Android phone',
    )
    Phone.objects.create(
        product_type='Phone',
        brand='Apple',
        model='iPhone 15',
        price=Decimal('1100.00'),
        purchase_price=Decimal('850.00'),
        storage='128GB',
        ram='6GB',
        color='Blue',
        condition='New',
        description='Latest iPhone',
    )

    response = api_client.get(reverse('product-search'), {'q': 'Galaxy'})

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == matching_phone.id
    assert response.data['results'][0]['model'] == 'Galaxy S24 Ultra'


@pytest.mark.django_db
def test_product_search_returns_empty_results_for_blank_query(api_client):
    Phone.objects.create(
        product_type='Case',
        brand='Generic',
        model='Silicone Case',
        price=Decimal('15.00'),
        purchase_price=Decimal('5.00'),
        color='Clear',
        condition='New',
        description='Transparent protective case',
    )

    response = api_client.get(reverse('product-search'), {'q': '   '})

    assert response.status_code == 200
    assert response.data['count'] == 0
    assert response.data['results'] == []
