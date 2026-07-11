from django.db import models


class Phone(models.Model):
    """
    Phone model representing mobile phone products and accessories in the inventory system.

    This model stores detailed information about products including phones, cases,
    chargers, screen protectors, and other mobile accessories with their
    specifications, pricing, and inventory tracking data.

    Attributes:
        product_type (str): Type of product (Phone, Case, Charger, etc.)
        brand (str): Product manufacturer (Apple, Samsung, etc.)
        model (str): Product model name (iPhone 15, Galaxy S24, etc.)
        price (Decimal): Selling price in the local currency
        purchase_price (Decimal): Cost price for profit calculations
        storage (str): Storage capacity for phones (e.g., "128GB", "256GB") - optional for accessories
        ram (str): RAM capacity for phones (e.g., "8GB", "12GB") - optional for accessories
        color (str): Product color variant
        condition (str): Product condition (New, Refurbished, Used)
        description (str): Optional detailed description
        image (ImageField): Product image file
        IMEI (str): Unique 15-digit IMEI identifier for phones - optional for accessories
        created_at (DateTime): Record creation timestamp
        updated_at (DateTime): Last modification timestamp

    Meta:
        Database indexes on brand, model, and price for performance
        Default ordering by creation date (newest first)

    Methods:
        __str__: Returns formatted string representation
    """
    PRODUCT_TYPE_CHOICES = [
        ('Phone', 'Phone'),
        ('Laptop', 'Laptop'),
        ('Case', 'Phone Case'),
        ('Charger', 'Charger'),
        ('Cable', 'Cable'),
        ('Screen Protector', 'Screen Protector'),
        ('Headphones', 'Headphones'),
        ('Earphones', 'Earphones'),
        ('Power Bank', 'Power Bank'),
        ('Memory Card', 'Memory Card'),
        ('Adapter', 'Adapter'),
        ('Holder', 'Phone Holder'),
        ('Other', 'Other Accessory'),
    ]

    BRAND_CHOICES = [
        ('Apple', 'Apple'),
        ('Samsung', 'Samsung'),
        ('Xiaomi', 'Xiaomi'),
        ('OnePlus', 'OnePlus'),
        ('Google', 'Google'),
        ('Huawei', 'Huawei'),
        ('Anker', 'Anker'),
        ('Belkin', 'Belkin'),
        ('Spigen', 'Spigen'),
        ('OtterBox', 'OtterBox'),
        ('Generic', 'Generic'),
        ('Other', 'Other'),
    ]

    CONDITION_CHOICES = [
        ('New', 'New'),
        ('Refurbished', 'Refurbished'),
        ('Used', 'Used'),
        ('Defective', 'Defective'),
    ]

    # Product type
    product_type = models.CharField(
        max_length=50,
        choices=PRODUCT_TYPE_CHOICES,
        default='Phone',
        db_index=True,
        help_text="Type of product (Phone, Case, Charger, etc.)"
    )

    # Basic product information
    brand = models.CharField(
        max_length=100,
        choices=BRAND_CHOICES,
        db_index=True,
        help_text="Phone manufacturer brand"
    )
    model = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Phone model name"
    )

    # Pricing information
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        db_index=True,
        help_text="Selling price in local currency"
    )
    purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Cost price for profit calculation"
    )

    # Technical specifications (optional for accessories)
    storage = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Storage capacity for phones (e.g., 128GB, 256GB) - optional for accessories"
    )
    ram = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="RAM capacity for phones (e.g., 4GB, 8GB) - optional for accessories"
    )
    color = models.CharField(
        max_length=50,
        help_text="Product color variant"
    )

    # Product details
    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        help_text="Product condition status"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional detailed product description"
    )
    image = models.ImageField(
        upload_to='phones/',
        blank=True,
        null=True,
        help_text="Product image file"
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="External product image URL"
    )

    # Unique identifier (Optional)
    IMEI = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="15-digit IMEI unique identifier for phones (optional)"
    )

    barcode = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Professional unique barcode (e.g., PM-000123)"
    )

    battery_percentage = models.IntegerField(
        blank=True,
        null=True,
        help_text="Battery percentage/health (especially for Apple devices)"
    )

    battery_cycle = models.IntegerField(
        blank=True,
        null=True,
        help_text="Battery cycle count (for laptops)"
    )

    screen_size = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Screen size in inches (e.g., '13.3')"
    )


    supplier = models.ForeignKey(
        'inventory.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='phones',
        help_text="Supplier of this product"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Record creation timestamp"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last modification timestamp"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Phone'
        verbose_name_plural = 'Phones'
        indexes = [
            models.Index(fields=['product_type'], name='phone_prodtype_idx'),
            models.Index(fields=['brand'], name='phone_brand_idx'),
            models.Index(fields=['model'], name='phone_model_idx'),
            models.Index(fields=['price'], name='phone_price_idx'),
            models.Index(fields=['brand', 'model'], name='phone_brand_model_idx'),
            models.Index(fields=['IMEI'], name='phone_imei_idx'),
            models.Index(fields=['barcode'], name='phone_barcode_idx'),
        ]

    def __str__(self):
        """Return formatted string representation of the product."""
        if self.product_type == 'Phone' and self.storage:
            if self.brand.lower() == 'apple' or not self.ram:
                return f"{self.brand} {self.model} - {self.storage} ({self.color})"
            return f"{self.brand} {self.model} - {self.storage}/{self.ram} ({self.color})"
        return f"{self.product_type}: {self.brand} {self.model} ({self.color})"

    def save(self, *args, **kwargs):
        """Custom save to generate unique barcode if not provided."""
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.barcode:
            # Generate professional barcode: PM-000XXX (ID)
            self.barcode = f"PM-{self.id:06d}"
            # Save again to persist the barcode
            super().save(update_fields=['barcode'])
