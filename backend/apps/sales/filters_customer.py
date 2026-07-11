import django_filters
from django.db.models import Q
from .models_customer import Customer


class CustomerFilter(django_filters.FilterSet):
    """
    Custom filter for Customer model with search and ordering functionality.
    
    Supported query parameters:
    - search: Search across name, phone, and email fields
    - name: Filter by customer name (case-insensitive, partial match)
    - ordering: Sort by name, created_at (use - for descending)
    """
    
    # Name filter - case-insensitive partial match
    name = django_filters.CharFilter(
        field_name='name',
        lookup_expr='icontains',
        label='Filter by customer name (case-insensitive)',
        help_text='Example: ?name=John'
    )
    
    # Search filter - searches name, phone, and email
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search across name, phone, and email',
        help_text='Example: ?search=john'
    )
    
    class Meta:
        model = Customer
        fields = []  # We define all filters manually above
        ordering = ['name', '-name', 'created_at', '-created_at']
    
    def filter_search(self, queryset, name, value):
        """
        Search across name, phone, and email fields.
        Case-insensitive search.
        """
        if value:
            return queryset.filter(
                Q(name__icontains=value) |
                Q(phone__icontains=value) |
                Q(email__icontains=value)
            )
        return queryset
