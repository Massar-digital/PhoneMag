"""
Database Sync Manager
Handles synchronization between local SQLite and cloud PostgreSQL databases
"""
import logging
import threading
import time
from django.conf import settings
from django.db import connections
from django.core.management import call_command
import requests

logger = logging.getLogger(__name__)


class DatabaseSyncManager:
    """
    Manages synchronization between local and cloud databases
    """
    
    def __init__(self):
        self.is_online = False
        self.sync_queue = []
        self.sync_lock = threading.Lock()
        self.check_interval = 60  # Check connectivity every 60 seconds
        
    def check_internet_connection(self):
        """Check if internet connection is available"""
        # If cloud database is available, we have internet
        # This is more reliable than trying to reach external websites
        return self.is_cloud_db_available()
    
    def is_cloud_db_available(self):
        """Check if cloud database is configured and reachable"""
        # Check if cloud database is configured in DATABASES
        if 'cloud' not in settings.DATABASES:
            return False
        
        try:
            # Try to connect to cloud database
            connection = connections['cloud']
            connection.ensure_connection()
            connection.close()
            return True
        except Exception as e:
            # Log the error for debugging
            print(f"Cloud DB connection failed: {e}")
            return False
    
    def add_to_sync_queue(self, operation_type, model_name, data, operation_id=None):
        """
        Add operation to sync queue
        
        Args:
            operation_type: 'create', 'update', 'delete'
            model_name: Name of the model (e.g., 'Phone', 'Sale')
            data: Dictionary of model data
            operation_id: Primary key of the object
        """
        with self.sync_lock:
            self.sync_queue.append({
                'type': operation_type,
                'model': model_name,
                'data': data,
                'id': operation_id,
                'timestamp': time.time()
            })
            logger.info(f"Added to sync queue: {operation_type} {model_name} (Queue size: {len(self.sync_queue)})")
    
    def sync_to_cloud(self):
        """Synchronize pending operations to cloud database"""
        if not self.is_cloud_db_available():
            logger.warning("Cloud database not available. Skipping sync.")
            return False
        
        with self.sync_lock:
            if not self.sync_queue:
                logger.info("Sync queue is empty. Nothing to sync.")
                return True
            
            logger.info(f"Starting sync of {len(self.sync_queue)} operations...")
            
            synced_count = 0
            failed_operations = []
            
            for operation in self.sync_queue[:]:  # Create a copy to iterate
                try:
                    self._sync_operation(operation)
                    self.sync_queue.remove(operation)
                    synced_count += 1
                except Exception as e:
                    logger.error(f"Failed to sync operation: {operation}. Error: {str(e)}")
                    failed_operations.append(operation)
            
            logger.info(f"Sync completed: {synced_count} synced, {len(failed_operations)} failed")
            return len(failed_operations) == 0
    
    def _sync_operation(self, operation):
        """Execute a single sync operation on cloud database"""
        from django.apps import apps
        
        model_class = apps.get_model('phones' if operation['model'] == 'Phone' else 
                                     'sales' if operation['model'] == 'Sale' else 
                                     'inventory', operation['model'])
        
        # Use cloud database connection
        using_db = 'cloud'
        
        if operation['type'] == 'create':
            model_class.objects.using(using_db).create(**operation['data'])
        elif operation['type'] == 'update':
            model_class.objects.using(using_db).filter(id=operation['id']).update(**operation['data'])
        elif operation['type'] == 'delete':
            model_class.objects.using(using_db).filter(id=operation['id']).delete()
    
    def start_auto_sync(self):
        """Start automatic sync thread"""
        def sync_loop():
            while True:
                time.sleep(self.check_interval)
                
                # Check internet connection
                self.is_online = self.check_internet_connection()
                
                if self.is_online:
                    logger.info("Internet connection detected. Starting sync...")
                    self.sync_to_cloud()
                else:
                    logger.debug("No internet connection. Sync postponed.")
        
        sync_thread = threading.Thread(target=sync_loop, daemon=True)
        sync_thread.start()
        logger.info("Auto-sync thread started")
    
    def get_sync_status(self):
        """Get current sync status"""
        cloud_available = self.is_cloud_db_available()
        return {
            'online': cloud_available,  # If cloud DB is available, we're online
            'queue_size': len(self.sync_queue),
            'cloud_available': cloud_available
        }


# Global sync manager instance
sync_manager = DatabaseSyncManager()
