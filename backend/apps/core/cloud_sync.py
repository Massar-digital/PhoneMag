"""
Cloud Sync Manager - Syncs local SQLite changes to cloud PostgreSQL database
"""
from django.db import connections, transaction
from django.apps import apps
from django.core.serializers import serialize, deserialize
from django.utils import timezone
import logging
import json

logger = logging.getLogger(__name__)


class CloudSyncManager:
    """Manages syncing operations between local SQLite and cloud PostgreSQL"""
    
    _is_available_cache = None
    _last_check_time = None
    CACHE_TTL = 300  # Cache availability for 300 seconds (5 minutes)
    
    # Models to sync (add more as needed)
    # IMPORTANT: must match `instance._meta.label_lower` (app_label.model_name)
    SYNC_MODELS = {
        'phones.phone',
        'sales.sale',
        'sales.saleitem',
        'sales.customer',
        'inventory.inventoryitem',
        'auth.user',
        'authentication.userrole',
        'shop.shop',
    }
    
    @staticmethod
    def get_cloud_connection():
        """Get cloud database connection if available"""
        if 'cloud' in connections.databases:
            return connections['cloud']
        return None
    
    @staticmethod
    def is_cloud_available():
        """Check if cloud database is configured and accessible with caching"""
        now = timezone.now()
        
        # Return cached result if valid
        if (CloudSyncManager._last_check_time and 
            (now - CloudSyncManager._last_check_time).total_seconds() < CloudSyncManager.CACHE_TTL):
            return CloudSyncManager._is_available_cache

        try:
            cloud_conn = CloudSyncManager.get_cloud_connection()
            if cloud_conn:
                # Use a very short timeout for the check
                with cloud_conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                
                CloudSyncManager._is_available_cache = True
                CloudSyncManager._last_check_time = now
                return True
        except Exception as e:
            logger.debug(f"Cloud database not available: {e}")
            
        CloudSyncManager._is_available_cache = False
        CloudSyncManager._last_check_time = now
        return False
    
    @staticmethod
    def serialize_instance(instance):
        """Serialize a model instance to JSON"""
        data = serialize('json', [instance])
        return json.loads(data)[0]
    
    @staticmethod
    def sync_to_cloud(instance, operation='update'):
        """
        Sync a single instance to cloud database
        
        Args:
            instance: Django model instance to sync
            operation: 'create', 'update', or 'delete'
        """
        if not CloudSyncManager.is_cloud_available():
            # Add to queue for later
            CloudSyncManager.add_to_queue(instance, operation)
            return False
        
        model_label = instance._meta.label_lower
        
        # Skip if not in sync models
        if model_label not in CloudSyncManager.SYNC_MODELS:
            return True
        
        try:
            model_class = instance.__class__
            
            with transaction.atomic(using='cloud'):
                if operation == 'delete':
                    # Delete from cloud
                    model_class.objects.using('cloud').filter(pk=instance.pk).delete()
                    logger.info(f"Deleted {model_label} #{instance.pk} from cloud")
                    
                elif operation in ['create', 'update']:
                    # Handle ForeignKey fields - ensure related objects exist in cloud
                    fk_data = {}
                    regular_data = {}
                    
                    for field in instance._meta.fields:
                        if field.name == 'id':
                            continue
                            
                        if field.is_relation and field.many_to_one:
                            # ForeignKey field
                            related_obj = getattr(instance, field.name)
                            if related_obj:
                                # Ensure related object exists in cloud if it's a syncable model
                                # This helps prevent foreign key constraint violations
                                related_label = related_obj._meta.label_lower
                                if related_label in CloudSyncManager.SYNC_MODELS:
                                    # Check if it exists in cloud, if not, sync it
                                    related_model = related_obj.__class__
                                    if not related_model.objects.using('cloud').filter(pk=related_obj.pk).exists():
                                        logger.info(f"Syncing dependent {related_label} #{related_obj.pk} before {model_label}")
                                        CloudSyncManager.sync_to_cloud(related_obj, 'update')
                                
                                # Store the ID, not the object
                                fk_data[field.name + '_id'] = related_obj.pk
                        elif not field.auto_created:
                            # Regular field
                            regular_data[field.name] = getattr(instance, field.name)
                    
                    # Combine all data
                    all_data = {**regular_data, **fk_data}
                    
                    # Get or create in cloud
                    cloud_obj, created = model_class.objects.using('cloud').update_or_create(
                        pk=instance.pk,
                        defaults=all_data
                    )
                    
                    action = "Created" if created else "Updated"
                    logger.info(f"{action} {model_label} #{instance.pk} in cloud")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync {model_label} #{instance.pk}: {e}", exc_info=True)
            CloudSyncManager.add_to_queue(instance, operation, str(e))
            return False
    
    @staticmethod
    def _get_model_data(instance):
        """Extract model field data for syncing"""
        data = {}
        for field in instance._meta.fields:
            if field.name != 'id' and not field.auto_created:
                data[field.name] = getattr(instance, field.name)
        return data
    
    @staticmethod
    def add_to_queue(instance, operation, error_message=''):
        """Add failed sync operation to queue"""
        from apps.core.models import SyncQueue
        from django.contrib.contenttypes.models import ContentType
        
        try:
            content_type = ContentType.objects.get_for_model(instance)
            serialized_data = CloudSyncManager.serialize_instance(instance)
            
            # Check if already in queue
            existing = SyncQueue.objects.filter(
                content_type=content_type,
                object_id=instance.pk,
                status__in=['pending', 'processing', 'failed']
            ).first()
            
            if existing:
                # Update existing queue item
                existing.operation = operation
                existing.data = serialized_data
                existing.attempts += 1
                existing.last_attempt = timezone.now()
                existing.error_message = error_message
                existing.status = 'failed' if error_message else 'pending'
                existing.save()
            else:
                # Create new queue item
                SyncQueue.objects.create(
                    content_type=content_type,
                    object_id=instance.pk,
                    operation=operation,
                    model_name=instance._meta.label_lower,
                    data=serialized_data,
                    status='failed' if error_message else 'pending',
                    error_message=error_message,
                    attempts=1,
                    last_attempt=timezone.now()
                )
            
            logger.info(f"Added {instance._meta.model_name} #{instance.pk} to sync queue")
            
        except Exception as e:
            logger.error(f"Failed to add to sync queue: {e}")
    
    @staticmethod
    def process_queue(max_items=100):
        """Process pending items in sync queue"""
        from apps.core.models import SyncQueue
        
        if not CloudSyncManager.is_cloud_available():
            logger.debug("Cloud database not available, skipping queue processing")
            return 0
        
        # Get pending items
        pending_items = SyncQueue.objects.filter(
            status__in=['pending', 'failed']
        ).order_by('created_at')[:max_items]
        
        processed = 0
        
        for queue_item in pending_items:
            try:
                # Mark as processing
                queue_item.status = 'processing'
                queue_item.save()
                
                # Get model class
                try:
                    app_label, model_name = queue_item.model_name.split('.')
                    model_class = apps.get_model(app_label, model_name)
                except (ValueError, LookupError) as e:
                    queue_item.status = 'failed'
                    queue_item.error_message = f"Invalid model: {e}"
                    queue_item.save()
                    continue

                # Skip models that are not configured for sync
                if model_class._meta.label_lower not in CloudSyncManager.SYNC_MODELS:
                    queue_item.status = 'completed'
                    queue_item.error_message = 'Not in SYNC_MODELS'
                    queue_item.last_attempt = timezone.now()
                    queue_item.save()
                    processed += 1
                    continue

                # Handle deletes even if the object no longer exists locally
                if queue_item.operation == 'delete':
                    try:
                        with transaction.atomic(using='cloud'):
                            model_class.objects.using('cloud').filter(pk=queue_item.object_id).delete()
                        queue_item.status = 'completed'
                        queue_item.error_message = ''
                        queue_item.last_attempt = timezone.now()
                        queue_item.save()
                        processed += 1
                        logger.info(f"Synced delete for {queue_item.model_name} #{queue_item.object_id}")
                    except Exception as e:
                        logger.error(f"Failed to delete {queue_item.model_name} #{queue_item.object_id}: {e}")
                        queue_item.status = 'failed'
                        queue_item.attempts += 1
                        queue_item.error_message = str(e)
                        queue_item.last_attempt = timezone.now()
                        queue_item.save()
                    continue
                
                # Get instance from local database
                try:
                    instance = model_class.objects.get(pk=queue_item.object_id)
                except model_class.DoesNotExist:
                    # Object deleted locally, mark as completed
                    queue_item.status = 'completed'
                    queue_item.error_message = 'Object no longer exists locally'
                    queue_item.save()
                    processed += 1
                    logger.info(f"Object {queue_item.model_name} #{queue_item.object_id} no longer exists")
                    continue
                
                # Attempt sync
                success = CloudSyncManager.sync_to_cloud(instance, queue_item.operation)
                
                if success:
                    queue_item.status = 'completed'
                    queue_item.error_message = ''
                    logger.info(f"Synced {queue_item.model_name} #{queue_item.object_id} successfully")
                else:
                    queue_item.status = 'failed'
                    queue_item.attempts += 1
                
                queue_item.last_attempt = timezone.now()
                queue_item.save()
                processed += 1
                
            except Exception as e:
                logger.error(f"Failed to process queue item {queue_item.id}: {e}", exc_info=True)
                try:
                    queue_item.status = 'failed'
                    queue_item.attempts += 1
                    queue_item.error_message = str(e)[:500]  # Limit error message length
                    queue_item.last_attempt = timezone.now()
                    queue_item.save()
                except Exception:
                    # If we can't even update the queue item, log and continue
                    logger.error(f"Failed to update queue item {queue_item.id}")
        
        if processed > 0:
            logger.info(f"Processed {processed} queue items")
        return processed
