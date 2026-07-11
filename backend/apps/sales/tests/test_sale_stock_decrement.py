import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.inventory.models import InventoryItem, StockHistory, Supplier
from apps.phones.models import Phone
from apps.sales.models import Expense, ProductReturn, ProductReturnItem, RepairTicket, Sale, SaleItem, TradeIn
from apps.sales.models_customer import Customer
from apps.sales.serializers import ProductReturnSerializer, SaleSerializer
from apps.sales.views import RepairTicketViewSet, SaleViewSet


@pytest.fixture
def phone_with_inventory():
    phone = Phone.objects.create(
        product_type="Phone",
        brand="Samsung",
        model="Galaxy S24",
        price=Decimal("1200.00"),
        purchase_price=Decimal("900.00"),
        storage="256GB",
        ram="12GB",
        color="Black",
        condition="New",
    )
    inventory = InventoryItem.objects.create(phone=phone, stock_quantity=10)
    return phone, inventory


@pytest.fixture
def user():
    return User.objects.create_user(username="tester", password="secret123")


@pytest.mark.django_db
def test_create_single_item_sale_decrements_inventory_stock(phone_with_inventory):
    phone, inventory = phone_with_inventory

    payload = {
        "phone": phone.id,
        "quantity": 3,
        "total_price": "3600.00",
        "customer_name": "Test Customer",
        "payment_method": "Cash",
    }

    serializer = SaleSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors
    sale = serializer.save()

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 7

    stock_entry = StockHistory.objects.filter(
        inventory_item=inventory,
        reason="SALE",
        adjustment_type="REMOVE",
    ).first()
    assert stock_entry is not None
    assert stock_entry.quantity == 3
    assert stock_entry.previous_stock == 10
    assert stock_entry.new_stock == 7
    assert sale.phone_id == phone.id


