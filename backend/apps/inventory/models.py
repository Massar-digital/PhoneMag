from django.db import models
from apps.phones.models import Phone


class Supplier(models.Model):
    """Model to track suppliers/vendors"""
    name = models.CharField(max_length=100, unique=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    delivery_time = models.CharField(max_length=100, blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # New field for payables
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    """Model to track inventory stock levels"""
    phone = models.OneToOneField(Phone, on_delete=models.CASCADE, related_name='inventory')
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    location = models.CharField(max_length=100, default='Main Warehouse', help_text="Shelf or warehouse location")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    last_restocked = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'

    def __str__(self):
        return f"{self.phone} - Stock: {self.stock_quantity}"

    @property
    def is_low_stock(self):
        """Boolean computed property for low stock status.

        Returns True when current stock is less than or equal to reorder level.
        Keep the method name backwards-compatible for admin / callers.
        """
        return self.stock_quantity <= self.reorder_level

    # No explicit method; property `is_low_stock` is preferred and used in serializers/admin


class StockHistory(models.Model):
    """Model to track stock adjustments and changes"""
    ADJUSTMENT_TYPES = [
        ('ADD', 'Add Stock'),
        ('REMOVE', 'Remove Stock'),
    ]

    REASONS = [
        ('SALE', 'Sale'),
        ('RETURN', 'Return'),
        ('DAMAGE', 'Damage'),
        ('RESTOCK', 'Restock'),
        ('CORRECTION', 'Correction'),
        ('INITIAL', 'Initial Stock'),
    ]

    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='stock_history')
    adjustment_type = models.CharField(max_length=10, choices=ADJUSTMENT_TYPES)
    quantity = models.IntegerField()
    reason = models.CharField(max_length=20, choices=REASONS)
    notes = models.TextField(blank=True, null=True)
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Stock History'
        verbose_name_plural = 'Stock History'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.inventory_item.phone} - {self.adjustment_type} {self.quantity} ({self.reason})"

