from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SaleViewSet, CustomerViewSet, ExpenseViewSet,
    ProductReturnViewSet, RepairTicketViewSet, ExchangeViewSet
)

router = DefaultRouter()
router.register(r'sales', SaleViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'returns', ProductReturnViewSet)
router.register(r'repairs', RepairTicketViewSet)
router.register(r'exchanges', ExchangeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
