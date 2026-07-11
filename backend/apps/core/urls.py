"""
URLs for sync management API
"""
from django.urls import path
from . import views
from . import dashboard_views

urlpatterns = [
    path('sync/status/', views.sync_status, name='sync_status'),
    path('sync/trigger/', views.trigger_sync, name='trigger_sync'),
    path('dashboard/stats/', dashboard_views.dashboard_stats, name='dashboard_stats'),
]
