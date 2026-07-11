from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, StockHistoryViewSet, SupplierViewSet

router = DefaultRouter()
router.register(r'inventory', InventoryItemViewSet)
router.register(r'stock-history', StockHistoryViewSet)
router.register(r'suppliers', SupplierViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
