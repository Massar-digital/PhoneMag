from django.db import models
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from decimal import Decimal
from apps.phones.models import Phone
from .models_customer import Customer
from apps.inventory.models import InventoryItem, StockHistory
import logging

logger = logging.getLogger(__name__)


class Sale(models.Model):
    """
    Model to track phone and accessory sales transactions.

    This model represents individual sales transactions in the phone management system.
    Each sale can contain multiple items (phones/accessories) through SaleItem model,
    or single item for backward compatibility. Tracks customer information,
    quantity sold, pricing details, and payment information.

    Attributes:
        user (ForeignKey): The employee who made the sale
        phone (ForeignKey): DEPRECATED - Reference to single Phone model (for backward compatibility)
        customer (ForeignKey): Optional reference to Customer model for registered customers
        quantity (int): DEPRECATED - Number of units sold (for backward compatibility)
        total_price (Decimal): Total sale amount including any discounts
        amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
        payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PAID')
        customer_name (str): Name of the customer (optional)
        discount_applied (Decimal): Discount amount applied to this sale
        profit_margin (Decimal): Calculated profit margin for this sale
        invoice_number (str): Unique invoice number for the sale (optional)
        customer_phone (str): Customer's phone number for contact purposes
        payment_method (str): Method of payment (Cash, Card, Check, Other)
        notes (str): Additional notes about the sale
        sale_date (DateTime): Timestamp when the sale was recorded

    Meta:
        ordering: Sales ordered by date descending (newest first)
        indexes: Database indexes for performance optimization on frequently queried fields

    Methods:
        clean(): Validates stock availability before saving
        save(): Overrides save to generate invoice number and update inventory
        calculate_profit_margin(): Calculates profit based on purchase price
    """
    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partial'),
        ('PAID', 'Paid'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_made')
    phone = models.ForeignKey(Phone, on_delete=models.SET_NULL, related_name='sales', null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_history')
    product_name_at_sale = models.CharField(max_length=255, blank=True, null=True, help_text="Caches product name for single-item sales")
    quantity = models.IntegerField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PAID')
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    discount_applied = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, help_text="Discount applied to sale")
    profit_margin = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Profit margin for this sale")
    invoice_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    customer_phone = models.CharField(max_length=20, blank=True, null=True)
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('Cash', 'Cash'),
            ('Card', 'Card'),
            ('Split', 'Split'),
            ('Check', 'Check'),
            ('Mobile Wallet', 'Mobile Wallet'),
            ('Other', 'Other')
        ],
        default='Cash'
    )
    trade_in_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Value of traded-in device")
    warranty_duration = models.CharField(max_length=100, blank=True, null=True, help_text="Warranty duration (e.g., 12 months)")
    notes = models.TextField(blank=True, null=True)
    sale_date = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-sale_date']
        verbose_name = 'Sale'
        verbose_name_plural = 'Sales'
        indexes = [
            models.Index(fields=['sale_date'], name='sale_sale_date_idx'),
            models.Index(fields=['customer_name'], name='sale_customer_name_idx'),
            models.Index(fields=['phone', 'sale_date'], name='sale_phone_date_idx')
        ]

    def __str__(self):
        return f"Sale #{self.id} - {self.customer_name} ({self.sale_date.date()})"

    def update_profit_margin(self):
        """Recalculate and save profit margin and total price for this sale"""
        # Use fresh queries to avoid caching issues during bulk updates
        items = list(self.items.all())
        
        total_profit = Decimal('0.00')
        # Start with current total_price for legacy/fallback single-item sales
        total_price = self.total_price or Decimal('0.00')
        
        # Calculate for single item (backward compatibility)
        if self.phone and self.quantity:
            cost = (self.phone.purchase_price or Decimal('0.00')) * Decimal(self.quantity)
            total_profit = total_price - cost
        
        # Add profit from items and update total_price if items exist
        if items:
            items_price = Decimal('0.00')
            items_profit = Decimal('0.00')
            for item in items:
                # item.total_price is already calculated in SaleItem.save()
                items_price += item.total_price or Decimal('0.00')
                if item.phone:
                    item_cost = (item.phone.purchase_price or Decimal('0.00')) * Decimal(item.quantity)
                    items_profit += (item.total_price or Decimal('0.00')) - item_cost
                else:
                    # Fallback for items where phone might have been deleted
                    items_profit += (item.total_price or Decimal('0.00'))
            
            # Apply global discount to the total items price
            total_price = items_price - (self.discount_applied or Decimal('0.00'))
            total_profit = items_profit - (self.discount_applied or Decimal('0.00'))
            
        # Subtract trade-in value if exists
        trade_val = Decimal('0.00')
        try:
            # check for trade_in relation
            if hasattr(self, 'trade_in'):
                trade_val = self.trade_in.trade_in_value or Decimal('0.00')
        except Exception:
            # If relation doesn't exist yet or other error
            pass
            
        self.total_price = total_price - trade_val
        self.profit_margin = total_profit - trade_val
        
        # Using .update() to avoid re-triggering signals but keeping instance in sync
        self.__class__.objects.filter(pk=self.pk).update(
            total_price=self.total_price,
            profit_margin=self.profit_margin
        )
        return self.total_price

    def clean(self):
        # Validate stock availability for single-item sales (backward compatibility)
        if self.phone and self.quantity:
            try:
                inventory = self.phone.inventory
            except InventoryItem.DoesNotExist:
                raise ValidationError('No inventory entry found for this phone.')
            if inventory.stock_quantity < self.quantity:
                raise ValidationError('Insufficient stock for this sale.')

    def save(self, *args, **kwargs):
        # Wrap in transaction to ensure consistency when updating inventory
        with transaction.atomic():
            # Populate product name cache for history preservation
            if self.phone and not self.product_name_at_sale:
                self.product_name_at_sale = f"{self.phone.brand} {self.phone.model}"
                if self.phone.IMEI:
                    self.product_name_at_sale += f" (IMEI: {self.phone.IMEI})"

            # Calculate profit margin for single-item sales (backward compatibility)
            if self.phone and self.total_price is not None and self.quantity:
                purchase_cost = (self.phone.purchase_price or Decimal('0.00')) * Decimal(self.quantity)
                self.profit_margin = (self.total_price or Decimal('0.00')) - purchase_cost

            # If new (no PK yet) we need to validate inventory and deduct stock
            is_new = self.pk is None
            
            if not is_new:
                # Handle updates to existing single-item sales
                if self.phone and self.quantity:
                    try:
                        old_instance = Sale.objects.get(pk=self.pk)
                        if old_instance.phone == self.phone:
                            quantity_diff = self.quantity - old_instance.quantity
                            if quantity_diff != 0:
                                inventory = InventoryItem.objects.get(phone=self.phone)
                                previous_stock = inventory.stock_quantity
                                inventory.stock_quantity = previous_stock - quantity_diff
                                inventory.save()
                                
                                StockHistory.objects.create(
                                    inventory_item=inventory,
                                    adjustment_type='REMOVE' if quantity_diff > 0 else 'ADD',
                                    quantity=abs(quantity_diff),
                                    reason='CORRECTION',
                                    notes=f'Sale #{self.invoice_number} quantity updated',
                                    previous_stock=previous_stock,
                                    new_stock=inventory.stock_quantity,
                                    created_by=self.user
                                )
                    except Sale.DoesNotExist:
                        pass

            # Generate invoice number if not present
            if not self.invoice_number:
                # Invoice prefix based on year
                year = timezone.now().year
                prefix = f'INV-{year}-'
                # Find last invoice number this year and increment
                last = Sale.objects.filter(invoice_number__startswith=prefix).order_by('-invoice_number').first()
                if last and last.invoice_number:
                    try:
                        last_seq = int(last.invoice_number.split('-')[-1])
                    except Exception:
                        last_seq = 0
                else:
                    last_seq = 0
                self.invoice_number = f"{prefix}{last_seq + 1:05d}"

            # Run full clean (for stock validation) only for single-item sales
            if self.phone and self.quantity:
                self.clean()

            super().save(*args, **kwargs)

            # Adjust inventory stock on creation for single-item sales (backward compatibility)
            if is_new and self.phone and self.quantity:
                inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                previous_stock = inventory.stock_quantity
                inventory.stock_quantity = previous_stock - self.quantity
                inventory.save()
                
                # Create stock history record
                StockHistory.objects.create(
                    inventory_item=inventory,
                    adjustment_type='REMOVE',
                    quantity=self.quantity,
                    reason='SALE',
                    notes=f'Sale #{self.invoice_number}',
                    previous_stock=previous_stock,
                    new_stock=inventory.stock_quantity,
                    created_by=self.user
                )

                # Specialized logic: If Used device and stock reached 0 after sale, delete product entry
                # Note: For SaleItem-based sales, deletion is handled in SaleItem.save()
                if self.phone and self.phone.condition == 'Used' and inventory.stock_quantity <= 0:
                    self.phone.delete()

    def delete(self, *args, **kwargs):
        # Increase stock when sale is deleted (e.g., refund)
        with transaction.atomic():
            # Handle single-item sales (backward compatibility)
            if self.phone and self.quantity:
                try:
                    inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                    previous_stock = inventory.stock_quantity
                    inventory.stock_quantity = previous_stock + self.quantity
                    inventory.save()
                    
                    # Create stock history record
                    StockHistory.objects.create(
                        inventory_item=inventory,
                        adjustment_type='ADD',
                        quantity=self.quantity,
                        reason='RETURN',
                        notes=f'Sale #{self.invoice_number} deleted',
                        previous_stock=previous_stock,
                        new_stock=inventory.stock_quantity,
                        created_by=self.user
                    )
                except InventoryItem.DoesNotExist:
                    pass
            
            # Handle multi-item sales
            # Note: We do this BEFORE super().delete() because CASCADE will remove them
            for item in self.items.all():
                try:
                    inventory = InventoryItem.objects.select_for_update().get(phone=item.phone)
                    previous_stock = inventory.stock_quantity
                    inventory.stock_quantity = previous_stock + item.quantity
                    inventory.save()
                    
                    # Create stock history record
                    StockHistory.objects.create(
                        inventory_item=inventory,
                        adjustment_type='ADD',
                        quantity=item.quantity,
                        reason='RETURN',
                        notes=f'Sale #{self.invoice_number} deleted (item restored)',
                        previous_stock=previous_stock,
                        new_stock=inventory.stock_quantity,
                        created_by=self.user
                    )
                except InventoryItem.DoesNotExist:
                    pass
                    
            super().delete(*args, **kwargs)


