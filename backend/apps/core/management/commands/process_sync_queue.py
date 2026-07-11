"""
Management command to process sync queue
Run: python manage.py process_sync_queue
"""
from django.core.management.base import BaseCommand
from apps.core.cloud_sync import CloudSyncManager


class Command(BaseCommand):
    help = 'Process pending items in sync queue'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--max-items',
            type=int,
            default=100,
            help='Maximum number of items to process'
        )
    
    def handle(self, *args, **options):
        max_items = options['max_items']
        
        self.stdout.write('Processing sync queue...')
        
        processed = CloudSyncManager.process_queue(max_items)
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully processed {processed} items')
        )
