"""
Management command to manually trigger database sync
Usage: python manage.py sync_to_cloud
"""
from django.core.management.base import BaseCommand
from apps.core.sync_manager import sync_manager


class Command(BaseCommand):
    help = 'Manually sync local database to cloud database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check-status',
            action='store_true',
            help='Check sync status without syncing',
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force sync even if offline',
        )
    
    def handle(self, *args, **options):
        if options['check_status']:
            from django.conf import settings
            from decouple import config
            
            # Check if cloud sync is even enabled
            cloud_sync_enabled = config('ENABLE_CLOUD_SYNC', default=False, cast=bool)
            
            if not cloud_sync_enabled:
                self.stdout.write(self.style.WARNING(f"\n📊 Sync Status:"))
                self.stdout.write(f"  • Cloud Sync: ❌ Disabled (not configured)")
                self.stdout.write(f"  • Local Database: ✅ Working")
                self.stdout.write(f"\n  ℹ️  Your app is working fine with local SQLite database.")
                self.stdout.write(f"  ℹ️  To enable cloud sync, set ENABLE_CLOUD_SYNC=True in .env")
                self.stdout.write(f"  ℹ️  and configure CLOUD_DATABASE_URL\n")
                return
            
            status = sync_manager.get_sync_status()
            self.stdout.write(self.style.SUCCESS(f"\n📊 Sync Status:"))
            self.stdout.write(f"  • Cloud Sync: ✅ Enabled")
            self.stdout.write(f"  • Cloud DB: {'✅ Connected' if status['cloud_available'] else '❌ Unavailable'}")
            self.stdout.write(f"  • Queue Size: {status['queue_size']} operations pending")
            
            if not status['cloud_available']:
                self.stdout.write(self.style.WARNING(f"\n  ⚠️  Cloud database is not reachable."))
                self.stdout.write(f"  ⚠️  Check your CLOUD_DATABASE_URL in .env file\n")
            else:
                self.stdout.write(self.style.SUCCESS(f"\n  ✅ Everything is working!\n"))
            return
        
        self.stdout.write(self.style.WARNING('Starting database synchronization...'))
        
        if not options['force'] and not sync_manager.check_internet_connection():
            self.stdout.write(self.style.ERROR('❌ No internet connection. Use --force to override.'))
            return
        
        success = sync_manager.sync_to_cloud()
        
        if success:
            self.stdout.write(self.style.SUCCESS('✅ Database synchronized successfully!'))
        else:
            self.stdout.write(self.style.ERROR('⚠️  Some operations failed to sync. Check logs for details.'))
