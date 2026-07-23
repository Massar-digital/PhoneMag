from rest_framework import serializers
from django.db.models import Sum
from .models import InventoryItem, StockHistory, Supplier
from apps.core.validators import (
    validate_positive_integer, 
    validate_non_negative_integer, 
    sanitize_string,
    validate_phone_number,
    validate_email_format
)
from apps.phones.serializers import PhoneSerializer
from apps.phones.models import Phone


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer for suppliers with input validation"""
    total_phones = serializers.SerializerMethodField(read_only=True)
    total_spent = serializers.SerializerMethodField(read_only=True)
    last_purchase_date = serializers.SerializerMethodField(read_only=True)
    purchase_history = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'

    def validate_name(self, value):
        """Sanitize supplier name"""
        return sanitize_string(value, max_length=100)

    def validate_phone(self, value):
        """Validate phone number format if provided"""
        if value:
            return validate_phone_number(value)
        return value

    def validate_email(self, value):
        """Validate email format if provided"""
        if value:
            return validate_email_format(value)
        return value

    def get_total_phones(self, obj):
        return obj.phones.count()

    def get_total_spent(self, obj):
        total = obj.phones.aggregate(total=Sum('purchase_price'))['total']
        return float(total) if total else 0.0

    def get_last_purchase_date(self, obj):
        last_phone = obj.phones.order_by('-created_at').first()
        return last_phone.created_at.isoformat() if last_phone else None

    def get_purchase_history(self, obj):
        phones_qs = obj.phones.all().order_by('-created_at')
        return [
            {
                'id': p.id,
                'product_type': p.product_type,
                'brand': p.brand,
                'model': p.model,
                'storage': p.storage,
                'color': p.color,
                'price': str(p.price),
                'purchase_price': str(p.purchase_price),
                'created_at': p.created_at.isoformat(),
            }
            for p in phones_qs
        ]


class InventoryItemSerializer(serializers.ModelSerializer):
    """Inventory serializer with comprehensive input validation"""
    phone = serializers.PrimaryKeyRelatedField(queryset=Phone.objects.all())
    phone_details = PhoneSerializer(source='phone', read_only=True)
    is_low_stock = serializers.SerializerMethodField(read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = InventoryItem
        fields = '__all__'
        read_only_fields = ['last_restocked']
    
    def validate_stock_quantity(self, value):
        """Validate stock quantity"""
        return validate_non_negative_integer(value)
    
    def validate_reorder_level(self, value):
        """Validate reorder level"""
        return validate_non_negative_integer(value)
    
    def validate_location(self, value):
        """Validate warehouse location"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Location cannot be empty.')
        return sanitize_string(value, max_length=100)
    
    def validate(self, data):
        """Cross-field validation"""
        # Reorder level should typically be less than expected stock
        if 'reorder_level' in data and data['reorder_level'] > 1000:
            raise serializers.ValidationError({
                'reorder_level': 'Reorder level seems too high (max 1000).'
            })
        
        return data

    def get_is_low_stock(self, obj):
        """Returns the boolean low stock flag for the inventory item"""
        try:
            return bool(obj.is_low_stock)
        except Exception:
            return False


class StockHistorySerializer(serializers.ModelSerializer):
    """Stock history serializer for tracking inventory changes"""
    phone_name = serializers.CharField(source='inventory_item.phone.__str__', read_only=True)
    phone_id = serializers.IntegerField(source='inventory_item.phone.id', read_only=True)
    brand = serializers.CharField(source='inventory_item.phone.brand', read_only=True)
    model_name = serializers.CharField(source='inventory_item.phone.model', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockHistory
        fields = [
            'id', 'inventory_item', 'adjustment_type', 'quantity', 'reason',
            'notes', 'previous_stock', 'new_stock', 'created_at',
            'phone_name', 'phone_id', 'brand', 'model_name', 'created_by_name'
        ]
        read_only_fields = ['id', 'previous_stock', 'new_stock', 'created_at', 'created_by']

    def validate_quantity(self, value):
        """Validate quantity is positive"""
        return validate_positive_integer(value)

    def validate_notes(self, value):
        """Validate and sanitize notes"""
        if value:
            return sanitize_string(value, max_length=500)
        return value
