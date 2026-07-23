from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import LicenseCode
from .serializers import LicenseActivateSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def activate_license(request):
    serializer = LicenseActivateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    try:
        lic = LicenseCode.objects.get(code=data['code'])
    except LicenseCode.DoesNotExist:
        return Response({'error': 'License code not found'}, status=status.HTTP_404_NOT_FOUND)

    if lic.is_activated:
        if lic.mac_address == data.get('mac_address', ''):
            return Response({'valid': True, 'message': 'Already activated on this device'})
        city = lic.city or 'Unknown'
        country = lic.country or 'Unknown'
        date = lic.activated_at.strftime('%Y-%m-%d %H:%M:%S') if lic.activated_at else 'Unknown'
        return Response({
            'error': f'Already activated in {city}, {country} on {date}',
        }, status=status.HTTP_403_FORBIDDEN)

    lic.is_activated = True
    lic.activated_at = timezone.now()
    lic.mac_address = data.get('mac_address', '')
    lic.ip_address = data.get('ip_address')
    lic.city = data.get('city', '')
    lic.country = data.get('country', '')
    lic.latitude = data.get('latitude')
    lic.longitude = data.get('longitude')
    lic.save(update_fields=[
        'is_activated', 'activated_at', 'mac_address', 'ip_address',
        'city', 'country', 'latitude', 'longitude',
    ])

    return Response({'valid': True, 'message': 'License activated'})
