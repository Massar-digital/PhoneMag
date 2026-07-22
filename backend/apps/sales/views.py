from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, F, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .models import Sale, Expense, ProductReturn, ProductReturnItem, RepairTicket, RepairPart, RepairStatusLog, TradeIn
from .models_customer import Customer
from .serializers import (
    SaleSerializer, CustomerSerializer, ExpenseSerializer,
    ProductReturnSerializer, RepairTicketSerializer, RepairPartSerializer,
    ExchangeListSerializer,
)
from .filters import SaleFilter
from .filters_customer import CustomerFilter
from datetime import datetime, timedelta
from apps.authentication.permissions import IsSalespersonCanCreateSales, IsAdminForDestructive


@extend_schema_view(
    list=extend_schema(
        summary="List all sales",
        description="Retrieve a paginated list of all sales transactions with optional filtering and sorting.",
        tags=['Sales'],
        parameters=[
            OpenApiParameter(
                name='phone',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by phone ID',
                required=False
            ),
            OpenApiParameter(
                name='customer',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by customer ID',
                required=False
            ),
            OpenApiParameter(
                name='min_total_price',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Minimum total price filter',
                required=False
            ),
            OpenApiParameter(
                name='max_total_price',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Maximum total price filter',
                required=False
            ),
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Start date for sale date filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='End date for sale date filter (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search in customer name, phone model, and salesperson',
                required=False
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Order by field (total_price, -total_price, sale_date, -sale_date)',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'List sales',
                value={'count': 50, 'next': 'http://api.example.com/api/sales/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get sale details",
        description="Retrieve detailed information about a specific sale transaction.",
        tags=['Sales'],
        examples=[
            OpenApiExample(
                'Sale details',
                value={
                    'id': 1,
                    'phone': {
                        'id': 1,
                        'brand': 'Apple',
                        'model': 'iPhone 15 Pro',
                        'price': 999.99
                    },
                    'customer': {
                        'id': 1,
                        'name': 'John Doe',
                        'phone': '+1234567890',
                        'email': 'john@example.com'
                    },
                    'quantity': 1,
                    'unit_price': 999.99,
                    'total_price': 999.99,
                    'discount_applied': 0.00,
                    'profit_margin': 199.99,
                    'sale_date': '2025-01-15T10:30:00Z',
                    'salesperson': 'Jane Smith',
                    'payment_method': 'Credit Card',
                    'notes': 'Customer requested extended warranty'
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create new sale",
        description="Record a new sale transaction. Requires salesperson permissions.",
        tags=['Sales'],
        examples=[
            OpenApiExample(
                'Create sale',
                value={
                    'phone': 1,
                    'customer': 1,
                    'quantity': 1,
                    'unit_price': 999.99,
                    'discount_applied': 50.00,
                    'salesperson': 'Jane Smith',
                    'payment_method': 'Credit Card',
                    'notes': 'First-time customer discount applied'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update sale",
        description="Update all fields of an existing sale transaction.",
        tags=['Sales']
    ),
    partial_update=extend_schema(
        summary="Partially update sale",
        description="Update specific fields of an existing sale transaction.",
        tags=['Sales']
    ),
    destroy=extend_schema(
        summary="Delete sale",
        description="Remove a sale transaction from records. Requires admin permissions. WARNING: This action cannot be undone.",
        tags=['Sales']
    ),
    daily_report=extend_schema(
        summary="Get daily sales report",
        description="Retrieve comprehensive sales statistics for a specific day or today.",
        tags=['Sales'],
        parameters=[
            OpenApiParameter(
                name='date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Date for the report (YYYY-MM-DD). Defaults to today.',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Daily sales report',
                value={
                    'date': '2025-01-15',
                    'summary': {
                        'total_sales': 12,
                        'total_revenue': 15499.88,
                        'total_discount': 250.00,
                        'total_profit': 3099.88,
                        'total_quantity_sold': 15,
                        'average_sale_value': 1291.66
                    },
                    'top_phones': [
                        {
                            'phone__brand': 'Apple',
                            'phone__model': 'iPhone 15 Pro',
                            'quantity_sold': 5,
                            'revenue': 4999.95
                        }
                    ]
                },
                response_only=True,
            ),
        ]
    ),
    stats=extend_schema(
        summary="Get sales statistics",
        description="Retrieve sales statistics for various time periods with comprehensive analytics.",
        tags=['Sales'],
        parameters=[
            OpenApiParameter(
                name='period',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Time period: day, week, month, all, or range',
                required=False,
                enum=['day', 'week', 'month', 'all', 'range']
            ),
            OpenApiParameter(
                name='date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Specific date for day period (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Start date for range period (YYYY-MM-DD)',
                required=False
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='End date for range period (YYYY-MM-DD)',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Sales statistics',
                value={
                    'period': 'month',
                    'summary': {
                        'total_sales': 245,
                        'total_revenue': 287499.50,
                        'total_profit': 57499.90,
                        'total_quantity_sold': 312,
                        'average_sale_value': 1173.47
                    },
                    'top_phones': [
                        {
                            'phone__brand': 'Samsung',
                            'phone__model': 'Galaxy S24 Ultra',
                            'quantity_sold': 45,
                            'revenue': 53999.55
                        }
                    ]
                },
                response_only=True,
            ),
        ]
    ),
)
class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing sales transactions.

    Provides CRUD operations for sales with advanced filtering,
    search capabilities, and comprehensive reporting features.
    """
    queryset = Sale.objects.select_related('phone', 'customer').prefetch_related('items__phone').all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = SaleFilter
    ordering_fields = ['total_price', 'sale_date', 'customer_name', 'invoice_number']
    ordering = ['-sale_date']

    def get_permissions(self):
        """Override permissions based on action"""
        if self.action == 'destroy':
            # Only admins can delete sales
            permission_classes = [IsAdminForDestructive]
        else:
            # All authenticated users can view, create, update sales
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def employee_performance(self, request):
        """
        Get sales performance statistics for each employee.
        """
        # Optional date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        sales_qs = Sale.objects.all()
        return_items_qs = ProductReturnItem.objects.all()
        
        if start_date:
            sales_qs = sales_qs.filter(sale_date__date__gte=start_date)
            return_items_qs = return_items_qs.filter(product_return__return_date__date__gte=start_date)
        if end_date:
            sales_qs = sales_qs.filter(sale_date__date__lte=end_date)
            return_items_qs = return_items_qs.filter(product_return__return_date__date__lte=end_date)
            
        # Aggregate Sales
        sales_perf = sales_qs.values(
            'user__id', 
            'user__username', 
            'user__first_name', 
            'user__last_name'
        ).annotate(
            total_sales_count=Count('id', distinct=True),
            raw_revenue=Coalesce(Sum('total_price'), 0, output_field=DecimalField()),
            raw_profit=Coalesce(Sum('profit_margin'), 0, output_field=DecimalField()),
            # Combine items and legacy quantity
            total_qty=Coalesce(Sum('items__quantity'), 0) + Coalesce(Sum('quantity'), 0)
        )
        
        # Aggregate Returns (associated with the original salesperson)
        returns_perf = return_items_qs.values(
            'product_return__sale__user__id'
        ).annotate(
            total_refunded=Coalesce(Sum('refund_amount'), 0, output_field=DecimalField()),
            total_profit_impact=Coalesce(Sum('profit_impact'), 0, output_field=DecimalField()),
            total_returned_qty=Coalesce(Sum('quantity'), 0)
        )
        
        returns_dict = {r['product_return__sale__user__id']: r for r in returns_perf}
        
        results = []
        for s in sales_perf:
            user_id = s['user__id']
            r = returns_dict.get(user_id, {})
            
            refunded = r.get('total_refunded', 0)
            profit_impact = r.get('total_profit_impact', 0)
            returned_qty = r.get('total_returned_qty', 0)
            
            net_revenue = s['raw_revenue'] - refunded
            net_profit = s['raw_profit'] + profit_impact
            net_items = s['total_qty'] - returned_qty
            
            results.append({
                'user__id': user_id,
                'user__username': s['user__username'],
                'user__first_name': s['user__first_name'],
                'user__last_name': s['user__last_name'],
                'total_sales': s['total_sales_count'],
                'total_revenue': float(net_revenue),
                'total_profit': float(net_profit),
                'total_items': net_items,
                'total_refunded': float(refunded)
            })
            
        # Order by net revenue
        results.sort(key=lambda x: x['total_revenue'], reverse=True)
            
        return Response(results)

    @action(detail=False, methods=['get'])
    def daily_report(self, request):
        """
        Get daily sales report for today or specified date.
        Returns total sales, revenue, and average sale value.
        """
        # Get date from query parameter or use today
        date_str = request.query_params.get('date', None)
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.localtime(timezone.now()).date()
        
        # Filter sales for the target date
        sales = Sale.objects.filter(
            sale_date__date=target_date
        )
        
        # Filter return items for the target date
        return_items = ProductReturnItem.objects.filter(
            product_return__return_date__date=target_date
        )
        
        # Calculate statistics
        total_sales_count = sales.count()
        raw_revenue = sales.aggregate(
            total=Coalesce(Sum('total_price'), 0, output_field=DecimalField())
        )['total']
        total_refunded = return_items.aggregate(
            total=Coalesce(Sum('refund_amount'), 0, output_field=DecimalField())
        )['total']
        
        # Calculate expenses for the target date
        total_expenses = Expense.objects.filter(
            date=target_date
        ).aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
        )['total']
        
        # Revenue stays as sales total minus refunds (expenses only affect profit)
        total_revenue = raw_revenue - total_refunded
        
        # Calculate repairs revenue for the target date (where status='closed' and updated_at is the target date)
        repairs_revenue = RepairTicket.objects.filter(
            status='closed',
            updated_at__date=target_date
        ).aggregate(
            total=Coalesce(Sum('final_cost'), 0, output_field=DecimalField())
        )['total']
        
        # Add repairs revenue to total revenue
        total_revenue += repairs_revenue
        
        total_discount = sales.aggregate(
            total=Coalesce(Sum('discount_applied'), 0, output_field=DecimalField())
        )['total']
        
        # Calculate profit
        raw_gross_profit = sales.aggregate(
            total=Coalesce(Sum('profit_margin'), 0, output_field=DecimalField())
        )['total']
        
        total_profit_impact = return_items.aggregate(
            total=Coalesce(Sum('profit_impact'), 0, output_field=DecimalField())
        )['total']
        
        # Fix missing gross_profit definition and apply expenses to net profit
        gross_profit = raw_gross_profit + total_profit_impact
        # Add repairs revenue to net profit
        net_profit = gross_profit - total_expenses + repairs_revenue
        
        # Net Sale Count
        net_sale_count = sales.annotate(
            refunded_amt=Coalesce(Sum('product_returns__items__refund_amount'), 0, output_field=DecimalField())
        ).filter(refunded_amt__lt=F('total_price')).count()
        
        return Response({
            'date': target_date,
            'summary': {
                'total_sales': net_sale_count,
                'total_revenue': total_revenue,
                'total_refunded': total_refunded,
                'total_discount': total_discount,
                'gross_profit': gross_profit,
                'total_expenses': total_expenses,
                'net_profit': net_profit,
                'average_sale_value': total_revenue / net_sale_count if net_sale_count > 0 else 0
            }
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Generic sales stats endpoint.
        Query params:
          - period: 'day'|'week'|'month'|'all'|'range' (default: 'day')
          - date: YYYY-MM-DD (for 'day' or 'range' start)
          - start_date/end_date: YYYY-MM-DD (for 'range')
        """
        period = request.query_params.get('period', 'day')
        # Determine date range
        if period == 'day':
            date_str = request.query_params.get('date', None)
            if date_str:
                try:
                    start_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                start_date = timezone.localtime(timezone.now()).date()
            end_date = start_date
        elif period == 'week':
            end_date = timezone.localtime(timezone.now()).date()
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            end_date = timezone.localtime(timezone.now()).date()
            start_date = end_date - timedelta(days=30)
        elif period == 'range':
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            if not start_date_str or not end_date_str:
                return Response({'error': 'start_date and end_date required for range'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # 'all' or unknown - get all
            start_date = None
            end_date = None

        # Build queryset
        if start_date and end_date:
            sales_qs = Sale.objects.filter(sale_date__date__gte=start_date, sale_date__date__lte=end_date)
            return_items_qs = ProductReturnItem.objects.filter(product_return__return_date__date__gte=start_date, product_return__return_date__date__lte=end_date)
        else:
            sales_qs = Sale.objects.all()
            return_items_qs = ProductReturnItem.objects.all()

        total_sales_count = sales_qs.count()
        raw_revenue = sales_qs.aggregate(total=Coalesce(Sum('total_price'), 0, output_field=DecimalField()))['total']
        raw_profit = sales_qs.aggregate(total=Coalesce(Sum('profit_margin'), 0, output_field=DecimalField()))['total']
        raw_quantity = sales_qs.aggregate(total=Coalesce(Sum('quantity'), 0))['total'] or 0
        
        # Calculate return impacts
        total_refunded = return_items_qs.aggregate(total=Coalesce(Sum('refund_amount'), 0, output_field=DecimalField()))['total']
        total_profit_impact = return_items_qs.aggregate(total=Coalesce(Sum('profit_impact'), 0, output_field=DecimalField()))['total']
        total_returned_qty = return_items_qs.aggregate(total=Coalesce(Sum('quantity'), 0))['total'] or 0

        # Calculate expenses for the period
        if start_date and end_date:
            expenses_qs = Expense.objects.filter(date__gte=start_date, date__lte=end_date)
            repairs_qs = RepairTicket.objects.filter(status='closed', updated_at__date__gte=start_date, updated_at__date__lte=end_date)
        else:
            expenses_qs = Expense.objects.all()
            repairs_qs = RepairTicket.objects.filter(status='closed')
        
        total_expenses = expenses_qs.aggregate(total=Coalesce(Sum('amount'), 0, output_field=DecimalField()))['total']
        total_repairs_revenue = repairs_qs.aggregate(total=Coalesce(Sum('final_cost'), 0, output_field=DecimalField()))['total']

        # Net totals
        # Subtract expenses from total revenue as requested, and add repairs
        total_revenue = raw_revenue - total_refunded - total_expenses + total_repairs_revenue
        total_profit = raw_profit + total_profit_impact - total_expenses + total_repairs_revenue
        total_quantity = raw_quantity - total_returned_qty
        
        # Net sales count (non-fully-refunded)
        net_sales_count = sales_qs.annotate(
            refunded_amt=Coalesce(Sum('product_returns__items__refund_amount'), 0, output_field=DecimalField())
        ).filter(refunded_amt__lt=F('total_price')).count()
        
        avg_sale_value = total_revenue / net_sales_count if net_sales_count > 0 else 0
        top_phones = sales_qs.values('phone__brand', 'phone__model').annotate(quantity_sold=Sum('quantity'), revenue=Sum('total_price')).order_by('-quantity_sold')[:10]

        return Response({
            'period': period,
            'summary': {
                'total_sales': net_sales_count,
                'total_revenue': float(total_revenue),
                'total_profit': float(total_profit),
                'total_expenses': float(total_expenses),
                'total_quantity_sold': total_quantity,
                'average_sale_value': float(avg_sale_value),
                'total_refunded': float(total_refunded),
                'total_returned_quantity': total_returned_qty
            },
            'top_phones': list(top_phones)
        }, status=status.HTTP_200_OK)


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shop expenses.
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['category', 'date']
    ordering_fields = ['amount', 'date']
    ordering = ['-date']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get expense statistics for a period.
        """
        period = request.query_params.get('period', 'month')
        
        queryset = self.get_queryset()
        
        if period == 'month':
            start_date = timezone.localtime(timezone.now()).date().replace(day=1)
            queryset = queryset.filter(date__gte=start_date)
        elif period == 'week':
            start_date = timezone.localtime(timezone.now()).date() - timedelta(days=7)
            queryset = queryset.filter(date__gte=start_date)
            
        stats = queryset.values('category').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')
        
        total_all = queryset.aggregate(
            total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
        )['total']
        
        return Response({
            'period': period,
            'total_expenses': total_all,
            'by_category': stats
        })


class RepairTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing phone repair tickets.
    """
    queryset = RepairTicket.objects.all()
    serializer_class = RepairTicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'customer', 'technician']
    ordering_fields = ['created_at', 'due_date', 'estimated_cost']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        # Initial status intake and log creation
        ticket = serializer.save()
        RepairStatusLog.objects.create(
            ticket=ticket,
            previous_status='',
            new_status='intake',
            changed_by=self.request.user,
            note="Ticket created"
        )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """
        Transition status with validation.
        """
        ticket = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        if not new_status:
            return Response({'error': 'New status is required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in RepairTicket.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic validation: no skipping to 'closed' without 'ready' etc. could be added here
        # For now, we'll just log the transition
        
        old_status = ticket.status
        ticket.status = new_status

        # If move to closed, set final_cost if not already set
        if new_status == 'closed' and not ticket.final_cost:
            ticket.final_cost = ticket.estimated_cost

        from django.core.exceptions import ValidationError
        try:
            ticket.save()
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add automated note if moving to waiting_approval
        if new_status == 'waiting_approval' and not note:
            note = "Waiting for customer approval of the estimated cost."

        RepairStatusLog.objects.create(
            ticket=ticket,
            previous_status=old_status,
            new_status=new_status,
            changed_by=self.request.user,
            note=note
        )
        
        return Response(RepairTicketSerializer(ticket).data)

    @action(detail=True, methods=['post'], url_path='add_part')
    def add_part(self, request, pk=None):
        ticket = self.get_object()
        serializer = RepairPartSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(ticket=ticket)
            return Response(RepairTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='remove_part/(?P<part_id>[^/.]+)')
    def remove_part(self, request, pk=None, part_id=None):
        ticket = self.get_object()
        try:
            part = ticket.parts.get(id=part_id)
            part.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except RepairPart.DoesNotExist:
            return Response({'error': 'Part not found'}, status=status.HTTP_404_NOT_FOUND)
            
        ticket.save()

        RepairStatusLog.objects.create(
            ticket=ticket,
            previous_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            note=note
        )

        return Response(RepairTicketSerializer(ticket).data)

    @action(detail=True, methods=['post'], url_path='parts')
    def add_part(self, request, pk=None):
        """
        Add a part used in the repair.
        """
        ticket = self.get_object()
        serializer = RepairPartSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(ticket=ticket)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(
        summary="List all customers",
        description="Retrieve a paginated list of all customers with optional filtering and sorting.",
        tags=['Customers'],
        parameters=[
            OpenApiParameter(
                name='name',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by customer name',
                required=False
            ),
            OpenApiParameter(
                name='phone',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by customer phone number',
                required=False
            ),
            OpenApiParameter(
                name='email',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by customer email',
                required=False
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search across name, phone, and email',
                required=False
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Order by field (name, -name, created_at, -created_at)',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'List customers',
                value={'count': 100, 'next': 'http://api.example.com/api/customers/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get customer details",
        description="Retrieve detailed information about a specific customer including purchase history.",
        tags=['Customers'],
        examples=[
            OpenApiExample(
                'Customer details',
                value={
                    'id': 1,
                    'name': 'John Doe',
                    'phone': '+1234567890',
                    'email': 'john@example.com',
                    'address': '123 Main St, City, State 12345',
                    'created_at': '2025-01-01T00:00:00Z',
                    'updated_at': '2025-01-15T10:30:00Z',
                    'purchase_history': [
                        {
                            'id': 1,
                            'phone': {
                                'brand': 'Apple',
                                'model': 'iPhone 15 Pro'
                            },
                            'quantity': 1,
                            'total_price': 999.99,
                            'sale_date': '2025-01-15T10:30:00Z'
                        }
                    ],
                    'total_purchases': 1,
                    'total_spent': 999.99
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create new customer",
        description="Add a new customer to the database.",
        tags=['Customers'],
        examples=[
            OpenApiExample(
                'Create customer',
                value={
                    'name': 'Jane Smith',
                    'phone': '+1987654321',
                    'email': 'jane@example.com',
                    'address': '456 Oak Ave, City, State 67890'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update customer",
        description="Update all fields of an existing customer.",
        tags=['Customers']
    ),
    partial_update=extend_schema(
        summary="Partially update customer",
        description="Update specific fields of an existing customer.",
        tags=['Customers']
    ),
    destroy=extend_schema(
        summary="Delete customer",
        description="Remove a customer from the database. Requires admin permissions. WARNING: This action cannot be undone.",
        tags=['Customers']
    ),
)
class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Customer CRUD operations with advanced filtering, search, and sorting.
    
    Supports:
    - GET /api/customers/ - List all customers with pagination
    - POST /api/customers/ - Create new customer
    - GET /api/customers/{id}/ - Get customer details
    - PUT /api/customers/{id}/ - Update customer
    - DELETE /api/customers/{id}/ - Delete customer
    
    Filtering, Search, and Sorting:
    - ?search=john - Search across name, phone, email
    - ?name=John - Filter by customer name
    - ?ordering=name - Sort by name (ascending)
    - ?ordering=-name - Sort by name (descending)
    - ?ordering=-created_at - Sort by newest first
    """
    queryset = Customer.objects.prefetch_related('purchase_history__phone').all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = CustomerFilter
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """Override permissions based on action"""
        if self.action == 'destroy':
            # Only admins can delete customers
            permission_classes = [IsAdminForDestructive]
        else:
            # All authenticated users can view, create, update customers
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ProductReturnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing product returns.
    Provides endpoints to create returns and view return history.
    """
    queryset = ProductReturn.objects.prefetch_related('items__product').all()
    serializer_class = ProductReturnSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['sale', 'return_date']
    ordering_fields = ['return_date', 'return_number']
    ordering = ['-return_date']

    def perform_create(self, serializer):
        # Automatically assign the current user as the person processing the return
        serializer.save(processed_by=self.request.user)


class ExchangeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trade-in / exchange transactions.

    An exchange is when a client brings their old phone and buys a new one from
    the shop. The old phone is added to inventory and the client pays the price
    difference.

    - list / retrieve: read exchange history
    - create: create a new sale with a mandatory trade_in section
    - Additional action: stats
    """
    queryset = (
        TradeIn.objects
        .select_related('sale', 'sale__customer', 'received_phone')
        .prefetch_related('sale__items__phone')
        .order_by('-created_at')
    )
    serializer_class = ExchangeListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['created_at', 'trade_in_value']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SaleSerializer
        return ExchangeListSerializer

    def create(self, request, *args, **kwargs):
        """
        Create an exchange: a Sale with a mandatory trade_in block.
        The old phone is added to inventory automatically.
        The new phone is deducted from stock.
        """
        data = request.data.copy()

        # Ensure trade_in is provided
        if not data.get('trade_in'):
            return Response(
                {'trade_in': 'Le bloc trade_in est obligatoire pour un échange.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sale_serializer = SaleSerializer(data=data, context={'request': request})
        if not sale_serializer.is_valid():
            return Response(sale_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        sale = sale_serializer.save()

        # Return the newly created TradeIn (exchange) in exchange format
        trade_in = getattr(sale, 'trade_in', None)
        if trade_in:
            out_serializer = ExchangeListSerializer(trade_in)
            return Response(out_serializer.data, status=status.HTTP_201_CREATED)

        # Fallback: return the sale
        return Response(sale_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Summary statistics for exchange transactions."""
        from django.db.models import Sum, Count, Avg

        qs = self.get_queryset()
        total = qs.count()
        total_trade_in_value = qs.aggregate(total=Sum('trade_in_value'))['total'] or 0
        avg_trade_in_value = qs.aggregate(avg=Avg('trade_in_value'))['avg'] or 0

        return Response({
            'total_exchanges': total,
            'total_trade_in_value': float(total_trade_in_value),
            'average_trade_in_value': float(avg_trade_in_value),
        })
