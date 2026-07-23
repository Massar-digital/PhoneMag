"""
URL configuration for Phone Magazine Management App.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from apps.core.dashboard_views import dashboard_stats

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('api/', include('apps.phones.urls')),
    path('api/', include('apps.sales.urls')),
    path('api/', include('apps.inventory.urls')),
    path('api/shop/', include('apps.shop.urls')),
    path('api/system/', include('apps.core.urls')),  # Sync management endpoints
    path('api/', include('apps.licensing.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# In Electron production, we need to serve media files manually
# This is usually discouraged in standard web development but necessary for local desktop apps
from django.views.static import serve
from django.urls import re_path

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]
