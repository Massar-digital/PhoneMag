from django.urls import path
from . import views

urlpatterns = [
    path('licenses/activate/', views.activate_license, name='license-activate'),
]
