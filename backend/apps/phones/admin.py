from django.contrib import admin
from .models import Phone


@admin.register(Phone)
class PhoneAdmin(admin.ModelAdmin):
    list_display = ['brand', 'model', 'product_type', 'storage', 'ram', 'color', 'price', 'battery_percentage', 'battery_cycle', 'screen_size', 'created_at']
    list_filter = ['brand', 'storage', 'ram', 'product_type']
    search_fields = ['brand', 'model', 'color']
    ordering = ['-created_at']
