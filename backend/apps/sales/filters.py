import django_filters
from django.db.models import Q
from .models import Sale


class SaleFilter(django_filters.FilterSet):
    """
    Custom filter for Sale model with date range, customer, payment method, and ordering filters.
    
    Supported query parameters:
    - start_date: Filter sales from this date onwards (format: YYYY-MM-DD)
    - end_date: Filter sales up to this date (format: YYYY-MM-DD)
    - customer: Filter by customer name (case-insensitive, partial match)
    - payment_method: Filter by payment method (exact match)
    - search: Search in customer name and notes fields
    - ordering: Sort by total_price, sale_date (use - for descending)
    """
    
    # Date range filters
    start_date = django_filters.DateFilter(
        field_name='sale_date',
        method='filter_start_date',
        label='Sales from this date onwards',
    )
    
    end_date = django_filters.DateFilter(
        field_name='sale_date',
        method='filter_end_date',
        label='Sales up to this date',
    )
    
    def filter_start_date(self, queryset, name, value):
        if value:
            return queryset.filter(sale_date__date__gte=value)
        return queryset

    def filter_end_date(self, queryset, name, value):
        if value:
            return queryset.filter(sale_date__date__lte=value)
        return queryset
    
    # Customer filter - case-insensitive partial match
    customer = django_filters.CharFilter(
        field_name='customer_name',
        lookup_expr='icontains',
        label='Filter by customer name (case-insensitive)',
        help_text='Example: ?customer=John'
    )

    # Payment method filter
    payment_method = django_filters.ChoiceFilter(
        field_name='payment_method',
        choices=Sale._meta.get_field('payment_method').choices,
        label='Filter by payment method'
    )
    
    # Phone filter - filter by phone ID
    phone = django_filters.NumberFilter(
        field_name='phone',
        lookup_expr='exact',
        label='Filter by phone ID',
        help_text='Example: ?phone=1'
    )

    # User filter - filter by user ID
    user = django_filters.NumberFilter(
        field_name='user',
        lookup_expr='exact',
        label='Filter by user ID',
        help_text='Example: ?user=1'
    )
    
    # Search filter - searches customer name and notes
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search across customer name and notes',
        help_text='Example: ?search=John'
    )
    
    class Meta:
        model = Sale
        fields = []  # We define all filters manually above
        ordering = ['total_price', '-total_price', 'sale_date', '-sale_date']
    
    def filter_search(self, queryset, name, value):
        """
        Search across customer name, notes, invoice number, and product details.
        Case-insensitive search.
        """
        if value:
            return queryset.filter(
                Q(customer_name__icontains=value) |
                Q(notes__icontains=value) |
                Q(invoice_number__icontains=value) |
                Q(phone__brand__icontains=value) |
                Q(phone__model__icontains=value) |
                Q(phone__IMEI__icontains=value) |
                Q(items__phone__brand__icontains=value) |
                Q(items__phone__model__icontains=value) |
                Q(items__phone__IMEI__icontains=value)
            ).distinct()
        return queryset
