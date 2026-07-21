from django.core.management.base import BaseCommand
from apps.phones.models import Phone
from apps.inventory.models import Supplier, InventoryItem, StockHistory
from django.db import transaction
from decimal import Decimal


PRODUCTS = [
    {"product_type": "Phone", "brand": "Apple", "model": "iPhone 16 Pro Max", "price": 1299, "purchase_price": 1050, "storage": "256GB", "ram": "8GB", "color": "Natural Titanium", "condition": "New", "description": "Latest flagship with A18 Pro chip", "IMEI": "356789123456789", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.9", "stock": 15},
    {"product_type": "Phone", "brand": "Apple", "model": "iPhone 16 Pro", "price": 1099, "purchase_price": 890, "storage": "256GB", "ram": "8GB", "color": "Desert Titanium", "condition": "New", "description": "Pro model with advanced camera system", "IMEI": "356789123456790", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.3", "stock": 20},
    {"product_type": "Phone", "brand": "Samsung", "model": "Galaxy S25 Ultra", "price": 1199, "purchase_price": 970, "storage": "512GB", "ram": "12GB", "color": "Titanium Gray", "condition": "New", "description": "Premium Android flagship with S Pen", "IMEI": "357890123456789", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.9", "stock": 12},
    {"product_type": "Phone", "brand": "Samsung", "model": "Galaxy S25", "price": 799, "purchase_price": 640, "storage": "256GB", "ram": "8GB", "color": "Silver Shadow", "condition": "New", "description": "Flagship Galaxy experience", "IMEI": "357890123456790", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.2", "stock": 18},
    {"product_type": "Phone", "brand": "Xiaomi", "model": "14 Pro", "price": 699, "purchase_price": 550, "storage": "512GB", "ram": "12GB", "color": "Black", "condition": "New", "description": "Flagship killer with Leica optics", "IMEI": "358901234567891", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.73", "stock": 10},
    {"product_type": "Phone", "brand": "Google", "model": "Pixel 10 Pro", "price": 999, "purchase_price": 800, "storage": "256GB", "ram": "12GB", "color": "Obsidian", "condition": "New", "description": "Pure Android with Tensor G5 chip", "IMEI": "359012345678901", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.7", "stock": 8},
    {"product_type": "Phone", "brand": "OnePlus", "model": "13", "price": 899, "purchase_price": 720, "storage": "512GB", "ram": "16GB", "color": "Emerald Green", "condition": "New", "description": "Fast and smooth flagship experience", "IMEI": "359123456789012", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.82", "stock": 14},
    {"product_type": "Case", "brand": "Spigen", "model": "Ultra Hybrid", "price": 19.99, "purchase_price": 10, "storage": None, "ram": None, "color": "Clear", "condition": "New", "description": "Clear protective case with military-grade drop protection", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 50},
    {"product_type": "Case", "brand": "OtterBox", "model": "Defender Series", "price": 49.99, "purchase_price": 28, "storage": None, "ram": None, "color": "Black", "condition": "New", "description": "Rugged protection for extreme conditions", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 25},
    {"product_type": "Charger", "brand": "Anker", "model": "PowerPort III 65W", "price": 35.99, "purchase_price": 20, "storage": None, "ram": None, "color": "White", "condition": "New", "description": "GaN fast charger with dual USB-C ports", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 30},
    {"product_type": "Cable", "brand": "Belkin", "model": "USB-C to USB-C 2m", "price": 14.99, "purchase_price": 7, "storage": None, "ram": None, "color": "Black", "condition": "New", "description": "Durable braided USB-C cable", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 40},
    {"product_type": "Screen Protector", "brand": "Spigen", "model": "Tempered Glass", "price": 12.99, "purchase_price": 5, "storage": None, "ram": None, "color": "Clear", "condition": "New", "description": "Premium tempered glass screen protector", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 60},
    {"product_type": "Headphones", "brand": "Apple", "model": "AirPods Pro 3", "price": 249, "purchase_price": 190, "storage": None, "ram": None, "color": "White", "condition": "New", "description": "Premium wireless earbuds with adaptive audio", "IMEI": None, "battery_percentage": 95, "battery_cycle": None, "screen_size": None, "stock": 22},
    {"product_type": "Power Bank", "brand": "Anker", "model": "PowerCore 20000", "price": 45.99, "purchase_price": 28, "storage": None, "ram": None, "color": "Black", "condition": "New", "description": "20000mAh high-capacity portable charger", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 18},
    {"product_type": "Phone", "brand": "Samsung", "model": "Galaxy A56", "price": 449, "purchase_price": 350, "storage": "128GB", "ram": "8GB", "color": "Awesome Blue", "condition": "New", "description": "Mid-range Galaxy with great value", "IMEI": "359234567890123", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.6", "stock": 25},
    {"product_type": "Phone", "brand": "Apple", "model": "iPhone SE 4", "price": 499, "purchase_price": 390, "storage": "128GB", "ram": "6GB", "color": "Midnight", "condition": "New", "description": "Affordable iPhone with A18 chip", "IMEI": "359345678901234", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.1", "stock": 30},
    {"product_type": "Phone", "brand": "Xiaomi", "model": "Redmi Note 14 Pro", "price": 399, "purchase_price": 300, "storage": "256GB", "ram": "8GB", "color": "Forest Green", "condition": "New", "description": "Popular mid-ranger with excellent cameras", "IMEI": "359456789012345", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "6.67", "stock": 35},
    {"product_type": "Phone", "brand": "Apple", "model": "iPhone 16", "price": 799, "purchase_price": 630, "storage": "128GB", "ram": "8GB", "color": "Blue", "condition": "Refurbished", "description": "Open box - like new condition", "IMEI": "359567890123456", "battery_percentage": 98, "battery_cycle": 3, "screen_size": "6.1", "stock": 5},
    {"product_type": "Phone", "brand": "Samsung", "model": "Galaxy Z Fold 7", "price": 1899, "purchase_price": 1500, "storage": "512GB", "ram": "12GB", "color": "Navy", "condition": "New", "description": "Foldable flagship with massive inner display", "IMEI": "359678901234567", "battery_percentage": 100, "battery_cycle": 0, "screen_size": "7.6", "stock": 6},
    {"product_type": "Adapter", "brand": "Anker", "model": "Nano II 30W", "price": 25.99, "purchase_price": 14, "storage": None, "ram": None, "color": "White", "condition": "New", "description": "Compact GaN charger for fast charging", "IMEI": None, "battery_percentage": None, "battery_cycle": None, "screen_size": None, "stock": 45},
]

SUPPLIERS = [
    {"name": "TechDistributors Inc.", "contact_person": "John Smith", "phone": "+1-555-0101", "email": "john@techdistributors.com", "address": "123 Commerce St, New York, NY"},
    {"name": "MobileParts Direct", "contact_person": "Sarah Lee", "phone": "+1-555-0102", "email": "sarah@mobileparts.com", "address": "456 Industrial Blvd, Los Angeles, CA"},
    {"name": "GadgetWholesale Co.", "contact_person": "Mike Chen", "phone": "+1-555-0103", "email": "mike@gadgetwholesale.com", "address": "789 Trade Center, Chicago, IL"},
]


class Command(BaseCommand):
    help = "Seed the database with 20 sample products and their inventory records"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Creating suppliers...")
        suppliers = []
        for data in SUPPLIERS:
            supplier, created = Supplier.objects.get_or_create(name=data["name"], defaults=data)
            if created:
                self.stdout.write(f"  Created supplier: {supplier.name}")
            suppliers.append(supplier)
            suppliers.sort(key=lambda s: s.name)

        for i, product_data in enumerate(PRODUCTS):
            supplier = suppliers[i % len(suppliers)]

            phone = Phone.objects.create(
                product_type=product_data["product_type"],
                brand=product_data["brand"],
                model=product_data["model"],
                price=Decimal(str(product_data["price"])),
                purchase_price=Decimal(str(product_data["purchase_price"])),
                storage=product_data.get("storage"),
                ram=product_data.get("ram"),
                color=product_data["color"],
                condition=product_data["condition"],
                description=product_data.get("description"),
                IMEI=product_data.get("IMEI"),
                battery_percentage=product_data.get("battery_percentage"),
                battery_cycle=product_data.get("battery_cycle"),
                screen_size=product_data.get("screen_size"),
                supplier=supplier,
            )

            inv_item = InventoryItem.objects.create(
                phone=phone,
                stock_quantity=product_data["stock"],
                reorder_level=10,
                location="Main Warehouse",
                supplier=supplier,
            )

            StockHistory.objects.create(
                inventory_item=inv_item,
                adjustment_type="ADD",
                quantity=product_data["stock"],
                reason="INITIAL",
                notes="Initial stock from seed command",
                previous_stock=0,
                new_stock=product_data["stock"],
            )

            self.stdout.write(f"  [{i+1}/20] Created: {phone} — Stock: {product_data['stock']}")

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded 20 products."))
