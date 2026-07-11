from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, DecimalField, Q, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.sales.models import Sale, SaleItem, ProductReturn, ProductReturnItem, Expense, RepairTicket
from apps.inventory.models import InventoryItem
from apps.phones.models import Phone


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get comprehensive dashboard statistics based on selected period
    Query params:
    - period: 'day', 'today', 'week', 'month', 'quarter', 'year', 'all' (default: 'today')
    """
    period = request.query_params.get('period', 'today')
    
    # Calculate date filter
    now = timezone.now()
    if period in ['today', 'day']:
        start_date = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = now - timedelta(days=7)
    elif period == 'month':
        start_date = now - timedelta(days=30)
    elif period == 'quarter':
        start_date = now - timedelta(days=90)
    elif period == 'year':
        start_date = now - timedelta(days=365)
    else:  # 'all'
        start_date = None
    
    # Filter sales by date
    sales_qs = Sale.objects.all()
    return_items_qs = ProductReturnItem.objects.all()
    if start_date:
        sales_qs = sales_qs.filter(sale_date__gte=start_date)
        return_items_qs = return_items_qs.filter(product_return__return_date__gte=start_date)
    
    # Sales statistics - Base metrics (without joining items to avoid duplication)
    sales_stats = sales_qs.aggregate(
        total_sales=Count('id'),
        total_revenue=Coalesce(Sum('total_price'), 0, output_field=DecimalField()),
        total_profit=Coalesce(Sum('profit_margin'), 0, output_field=DecimalField()),
        legacy_quantity=Coalesce(Sum('quantity'), 0),
        avg_sale_value=Coalesce(Avg('total_price'), 0, output_field=DecimalField())
    )

    # Calculate quantity from multi-item sales separately
    items_quantity = SaleItem.objects.filter(sale__in=sales_qs).aggregate(
        total=Coalesce(Sum('quantity'), 0)
    )['total']

    total_quantity_sold = sales_stats['legacy_quantity'] + items_quantity

    # Return statistics (from return items)
    return_stats = return_items_qs.aggregate(
        total_refunded=Coalesce(Sum('refund_amount'), 0, output_field=DecimalField()),
        total_profit_impact=Coalesce(Sum('profit_impact'), 0, output_field=DecimalField()),
        total_quantity_returned=Coalesce(Sum('quantity'), 0)
    )

    # Adjusted statistics (Subtract returns)
    net_revenue = sales_stats['total_revenue'] - return_stats['total_refunded']
    # profit_impact is typically negative (cost - refund), so we ADD it to raw profit
    net_profit = sales_stats['total_profit'] + return_stats['total_profit_impact']
    net_quantity = total_quantity_sold - return_stats['total_quantity_returned']

    # New: Calculate expenses for the period
    expenses_qs = Expense.objects.all()
    if start_date:
        expenses_qs = expenses_qs.filter(date__gte=start_date)
    
    total_expenses = expenses_qs.aggregate(
        total=Coalesce(Sum('amount'), 0, output_field=DecimalField())
    )['total']

    # New: Calculate repairs revenue for the period
    repairs_qs = RepairTicket.objects.filter(status='closed')
    if start_date:
        repairs_qs = repairs_qs.filter(updated_at__gte=start_date)
    
    total_repairs_revenue = repairs_qs.aggregate(
        total=Coalesce(Sum('final_cost'), 0, output_field=DecimalField())
    )['total']

    # Apply expenses and repairs to net revenue and profit
    net_revenue = net_revenue - total_expenses + total_repairs_revenue
    net_profit = net_profit - total_expenses + total_repairs_revenue
    
    # Count of net sales (transactions that were not fully refunded)
    # Use a subquery to avoid join issues with Sum in annotate
    refunds_subquery = ProductReturnItem.objects.filter(
        product_return__sale=OuterRef('pk')
    ).values('product_return__sale').annotate(
        total_refunded=Sum('refund_amount')
    ).values('total_refunded')
    
    net_sales_count = sales_qs.annotate(
        total_refunded_amount=Coalesce(Subquery(refunds_subquery, output_field=DecimalField()), Decimal('0.00'))
    ).filter(total_refunded_amount__lt=F('total_price')).count()
    
    # Average calculation
    # Use net sales count for more accurate average value of successful transactions
    avg_sale_val = net_revenue / net_sales_count if net_sales_count > 0 else 0
    
    # Inventory statistics
    inventory_stats = InventoryItem.objects.aggregate(
        total_phones=Count('id'),
        total_stock_quantity=Coalesce(Sum('stock_quantity'), 0),
        low_stock_count=Count('id', filter=Q(
            stock_quantity__lte=F('reorder_level'),
            stock_quantity__gt=0
        )),
        out_of_stock_count=Count('id', filter=Q(stock_quantity=0)),
        total_inventory_value=Coalesce(
            Sum(F('stock_quantity') * F('phone__purchase_price')),
            0,
            output_field=DecimalField()
        )
    )
    
    # Top selling phones (in selected period) - handle both legacy and multi-item sales
    items_products = SaleItem.objects.filter(sale__in=sales_qs).values(
        'phone__brand',
        'phone__model',
        'phone__id'
    ).annotate(
        quantity_sold=Sum('quantity'),
        revenue=Sum('total_price')
    )

    legacy_products = sales_qs.filter(phone__isnull=False).values(
        'phone__brand',
        'phone__model',
        'phone__id'
    ).annotate(
        quantity_sold=Sum('quantity'),
        revenue=Sum('total_price')
    )
    
    combined_products = {}
    
    for item in items_products:
        pid = item['phone__id']
        brand = item['phone__brand'] or "Produit"
        model = item['phone__model'] or ""
        if pid not in combined_products:
            combined_products[pid] = {'phone__brand': brand, 'phone__model': model, 'phone__id': pid, 'quantity_sold': 0, 'revenue': 0}
        combined_products[pid]['quantity_sold'] += (item['quantity_sold'] or 0)
        combined_products[pid]['revenue'] += float(item['revenue'] or 0)

    for item in legacy_products:
        pid = item['phone__id']
        brand = item['phone__brand'] or "Produit"
        model = item['phone__model'] or ""
        if pid not in combined_products:
            combined_products[pid] = {'phone__brand': brand, 'phone__model': model, 'phone__id': pid, 'quantity_sold': 0, 'revenue': 0}
        combined_products[pid]['quantity_sold'] += (item['quantity_sold'] or 0)
        combined_products[pid]['revenue'] += float(item['revenue'] or 0)
            
    top_products_list = sorted(combined_products.values(), key=lambda x: x['quantity_sold'], reverse=True)[:5]
    
    # Recent activity
    recent_sales_count = Sale.objects.filter(
        sale_date__gte=now - timedelta(hours=24)
    ).count()
    
    data = {
        'period': period,
        'sales': {
            'total_sales': net_sales_count,
            'total_revenue': float(net_revenue),
            'total_profit': float(net_profit),
            'total_quantity_sold': net_quantity,
            'avg_sale_value': float(avg_sale_val),
            'recent_sales_24h': recent_sales_count,
            'total_refunded': float(return_stats['total_refunded']),
            'total_expenses': float(total_expenses),
            # Show as positive number for "Profit Lost"
            'total_profit_lost': float(abs(return_stats['total_profit_impact'])),
            'total_returns_count': ProductReturn.objects.filter(return_date__gte=start_date).count() if start_date else ProductReturn.objects.count()
        },
        'inventory': {
            'total_phones': inventory_stats['total_phones'],
            'total_stock_quantity': inventory_stats['total_stock_quantity'],
            'low_stock_count': inventory_stats['low_stock_count'],
            'out_of_stock_count': inventory_stats['out_of_stock_count'],
            'total_inventory_value': float(inventory_stats['total_inventory_value'])
        },
        'top_products': top_products_list
    }
    
    return Response(data)
