from rest_framework import serializers
from .models import Sale, SaleItem, TradeIn, Expense, ProductReturn, ProductReturnItem, RepairTicket, RepairPart, RepairStatusLog
from .models_customer import Customer
from apps.phones.serializers import PhoneSerializer
from apps.phones.models import Phone
from apps.core.validators import (
    validate_quantity, validate_price, validate_discount, validate_choices,
    sanitize_string, validate_phone_number, validate_email_format
)
from apps.inventory.models import InventoryItem
from decimal import Decimal
from django.db.models import Sum


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer for individual sale items"""
    id = serializers.IntegerField(required=False)
    phone = serializers.PrimaryKeyRelatedField(queryset=Phone.objects.all(), required=True)
    phone_details = PhoneSerializer(source='phone', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'phone', 'phone_details', 'product_name_at_sale', 
            'quantity', 'unit_price', 'total_price', 'discount_applied'
        ]
        read_only_fields = ['total_price', 'product_name_at_sale']
    
    def validate_quantity(self, value):
        """Validate item quantity"""
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value
    
    def validate_unit_price(self, value):
        """Validate unit price"""
        if value <= 0:
            raise serializers.ValidationError('Unit price must be greater than zero.')
        return value
    
    def validate_discount_applied(self, value):
        """Validate discount amount"""
        if value < 0:
            raise serializers.ValidationError('Discount cannot be negative.')
        return value
    
    def validate(self, data):
        """Validate stock availability for this item"""
        phone_obj = data.get('phone')
        qty = data.get('quantity')
        
        if phone_obj and qty:
            try:
                inventory = phone_obj.inventory
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError({'phone': f'No inventory entry found for {phone_obj}.'})
            if inventory.stock_quantity < qty:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock for {phone_obj}. Available: {inventory.stock_quantity}'
                })
        
        # Validate discount doesn't exceed subtotal
        if 'discount_applied' in data and 'unit_price' in data and 'quantity' in data:
            subtotal = Decimal(str(data['unit_price'])) * Decimal(str(data['quantity']))
            if Decimal(str(data['discount_applied'])) > subtotal:
                raise serializers.ValidationError({
                    'discount_applied': 'Discount cannot exceed item subtotal.'
                })
        
        return data


class TradeInSerializer(serializers.ModelSerializer):
    """Serializer for trade-in devices"""
    # Extra fields accepted on write but not stored in TradeIn (used for Phone creation)
    ram = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    battery_percentage = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    resale_price = serializers.DecimalField(required=False, allow_null=True, write_only=True, max_digits=10, decimal_places=2)

    class Meta:
        model = TradeIn
        fields = ['id', 'brand', 'model', 'imei', 'color', 'storage', 'ram', 'battery_percentage',
                  'condition', 'trade_in_value', 'resale_price', 'notes', 'received_phone', 'created_at']
        read_only_fields = ['id', 'received_phone', 'created_at']


class ExchangeListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing exchange transactions (trade-ins)"""

    sale_invoice = serializers.ReadOnlyField(source='sale.invoice_number')
    sale_date = serializers.ReadOnlyField(source='sale.sale_date')
    customer_name = serializers.ReadOnlyField(source='sale.customer_name')
    customer_phone_number = serializers.ReadOnlyField(source='sale.customer.phone')
    new_phone_price = serializers.SerializerMethodField()
    new_phone_name = serializers.SerializerMethodField()
    amount_paid_by_client = serializers.ReadOnlyField(source='sale.total_price')
    payment_method = serializers.ReadOnlyField(source='sale.payment_method')
    received_phone_details = serializers.SerializerMethodField()

    class Meta:
        model = TradeIn
        fields = [
            'id', 'sale', 'sale_invoice', 'sale_date',
            'customer_name', 'customer_phone_number',
            'brand', 'model', 'imei', 'color', 'storage', 'condition',
            'trade_in_value', 'notes',
            'new_phone_name', 'new_phone_price',
            'amount_paid_by_client', 'payment_method',
            'received_phone', 'received_phone_details',
            'created_at',
        ]

    def get_new_phone_name(self, obj):
        """Name of the new phone the client bought"""
        try:
            first_item = obj.sale.items.first()
            if first_item and first_item.phone:
                p = first_item.phone
                return f"{p.brand} {p.model}" + (f" {p.storage}" if p.storage else "")
            if obj.sale.phone:
                p = obj.sale.phone
                return f"{p.brand} {p.model}" + (f" {p.storage}" if p.storage else "")
            return obj.sale.product_name_at_sale or 'N/A'
        except Exception:
            return 'N/A'

    def get_new_phone_price(self, obj):
        """Original price of the new phone (before trade-in deduction)"""
        try:
            first_item = obj.sale.items.first()
            if first_item:
                return float(first_item.unit_price or 0)
            if obj.sale.phone:
                return float(obj.sale.phone.price or 0)
            return None
        except Exception:
            return None

    def get_received_phone_details(self, obj):
        """Details of the phone added to inventory from trade-in"""
        if obj.received_phone:
            from apps.phones.serializers import PhoneSerializer
            return PhoneSerializer(obj.received_phone).data
        return None


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer for shop expenses"""
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Expense
        fields = ['id', 'category', 'amount', 'description', 'date', 'user', 'user_name', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ProductReturnItemSerializer(serializers.ModelSerializer):
    """Serializer for individual items in a return transaction"""
    product_details = PhoneSerializer(source='product', read_only=True)
    
    class Meta:
        model = ProductReturnItem
        fields = [
            'id', 'sale_item', 'product', 'product_details', 
            'quantity', 'refund_amount', 'profit_impact'
        ]
        read_only_fields = ['id', 'profit_impact']

    def validate(self, data):
        """
        Validate return item:
        1. Quantity doesn't exceed available for return.
        2. Sale item matches product.
        """
        sale_item = data.get('sale_item')
        product = data.get('product')
        quantity = data.get('quantity')

        if sale_item:
            # For modern sales with sale items
            # If sale_item.phone is None (was deleted), we allow the product to be set or None
            # The product will be restored from sale_item in the model's save method if needed
            if sale_item.phone:
                # Product exists, validate it matches
                if product and product != sale_item.phone:
                    raise serializers.ValidationError({"product": "Product does not match the original sale item."})
                # If product is None but sale_item.phone exists, use sale_item.phone
                if not product:
                    data['product'] = sale_item.phone
            else:
                # sale_item.phone is None (was deleted), product can be None or a new product
                # The model's save method will handle restoration if needed
                if not product:
                    # Try to get product from sale_item if it was just set to None
                    # This is handled in the model's save method
                    pass

            # Check quantity validation
            already_returned = sale_item.return_items.aggregate(total=Sum('quantity'))['total'] or 0
            max_allowed = sale_item.quantity - already_returned
            
            if quantity > max_allowed:
                raise serializers.ValidationError({
                    "quantity": f"Cannot return {quantity} units. Only {max_allowed} units remaining for return."
                })

            # IMPORTANT: Check if phone can be restored from snapshot
            if not product:
                # Product is None - check if we can restore it
                if not sale_item.product_data_snapshot:
                    if sale_item.phone:
                        # Phone exists, use it
                        data['product'] = sale_item.phone
                    else:
                        # Cannot restore - no phone and no snapshot
                        raise serializers.ValidationError({
                            "product": "Cannot process return: The original product was deleted and no backup data exists. This sale predates the product snapshot system. Please contact the administrator."
                        })
                # else: snapshot exists, will be restored in model's save()
        else:
            # Legacy sales without sale_item link
            # We need the parent sale from the context or the data
            sale = data.get('product_return').sale if 'product_return' in data else None
            
            # If we're inside a ProductReturnSerializer create, data might not have product_return yet
            # but we can try to find it from the sale provided in the sibling data
            # However, since this validate is on ProductReturnItemSerializer,
            # we'll rely on the model's clean() which we now catch in the parent create()
            pass
            
        return data


class ProductReturnSerializer(serializers.ModelSerializer):
    """
    Serializer for the full return transaction.
    Supports nested item creation.
    """
    items = ProductReturnItemSerializer(many=True)
    processed_by_name = serializers.ReadOnlyField(source='processed_by.username')
    sale_invoice = serializers.ReadOnlyField(source='sale.invoice_number')

    class Meta:
        model = ProductReturn
        fields = [
            'id', 'sale', 'sale_invoice', 'return_number', 'reason', 
            'return_date', 'processed_by', 'processed_by_name', 'items'
        ]
        read_only_fields = ['id', 'return_number', 'return_date', 'processed_by']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Wrapped in atomic transaction at the model level, 
        # but also here just to be safe with multi-item logic.
        from django.db import transaction
        from django.core.exceptions import ValidationError as DjangoValidationError
        import traceback
        
        try:
            with transaction.atomic():
                product_return = ProductReturn.objects.create(**validated_data)
                for item_data in items_data:
                    ProductReturnItem.objects.create(product_return=product_return, **item_data)
                    
            return product_return
        except DjangoValidationError as e:
            # Convert model-level ValidationError to DRF-level ValidationError (400 instead of 500)
            error_details = e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)}
            raise serializers.ValidationError({
                "error": "Validation failed",
                "details": error_details,
                "type": "validation_error"
            })
        except Exception as e:
            # Broad catch to capture any 500 and convert to 400 for debugging
            error_message = str(e)
            is_phone_error = any(keyword in error_message.lower() for keyword in ['phone', 'product', 'imei', 'barcode', 'snapshot'])

            print(f"ERROR: Exception in ProductReturnSerializer.create: {error_message}")
            traceback.print_exc()

            raise serializers.ValidationError({
                "error": "Phone recreation failed" if is_phone_error else "Return processing failed",
                "details": error_message,
                "type": "system_error",
                "help": "This error has been logged. Please contact the administrator if this persists."
            })


class RepairPartSerializer(serializers.ModelSerializer):
    """Serializer for parts used in a repair"""
    class Meta:
        model = RepairPart
        fields = ['id', 'part_name', 'quantity', 'unit_cost']


class RepairStatusLogSerializer(serializers.ModelSerializer):
    """Serializer for repair status history"""
    changed_by_name = serializers.ReadOnlyField(source='changed_by.username')

    class Meta:
        model = RepairStatusLog
        fields = ['id', 'previous_status', 'new_status', 'changed_by', 'changed_by_name', 'changed_at', 'note']
        read_only_fields = ['id', 'changed_at']


class RepairTicketSerializer(serializers.ModelSerializer):
    """Serializer for full repair ticket details"""
    customer_name = serializers.ReadOnlyField(source='customer.name')
    technician_name = serializers.ReadOnlyField(source='technician.username')
    parts = RepairPartSerializer(many=True, read_only=True)
    logs = RepairStatusLogSerializer(many=True, read_only=True)

    class Meta:
        model = RepairTicket
        fields = [
            'id', 'customer', 'customer_name', 'device_model', 'imei', 
            'issue_description', 'technician', 'technician_name', 
            'status', 'estimated_cost', 'final_cost', 'customer_approved', 
            'created_at', 'updated_at', 'due_date', 'notes', 'parts', 'logs',
            'is_overdue', 'days_overdue'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_overdue', 'days_overdue']
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
        }


class SaleSerializer(serializers.ModelSerializer):
    """Sale serializer with comprehensive input validation and support for multiple items"""
    # Keep `phone` as writeable PK field for backward compatibility
    phone = serializers.PrimaryKeyRelatedField(queryset=Phone.objects.all(), required=False, allow_null=True)
    phone_details = serializers.SerializerMethodField()
    # Add items field for multi-item sales
    items = SaleItemSerializer(many=True, required=False)
    # Add trade-in field
    trade_in = TradeInSerializer(required=False, allow_null=True)
    # Add returns field
    returns = ProductReturnSerializer(many=True, read_only=True, source='product_returns')
    # Add net amount (total_price - refunded)
    net_total = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ['sale_date', 'profit_margin', 'invoice_number', 'user', 'product_name_at_sale']

    def get_net_total(self, obj):
        """Calculate amount remaining after refunds"""
        try:
            total_refunded = Decimal('0.00')
            # product_returns is the related name from ProductReturn model
            if hasattr(obj, 'product_returns'):
                for r in obj.product_returns.all():
                    for item in r.items.all():
                        total_refunded += (item.refund_amount or Decimal('0.00'))
            
            total_price = obj.total_price or Decimal('0.00')
            return float(total_price - total_refunded)
        except Exception:
            return 0.0

    def get_phone_details(self, obj):
        """Get phone details for single item or first item of multiple"""
        target_phone = obj.phone
        first_item = None
        if not target_phone:
            first_item = obj.items.first()
            if first_item:
                target_phone = first_item.phone
        
        if target_phone:
            return PhoneSerializer(target_phone).data

        if not first_item:
            if obj.product_name_at_sale:
                return {
                    'brand': obj.product_name_at_sale,
                    'model': ''
                }
            return None

        snapshot = first_item.product_data_snapshot
        if snapshot:
            return {
                'id': None,
                'product_type': snapshot.get('product_type'),
                'brand': snapshot.get('brand'),
                'model': snapshot.get('model'),
                'price': snapshot.get('price'),
                'purchase_price': snapshot.get('purchase_price'),
                'storage': snapshot.get('storage'),
                'ram': snapshot.get('ram'),
                'color': snapshot.get('color'),
                'condition': snapshot.get('condition'),
                'description': snapshot.get('description'),
                'image_url': snapshot.get('image_url'),
                'IMEI': snapshot.get('IMEI'),
                'barcode': snapshot.get('barcode'),
                'battery_percentage': snapshot.get('battery_percentage')
            }

        if first_item.product_name_at_sale:
            return {
                'brand': first_item.product_name_at_sale,
                'model': ''
            }

        return None

    def to_representation(self, instance):
        """Customize output to ensure quantity and phone are always populated"""
        ret = super().to_representation(instance)
        
        # If quantity is null, calculate it from items
        if ret.get('quantity') is None:
            ret['quantity'] = instance.items.aggregate(total=Sum('quantity'))['total'] or 0
            
        return ret
    
    def validate_quantity(self, value):
        """Validate sale quantity (for backward compatibility)"""
        if value is not None and value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value
    
    def validate_total_price(self, value):
        """Validate total price"""
        return validate_price(value)
    
    def validate_customer_name(self, value):
        """Validate customer name"""
        if value:
            return sanitize_string(value, max_length=100)
        return value
    
    def validate_discount_applied(self, value):
        """Validate discount amount (currency amount, not percentage)."""
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError('Discount cannot be negative.')
        return value
    
    def validate_customer_phone(self, value):
        """Validate customer phone number"""
        if value:
            return validate_phone_number(value)
        return value
    
    def validate_payment_method(self, value):
        """Validate payment method choice"""
        valid_methods = ['Cash', 'Card', 'Split', 'Check', 'Mobile Wallet', 'Other']
        return validate_choices(value, valid_methods)
    
    def validate_notes(self, value):
        """Validate notes field"""
        if value:
            return sanitize_string(value, max_length=500, allow_special_chars=True)
        return value
    
    def validate(self, data):
        """Cross-field validation + stock availability"""
        # Ensure either phone/quantity (old way) or items (new way) is provided
        has_single_item = 'phone' in data and data['phone'] is not None
        has_multiple_items = 'items' in data and len(data['items']) > 0
        
        if not has_single_item and not has_multiple_items:
            raise serializers.ValidationError({
                'phone': 'Either phone or items must be provided.'
            })
        
        if has_single_item and has_multiple_items:
            raise serializers.ValidationError({
                'items': 'Cannot have both phone and items. Use items for multiple products.'
            })
        
        # Total price should be positive
        if 'total_price' in data and data['total_price'] <= 0:
            raise serializers.ValidationError({
                'total_price': 'Total price must be greater than zero.'
            })
        
        # For single-item sales (backward compatibility)
        if has_single_item:
            qty = data.get('quantity')
            if qty is None or qty <= 0:
                raise serializers.ValidationError({
                    'quantity': 'Quantity is required for single-item sales and must be greater than zero.'
                })
            
            # Validate stock availability
            phone_obj = data['phone']
            try:
                inventory = phone_obj.inventory
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError({'phone': 'No inventory entry found for this phone.'})
            if inventory.stock_quantity < qty:
                raise serializers.ValidationError({'quantity': 'Insufficient stock for this sale.'})
        
        # Discount should not exceed subtotal (total_price + discount_applied)
        if 'discount_applied' in data and 'total_price' in data:
            subtotal = data['total_price'] + data['discount_applied']
            if data['discount_applied'] > subtotal:
                raise serializers.ValidationError({
                    'discount_applied': 'Discount cannot exceed subtotal.'
                })

        return data
    
    def create(self, validated_data):
        """Create sale with support for multiple items and trade-ins"""
        items_data = validated_data.pop('items', None)
        trade_in_data = validated_data.pop('trade_in', None)
        
        # Set the user from the request context
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['user'] = request.user
            
        from django.db import transaction
        with transaction.atomic():
            # Create the sale
            sale = Sale.objects.create(**validated_data)
            
            # Create sale items if provided
            if items_data:
                for item_data in items_data:
                    SaleItem.objects.create(sale=sale, **item_data)

            # Create trade-in if provided
            if trade_in_data:
                # Automatically add traded-in phone to inventory
                # We create a new Phone entry for the traded-in device
                trade_in_value = Decimal(str(trade_in_data['trade_in_value']))
                resale_price = trade_in_data.get('resale_price')
                if resale_price is not None:
                    selling_price = Decimal(str(resale_price))
                else:
                    selling_price = trade_in_value * Decimal('1.2')  # Default markup

                traded_phone = Phone.objects.create(
                    brand=trade_in_data['brand'],
                    model=trade_in_data['model'],
                    color=trade_in_data.get('color', 'Non spécifié'),
                    storage=trade_in_data.get('storage'),
                    ram=trade_in_data.get('ram'),
                    IMEI=trade_in_data.get('imei'),
                    condition=trade_in_data.get('condition', 'Used'),
                    battery_percentage=trade_in_data.get('battery_percentage'),
                    price=selling_price,
                    purchase_price=trade_in_value,
                    product_type='Phone',
                    description=f"Reprise échange - Vente {sale.invoice_number}. {trade_in_data.get('notes', '')}".strip('. ')
                )

                # Create inventory item for the traded-in phone
                InventoryItem.objects.create(
                    phone=traded_phone,
                    stock_quantity=1,
                    location='Rayon Reprises'
                )

                # Create TradeIn record, linking to the received phone
                TradeIn.objects.create(
                    sale=sale,
                    received_phone=traded_phone,
                    brand=trade_in_data['brand'],
                    model=trade_in_data['model'],
                    imei=trade_in_data.get('imei'),
                    color=trade_in_data.get('color', 'Non spécifié'),
                    storage=trade_in_data.get('storage'),
                    condition=trade_in_data.get('condition', 'Used'),
                    trade_in_value=trade_in_data['trade_in_value'],
                    notes=trade_in_data.get('notes'),
                )
            
            # Finally, calculate everything using the model method
            sale.update_profit_margin()
        
        return sale

    def update(self, instance, validated_data):
        """Update sale with nested support for items and trade-ins"""
        items_data = validated_data.pop('items', None)
        trade_in_data = validated_data.pop('trade_in', None)
        
        # Update sale fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle Nested Items
        if items_data is not None:
            from django.db import transaction
            with transaction.atomic():
                # Get existing items
                existing_items = {item.id: item for item in instance.items.all()}
                received_ids = []
                
                for item_data in items_data:
                    item_id = item_data.get('id')
                    
                    if item_id and item_id in existing_items:
                        # Update existing
                        item_instance = existing_items[item_id]
                        # Remove id from data before updating instance
                        item_data.pop('id', None)
                        for attr, value in item_data.items():
                            setattr(item_instance, attr, value)
                        item_instance.save()
                        received_ids.append(item_id)
                    else:
                        # Create new
                        item_data.pop('id', None) # Remove if provided but not found
                        new_item = SaleItem.objects.create(sale=instance, **item_data)
                        received_ids.append(new_item.id)
                
                # Delete items not present in request
                for item_id, item_instance in existing_items.items():
                    if item_id not in received_ids:
                        item_instance.delete()
            
# Handle trade-in if exists or updated
            if trade_in_data:
                # Update or create trade-in (simplified)
                TradeIn.objects.update_or_create(
                    sale=instance, defaults=trade_in_data
                )
            
            # Recalculate totals using the model method (this also handles trade-in now)
            instance.update_profit_margin()
        
        return instance


class CustomerSerializer(serializers.ModelSerializer):
    """Customer serializer with comprehensive input validation"""
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['created_at', 'loyalty_points']
    
    def validate_name(self, value):
        """Validate customer name"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError('Customer name cannot be empty.')
        return sanitize_string(value, max_length=100)
    
    def validate_phone(self, value):
        """Validate customer phone number"""
        if value:
            return validate_phone_number(value)
        return value
    
    def validate_email(self, value):
        """Validate customer email"""
        if value:
            return validate_email_format(value)
        return value
    
    def validate_address(self, value):
        """Validate customer address"""
        if value:
            return sanitize_string(value, max_length=255, allow_special_chars=True)
        return value

    # Add computed fields for customer list view
    total_purchases = serializers.SerializerMethodField(read_only=True)
    last_purchase_date = serializers.SerializerMethodField(read_only=True)
    
    # Add nested purchase history - list of sales (read-only)
    purchase_history = serializers.SerializerMethodField(read_only=True)

    def get_total_purchases(self, obj):
        """Return the total number of purchases for this customer"""
        return obj.purchase_history.count()
    
    def get_last_purchase_date(self, obj):
        """Return the date of the last purchase for this customer"""
        last_sale = obj.purchase_history.order_by('-sale_date').first()
        return last_sale.sale_date.isoformat() if last_sale else None

    def get_purchase_history(self, obj):
        """Return a summarized sale list for this customer"""
        sales_qs = obj.purchase_history.all().order_by('-sale_date')
        # Use a lightweight representation to avoid recursion
        return [
            {
                'id': s.id,
                'phone': PhoneSerializer(s.phone).data,
                'quantity': s.quantity,
                'total_price': str(s.total_price),
                'sale_date': s.sale_date.isoformat(),
            }
            for s in sales_qs
        ]

