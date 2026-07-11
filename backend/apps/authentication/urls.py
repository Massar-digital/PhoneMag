from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    UserPreferencesViewSet,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    register,
    logout,
    password_reset_request,
    password_reset_confirm,
    current_user,
    upload_profile_picture,
    change_password,
    setup_status,
    create_initial_admin
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'preferences', UserPreferencesViewSet, basename='preferences')

urlpatterns = [
    path('register/', register, name='register'),
    path('logout/', logout, name='logout'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('password/reset/', password_reset_request, name='password_reset_request'),
    path('password/reset/confirm/', password_reset_confirm, name='password_reset_confirm'),
    # Specific user paths - must come before router to avoid conflicts
    path('users/current/', current_user, name='current_user'),
    path('users/current/upload-picture/', upload_profile_picture, name='upload_profile_picture'),
    path('users/change-password/', change_password, name='change_password'),
    # Initial Setup
    path('setup/status/', setup_status, name='setup_status'),
    path('setup/admin/', create_initial_admin, name='create_initial_admin'),
    # Router URLs - includes users/ CRUD endpoints
    path('', include(router.urls)),
]