class SaleItem(models.Model):
    """
    Model to track individual items in a sale (line items).
    
    This allows sales to have multiple products (phones/accessories) with different
    quantities and pricing.
    
    Attributes:
        sale (ForeignKey): Reference to the parent Sale
        phone (ForeignKey): Reference to the Phone/Accessory being sold
        product_name_at_sale (str): Copy of product name at time of sale (to preserve history if product is deleted)
        quantity (int): Number of units sold for this item
        unit_price (Decimal): Price per unit at time of sale
        total_price (Decimal): Total price for this item (unit_price * quantity)
        discount_applied (Decimal): Discount applied specifically to this item
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    phone = models.ForeignKey(Phone, on_delete=models.SET_NULL, null=True, blank=True)
    product_name_at_sale = models.CharField(max_length=255, blank=True, null=True)
    product_data_snapshot = models.JSONField(blank=True, null=True, help_text="Stores product data before deletion for refund restoration")
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)

    class Meta:
        verbose_name = 'Sale Item'
        verbose_name_plural = 'Sale Items'

    def __str__(self):
        return f"{self.sale} - {self.phone} x{self.quantity}"

    def clean(self):
        # Validate stock availability
        if not self.phone:
            raise ValidationError('Product/Phone is required for a sale item.')
        try:
            inventory = self.phone.inventory
        except InventoryItem.DoesNotExist:
            raise ValidationError(f'No inventory entry found for {self.phone}.')
        if inventory.stock_quantity < self.quantity:
            raise ValidationError(f'Insufficient stock for {self.phone}. Available: {inventory.stock_quantity}')

    def save(self, *args, **kwargs):
        with transaction.atomic():
            # Record product name and data for history before potential deletion
            if self.phone and not self.product_name_at_sale:
                self.product_name_at_sale = f"{self.phone.brand} {self.phone.model}"
                if self.phone.IMEI:
                    self.product_name_at_sale += f" (IMEI: {self.phone.IMEI})"
            
            # Store product data snapshot before potential deletion (for used products)
            if self.phone and not self.product_data_snapshot:
                self.product_data_snapshot = {
                    'product_type': self.phone.product_type,
                    'brand': self.phone.brand,
                    'model': self.phone.model,
                    'storage': self.phone.storage,
                    'ram': self.phone.ram,
                    'color': self.phone.color,
                    'condition': self.phone.condition,
                    'price': str(self.phone.price),
                    'purchase_price': str(self.phone.purchase_price),
                    'description': self.phone.description,
                    'IMEI': self.phone.IMEI,
                    'barcode': self.phone.barcode,
                    'battery_percentage': self.phone.battery_percentage,
                    'image_url': self.phone.image_url,
                    'supplier_id': self.phone.supplier.id if self.phone.supplier else None,
                }

            # Calculate total_price
            subtotal = Decimal(str(self.unit_price)) * Decimal(str(self.quantity))
            self.total_price = subtotal - (self.discount_applied or Decimal('0.00'))
            
            is_new = self.pk is None
            
            if not is_new:
                # Get the old quantity to calculate the difference
                old_instance = SaleItem.objects.get(pk=self.pk)
                quantity_diff = self.quantity - old_instance.quantity
                
                if quantity_diff != 0 and self.phone:
                    inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                    previous_stock = inventory.stock_quantity
                    
                    # If we are increasing quantity sold, we decrease stock and vice versa
                    inventory.stock_quantity = previous_stock - quantity_diff
                    inventory.save()
                    
                    # Create stock history record for the adjustment
                    StockHistory.objects.create(
                        inventory_item=inventory,
                        adjustment_type='REMOVE' if quantity_diff > 0 else 'ADD',
                        quantity=abs(quantity_diff),
                        reason='CORRECTION' if quantity_diff != 0 else 'SALE',
                        notes=f'Sale #{self.sale.invoice_number} item quantity updated',
                        previous_stock=previous_stock,
                        new_stock=inventory.stock_quantity,
                        created_by=self.sale.user
                    )
            
            # Valdiate stock before saving if new
            if is_new:
                self.clean()
            
            # Check if product should be deleted after sale (before saving)
            phone_to_delete = None
            should_delete_phone = False
            if is_new and self.phone:
                inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                previous_stock = inventory.stock_quantity
                new_stock = previous_stock - self.quantity
                
                # Check if this is a used product that will reach 0 stock
                if self.phone.condition == 'Used' and new_stock <= 0:
                    should_delete_phone = True
                    # Ensure we have the snapshot before deleting
                    if not self.product_data_snapshot:
                        self.product_data_snapshot = {
                            'product_type': self.phone.product_type,
                            'brand': self.phone.brand,
                            'model': self.phone.model,
                            'storage': self.phone.storage,
                            'ram': self.phone.ram,
                            'color': self.phone.color,
                            'condition': self.phone.condition,
                            'price': str(self.phone.price),
                            'purchase_price': str(self.phone.purchase_price),
                            'description': self.phone.description,
                            'IMEI': self.phone.IMEI,
                            'barcode': self.phone.barcode,
                            'battery_percentage': self.phone.battery_percentage,
                            'image_url': self.phone.image_url,
                            'supplier_id': self.phone.supplier.id if self.phone.supplier else None,
                        }
                    # Store phone reference before setting to None
                    phone_to_delete = self.phone
                    # Set phone to None so it's saved as None
                    self.phone = None
            
            super().save(*args, **kwargs)
            
            # Update parent sale profit and totals
            if self.sale:
                self.sale.update_profit_margin()
            
            # Deduct inventory on creation
            if is_new and phone_to_delete:
                # Use phone_to_delete since self.phone is now None
                inventory = InventoryItem.objects.select_for_update().get(phone=phone_to_delete)
                previous_stock = inventory.stock_quantity
                inventory.stock_quantity = previous_stock - self.quantity
                inventory.save()
                
                # Create stock history record
                StockHistory.objects.create(
                    inventory_item=inventory,
                    adjustment_type='REMOVE',
                    quantity=self.quantity,
                    reason='SALE',
                    notes=f'Sale #{self.sale.invoice_number} (Item)',
                    previous_stock=previous_stock,
                    new_stock=inventory.stock_quantity,
                    created_by=self.sale.user
                )

                # Delete the product if it's a used device with 0 stock
                if should_delete_phone:
                    phone_to_delete.delete()
            elif is_new and self.phone:
                # Normal case: product exists and won't be deleted
                inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                previous_stock = inventory.stock_quantity
                inventory.stock_quantity = previous_stock - self.quantity
                inventory.save()
                
                # Create stock history record
                StockHistory.objects.create(
                    inventory_item=inventory,
                    adjustment_type='REMOVE',
                    quantity=self.quantity,
                    reason='SALE',
                    notes=f'Sale #{self.sale.invoice_number} (Item)',
                    previous_stock=previous_stock,
                    new_stock=inventory.stock_quantity,
                    created_by=self.sale.user
                )

    def delete(self, *args, **kwargs):
        # Restore inventory when item is deleted
        try:
            if not self.phone:
                super().delete(*args, **kwargs)
                return
                
            with transaction.atomic():
                inventory = InventoryItem.objects.select_for_update().get(phone=self.phone)
                previous_stock = inventory.stock_quantity
                inventory.stock_quantity = previous_stock + self.quantity
                inventory.save()
                
                # Create stock history record
                StockHistory.objects.create(
                    inventory_item=inventory,
                    adjustment_type='ADD',
                    quantity=self.quantity,
                    reason='RETURN',
                    notes=f'Sale Item from #{self.sale.invoice_number} removed',
                    previous_stock=previous_stock,
                    new_stock=inventory.stock_quantity,
                    created_by=self.sale.user
                )
        except InventoryItem.DoesNotExist:
            pass
        super().delete(*args, **kwargs)


class TradeIn(models.Model):
    """
    Model to track traded-in devices during a sale (exchange service).
    When a client brings their old phone to exchange for a new one from the shop.
    """
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name='trade_in')
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    imei = models.CharField(max_length=15, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, default='Non spécifié', help_text="Color of the traded-in device")
    storage = models.CharField(max_length=50, blank=True, null=True, help_text="Storage capacity of the traded-in device")
    condition = models.CharField(max_length=50, choices=Phone.CONDITION_CHOICES, default='Used')
    trade_in_value = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    # FK to the phone record created in inventory from this trade-in
    received_phone = models.OneToOneField(
        Phone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exchange_received',
        help_text="The phone record added to inventory from this trade-in"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Trade-in'
        verbose_name_plural = 'Trade-ins'
        ordering = ['-created_at']

    def __str__(self):
        return f"Trade-in: {self.brand} {self.model} ({self.trade_in_value} DA)"

    @property
    def difference_paid(self):
        """Amount the client paid on top of trade-in value"""
        if self.sale:
            return self.sale.total_price
        return Decimal('0.00')


class Expense(models.Model):
    """
    Model to track shop expenses (rent, electricity, salaries, etc.)
    """
    CATEGORY_CHOICES = [
        ('Rent', 'Rent'),
        ('Electricity', 'Electricity'),
        ('Water', 'Water'),
        ('Internet', 'Internet'),
        ('Salaries', 'Salaries'),
        ('Marketing', 'Marketing'),
        ('Supplies', 'Supplies'),
        ('Maintenance', 'Maintenance'),
        ('Tax', 'Tax'),
        ('Other', 'Other'),
    ]

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    date = models.DateField(default=timezone.now)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses_recorded')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'

    def __str__(self):
        return f"{self.category} - ${self.amount} ({self.date})"


class RepairTicket(models.Model):
    STATUS_CHOICES = [
        ('intake', 'Intake'),
        ('diagnosis', 'Diagnosis'),
        ('waiting_parts', 'Waiting for Parts'),
        ('in_repair', 'In Repair'),
        ('waiting_approval', 'Waiting Customer Approval'),
        ('ready', 'Ready for Pickup'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='repair_tickets')
    device_model = models.CharField(max_length=200)
    imei = models.CharField(max_length=20, blank=True)
    issue_description = models.TextField()
    technician = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_repairs')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='intake')
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    customer_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Repair Ticket'
        verbose_name_plural = 'Repair Tickets'

    def __str__(self):
        return f"Repair #{self.id}: {self.device_model} ({self.status})"

    @property
    def is_overdue(self):
        if self.due_date and self.status not in ['closed', 'cancelled']:
            return self.due_date < timezone.now().date()
        return False

    @property
    def days_overdue(self):
        if self.is_overdue:
            delta = timezone.now().date() - self.due_date
            return delta.days
        return 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.pk:
            old_instance = RepairTicket.objects.get(pk=self.pk)
            # Block progression from 'waiting_approval' until approved
            if old_instance.status == 'waiting_approval' and self.status not in ['waiting_approval', 'cancelled']:
                if not self.customer_approved:
                    raise ValidationError("Cannot progress repair from 'Waiting Customer Approval' until 'Customer Approved' is checked.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class RepairPart(models.Model):
    ticket = models.ForeignKey(RepairTicket, related_name='parts', on_delete=models.CASCADE)
    part_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.part_name} (x{self.quantity}) for Ticket #{self.ticket.id}"


class RepairStatusLog(models.Model):
    ticket = models.ForeignKey(RepairTicket, related_name='logs', on_delete=models.CASCADE)
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"Ticket #{self.ticket.id}: {self.previous_status} -> {self.new_status}"


class ProductReturn(models.Model):
    """
    Header model for a product return transaction.
    One return can contain multiple items from the same sale.
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='product_returns')
    return_number = models.CharField(max_length=20, unique=True, blank=True)
    reason = models.TextField(blank=True, null=True)
    return_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='returns_processed')

    class Meta:
        ordering = ['-return_date']
        verbose_name = 'Product Return'
        verbose_name_plural = 'Product Returns'

    def __str__(self):
        return f"Return {self.return_number} for Sale #{self.sale.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.return_number:
            # Generate return number: RET-YYYY-XXXXX
            year = timezone.now().year
            prefix = f'RET-{year}-'
            last = ProductReturn.objects.filter(return_number__startswith=prefix).order_by('-return_number').first()
            if last and last.return_number:
                try:
                    last_seq = int(last.return_number.split('-')[-1])
                except (ValueError, IndexError):
                    last_seq = 0
            else:
                last_seq = 0
            self.return_number = f"{prefix}{last_seq + 1:05d}"
        super().save(*args, **kwargs)


