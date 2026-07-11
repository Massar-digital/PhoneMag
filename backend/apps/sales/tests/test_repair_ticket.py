import pytest
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from apps.sales.models import RepairTicket, Customer

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username="testuser", password="password123")

@pytest.mark.django_db
class TestRepairTicket:
    def test_create_repair_ticket(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        # Create a customer first
        customer = Customer.objects.create(name="Test Customer", phone="0555000000")
        
        url = reverse('repairticket-list')
        data = {
            "customer": customer.id,
            "device_model": "iPhone 13",
            "imei": "123456789012345",
            "issue_description": "Broken screen",
            "status": "intake",
            "estimated_cost": 5000.0,
            "due_date": "2023-12-31"
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert RepairTicket.objects.count() == 1
        
    def test_repair_ticket_list(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        customer = Customer.objects.create(name="Test Customer", phone="0555000000")
        RepairTicket.objects.create(
            customer=customer,
            device_model="Samsung S21",
            issue_description="Battery change",
            status="intake",
            estimated_cost=3000
        )
        
        url = reverse('repairticket-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Check results in paginated response
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['customer_name'] == "Test Customer"

    def test_repair_overdue_logic(self, db):
        from django.utils import timezone
        from datetime import timedelta
        customer = Customer.objects.create(name="Test Customer", phone="0555000000")
        
        # Ticket overdue
        overdue_date = timezone.now().date() - timedelta(days=2)
        ticket = RepairTicket.objects.create(
            customer=customer,
            device_model="Overdue Device",
            issue_description="Late",
            due_date=overdue_date,
            status="in_repair"
        )
        assert ticket.is_overdue is True
        assert ticket.days_overdue == 2

        # Ticket NOT overdue (due today)
        ticket.due_date = timezone.now().date()
        ticket.save()
        assert ticket.is_overdue is False

        # Ticket NOT overdue (future)
        ticket.due_date = timezone.now().date() + timedelta(days=5)
        ticket.save()
        assert ticket.is_overdue is False

        # Ticket is closed (should not be overdue even if date passed)
        ticket.due_date = timezone.now().date() - timedelta(days=5)
        ticket.status = "closed"
        ticket.save()
        assert ticket.is_overdue is False

    def test_repair_approval_flow(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        customer = Customer.objects.create(name="Test Customer", phone="0555000000")
        ticket = RepairTicket.objects.create(
            customer=customer,
            device_model="iPhone 13",
            issue_description="Dead",
            status="waiting_approval",
            customer_approved=False
        )

        # Attempt to progress to in_repair without approval
        url = reverse('repairticket-update-status', kwargs={'pk': ticket.id})
        response = api_client.patch(url, {'status': 'in_repair'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot progress repair" in response.data['error']

        # Approve and then progress
        ticket.customer_approved = True
        ticket.save()
        
        response = api_client.patch(url, {'status': 'in_repair'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        ticket.refresh_from_db()
        assert ticket.status == 'in_repair'
