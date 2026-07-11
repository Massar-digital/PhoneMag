import pytest
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from apps.phones.models import Phone


@pytest.fixture
def user():
    return User.objects.create_user(username='tester', password='secret123')


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_product_imei_lookup(api_client):
    target_imei = '123456789012345'
    phone = Phone.objects.create(
        product_type='Phone',
        brand='Apple',
        model='iPhone 15',
        price=Decimal('1000.00'),
        purchase_price=Decimal('800.00'),
        storage='128GB',
        ram='6GB',
        color='Black',
        condition='New',
        IMEI=target_imei,
    )
    
    url = reverse('product-imei-lookup', kwargs={'imei': target_imei})
    response = api_client.get(url)

    assert response.status_code == 200
    assert response.data['id'] == phone.id
    assert response.data['IMEI'] == target_imei


@pytest.mark.django_db
def test_product_barcode_lookup(api_client):
    target_barcode = 'PM-999999'
    phone = Phone.objects.create(
        product_type='Case',
        brand='Spigen',
        model='Tough Armor',
        price=Decimal('30.00'),
        purchase_price=Decimal('15.00'),
        color='Gunmetal',
        condition='New',
        barcode=target_barcode,
    )
    
    url = reverse('product-barcode-lookup', kwargs={'code': target_barcode})
    response = api_client.get(url)

    assert response.status_code == 200
    assert response.data['id'] == phone.id
    assert response.data['barcode'] == target_barcode


@pytest.mark.django_db
def test_product_lookup_not_found(api_client):
    imei_url = reverse('product-imei-lookup', kwargs={'imei': 'nonexistent'})
    barcode_url = reverse('product-barcode-lookup', kwargs={'code': 'nonexistent'})
    
    assert api_client.get(imei_url).status_code == 404
    assert api_client.get(barcode_url).status_code == 404
