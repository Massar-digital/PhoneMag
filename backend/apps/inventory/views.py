from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models, transaction
from django.db.models import F
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import InventoryItem, StockHistory, Supplier
from .serializers import InventoryItemSerializer, StockHistorySerializer, SupplierSerializer
from apps.authentication.permissions import IsManagerOrAdmin, IsAdminForDestructive


@extend_schema_view(
    list=extend_schema(
        summary="List all inventory items",
        description="Retrieve a paginated list of all inventory items with their current stock levels.",
        tags=['Inventory'],
        examples=[
            OpenApiExample(
                'List inventory items',
                value={'count': 25, 'next': 'http://api.example.com/api/inventory/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get inventory item details",
        description="Retrieve detailed information about a specific inventory item.",
        tags=['Inventory'],
        examples=[
            OpenApiExample(
                'Inventory item details',
                value={
                    'id': 1,
                    'phone': {
                        'id': 1,
                        'brand': 'Apple',
                        'model': 'iPhone 15 Pro',
                        'price': 999.99
                    },
                    'stock_quantity': 10,
                    'reorder_level': 5,
                    'location': 'Shelf A1',
                    'supplier': 'Apple Inc.',
                    'last_restocked': '2025-01-15',
                    'is_low_stock': False
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create inventory item",
        description="Add a new inventory item for a phone. Requires manager or admin permissions.",
        tags=['Inventory'],
        examples=[
            OpenApiExample(
                'Create inventory item',
                value={
                    'phone': 1,
                    'stock_quantity': 20,
                    'reorder_level': 5,
                    'location': 'Shelf B2',
                    'supplier': 'Samsung Electronics',
                    'last_restocked': '2025-01-15'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update inventory item",
        description="Update all fields of an existing inventory item. Requires manager or admin permissions.",
        tags=['Inventory']
    ),
    partial_update=extend_schema(
        summary="Partially update inventory item",
        description="Update specific fields of an existing inventory item. Requires manager or admin permissions.",
        tags=['Inventory']
    ),
    destroy=extend_schema(
        summary="Delete inventory item",
        description="Remove an inventory item from the system. Requires admin permissions. WARNING: This action cannot be undone.",
        tags=['Inventory']
    ),
    adjust_stock=extend_schema(
        summary="Adjust stock quantity",
        description="Adjust the stock quantity of an inventory item and create a history record. Requires manager or admin permissions.",
        tags=['Inventory'],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'adjustment_type': {
                        'type': 'string',
                        'enum': ['ADD', 'REMOVE'],
                        'description': 'Type of stock adjustment'
                    },
                    'quantity': {
                        'type': 'integer',
                        'description': 'Quantity to add or remove'
                    },
                    'reason': {
                        'type': 'string',
                        'description': 'Reason for the adjustment'
                    },
                    'notes': {
                        'type': 'string',
                        'description': 'Optional additional notes'
                    }
                },
                'required': ['adjustment_type', 'quantity', 'reason']
            }
        },
        examples=[
            OpenApiExample(
                'Adjust stock',
                value={
                    'adjustment_type': 'ADD',
                    'quantity': 10,
                    'reason': 'RESTOCK',
                    'notes': 'Monthly restock from supplier'
                },
                request_only=True,
            ),
        ]
    ),
    history=extend_schema(
        summary="Get stock history",
        description="Retrieve the stock adjustment history for a specific inventory item.",
        tags=['Inventory'],
        parameters=[
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Start date for history filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='End date for history filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='reason',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by adjustment reason',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Stock history',
                value=[
                    {
                        'id': 1,
                        'adjustment_type': 'ADD',
                        'quantity': 10,
                        'reason': 'RESTOCK',
                        'notes': 'Monthly restock',
                        'previous_stock': 5,
                        'new_stock': 15,
                        'created_at': '2025-01-15T10:30:00Z',
                        'created_by': 'manager@example.com'
                    }
                ],
                response_only=True,
            ),
        ]
    ),
)
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related('phone').all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Allow filtering by low stock"""
        queryset = super().get_queryset()
        low_stock = self.request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            queryset = queryset.filter(
                stock_quantity__lte=F('reorder_level')
            ).exclude(phone__product_type__in=['Phone', 'Laptop'])
        
        # Add advanced multi-word search
        search = self.request.query_params.get('search')
        if search:
            search_terms = search.split()
            search_filter = models.Q()
            
            for term in search_terms:
                term_filter = (
                    models.Q(phone__brand__icontains=term) | 
                    models.Q(phone__model__icontains=term) |
                    models.Q(phone__barcode__icontains=term) |
                    models.Q(phone__IMEI__icontains=term)
                )
                search_filter &= term_filter
            
            queryset = queryset.filter(search_filter)
            
        return queryset

    def get_permissions(self):
        """Override permissions based on action"""
        if self.action == 'destroy':
            # Only admins can delete inventory items
            permission_classes = [IsAdminForDestructive]
        elif self.action in ['create', 'update', 'partial_update']:
            # Only managers and admins can create/update inventory items
            permission_classes = [IsManagerOrAdmin]
        else:
            # Everyone can read
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['post'], permission_classes=[IsManagerOrAdmin])
    def adjust_stock(self, request, pk=None):
        """Adjust stock quantity and create history record"""
        inventory_item = self.get_object()
        
        # Add inventory_item to the request data
        request_data = request.data.copy()
        request_data['inventory_item'] = inventory_item.id
        
        serializer = StockHistorySerializer(data=request_data)
        
        if serializer.is_valid():
            adjustment_type = serializer.validated_data['adjustment_type']
            quantity = serializer.validated_data['quantity']
            reason = serializer.validated_data['reason']
            notes = serializer.validated_data.get('notes', '')
            
            # Calculate new stock
            previous_stock = inventory_item.stock_quantity
            if adjustment_type == 'ADD':
                new_stock = previous_stock + quantity
            elif adjustment_type == 'REMOVE':
                if quantity > previous_stock:
                    return Response(
                        {'error': 'Cannot remove more stock than available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                new_stock = previous_stock - quantity
            else:
                return Response(
                    {'error': 'Invalid adjustment type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update inventory and create history record atomically
            with transaction.atomic():
                inventory_item.stock_quantity = new_stock
                inventory_item.save()
                
                StockHistory.objects.create(
                    inventory_item=inventory_item,
                    adjustment_type=adjustment_type,
                    quantity=quantity,
                    reason=reason,
                    notes=notes,
                    previous_stock=previous_stock,
                    new_stock=new_stock,
                    created_by=request.user
                )
            
            return Response({
                'message': 'Stock adjusted successfully',
                'previous_stock': previous_stock,
                'new_stock': new_stock
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def history(self, request, pk=None):
        """Get stock history for an inventory item"""
        inventory_item = self.get_object()
        history = StockHistory.objects.filter(inventory_item=inventory_item)
        
        # Apply filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        reason = request.query_params.get('reason')
        
        if start_date:
            history = history.filter(created_at__date__gte=start_date)
        if end_date:
            history = history.filter(created_at__date__lte=end_date)
        if reason:
            history = history.filter(reason=reason)
        
        serializer = StockHistorySerializer(history, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary="List stock history",
        description="Retrieve a paginated list of all stock adjustment history records with optional filtering.",
        tags=['Inventory'],
        parameters=[
            OpenApiParameter(
                name='inventory_item',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by inventory item ID',
                required=False
            ),
            OpenApiParameter(
                name='phone',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by phone ID',
                required=False
            ),
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Start date for history filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='End date for history filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='reason',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by adjustment reason',
                required=False
            ),
            OpenApiParameter(
                name='adjustment_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by adjustment type (ADD, REMOVE)',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'List stock history',
                value={'count': 50, 'next': 'http://api.example.com/api/stock-history/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get stock history details",
        description="Retrieve detailed information about a specific stock adjustment record.",
        tags=['Inventory']
    ),
)
class StockHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for stock history across all inventory items"""
    queryset = StockHistory.objects.select_related('inventory_item__phone', 'created_by').all()
    serializer_class = StockHistorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['inventory_item__phone__brand', 'inventory_item__phone__model', 'notes', 'reason']
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = super().get_queryset()
        
        # Filter by inventory item
        inventory_item_id = self.request.query_params.get('inventory_item')
        if inventory_item_id:
            queryset = queryset.filter(inventory_item_id=inventory_item_id)
        
        # Filter by phone
        phone_id = self.request.query_params.get('phone')
        if phone_id:
            queryset = queryset.filter(inventory_item__phone_id=phone_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        # Filter by reason
        reason = self.request.query_params.get('reason')
        if reason:
            queryset = queryset.filter(reason=reason)
        
        # Filter by adjustment type
        adjustment_type = self.request.query_params.get('adjustment_type')
        if adjustment_type:
            queryset = queryset.filter(adjustment_type=adjustment_type)
            
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(created_by_id=user_id)
            
        # Add basic search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(inventory_item__phone__brand__icontains=search) | 
                models.Q(inventory_item__phone__model__icontains=search) |
                models.Q(notes__icontains=search)
            )
        
        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get summary statistics for stock movements"""
        queryset = self.get_queryset()
        
        total_added = queryset.filter(adjustment_type='ADD').aggregate(
            total=models.Sum('quantity'))['total'] or 0
        total_removed = queryset.filter(adjustment_type='REMOVE').aggregate(
            total=models.Sum('quantity'))['total'] or 0
            
        by_reason = queryset.values('reason').annotate(
            count=models.Count('id'),
            total_quantity=models.Sum('quantity')
        )
        
        return Response({
            'total_added': total_added,
            'total_removed': total_removed,
            'net_change': total_added - total_removed,
            'by_reason': by_reason
        })

@extend_schema_view(
    list=extend_schema(summary="List all suppliers", tags=['Suppliers']),
    retrieve=extend_schema(summary="Get supplier details", tags=['Suppliers']),
    create=extend_schema(summary="Create supplier", tags=['Suppliers']),
    update=extend_schema(summary="Update supplier", tags=['Suppliers']),
    partial_update=extend_schema(summary="Partially update supplier", tags=['Suppliers']),
    destroy=extend_schema(summary="Delete supplier", tags=['Suppliers']),
)
class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for managing suppliers"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [IsAuthenticated()]
