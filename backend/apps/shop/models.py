from django.db import models
from django.core.validators import EmailValidator, RegexValidator
from django.core.exceptions import ValidationError


def validate_currency_symbol(value):
    """Validate currency symbol format"""
    if not value or len(value.strip()) == 0:
        raise ValidationError('Currency symbol cannot be empty')
    if len(value) > 5:
        raise ValidationError('Currency symbol must be 5 characters or less')


class Shop(models.Model):
    """Shop/Company information model"""

    # Basic Information
    name = models.CharField(
        max_length=255,
        help_text="Shop/company name"
    )

    # Contact Information
    email = models.EmailField(
        validators=[EmailValidator()],
        blank=True,
        null=True,
        help_text="Primary contact email (optional)"
    )

    phone = models.CharField(
        max_length=20,
        validators=[RegexValidator(
            regex=r'^(\+?[\d\s\-\(\)]{9,20}|0[\d]{9})$',
            message='Phone number format is invalid. Use 10 digits (0550660064) or international format (+213550660064)'
        )],
        help_text="Primary contact phone number"
    )

    # Address Information
    address_line_1 = models.CharField(
        max_length=255,
        help_text="Street address"
    )

    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Additional address information (optional)"
    )

    city = models.CharField(
        max_length=100,
        help_text="City"
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="State/Province (optional)"
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Postal/ZIP code (optional)"
    )

    country = models.CharField(
        max_length=100,
        default="Algeria",
        help_text="Country"
    )

    # Business Settings
    currency_symbol = models.CharField(
        max_length=5,
        default="DZD",
        validators=[validate_currency_symbol],
        help_text="Currency symbol (e.g., $, €, £, DZD)"
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Default tax rate as percentage (e.g., 8.25 for 8.25%)"
    )

    # Logo
    logo = models.ImageField(
        upload_to='shop_logos/',
        blank=True,
        null=True,
        help_text="Shop logo for invoices and reports"
    )

    # Additional Settings
    invoice_footer = models.TextField(
        blank=True,
        null=True,
        help_text="Footer text for invoices"
    )

    website = models.URLField(
        blank=True,
        null=True,
        help_text="Company website URL"
    )

    instagram_handle = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Instagram handle (e.g., @shopname)"
    )

    # Barcode Printing Settings
    barcode_printer_name = models.CharField(
        max_length=255,
        default='Xprinter XP-233B',
        help_text="Default barcode printer name"
    )
    barcode_label_width = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=45.00,
        help_text="Label width in mm"
    )
    barcode_label_height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=35.00,
        help_text="Label height in mm"
    )
    barcode_orientation = models.CharField(
        max_length=20,
        default='landscape',
        choices=[('portrait', 'Portrait'), ('landscape', 'Landscape')],
        help_text="Print orientation"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Shop"
        verbose_name_plural = "Shop Settings"
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def get_full_address(self):
        """Return formatted full address"""
        address_parts = [
            self.address_line_1,
            self.address_line_2,
            self.city,
            self.state,
            self.postal_code,
            self.country
        ]
        return ', '.join(filter(None, address_parts))

    def clean(self):
        """Custom validation"""
        super().clean()

        # Validate tax rate range
        if self.tax_rate < 0 or self.tax_rate > 100:
            raise ValidationError({
                'tax_rate': 'Tax rate must be between 0 and 100 percent'
            })

        # Ensure at least basic address information
        if not self.city:
            raise ValidationError({
                'city': 'City is required for address'
            })