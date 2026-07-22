import re
import requests

from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
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


# Hardcoded seed models for top Algerian market brands so combobox isn't empty on day 1.
# Merged with DISTINCT results from the phones table at query time.
SEED_MODELS = {
    'Apple': ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
              'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
              'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
              'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone SE 2022',
              'iPhone 12', 'iPhone 11', 'iPhone XR'],
    'Samsung': ['Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25',
                'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
                'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23',
                'Galaxy A55', 'Galaxy A35', 'Galaxy A25', 'Galaxy A15', 'Galaxy A05',
                'Galaxy Z Fold 6', 'Galaxy Z Flip 6', 'Galaxy Z Fold 5', 'Galaxy Z Flip 5',
                'Galaxy M55', 'Galaxy M35', 'Galaxy M15'],
    'Xiaomi': ['Xiaomi 14T Pro', 'Xiaomi 14T', 'Xiaomi 14 Ultra', 'Xiaomi 14',
               'Xiaomi 13T Pro', 'Xiaomi 13T', 'Xiaomi 13 Ultra', 'Xiaomi 13',
               'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13',
               'Redmi Note 12 Pro+', 'Redmi Note 12 Pro', 'Redmi Note 12',
               'Poco X6 Pro', 'Poco X6', 'Poco F6 Pro', 'Poco F6', 'Poco M6 Pro',
               'Redmi 13C', 'Redmi 12C'],
    'Infinix': ['Infinix Note 40 Pro+', 'Infinix Note 40 Pro', 'Infinix Note 40',
                'Infinix Hot 40 Pro', 'Infinix Hot 40', 'Infinix Hot 40i',
                'Infinix Zero 40', 'Infinix Zero 30',
                'Infinix Smart 9', 'Infinix Smart 8'],
    'Tecno': ['Tecno Camon 30 Premier', 'Tecno Camon 30 Pro', 'Tecno Camon 30',
              'Tecno Spark 20 Pro+', 'Tecno Spark 20 Pro', 'Tecno Spark 20', 'Tecno Spark 20C',
              'Tecno Phantom X2 Pro', 'Tecno Phantom V Fold',
              'Tecno Pova 6 Pro', 'Tecno Pova 6'],
    'OnePlus': ['OnePlus 13', 'OnePlus 12', 'OnePlus 12R', 'OnePlus 11',
                'OnePlus Nord 4', 'OnePlus Nord CE 4', 'OnePlus Nord N30'],
    'Google': ['Pixel 9 Pro Fold', 'Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9',
               'Pixel 8a', 'Pixel 8 Pro', 'Pixel 8'],
    'Huawei': ['Pura 70 Ultra', 'Pura 70 Pro', 'Pura 70',
               'Mate 60 Pro', 'Mate 60', 'Nova 12 Ultra', 'Nova 12'],
}


class PhoneModelsView(APIView):
    """Return distinct model names for a given brand, merged with seed list."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List phone models by brand",
        description="Returns distinct model names from the phones table for a given brand, merged with a hardcoded seed list.",
        tags=['Phones'],
        parameters=[
            OpenApiParameter(
                name='brand',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Brand name (case-insensitive)',
                required=True,
            ),
        ],
    )
    def get(self, request):
        brand = (request.query_params.get('brand') or '').strip()
        if not brand:
            return Response([], status=status.HTTP_200_OK)

        # Normalise brand key for seed lookup
        brand_key = {
            'apple': 'Apple', 'samsung': 'Samsung', 'xiaomi': 'Xiaomi',
            'infinix': 'Infinix', 'tecno': 'Tecno', 'oneplus': 'OnePlus',
            'google': 'Google', 'huawei': 'Huawei',
        }.get(brand.lower())

        # Merge: DB DISTINCT models + seed list, deduped
        db_models = set(
            Phone.objects.filter(brand__iexact=brand)
            .values_list('model', flat=True)
            .distinct()
        )
        seed_models = set(SEED_MODELS.get(brand_key, []))

        merged = sorted(db_models | seed_models)
        return Response(merged, status=status.HTTP_200_OK)


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


@extend_schema(
    summary="Fetch product images from DuckDuckGo",
    description="Two-step DuckDuckGo image search: (1) GET /?q=... to obtain vqd token, (2) GET /i.js with token to retrieve image JSON. Returns top 3 image URLs. Never crashes — returns empty list on any failure.",
    tags=['Phones'],
    parameters=[
        OpenApiParameter(
            name='brand',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Phone brand (e.g. Samsung)',
            required=True,
        ),
        OpenApiParameter(
            name='model',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Phone model (e.g. Galaxy A55)',
            required=True,
        ),
    ],
)
class FetchPhoneImageView(APIView):
    """
    GET /api/phones/fetch-image/?brand=Samsung&model=Galaxy+A55

    Uses the unofficial DuckDuckGo image search API (two-step token flow).
    This is inherently fragile — DuckDuckGo may change their token format or
    HTML structure at any time. The view catches all exceptions gracefully.
    """

    permission_classes = [IsAuthenticated]

    DUCKDUCKGO_URL = 'https://duckduckgo.com/'
    IMG_API_URL = 'https://duckduckgo.com/i.js'
    HEADERS = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/125.0.0.0 Safari/537.36'
        ),
    }

    def _extract_vqd(self, html):
        """
        Extract the vqd token from DuckDuckGo's HTML response.
        DuckDuckGo requires this token to call i.js.
        The token format changes occasionally; we try multiple patterns.
        """
        patterns = [
            r'vqd=([\w-]+)&',              # URL-encoded: vqd=abc-123&
            r'"vqd":"([\w-]+)"',            # JSON-style: "vqd":"abc-123"
            r'vqd["\']?\s*[:=]\s*["\']([\w-]+)["\']',  # Generic: vqd='abc-123'
        ]
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                return match.group(1)
        return None

    def get(self, request):
        brand = (request.query_params.get('brand') or '').strip()
        model = (request.query_params.get('model') or '').strip()

        if not brand or not model:
            return Response({'images': []})

        query = f'{brand} {model} smartphone official'

        try:
            # Step 1: Get the vqd token from the main DuckDuckGo search page.
            # DuckDuckGo's image API requires this per-request token.
            session = requests.Session()
            resp = session.get(
                self.DUCKDUCKGO_URL,
                params={'q': query, 'iax': 'images', 'ia': 'images'},
                headers=self.HEADERS,
                timeout=5,
            )
            resp.raise_for_status()

            vqd = self._extract_vqd(resp.text)
            if not vqd:
                return Response({'images': []})

            # Step 2: Use the vqd token to fetch the actual image results.
            img_resp = session.get(
                self.IMG_API_URL,
                params={'q': query, 'vqd': vqd, 'o': 'json', 'p': '1'},
                headers=self.HEADERS,
                timeout=5,
            )
            img_resp.raise_for_status()
            data = img_resp.json()

            # Extract top 3 image URLs from results.
            images = []
            for result in data.get('results', []):
                url = result.get('image') or result.get('thumbnail')
                if url:
                    # Force HTTPS — DuckDuckGo sometimes returns protocol-relative URLs
                    if url.startswith('//'):
                        url = 'https:' + url
                    images.append(url)
                    if len(images) >= 3:
                        break

            return Response({'images': images})

        except Exception:
            # Graceful degradation: never crash the form.
            return Response({'images': []})


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
