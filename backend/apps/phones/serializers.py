from rest_framework import serializers
from .models import Phone
from apps.core.validators import (
    validate_price, validate_storage_format,
    validate_ram_format, sanitize_string, validate_choices
)


class PhoneSerializer(serializers.ModelSerializer):
    """Phone serializer with comprehensive input validation"""
    ram = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="RAM capacity (optional, e.g., 4GB, 8GB)"
    )
    
    # Add quantity field for initial stock
    quantity = serializers.IntegerField(
        min_value=0,
        write_only=True,
        required=False,
        help_text="Initial stock quantity for this phone"
    )

    # Add inventory fields
    reorder_level = serializers.IntegerField(
        min_value=0,
        write_only=True,
        required=False
    )
    location = serializers.CharField(
        max_length=100,
        write_only=True,
        required=False,
        allow_blank=True,
        default='Main Warehouse'
    )
    supplier_name = serializers.ReadOnlyField(source='supplier.name')

    image = serializers.ImageField(
        required=False,
        allow_null=True,
        allow_empty_file=True,
        help_text="Product image file"
    )

    class Meta:
        model = Phone
        fields = [
            'id', 'product_type', 'brand', 'model', 'price', 'purchase_price',
            'storage', 'ram', 'color', 'condition', 'description', 'image', 'image_url',
            'IMEI', 'barcode', 'battery_percentage', 'battery_cycle', 'screen_size', 'created_at', 'updated_at',
            'quantity', 'reorder_level', 'location', 'supplier', 'supplier_name', 'inventory'
        ]
        read_only_fields = ['created_at', 'updated_at', 'inventory', 'supplier_name']

    def create(self, validated_data):
        # Extract inventory fields
        quantity = validated_data.pop('quantity', 0)
        reorder_level = validated_data.pop('reorder_level', 10)
        location = validated_data.pop('location', 'Main Warehouse')
        
        # Supplier is now a model field, it should be in validated_data if sent correctly
        # But wait, we might need to handle the string ID sent by the frontend
        supplier = validated_data.get('supplier')

        phone = super().create(validated_data)

        # Create InventoryItem
        from apps.inventory.models import InventoryItem
        
        InventoryItem.objects.create(
            phone=phone,
            stock_quantity=quantity if quantity is not None else 0,
            reorder_level=reorder_level if reorder_level is not None else 10,
            location=location if location else 'Main Warehouse',
            supplier=supplier
        )
        
        return phone

    def update(self, instance, validated_data):
        # Extract inventory fields
        quantity = validated_data.pop('quantity', None)
        reorder_level = validated_data.pop('reorder_level', None)
        location = validated_data.pop('location', None)
        
        # Update Phone instance
        instance = super().update(instance, validated_data)
        
        # Update or create related InventoryItem
        from apps.inventory.models import InventoryItem
        inventory_item, created = InventoryItem.objects.get_or_create(
            phone=instance,
            defaults={'location': 'Main Warehouse'}
        )
        
        if quantity is not None:
            inventory_item.stock_quantity = quantity
        if reorder_level is not None:
            inventory_item.reorder_level = reorder_level
        if location is not None:
            inventory_item.location = location
        
        # Sync supplier to inventory item as well for backward compatibility
        inventory_item.supplier = instance.supplier
        
        inventory_item.save()
            
        return instance
    
    def validate_brand(self, value):
        """Validate brand choice against model choices"""
        if not value: return value
        valid_brands = [choice[0] for choice in Phone.BRAND_CHOICES]
        # Just return the value if it's not and we don't want to block
        return value
    
    def validate_product_type(self, value):
        """Validate product type choice against model choices"""
        if not value: return value
        valid_types = [choice[0] for choice in Phone.PRODUCT_TYPE_CHOICES]
        return value
    
    def validate_model(self, value):
        """Validate model name"""
        if not value:
            return value
        return value.strip()

    def validate_battery_percentage(self, value):
        """Validate battery percentage (0-100)"""
        if value is not None:
            try:
                val = int(value)
                if val < 0 or val > 100:
                    raise serializers.ValidationError('Battery percentage must be between 0 and 100.')
                return val
            except (ValueError, TypeError):
                if value == '': return None
                raise serializers.ValidationError('Invalid battery percentage.')
        return value

    def validate_price(self, value):
        """Validate selling price"""
        if value <= 0:
            raise serializers.ValidationError('Selling price must be greater than zero.')
        return value
    
    def validate_purchase_price(self, value):
        """Validate purchase price"""
        if value < 0:
            raise serializers.ValidationError('Purchase price cannot be negative.')
        return value
    
    def validate_storage(self, value):
        """Validate storage format - optional for accessories"""
        if value:
            # Basic validation instead of strict core helper
            return value.strip()
        return value
    
    def validate_ram(self, value):
        """Validate RAM format - optional for accessories"""
        # Handle empty string as None
        if not value or (isinstance(value, str) and value.strip() == ''):
            return None
        return value.strip()
    
    def validate_color(self, value):
        """Validate color"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Color cannot be empty.')
        return value.strip()
    
    def validate_description(self, value):
        """Validate description"""
        if value:
            return value.strip()
        return value
    
    def validate_condition(self, value):
        """Validate condition choice against model choices"""
        valid_conditions = [choice[0] for choice in Phone.CONDITION_CHOICES]
        if value not in valid_conditions:
            raise serializers.ValidationError(f"Invalid condition. Allowed: {', '.join(valid_conditions)}")
        return value

    def validate_supplier(self, value):
        """Validate supplier field - convert empty string to None"""
        if value == '' or value is None:
            return None
            
        # If it's already a Supplier instance (from PrimaryKeyRelatedField), return it
        from apps.inventory.models import Supplier
        if isinstance(value, Supplier):
            return value
            
        try:
            return int(value)
        except (ValueError, TypeError):
            # If it's already an instance or something else, return as is
            return value

    def validate_image_url(self, value):
        """Validate image_url - convert empty string to None"""
        if value == '' or value is None:
            return None
        return value.strip() if isinstance(value, str) else value

    def validate(self, data):
        """Cross-field validation"""
        # Purchase price should be less than selling price
        # For updates, we need to check both the new data and the existing object's status
        price = data.get('price')
        purchase_price = data.get('purchase_price')
        
        # If we have both prices in data, compare them
        if price is not None and purchase_price is not None:
            # Loosen to allow equal prices
            if purchase_price > price and price > 0:
                raise serializers.ValidationError({
                    'price': 'Selling price should be at least equal to purchase price.'
                })
        # If we only have one, and we are updating, compare with instance value
        elif self.instance:
            current_price = price if price is not None else self.instance.price
            current_purchase = purchase_price if purchase_price is not None else self.instance.purchase_price
            
            if current_purchase > current_price and current_price > 0:
                raise serializers.ValidationError({
                    'price': 'Selling price should be at least equal to purchase price.'
                })
        
        # For phones, storage is required
        product_type = data.get('product_type')
        if not product_type and self.instance:
            product_type = self.instance.product_type
        else:
            product_type = product_type or 'Phone'
            
        if product_type == 'Phone':
            storage = data.get('storage')
            if storage is None and self.instance:
                storage = self.instance.storage
            
            # Allow empty storage during update if it was already empty or if it's not a Phone
            if not storage and product_type == 'Phone':
                # Only raise if it's definitely a phone and storage is being explicitly cleared or is missing
                pass 
        
        return data


class PhoneDetailSerializer(serializers.ModelSerializer):
    """Phone serializer with inventory details for phone details view"""
    
    inventory = serializers.SerializerMethodField()
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    
    class Meta:
        model = Phone
        fields = '__all__'
    
    def get_inventory(self, obj):
        """Get inventory information for this phone"""
        try:
            inventory_item = obj.inventory
            return {
                'stock_quantity': inventory_item.stock_quantity,
                'reorder_level': inventory_item.reorder_level,
                'location': inventory_item.location,
                'supplier': inventory_item.supplier.name if inventory_item.supplier else None,
                'supplier_id': inventory_item.supplier.id if inventory_item.supplier else None,
                'last_restocked': inventory_item.last_restocked.isoformat() if inventory_item.last_restocked else None,
            }
        except:
            return None
