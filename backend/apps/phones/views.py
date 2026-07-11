from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.filters import OrderingFilter
from django.db.models import Sum, Count, F, DecimalField, Q
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Phone
from .serializers import PhoneSerializer, PhoneDetailSerializer
from .filters import PhoneFilter
from apps.inventory.models import InventoryItem, StockHistory
from apps.authentication.permissions import IsManagerOrAdmin, IsAdminForDestructive
from apps.authentication.throttles import SensitiveActionThrottle


@extend_schema(
    summary="Search products",
    description=(
        "Server-side product search across the phone inventory. "
        "Filters by the `q` query parameter and returns paginated results."
    ),
    tags=['Products'],
    parameters=[
        OpenApiParameter(
            name='q',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Search term used to filter products on the server.',
            required=True,
        ),
    ],
)
class ProductSearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhoneDetailSerializer

    def get_queryset(self):
        query = (self.request.query_params.get('q') or '').strip()
        in_stock = self.request.query_params.get('in_stock') == 'true'
        
        if not query and not in_stock:
            return Phone.objects.none()

        queryset = Phone.objects.select_related('inventory', 'supplier').all()
        
        if in_stock:
            queryset = queryset.filter(inventory__stock_quantity__gt=0)
            
        if not query:
            return queryset.order_by('-created_at')

        search_fields = (
            'brand',
            'model',
            'product_type',
            'color',
            'storage',
            'ram',
            'description',
            'barcode',
            'IMEI',
            'supplier__name',
        )

        terms = [term for term in query.split() if term]
        for term in terms:
            term_query = Q()
            for field in search_fields:
                term_query |= Q(**{f'{field}__icontains': term})
            queryset = queryset.filter(term_query)

        return queryset.distinct().order_by('-created_at')


@extend_schema(
    summary="IMEI lookup",
    description="Retrieve a single product by its IMEI number.",
    tags=['Products'],
)
class ProductIMEILookupView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhoneDetailSerializer
    lookup_field = 'IMEI'
    lookup_url_kwarg = 'imei'

    def get_queryset(self):
        return Phone.objects.select_related('inventory', 'supplier').all()


@extend_schema(
    summary="Barcode lookup",
    description="Retrieve a single product by its barcode.",
    tags=['Products'],
)
class ProductBarcodeLookupView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PhoneDetailSerializer
    lookup_field = 'barcode'
    lookup_url_kwarg = 'code'

    def get_queryset(self):
        return Phone.objects.select_related('inventory', 'supplier').all()


