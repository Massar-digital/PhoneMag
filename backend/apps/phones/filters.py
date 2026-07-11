import django_filters
from django.db.models import Q
from .models import Phone


class PhoneFilter(django_filters.FilterSet):
    """
    Custom filter for Phone model with product type, brand, price range, storage, condition, and ordering filters.
    
    Supported query parameters:
    - product_type: Filter by product type (Phone, Case, Charger, etc.)
    - brand: Filter by phone brand (exact match)
    - min_price: Filter by minimum price (greater than or equal)
    - max_price: Filter by maximum price (less than or equal)
    - storage: Filter by storage capacity (e.g., 128GB)
    - condition: Filter by phone condition (New, Refurbished, Used)
    - search: Search in brand, model fields
    - ordering: Sort by price, created_at (use - for descending)
    """
    
    # Product type filter - exact match
    product_type = django_filters.CharFilter(
        field_name='product_type',
        lookup_expr='iexact',
        label='Filter by product type (case-insensitive)',
        help_text='Example: ?product_type=Phone or ?product_type=Case'
    )
    
    # Brand filter - exact match
    brand = django_filters.CharFilter(
        field_name='brand',
        lookup_expr='iexact',
        label='Filter by brand (case-insensitive)',
        help_text='Example: ?brand=Apple'
    )
    
    # Price range filters
    min_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='gte',
        label='Minimum price (greater than or equal)',
        help_text='Example: ?min_price=100'
    )
    
    max_price = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='lte',
        label='Maximum price (less than or equal)',
        help_text='Example: ?max_price=500'
    )
    
    # Storage filter - exact match
    storage = django_filters.CharFilter(
        field_name='storage',
        lookup_expr='iexact',
        label='Filter by storage (case-insensitive)',
        help_text='Example: ?storage=128GB'
    )
    
    # Condition filter - exact match
    condition = django_filters.CharFilter(
        field_name='condition',
        lookup_expr='iexact',
        label='Filter by condition (case-insensitive)',
        help_text='Example: ?condition=New or ?condition=Refurbished or ?condition=Used'
    )
    
    # Stock availability filter
    in_stock = django_filters.BooleanFilter(
        method='filter_in_stock',
        label='Filter items in stock',
        help_text='Example: ?in_stock=true'
    )
    
    # Search filter - searches brand and model
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search across brand and model',
        help_text='Example: ?search=iPhone'
    )
    
    class Meta:
        model = Phone
        fields = []  # We define all filters manually above
        ordering = ['price', '-price', 'created_at', '-created_at']

    def filter_in_stock(self, queryset, name, value):
        """
        Filter items that have stock_quantity > 0.
        """
        if value is True:
            return queryset.filter(inventory__stock_quantity__gt=0)
        elif value is False:
            return queryset.filter(inventory__stock_quantity__lte=0)
        return queryset
    
    def filter_search(self, queryset, name, value):
        """
        Search across brand and model fields.
        Case-insensitive search.
        """
        if value:
            return queryset.filter(
                Q(brand__icontains=value) |
                Q(model__icontains=value)
            )
        return queryset