@pytest.mark.django_db
def test_create_multi_item_sale_decrements_inventory_stock(phone_with_inventory):
    phone, inventory = phone_with_inventory

    payload = {
        "total_price": "2400.00",
        "customer_name": "Multi Item Customer",
        "payment_method": "Card",
        "items": [
            {
                "phone": phone.id,
                "quantity": 2,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
    }

    serializer = SaleSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors
    sale = serializer.save()

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 8

    stock_entry = StockHistory.objects.filter(
        inventory_item=inventory,
        reason="SALE",
        adjustment_type="REMOVE",
    ).first()
    assert stock_entry is not None
    assert stock_entry.quantity == 2
    assert stock_entry.previous_stock == 10
    assert stock_entry.new_stock == 8
    assert sale.items.count() == 1


@pytest.mark.django_db
def test_return_creation_increments_inventory_stock(phone_with_inventory):
    phone, inventory = phone_with_inventory

    sale_payload = {
        "total_price": "2400.00",
        "customer_name": "Return Customer",
        "payment_method": "Cash",
        "items": [
            {
                "phone": phone.id,
                "quantity": 2,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
    }
    sale_serializer = SaleSerializer(data=sale_payload)
    assert sale_serializer.is_valid(), sale_serializer.errors
    sale = sale_serializer.save()
    sale_item = sale.items.first()

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 8

    return_payload = {
        "sale": sale.id,
        "reason": "Customer changed mind",
        "items": [
            {
                "sale_item": sale_item.id,
                "quantity": 1,
                "refund_amount": "1200.00",
            }
        ],
    }
    return_serializer = ProductReturnSerializer(data=return_payload)
    assert return_serializer.is_valid(), return_serializer.errors
    product_return = return_serializer.save(processed_by=None)

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 9

    stock_entry = StockHistory.objects.filter(
        inventory_item=inventory,
        reason="RETURN",
        adjustment_type="ADD",
    ).first()
    assert stock_entry is not None
    assert stock_entry.quantity == 1
    assert stock_entry.previous_stock == 8
    assert stock_entry.new_stock == 9
    assert product_return.items.count() == 1


@pytest.mark.django_db
def test_return_creation_calculates_profit_impact(phone_with_inventory):
    phone, _inventory = phone_with_inventory

    sale_payload = {
        "total_price": "1200.00",
        "customer_name": "Profit Impact Customer",
        "payment_method": "Cash",
        "items": [
            {
                "phone": phone.id,
                "quantity": 1,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
    }
    sale_serializer = SaleSerializer(data=sale_payload)
    assert sale_serializer.is_valid(), sale_serializer.errors
    sale = sale_serializer.save()
    sale_item = sale.items.first()

    return_payload = {
        "sale": sale.id,
        "reason": "Defect return",
        "items": [
            {
                "sale_item": sale_item.id,
                "quantity": 1,
                "refund_amount": "1200.00",
            }
        ],
    }
    return_serializer = ProductReturnSerializer(data=return_payload)
    assert return_serializer.is_valid(), return_serializer.errors
    product_return = return_serializer.save(processed_by=None)
    return_item = product_return.items.first()

    # Formula in ProductReturnItem.save():
    # profit_impact = (purchase_price * quantity) - refund_amount
    assert return_item.profit_impact == Decimal("-300.00")


@pytest.mark.django_db
def test_exchange_flow_decrements_sold_stock_and_increments_tradein_stock(phone_with_inventory, user):
    sold_phone, sold_inventory = phone_with_inventory

    payload = {
        "total_price": "1000.00",
        "customer_name": "Exchange Customer",
        "payment_method": "Cash",
        "items": [
            {
                "phone": sold_phone.id,
                "quantity": 1,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
        "trade_in": {
            "brand": "Apple",
            "model": "iPhone 12",
            "imei": "359881234567890",
            "color": "White",
            "storage": "128GB",
            "condition": "Used",
            "trade_in_value": "200.00",
            "notes": "Trade-in unit",
        },
    }

    serializer = SaleSerializer(data=payload, context={"request": type("Req", (), {"user": user, "is_authenticated": True})()})
    assert serializer.is_valid(), serializer.errors
    sale = serializer.save()

    sold_inventory.refresh_from_db()
    assert sold_inventory.stock_quantity == 9

    trade_in = TradeIn.objects.get(sale=sale)
    received_inventory = InventoryItem.objects.get(phone=trade_in.received_phone)
    assert received_inventory.stock_quantity == 1


@pytest.mark.django_db
def test_exchange_flow_is_atomic_when_tradein_creation_fails(phone_with_inventory, user, monkeypatch):
    sold_phone, sold_inventory = phone_with_inventory

    payload = {
        "total_price": "1000.00",
        "customer_name": "Atomic Exchange",
        "payment_method": "Cash",
        "items": [
            {
                "phone": sold_phone.id,
                "quantity": 1,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
        "trade_in": {
            "brand": "Apple",
            "model": "iPhone 13",
            "imei": "359881234567891",
            "color": "Blue",
            "storage": "128GB",
            "condition": "Used",
            "trade_in_value": "200.00",
        },
    }

    original_create = InventoryItem.objects.create

    def flaky_create(*args, **kwargs):
        # Fail only when creating inventory for trade-in phone (stock_quantity=1 in serializer)
        if kwargs.get("stock_quantity") == 1 and kwargs.get("location") == "Rayon Reprises":
            raise RuntimeError("forced trade-in inventory failure")
        return original_create(*args, **kwargs)

    monkeypatch.setattr(InventoryItem.objects, "create", flaky_create)

    serializer = SaleSerializer(data=payload, context={"request": type("Req", (), {"user": user, "is_authenticated": True})()})
    assert serializer.is_valid(), serializer.errors

    with pytest.raises(RuntimeError, match="forced trade-in inventory failure"):
        serializer.save()

    sold_inventory.refresh_from_db()
    assert sold_inventory.stock_quantity == 10
    assert Sale.objects.count() == 0
    assert TradeIn.objects.count() == 0


@pytest.mark.django_db
def test_repair_billing_amount_and_paid_status_transition(user):
    customer = Customer.objects.create(name="Repair Customer", phone="123456789")
    repair = RepairTicket.objects.create(
        customer=customer,
        device_model="iPhone 14",
        issue_description="Screen replacement",
        estimated_cost=Decimal("150.00"),
        status='intake',
        technician=user,
    )
    assert repair.estimated_cost == Decimal("150.00")
    assert repair.status == 'intake'
    assert repair.final_cost is None

    factory = APIRequestFactory()
    request = factory.patch(f"/api/repairs/{repair.id}/status/", {"status": "closed"}, format='json')
    force_authenticate(request, user=user)
    view = RepairTicketViewSet.as_view({"patch": "update_status"})
    response = view(request, pk=repair.id)

    assert response.status_code == 200
    repair.refresh_from_db()
    assert repair.final_cost == Decimal("150.00")
    assert repair.status == 'closed'


@pytest.mark.django_db
def test_expense_recording_reduces_net_profit_in_sales_stats(phone_with_inventory, user):
    phone, _inventory = phone_with_inventory

    sale_payload = {
        "phone": phone.id,
        "quantity": 1,
        "total_price": "1200.00",
        "customer_name": "Stats Customer",
        "payment_method": "Cash",
    }
    serializer = SaleSerializer(data=sale_payload, context={"request": type("Req", (), {"user": user, "is_authenticated": True})()})
    assert serializer.is_valid(), serializer.errors
    serializer.save()

    # Expense for today should reduce both revenue and profit in stats(day)
    Expense.objects.create(
        category="Rent",
        amount=Decimal("100.00"),
        date=timezone.localdate(),
        user=user,
    )

    factory = APIRequestFactory()
    request = factory.get("/api/sales/stats/?period=day")
    force_authenticate(request, user=user)
    view = SaleViewSet.as_view({"get": "stats"})
    response = view(request)

    assert response.status_code == 200
    summary = response.data["summary"]
    assert summary["total_expenses"] == 100.0
    assert summary["total_profit"] == 200.0


@pytest.mark.django_db
def test_full_sale_return_restock_cycle_via_api(phone_with_inventory, user):
    phone, inventory = phone_with_inventory
    client = APIClient()
    client.force_authenticate(user=user)

    sale_payload = {
        "total_price": "2400.00",
        "customer_name": "Cycle Customer",
        "payment_method": "Cash",
        "items": [
            {
                "phone": phone.id,
                "quantity": 2,
                "unit_price": "1200.00",
                "discount_applied": "0.00",
            }
        ],
    }
    sale_response = client.post("/api/sales/", sale_payload, format="json")
    assert sale_response.status_code == 201, sale_response.data

    sale = Sale.objects.get(id=sale_response.data["id"])
    sale_item = sale.items.get(phone=phone)

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 8

    return_payload = {
        "sale": sale.id,
        "reason": "Customer returned full order",
        "items": [
            {
                "sale_item": sale_item.id,
                "quantity": 2,
                "refund_amount": "2400.00",
            }
        ],
    }
    return_response = client.post("/api/returns/", return_payload, format="json")
    assert return_response.status_code == 201, return_response.data

    inventory.refresh_from_db()
    assert inventory.stock_quantity == 10

    sale_stock_entry = StockHistory.objects.filter(
        inventory_item=inventory,
        reason="SALE",
        adjustment_type="REMOVE",
    ).first()
    assert sale_stock_entry is not None
    assert sale_stock_entry.quantity == 2
    assert sale_stock_entry.previous_stock == 10
    assert sale_stock_entry.new_stock == 8

    return_stock_entry = StockHistory.objects.filter(
        inventory_item=inventory,
        reason="RETURN",
        adjustment_type="ADD",
    ).first()
    assert return_stock_entry is not None
    assert return_stock_entry.quantity == 2
    assert return_stock_entry.previous_stock == 8
    assert return_stock_entry.new_stock == 10


@pytest.mark.django_db
def test_inventory_model_helpers_and_history_str():
    supplier = Supplier.objects.create(
        name="Core Supplier",
        contact_person="Sam Vendor",
        phone="+213555000111",
        email="vendor@example.com",
    )
    phone = Phone.objects.create(
        product_type="Phone",
        brand="Samsung",
        model="Galaxy A55",
        price=Decimal("600.00"),
        purchase_price=Decimal("450.00"),
        storage="128GB",
        ram="8GB",
        color="Blue",
        condition="New",
    )
    inventory = InventoryItem.objects.create(
        phone=phone,
        stock_quantity=4,
        reorder_level=5,
        supplier=supplier,
    )
    history = StockHistory.objects.create(
        inventory_item=inventory,
        adjustment_type="ADD",
        quantity=4,
        reason="INITIAL",
        notes="Opening stock",
        previous_stock=0,
        new_stock=4,
        created_by=None,
    )

    assert str(supplier) == "Core Supplier"
    assert str(inventory) == f"{phone} - Stock: 4"
    assert inventory.is_low_stock is True
    assert str(history) == f"{phone} - ADD 4 (INITIAL)"


@pytest.mark.django_db
def test_sale_validation_update_delete_and_str():
    orphan_phone = Phone.objects.create(
        product_type="Phone",
        brand="Apple",
        model="iPhone 15",
        price=Decimal("1200.00"),
        purchase_price=Decimal("900.00"),
        storage="256GB",
        ram="6GB",
        color="Black",
        condition="New",
    )
    with pytest.raises(ValidationError, match="No inventory entry found for this phone."):
        Sale(phone=orphan_phone, quantity=1, total_price=Decimal("1200.00")).clean()

    limited_phone = Phone.objects.create(
        product_type="Phone",
        brand="Samsung",
        model="Galaxy S24",
        price=Decimal("1100.00"),
        purchase_price=Decimal("800.00"),
        storage="256GB",
        ram="12GB",
        color="Gray",
        condition="New",
    )
    limited_inventory = InventoryItem.objects.create(phone=limited_phone, stock_quantity=1)
    with pytest.raises(ValidationError, match="Insufficient stock for this sale."):
        Sale(phone=limited_phone, quantity=2, total_price=Decimal("2200.00")).clean()

    sale_phone = Phone.objects.create(
        product_type="Phone",
        brand="Samsung",
        model="Galaxy S24+",
        price=Decimal("1200.00"),
        purchase_price=Decimal("900.00"),
        storage="256GB",
        ram="12GB",
        color="Black",
        condition="New",
    )
    sale_inventory = InventoryItem.objects.create(phone=sale_phone, stock_quantity=10)
    sale = Sale.objects.create(
        phone=sale_phone,
        quantity=2,
        total_price=Decimal("2400.00"),
        customer_name="Lifecycle Customer",
        payment_method="Cash",
    )

    assert str(sale).startswith("Sale #")
    assert sale.product_name_at_sale == "Samsung Galaxy S24+"
    assert sale.invoice_number.startswith(f"INV-{timezone.now().year}-")

    sale.quantity = 3
    sale.total_price = Decimal("3600.00")
    sale.save()

    sale_inventory.refresh_from_db()
    assert sale_inventory.stock_quantity == 7

    sale.delete()
    sale_inventory.refresh_from_db()
    assert sale_inventory.stock_quantity == 10

    multi_phone = Phone.objects.create(
        product_type="Phone",
        brand="Xiaomi",
        model="Redmi Note 13",
        price=Decimal("400.00"),
        purchase_price=Decimal("250.00"),
        storage="128GB",
        ram="6GB",
        color="Blue",
        condition="New",
    )
    multi_inventory = InventoryItem.objects.create(phone=multi_phone, stock_quantity=5)
    multi_sale = Sale.objects.create(
        total_price=Decimal("800.00"),
        customer_name="Bundle Customer",
        payment_method="Card",
    )
    SaleItem.objects.create(
        sale=multi_sale,
        phone=multi_phone,
        quantity=2,
        unit_price=Decimal("400.00"),
        discount_applied=Decimal("0.00"),
    )

    multi_inventory.refresh_from_db()
    assert multi_inventory.stock_quantity == 3

    multi_sale.delete()
    multi_inventory.refresh_from_db()
    assert multi_inventory.stock_quantity == 5


@pytest.mark.django_db
def test_saleitem_validation_and_snapshot_recreation(user):
    no_phone_item = SaleItem(
        sale=Sale.objects.create(total_price=Decimal("0.00"), customer_name="Validation", payment_method="Cash"),
        quantity=1,
        unit_price=Decimal("100.00"),
        discount_applied=Decimal("0.00"),
    )
    with pytest.raises(ValidationError, match="Product/Phone is required for a sale item."):
        no_phone_item.clean()

    missing_inventory_phone = Phone.objects.create(
        product_type="Phone",
        brand="Google",
        model="Pixel 8",
        price=Decimal("900.00"),
        purchase_price=Decimal("650.00"),
        storage="128GB",
        ram="8GB",
        color="Obsidian",
        condition="New",
    )
    missing_inventory_item = SaleItem(
        sale=Sale.objects.create(total_price=Decimal("0.00"), customer_name="Validation", payment_method="Cash"),
        phone=missing_inventory_phone,
        quantity=1,
        unit_price=Decimal("900.00"),
        discount_applied=Decimal("0.00"),
    )
    with pytest.raises(ValidationError, match="No inventory entry found for"):
        missing_inventory_item.clean()

    stock_phone = Phone.objects.create(
        product_type="Phone",
        brand="OnePlus",
        model="12",
        price=Decimal("700.00"),
        purchase_price=Decimal("500.00"),
        storage="256GB",
        ram="16GB",
        color="Green",
        condition="New",
    )
    stock_inventory = InventoryItem.objects.create(phone=stock_phone, stock_quantity=1)
    sale = Sale.objects.create(total_price=Decimal("700.00"), customer_name="Item Update", payment_method="Cash")
    sale_item = SaleItem.objects.create(
        sale=sale,
        phone=stock_phone,
        quantity=1,
        unit_price=Decimal("700.00"),
        discount_applied=Decimal("0.00"),
    )
    stock_inventory.refresh_from_db()
    assert stock_inventory.stock_quantity == 0

    sale_item.quantity = 2
    sale_item.unit_price = Decimal("700.00")
    sale_item.save()
    stock_inventory.refresh_from_db()
    assert stock_inventory.stock_quantity == -1

    used_phone = Phone.objects.create(
        product_type="Phone",
        brand="Apple",
        model="iPhone 12",
        price=Decimal("800.00"),
        purchase_price=Decimal("500.00"),
        storage="64GB",
        ram="4GB",
        color="White",
        condition="Used",
        IMEI="359881234500000",
    )
    InventoryItem.objects.create(phone=used_phone, stock_quantity=1)
    used_sale = Sale.objects.create(total_price=Decimal("800.00"), customer_name="Snapshot Customer", payment_method="Cash")
    used_sale_item = SaleItem.objects.create(
        sale=used_sale,
        phone=used_phone,
        quantity=1,
        unit_price=Decimal("800.00"),
        discount_applied=Decimal("0.00"),
    )

    assert used_sale_item.phone is None
    assert used_sale_item.product_data_snapshot["brand"] == "Apple"
    assert not Phone.objects.filter(pk=used_phone.pk).exists()

    product_return = ProductReturn.objects.create(sale=used_sale, processed_by=user)
    return_item = ProductReturnItem.objects.create(
        product_return=product_return,
        sale_item=used_sale_item,
        quantity=1,
        refund_amount=Decimal("800.00"),
    )

    assert return_item.product is not None
    assert return_item.product.IMEI == "359881234500000"
    recreated_inventory = InventoryItem.objects.get(phone=return_item.product)
    assert recreated_inventory.stock_quantity == 1
    assert used_sale_item.phone_id == return_item.product_id


@pytest.mark.django_db
def test_return_tradein_repair_and_expense_helpers(user):
    phone = Phone.objects.create(
        product_type="Phone",
        brand="Samsung",
        model="Galaxy S23",
        price=Decimal("1000.00"),
        purchase_price=Decimal("700.00"),
        storage="256GB",
        ram="8GB",
        color="Black",
        condition="New",
    )
    InventoryItem.objects.create(phone=phone, stock_quantity=2)

    sale = Sale.objects.create(
        phone=phone,
        quantity=1,
        total_price=Decimal("1000.00"),
        customer_name="Return Helper",
        payment_method="Cash",
    )
    trade_in = TradeIn.objects.create(
        sale=sale,
        brand="Apple",
        model="iPhone 11",
        trade_in_value=Decimal("200.00"),
        condition="Used",
    )
    assert str(trade_in) == "Trade-in: Apple iPhone 11 (200.00 DA)"
    assert trade_in.difference_paid == sale.total_price

    product_return = ProductReturn.objects.create(sale=sale, processed_by=user)
    assert str(product_return).startswith(f"Return {product_return.return_number} for Sale #")

    return_item = ProductReturnItem(
        product_return=product_return,
        sale_item=None,
        product=phone,
        quantity=3,
        refund_amount=Decimal("900.00"),
    )
    with pytest.raises(ValidationError, match="Only 1 units remaining for return on this item."):
        return_item.clean()

    legacy_item = ProductReturnItem(
        product_return=product_return,
        sale_item=None,
        product=phone,
        quantity=1,
        refund_amount=Decimal("100.00"),
    )
    assert str(legacy_item) == f"1 x {phone.model} (Return {product_return.return_number})"

    expense = Expense.objects.create(
        category="Rent",
        amount=Decimal("250.00"),
        description="Monthly rent",
        date=timezone.localdate(),
        user=user,
    )
    repair = RepairTicket.objects.create(
        customer=Customer.objects.create(name="Repair Helper Customer"),
        device_model="iPhone 14",
        issue_description="Screen replacement",
        estimated_cost=Decimal("150.00"),
        status='intake',
        technician=user,
    )

    assert str(expense) == f"Rent - $250.00 ({timezone.localdate()})"
    assert str(repair) == f"Repair #{repair.id}: iPhone 14 (intake)"