@extend_schema_view(
    list=extend_schema(
        summary="List all phones",
        description="Retrieve a paginated list of all phones in inventory with optional filtering and sorting.",
        tags=['Phones'],
        parameters=[
            OpenApiParameter(
                name='brand',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by phone brand (e.g., Apple, Samsung)',
                required=False
            ),
            OpenApiParameter(
                name='min_price',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Minimum price filter',
                required=False
            ),
            OpenApiParameter(
                name='max_price',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Maximum price filter',
                required=False
            ),
            OpenApiParameter(
                name='storage',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by storage capacity (e.g., 128GB, 256GB)',
                required=False
            ),
            OpenApiParameter(
                name='condition',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by condition (New, Refurbished, Used)',
                required=False
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search in brand, model, and description',
                required=False
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Order by field (price, -price, created_at, -created_at)',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'List all phones',
                value={'count': 25, 'next': 'http://api.example.com/api/phones/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get phone details",
        description="Retrieve detailed information about a specific phone including inventory data.",
        tags=['Phones'],
        examples=[
            OpenApiExample(
                'Phone details',
                value={
                    'id': 1,
                    'brand': 'Apple',
                    'model': 'iPhone 15 Pro',
                    'price': 999.99,
                    'storage': '256GB',
                    'ram': '8GB',
                    'color': 'Natural Titanium',
                    'condition': 'New',
                    'imei': '123456789012345',
                    'description': 'Latest iPhone model with advanced features',
                    'inventory': {
                        'stock_quantity': 10,
                        'reorder_level': 5,
                        'location': 'Shelf A1',
                        'supplier': 'Apple Inc.',
                        'last_restocked': '2025-01-15'
                    }
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create new phone",
        description="Add a new phone to the inventory. Requires manager or admin permissions.",
        tags=['Phones'],
        examples=[
            OpenApiExample(
                'Create phone',
                value={
                    'brand': 'Samsung',
                    'model': 'Galaxy S24 Ultra',
                    'price': 1199.99,
                    'purchase_price': 899.99,
                    'storage': '512GB',
                    'ram': '12GB',
                    'color': 'Titanium Black',
                    'condition': 'New',
                    'imei': '987654321098765',
                    'description': 'Premium Android smartphone'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update phone",
        description="Update all fields of an existing phone. Requires manager or admin permissions.",
        tags=['Phones']
    ),
    partial_update=extend_schema(
        summary="Partially update phone",
        description="Update specific fields of an existing phone. Requires manager or admin permissions.",
        tags=['Phones']
    ),
    destroy=extend_schema(
        summary="Delete phone",
        description="Remove a phone from inventory. Requires admin permissions. WARNING: This action cannot be undone.",
        tags=['Phones']
    ),
    low_stock=extend_schema(
        summary="Get low stock phones",
        description="Retrieve all phones that are currently below their reorder level.",
        tags=['Phones'],
        examples=[
            OpenApiExample(
                'Low stock response',
                value={
                    'count': 3,
                    'low_stock_items': [
                        {
                            'phone_id': 1,
                            'phone': 'Apple iPhone 15 Pro',
                            'brand': 'Apple',
                            'model': 'iPhone 15 Pro',
                            'current_stock': 2,
                            'reorder_level': 5,
                            'location': 'Shelf A1',
                            'supplier': 'Apple Inc.',
                            'last_restocked': '2025-01-10',
                            'status': 'Low Stock',
                            'is_low_stock': True
                        }
                    ]
                },
                response_only=True,
            ),
        ]
    ),
)
class PhoneViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing phone inventory.

    Provides CRUD operations for phones with advanced filtering,
    search capabilities, and inventory management features.
    """
    queryset = Phone.objects.select_related('inventory').all()
    serializer_class = PhoneSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [SensitiveActionThrottle]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PhoneFilter
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use PhoneDetailSerializer for list and retrieve to include inventory"""
        if self.action in ['list', 'retrieve']:
            return PhoneDetailSerializer
        return PhoneSerializer
    
    def get_permissions(self):
        """Override permissions based on action"""
        if self.action == 'destroy':
            # Only admins can delete phones
            permission_classes = [IsAdminForDestructive]
        elif self.action in ['create', 'update', 'partial_update']:
            # Only managers and admins can create/update phones
            permission_classes = [IsManagerOrAdmin]
        elif self.action == 'validate_imei':
            # IMEI validation is public (no authentication required)
            permission_classes = []
        else:
            # Everyone can read
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_update(self, serializer):
        """Update phone instance"""
        serializer.save()

    def perform_create(self, serializer):
        """Create phone instance"""
        serializer.save()

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """
        Get all phones with inventory below reorder level.
        Returns low stock items with inventory details.
        """
        low_stock_items = InventoryItem.objects.filter(
            stock_quantity__lte=F('reorder_level')
        ).select_related('phone')
        
        data = []
        for item in low_stock_items:
            data.append({
                'phone_id': item.phone.id,
                'phone': str(item.phone),
                'brand': item.phone.brand,
                'model': item.phone.model,
                'current_stock': item.stock_quantity,
                'reorder_level': item.reorder_level,
                'location': item.location,
                'supplier': item.supplier.name if item.supplier else None,
                'last_restocked': item.last_restocked.isoformat() if item.last_restocked else None,
                'status': 'Out of Stock' if item.stock_quantity == 0 else 'Low Stock',
                'is_low_stock': item.is_low_stock
            })
        
        return Response({
            'count': len(data),
            'low_stock_items': data
        }, status=status.HTTP_200_OK)
