from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PhoneViewSet, ProductSearchView, ProductIMEILookupView, ProductBarcodeLookupView

router = DefaultRouter()
router.register(r'phones', PhoneViewSet)

urlpatterns = [
    path('products/search/', ProductSearchView.as_view(), name='product-search'),
    path('products/imei/<str:imei>/', ProductIMEILookupView.as_view(), name='product-imei-lookup'),
    path('products/barcode/<str:code>/', ProductBarcodeLookupView.as_view(), name='product-barcode-lookup'),
    path('', include(router.urls)),
]
