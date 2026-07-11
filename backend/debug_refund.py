import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.sales.models import Sale, SaleItem, ProductReturn, ProductReturnItem
from apps.phones.models import Phone
from apps.inventory.models import InventoryItem
from decimal import Decimal
from django.contrib.auth.models import User

def debug_refund():
    user = User.objects.first()
    print(f"Using user: {user.username}")
    
    # Create Phone
    phone = Phone.objects.create(brand="Debug", model="Refund500", purchase_price=Decimal('100.00'), price=Decimal('200.00'))
    # Create Inventory
    inv = InventoryItem.objects.create(phone=phone, stock_quantity=10)
    
    # Create Sale
    sale = Sale.objects.create(
        user=user,
        total_price=Decimal('200.00'),
        invoice_number='DEBUG-500-REF'
    )
    
    # Create Sale Item
    item = SaleItem.objects.create(
        sale=sale,
        phone=phone,
        quantity=1,
        unit_price=Decimal('200.00'),
        total_price=Decimal('200.00')
    )
    
    print(f"Sale and Item created. Preparing return...")
    
    try:
        # Simulate payload
        payload_items = [
            {
                'sale_item': item,
                'product': phone,
                'quantity': 1,
                'refund_amount': Decimal('200.00')
            }
        ]
        
        from django.db import transaction
        with transaction.atomic():
            ret = ProductReturn.objects.create(
                sale=sale,
                reason="Debug 500",
                processed_by=user
            )
            print(f"ProductReturn created: {ret.id}")
            
            for item_data in payload_items:
                print(f"Creating ReturnItem with data: {item_data}")
                ritem = ProductReturnItem.objects.create(product_return=ret, **item_data)
                print(f"ReturnItem created: {ritem.id}")
                
        print("Test PASSED locally.")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_refund()