class ProductReturnItem(models.Model):
    """
    Line item for a product return.
    Links a specific returned quantity of a product from a specific SaleItem.
    """
    product_return = models.ForeignKey(ProductReturn, on_delete=models.CASCADE, related_name='items')
    sale_item = models.ForeignKey(SaleItem, on_delete=models.CASCADE, related_name='return_items', null=True, blank=True)
    product = models.ForeignKey(Phone, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount refunded for this item")
    profit_impact = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Impact on profit (usually negative)")

    class Meta:
        verbose_name = 'Product Return Item'
        verbose_name_plural = 'Product Return Items'

    def __str__(self):
        product_name = self.product.model if self.product else "Unknown Product"
        return f"{self.quantity} x {product_name} (Return {self.product_return.return_number})"

    def clean(self):
        # Business Logic: Check if quantity returned exceeds quantity sold minus already returned
        if self.sale_item:
            # For modern sales with sale items
            already_returned = self.sale_item.return_items.exclude(pk=self.pk).aggregate(total=models.Sum('quantity'))['total'] or 0
            max_allowed = self.sale_item.quantity - already_returned
            if self.quantity > max_allowed:
                raise ValidationError(f"Cannot return {self.quantity} units. Only {max_allowed} units remaining for return on this item.")
        else:
            # Legacy support (single item on Sale)
            already_returned = ProductReturnItem.objects.filter(
                product_return__sale=self.product_return.sale,
                product=self.product,
                sale_item__isnull=True
            ).exclude(pk=self.pk).aggregate(total=models.Sum('quantity'))['total'] or 0
            # Use sale level quantity for legacy
            sale_qty = self.product_return.sale.quantity
            if sale_qty is None:
                # Fallback for legacy sales without explicit quantity: sum of sale items or assume 1
                if hasattr(self.product_return.sale, 'items'):
                    sale_qty = self.product_return.sale.items.aggregate(total=Sum('quantity'))['total'] or 1
                else:
                    sale_qty = 1
            max_allowed = sale_qty - already_returned
            if self.quantity > max_allowed:
                raise ValidationError(f"Cannot return {self.quantity} units. Only {max_allowed} units remaining for return on this item.")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        logger.info(f"ProductReturnItem.save() called: is_new={is_new}, sale_item_id={self.sale_item_id}, product_id={self.product_id}, quantity={self.quantity}")
        with transaction.atomic():
            if is_new:
                self.clean()
                
                # Financial calculation
                # Profit Impact = (Value of stock restored) - (Amount given back to client)
                # We use the original purchase price of the product to restore inventory value accurately
                purchase_cost_per_unit = Decimal('0.00')
                if self.product:
                    purchase_cost_per_unit = self.product.purchase_price or Decimal('0.00')
                elif self.sale_item and self.sale_item.product_data_snapshot:
                    purchase_cost_per_unit = Decimal(self.sale_item.product_data_snapshot.get('purchase_price', '0'))
                
                self.profit_impact = (purchase_cost_per_unit * Decimal(self.quantity)) - Decimal(self.refund_amount)

                # Inventory Restoration
                # First, try to get product from sale_item if product is None (was deleted)
                if not self.product and self.sale_item:
                    self.product = self.sale_item.phone
                    if self.product:
                        logger.info(f"Product restored from sale_item.phone: product_id={self.product.id}")

                # If product still doesn't exist but we have product_data_snapshot, recreate it
                if not self.product and self.sale_item and self.sale_item.product_data_snapshot:
                    logger.info(f"Product is None, attempting to recreate from snapshot for sale_item_id={self.sale_item.id}")
                    product_data = self.sale_item.product_data_snapshot
                    # Recreate the product from snapshot
                    from apps.phones.models import Phone
                    from apps.inventory.models import InventoryItem, Supplier

                    # Get supplier if it exists
                    supplier = None
                    if product_data.get('supplier_id'):
                        try:
                            supplier = Supplier.objects.get(id=product_data['supplier_id'])
                        except Supplier.DoesNotExist:
                            logger.warning(f"Supplier {product_data['supplier_id']} not found in snapshot, proceeding without supplier")
                            pass

                    # Handle IMEI uniqueness - if IMEI exists and product was deleted, we might need to clear it
                    # or handle the unique constraint
                    imei_value = product_data.get('IMEI')
                    barcode_value = product_data.get('barcode')
                    
                    # Check if IMEI already exists (in case product was recreated before)
                    if imei_value:
                        try:
                            existing_phone = Phone.objects.get(IMEI=imei_value)
                            # If product already exists, use it instead of creating new one
                            logger.warning(f"Phone with IMEI {imei_value} already exists (id={existing_phone.id}), reusing it instead of creating duplicate")
                            self.product = existing_phone
                        except Phone.DoesNotExist:
                            # IMEI doesn't exist, safe to create
                            logger.info(f"IMEI {imei_value} is available, will create new phone")
                            pass
                        except Phone.MultipleObjectsReturned:
                            # Multiple products with same IMEI (shouldn't happen but handle it)
                            logger.error(f"Multiple phones found with IMEI {imei_value} - data integrity issue!")
                            existing_phone = Phone.objects.filter(IMEI=imei_value).first()
                            if existing_phone:
                                self.product = existing_phone
                    
                    # Only create if product doesn't exist yet
                    if not self.product:
                        # Validate required fields before attempting creation
                        required_fields = ['brand', 'model', 'color', 'price', 'purchase_price']
                        missing_fields = [f for f in required_fields if not product_data.get(f)]
                        if missing_fields:
                            error_msg = f"Cannot recreate phone: missing required fields {missing_fields}"
                            logger.error(f"CRITICAL: {error_msg} for sale_item_id={self.sale_item.id}")
                            raise ValueError(error_msg)

                        # Check for barcode uniqueness conflict
                        if barcode_value:
                            if Phone.objects.filter(barcode=barcode_value).exists():
                                logger.warning(f"Barcode {barcode_value} already exists, clearing it to allow phone creation")
                                barcode_value = None  # Let Phone.save() generate a new barcode

                        # Create the product
                        logger.info(f"Creating new phone from snapshot: brand={product_data.get('brand')}, model={product_data.get('model')}, IMEI={imei_value}")
                        try:
                            self.product = Phone.objects.create(
                                product_type=product_data.get('product_type', 'Phone'),
                                brand=product_data.get('brand'),
                                model=product_data.get('model'),
                                storage=product_data.get('storage'),
                                ram=product_data.get('ram'),
                                color=product_data.get('color'),
                                condition=product_data.get('condition', 'Used'),
                                price=Decimal(product_data.get('price', '0')),
                                purchase_price=Decimal(product_data.get('purchase_price', '0')),
                                description=product_data.get('description'),
                                IMEI=imei_value if imei_value else None,
                                barcode=barcode_value if barcode_value else None,
                                battery_percentage=product_data.get('battery_percentage'),
                                image_url=product_data.get('image_url'),
                                supplier=supplier,
                            )
                            logger.info(f"✓ Successfully created phone with id={self.product.id}")
                        except Exception as e:
                            logger.error(f"CRITICAL: Phone creation failed for sale_item_id={self.sale_item.id}: {str(e)}", exc_info=True)
                            raise  # Re-raise to prevent silent failures
                        
                        # Create inventory item for the recreated product
                        import apps.inventory.models
                        apps.inventory.models.InventoryItem.objects.create(
                            phone=self.product,
                            stock_quantity=0,  # Will be updated below
                            reorder_level=10,
                            location='Main Warehouse',
                            supplier=supplier
                        )
                    else:
                        # Product already exists (found by IMEI), ensure inventory item exists
                        try:
                            InventoryItem.objects.get(phone=self.product)
                        except InventoryItem.DoesNotExist:
                            InventoryItem.objects.create(
                                phone=self.product,
                                stock_quantity=0,  # Will be updated below
                                reorder_level=10,
                                location='Main Warehouse',
                                supplier=supplier
                            )

                elif not self.product and self.sale_item and not self.sale_item.product_data_snapshot:
                    # Missing snapshot - log this critical issue
                    logger.error(f"CRITICAL: Cannot restore product for sale_item_id={self.sale_item.id} - product is None and no snapshot exists. This sale predates the snapshot feature.")
                
                # If we recreated or reused a product, re-link the sale item for future lookups
                if self.sale_item and self.product and not self.sale_item.phone_id:
                    self.sale_item.phone = self.product
                    self.sale_item.save(update_fields=['phone'])

                if self.product:
                    from apps.inventory.models import InventoryItem, StockHistory
                    try:
                        inventory = InventoryItem.objects.get(phone=self.product)
                        previous_stock = inventory.stock_quantity
                        inventory.stock_quantity = previous_stock + self.quantity
                        inventory.save()
                        
                        # Log movement for auditability
                        StockHistory.objects.create(
                            inventory_item=inventory,
                            adjustment_type='ADD',
                            quantity=self.quantity,
                            reason='RETURN',
                            notes=f'Return {self.product_return.return_number} for Sale #{self.product_return.sale.invoice_number}',
                            previous_stock=previous_stock,
                            new_stock=inventory.stock_quantity,
                            created_by=self.product_return.processed_by
                        )
                    except InventoryItem.DoesNotExist:
                        # If inventory item doesn't exist, create it
                        inventory = apps.inventory.models.InventoryItem.objects.create(
                            phone=self.product,
                            stock_quantity=self.quantity,
                            reorder_level=10,
                            location='Main Warehouse'
                        )
                        
                        # Log movement for auditability
                        from apps.inventory.models import StockHistory
                        StockHistory.objects.create(
                            inventory_item=inventory,
                            adjustment_type='ADD',
                            quantity=self.quantity,
                            reason='RETURN',
                            notes=f'Return {self.product_return.return_number} for Sale #{self.product_return.sale.invoice_number} - Inventory recreated',
                            previous_stock=0,
                            new_stock=inventory.stock_quantity,
                            created_by=self.product_return.processed_by
                        )
            
            # Save the ProductReturnItem
            # If product was recreated, make sure it's saved with the product reference
            # Set product_id explicitly to ensure it's saved
            if self.product and not self.product_id:
                self.product_id = self.product.id
            super().save(*args, **kwargs)
