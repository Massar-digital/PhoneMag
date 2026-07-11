from django.contrib import admin
from .models import Sale, SaleItem, ProductReturn, ProductReturnItem, RepairTicket, RepairPart, RepairStatusLog


class RepairPartInline(admin.TabularInline):
    model = RepairPart
    extra = 1


class RepairStatusLogInline(admin.TabularInline):
    model = RepairStatusLog
    readonly_fields = ['previous_status', 'new_status', 'changed_by', 'changed_at', 'note']
    extra = 0
    can_delete = False


@admin.register(RepairTicket)
class RepairTicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'device_model', 'status', 'estimated_cost', 'due_date', 'created_at']
    list_filter = ['status', 'created_at', 'due_date']
    search_fields = ['customer__name', 'device_model', 'imei']
    inlines = [RepairPartInline, RepairStatusLogInline]


@admin.register(RepairPart)
class RepairPartAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'part_name', 'quantity', 'unit_cost']


@admin.register(RepairStatusLog)
class RepairStatusLogAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'previous_status', 'new_status', 'changed_by', 'changed_at']
    readonly_fields = ['ticket', 'previous_status', 'new_status', 'changed_by', 'changed_at', 'note']


class ProductReturnItemInline(admin.TabularInline):
    model = ProductReturnItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'refund_amount', 'profit_impact']


class ProductReturnInline(admin.TabularInline):
    model = ProductReturn
    extra = 0
    readonly_fields = ['return_number', 'return_date', 'processed_by']
    show_change_link = True


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    fields = ['phone', 'quantity', 'unit_price', 'discount_applied', 'total_price']
    readonly_fields = ['total_price']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'phone', 'quantity', 'total_price', 'customer_name', 'payment_method', 'sale_date']
    list_filter = ['payment_method', 'sale_date', 'phone__brand']
    search_fields = ['customer_name', 'customer_phone']
    ordering = ['-sale_date']
    inlines = [SaleItemInline, ProductReturnInline]


@admin.register(ProductReturn)
class ProductReturnAdmin(admin.ModelAdmin):
    list_display = ['return_number', 'sale', 'return_date', 'processed_by']
    list_filter = ['return_date']
    search_fields = ['return_number', 'sale__id', 'reason']
    ordering = ['-return_date']
    inlines = [ProductReturnItemInline]


@admin.register(ProductReturnItem)
class ProductReturnItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'product_return', 'product', 'quantity', 'refund_amount', 'profit_impact']
    list_filter = ['product_return__return_date']
    search_fields = ['product_return__return_number', 'product__model']


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'sale', 'phone', 'quantity', 'unit_price', 'total_price', 'discount_applied']
    list_filter = ['phone__brand', 'phone__product_type']
    search_fields = ['sale__customer_name', 'phone__brand', 'phone__model']
    ordering = ['-sale__sale_date']
