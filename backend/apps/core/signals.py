"""
Signal handlers for automatic cloud sync
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.core.cloud_sync import CloudSyncManager
from apps.phones.models import Phone
from apps.sales.models import Sale, SaleItem
from apps.sales.models_customer import Customer
from apps.inventory.models import InventoryItem
from apps.authentication.models import User, UserRole
from apps.shop.models import Shop
import logging

logger = logging.getLogger(__name__)


def should_sync(instance, **kwargs):
    """Check if instance should be synced to cloud"""
    # Don't sync if this is a raw save (e.g., from loaddata)
    if kwargs.get('raw', False):
        return False
    
    # Don't sync if already from cloud database (prevent recursion)
    if hasattr(instance, '_state') and instance._state.db == 'cloud':
        return False
    
    return True


# Phone signals
@receiver(post_save, sender=Phone)
def sync_phone_to_cloud(sender, instance, created, **kwargs):
    """Sync phone changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=Phone)
def sync_phone_delete_to_cloud(sender, instance, **kwargs):
    """Sync phone deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# Sale signals
@receiver(post_save, sender=Sale)
def sync_sale_to_cloud(sender, instance, created, **kwargs):
    """Sync sale changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=Sale)
def sync_sale_delete_to_cloud(sender, instance, **kwargs):
    """Sync sale deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# SaleItem signals
@receiver(post_save, sender=SaleItem)
def sync_saleitem_to_cloud(sender, instance, created, **kwargs):
    """Sync sale item changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=SaleItem)
def sync_saleitem_delete_to_cloud(sender, instance, **kwargs):
    """Sync sale item deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# Inventory signals
@receiver(post_save, sender=InventoryItem)
def sync_inventory_to_cloud(sender, instance, created, **kwargs):
    """Sync inventory changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=InventoryItem)
def sync_inventory_delete_to_cloud(sender, instance, **kwargs):
    """Sync inventory deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# Customer signals
@receiver(post_save, sender=Customer)
def sync_customer_to_cloud(sender, instance, created, **kwargs):
    """Sync customer changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=Customer)
def sync_customer_delete_to_cloud(sender, instance, **kwargs):
    """Sync customer deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# UserRole signals
@receiver(post_save, sender=UserRole)
def sync_userrole_to_cloud(sender, instance, created, **kwargs):
    """Sync user role changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=UserRole)
def sync_userrole_delete_to_cloud(sender, instance, **kwargs):
    """Sync user role deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')


# Shop signals
@receiver(post_save, sender=Shop)
def sync_shop_to_cloud(sender, instance, created, **kwargs):
    """Sync shop changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


# User signals
@receiver(post_save, sender=User)
def sync_user_to_cloud(sender, instance, created, **kwargs):
    """Sync user changes to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    operation = 'create' if created else 'update'
    CloudSyncManager.sync_to_cloud(instance, operation)


@receiver(post_delete, sender=User)
def sync_user_delete_to_cloud(sender, instance, **kwargs):
    """Sync user deletion to cloud database"""
    if not should_sync(instance, **kwargs):
        return
    CloudSyncManager.sync_to_cloud(instance, 'delete')
