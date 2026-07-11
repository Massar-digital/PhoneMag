from django.contrib import admin
from .models import InventoryItem, Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'email']
    search_fields = ['name', 'contact_person', 'email']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['phone', 'stock_quantity', 'reorder_level', 'is_low_stock', 'last_restocked']
    list_filter = ['last_restocked']
    search_fields = ['phone__brand', 'phone__model']
    ordering = ['stock_quantity']
