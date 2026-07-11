# Generated manually on 2026-02-08
# Purpose: Backfill product_data_snapshot for existing SaleItems

from django.db import migrations


def backfill_product_data_snapshots(apps, schema_editor):
    """
    Backfill product_data_snapshot for existing SaleItems that don't have it.
    This allows returns/refunds to work properly for sales created before the snapshot feature was added.
    """
    SaleItem = apps.get_model('sales', 'SaleItem')

    items_updated = 0
    items_skipped = 0

    # Find all SaleItems without snapshots
    sale_items_without_snapshot = SaleItem.objects.filter(product_data_snapshot__isnull=True)

    print(f"\nBackfilling product_data_snapshot for {sale_items_without_snapshot.count()} SaleItems...")

    for item in sale_items_without_snapshot:
        if item.phone:
            # Phone still exists - we can create the snapshot
            try:
                item.product_data_snapshot = {
                    'product_type': item.phone.product_type,
                    'brand': item.phone.brand,
                    'model': item.phone.model,
                    'storage': item.phone.storage,
                    'ram': item.phone.ram,
                    'color': item.phone.color,
                    'condition': item.phone.condition,
                    'price': str(item.phone.price),
                    'purchase_price': str(item.phone.purchase_price) if item.phone.purchase_price else '0',
                    'description': item.phone.description,
                    'IMEI': item.phone.IMEI,
                    'barcode': item.phone.barcode,
                    'battery_percentage': item.phone.battery_percentage,
                    'image_url': item.phone.image_url,
                    'supplier_id': item.phone.supplier.id if item.phone.supplier else None,
                }
                item.save(update_fields=['product_data_snapshot'])
                items_updated += 1
            except Exception as e:
                print(f"  WARNING: Could not backfill snapshot for SaleItem {item.id}: {str(e)}")
                items_skipped += 1
        else:
            # Phone was already deleted - cannot backfill
            # This is OK - the return will simply fail with a clear error message
            items_skipped += 1
            print(f"  INFO: SaleItem {item.id} has no phone (already deleted), cannot backfill snapshot")

    print(f"SUCCESS: Backfilled {items_updated} snapshots")
    if items_skipped > 0:
        print(f"WARNING: Skipped {items_skipped} items (phone already deleted or error occurred)")
    print()


def reverse_backfill(apps, schema_editor):
    """
    Reverse migration - clear the backfilled snapshots.
    Note: We can't distinguish between backfilled and organically created snapshots,
    so this just logs a message.
    """
    print("Note: Cannot reverse backfill migration - snapshots will remain.")
    print("This is safe and does not affect system functionality.")


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0020_add_product_data_snapshot'),
    ]

    operations = [
        migrations.RunPython(backfill_product_data_snapshots, reverse_code=reverse_backfill),
    ]
