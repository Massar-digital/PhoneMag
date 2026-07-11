"""
Database Sync Middleware
Automatically processes sync queue for cloud sync
"""
from django.utils.deprecation import MiddlewareMixin
from apps.core.cloud_sync import CloudSyncManager
import logging

logger = logging.getLogger(__name__)


class SyncMiddleware(MiddlewareMixin):
    """
    Middleware to process sync queue after successful operations
    """
    
    def process_request(self, request):
        """
        Opportunistically process the sync queue on state-changing requests
        to minimize overhead on read-only operations.
        """
        # Only process queue on write operations or occasionally
        if request.method not in ['GET', 'HEAD', 'OPTIONS']:
            try:
                if CloudSyncManager.is_cloud_available():
                    CloudSyncManager.process_queue(max_items=5)
            except Exception as e:
                logger.debug(f"Background sync queue processing skipped: {e}")
                pass
        return None

    def process_response(self, request, response):
        """
        After successful mutations, process a larger batch from the sync queue
        Only sync on successful responses (200-299 status codes)
        """
        # Process sync queue after successful write operations
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and 200 <= response.status_code < 300:
            try:
                # Check if cloud is available before processing
                if CloudSyncManager.is_cloud_available():
                    # Process a larger batch from queue
                    CloudSyncManager.process_queue(max_items=20)
            except Exception as e:
                # Never break the main request/response path
                logger.debug(f"Sync queue processing skipped: {e}")
                pass
        
        return response
