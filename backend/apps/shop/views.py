from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .models import Shop
from .serializers import ShopSerializer

@extend_schema_view(
    list=extend_schema(
        summary="Get shop settings",
        description="Retrieve the current shop/company settings and configuration.",
        tags=['Shop'],
        examples=[
            OpenApiExample(
                'Shop settings',
                value={
                    'id': 1,
                    'name': 'Phone Magazine Store',
                    'address': '123 Main St, City, State 12345',
                    'phone': '+1234567890',
                    'email': 'contact@phonemagazine.com',
                    'website': 'https://phonemagazine.com',
                    'tax_rate': 8.5,
                    'currency': 'USD',
                    'logo': 'http://api.example.com/media/logos/logo.png'
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create shop settings",
        description="Create initial shop/company settings. Only works if no shop settings exist.",
        tags=['Shop'],
        examples=[
            OpenApiExample(
                'Create shop',
                value={
                    'name': 'Phone Magazine Store',
                    'address': '123 Main St, City, State 12345',
                    'phone': '+1234567890',
                    'email': 'contact@phonemagazine.com',
                    'website': 'https://phonemagazine.com',
                    'tax_rate': 8.5,
                    'currency': 'USD'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update shop settings",
        description="Update all shop/company settings. Creates settings if they don't exist.",
        tags=['Shop']
    ),
    partial_update=extend_schema(
        summary="Partially update shop settings",
        description="Update specific shop/company settings fields.",
        tags=['Shop']
    ),
    upload_logo=extend_schema(
        summary="Upload shop logo",
        description="Upload a new logo image for the shop.",
        tags=['Shop'],
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'logo': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Logo image file'
                    }
                },
                'required': ['logo']
            }
        },
        examples=[
            OpenApiExample(
                'Upload logo',
                value={'logo': '<binary image data>'},
                request_only=True,
            ),
        ]
    ),
    delete_logo=extend_schema(
        summary="Delete shop logo",
        description="Remove the current shop logo.",
        tags=['Shop']
    ),
)
class ShopViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shop/company settings.

    Since we typically want only one shop configuration,
    this ViewSet is designed to work with a single shop instance.
    """

    serializer_class = ShopSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return shop instances (typically only one)"""
        return Shop.objects.all()

    def list(self, request, *args, **kwargs):
        """
        Get shop settings. If no shop exists, return a message and 200 OK.
        """
        try:
            shop = Shop.objects.first()
            if shop:
                serializer = self.get_serializer(shop)
                return Response(serializer.data)
            else:
                return Response(
                    {"message": "No shop settings configured", "id": None},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """
        Create shop settings. Only allow if no shop exists.
        """
        if Shop.objects.exists():
            return Response(
                {"error": "Shop settings already exist. Use PUT to update."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """
        Update shop settings. Create if doesn't exist.
        """
        shop = Shop.objects.first()

        if shop:
            # Update existing shop
            serializer = self.get_serializer(shop, data=request.data, partial=True)
        else:
            # Create new shop if none exists
            serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """
        Partial update shop settings.
        """
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def upload_logo(self, request):
        """
        Upload shop logo separately.
        """
        shop = Shop.objects.first()
        if not shop:
            return Response(
                {"error": "Shop settings not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if 'logo' not in request.FILES:
            return Response(
                {"error": "No logo file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        shop.logo = request.FILES['logo']
        shop.save()

        serializer = self.get_serializer(shop)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def delete_logo(self, request):
        """
        Delete shop logo.
        """
        shop = Shop.objects.first()
        if not shop:
            return Response(
                {"error": "Shop settings not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if shop.logo:
            shop.logo.delete()
            shop.save()

        serializer = self.get_serializer(shop)
        return Response(serializer.data)