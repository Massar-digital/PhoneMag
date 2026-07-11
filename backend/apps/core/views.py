"""
API Views for Database Sync Management
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.core.sync_manager import sync_manager
from drf_spectacular.utils import extend_schema


@extend_schema(
    summary="Get sync status",
    description="Get current database synchronization status including queue size and connectivity",
    tags=['System'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sync_status(request):
    """Get current sync status"""
    status_data = sync_manager.get_sync_status()
    return Response({
        'online': status_data['online'],
        'cloud_available': status_data['cloud_available'],
        'pending_operations': status_data['queue_size'],
        'message': f"{'🟢 Online' if status_data['online'] else '🔴 Offline'} - {status_data['queue_size']} operations in queue"
    })


@extend_schema(
    summary="Trigger manual sync",
    description="Manually trigger synchronization to cloud database",
    tags=['System'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_sync(request):
    """Manually trigger cloud sync"""
    if not sync_manager.check_internet_connection():
        return Response({
            'success': False,
            'message': 'No internet connection available'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    success = sync_manager.sync_to_cloud()
    
    if success:
        return Response({
            'success': True,
            'message': 'Database synchronized successfully',
            'pending_operations': len(sync_manager.sync_queue)
        })
    else:
        return Response({
            'success': False,
            'message': 'Some operations failed to sync',
            'pending_operations': len(sync_manager.sync_queue)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
