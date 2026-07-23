from rest_framework import serializers
from .models import LicenseCode


class LicenseActivateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8)
    mac_address = serializers.CharField(max_length=17, required=False, allow_blank=True, default='')
    ip_address = serializers.IPAddressField(required=False, allow_null=True, default=None)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    latitude = serializers.FloatField(required=False, allow_null=True, default=None)
    longitude = serializers.FloatField(required=False, allow_null=True, default=None)
