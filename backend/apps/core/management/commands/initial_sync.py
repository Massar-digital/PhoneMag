"""
Management command to perform initial full database sync
Usage: python manage.py initial_sync
"""
from django.core.management.base import BaseCommand
from django.db import connections
from apps.phones.models import Phone
from apps.sales.models import Sale, SaleItem, Customer
from apps.inventory.models import InventoryItem, StockHistory
from django.contrib.auth.models import User
from apps.authentication.models import UserRole, UserProfile, UserPreferences, PasswordResetToken


class Command(BaseCommand):
    help = 'Perform initial full database sync from local to cloud'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be synced without actually syncing',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Check cloud database connection
        try:
            conn = connections['cloud']
            conn.ensure_connection()
            conn.close()
            self.stdout.write(self.style.SUCCESS('✅ Cloud database connection OK'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Cannot connect to cloud database: {e}'))
            return
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No data will be synced\n'))
        else:
            self.stdout.write(self.style.WARNING('\n🚀 Starting full database sync...\n'))
        
        # Models to sync in order (respecting foreign key dependencies)
        models_to_sync = [
            ('Users', User),
            ('User Roles', UserRole),
            ('User Profiles', UserProfile),
            ('User Preferences', UserPreferences),
            ('Password Reset Tokens', PasswordResetToken),
            ('Phones', Phone),
            ('Inventory Items', InventoryItem),
            ('Stock History', StockHistory),
            ('Customers', Customer),
            ('Sales', Sale),
            ('Sale Items', SaleItem),
        ]
        
        total_synced = 0
        
        for model_name, model_class in models_to_sync:
            local_count = model_class.objects.using('default').count()
            cloud_count = model_class.objects.using('cloud').count()
            
            self.stdout.write(f'\n📦 {model_name}:')
            self.stdout.write(f'  Local: {local_count} | Cloud: {cloud_count}')
            
            if local_count == 0:
                self.stdout.write(self.style.WARNING('  ⏭️  Skipping (no local data)'))
                continue
            
            if not dry_run:
                try:
                    # Get all objects from local database
                    objects = list(model_class.objects.using('default').all())
                    
                    # Clear cloud table first (for clean sync)
                    model_class.objects.using('cloud').all().delete()
                    
                    # Bulk create in cloud database
                    if objects:
                        synced_objects = []
                        for obj in objects:
                            # Create a copy without the pk to let cloud DB auto-generate
                            obj_copy = model_class(**{
                                field.name: getattr(obj, field.name) 
                                for field in model_class._meta.fields 
                                if field.name != 'id'
                            })
                            synced_objects.append(obj_copy)
                        
                        model_class.objects.using('cloud').bulk_create(synced_objects)
                        synced_count = len(synced_objects)
                        total_synced += synced_count
                        
                        self.stdout.write(self.style.SUCCESS(f'  ✅ Synced {synced_count} records'))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ❌ Error: {str(e)}'))
            else:
                self.stdout.write(f'  Would sync {local_count} records')
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Dry run complete! Ready to sync.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Full sync complete! {total_synced} total records synced.'))
