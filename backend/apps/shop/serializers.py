from rest_framework import serializers
from .models import Shop


class ShopSerializer(serializers.ModelSerializer):
    """Serializer for Shop model"""

    # Read-only fields
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    # Computed fields
    full_address = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'address_line_1',
            'address_line_2',
            'city',
            'state',
            'postal_code',
            'country',
            'currency_symbol',
            'tax_rate',
            'logo',
            'invoice_footer',
            'website',
            'instagram_handle',
            'barcode_printer_name',
            'barcode_label_width',
            'barcode_label_height',
            'barcode_orientation',
            'full_address',
            'created_at',
            'updated_at'
        ]

    def get_full_address(self, obj):
        """Return formatted full address"""
        return obj.get_full_address()

    def validate_tax_rate(self, value):
        """Validate tax rate range"""
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Tax rate must be between 0 and 100 percent"
            )
        return value

    def validate_currency_symbol(self, value):
        """Validate currency symbol"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Currency symbol cannot be empty")
        if len(value) > 5:
            raise serializers.ValidationError(
                "Currency symbol must be 5 characters or less"
            )
        return value.strip()