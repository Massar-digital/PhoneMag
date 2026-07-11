from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for the shop ViewSet
router = DefaultRouter()
router.register(r'', views.ShopViewSet, basename='shop')

urlpatterns = [
    # Custom URL for shop settings that handles GET, PUT, PATCH
    path('', views.ShopViewSet.as_view({
        'get': 'list',
        'put': 'update',
        'patch': 'update'
    }), name='shop-settings'),
    
    # Upload logo endpoint
    path('upload_logo/', views.ShopViewSet.as_view({
        'post': 'upload_logo'
    }), name='shop-upload-logo'),
    
    # Delete logo endpoint
    path('delete_logo/', views.ShopViewSet.as_view({
        'delete': 'delete_logo'
    }), name='shop-delete-logo'),
]