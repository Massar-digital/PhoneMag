from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    PINPasswordResetSerializer,
    PasswordResetConfirmSerializer,
    UserManagementSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserPreferencesSerializer,
    ProfileUpdateSerializer
)
from .models import PasswordResetToken, UserRole, UserPreferences
from .permissions import CanManageUsers
from .throttles import (
    LoginThrottle,
    RegisterThrottle,
    PasswordResetThrottle,
    PasswordResetConfirmThrottle,
    PasswordChangeThrottle,
    TokenRefreshThrottle,
    SensitiveActionThrottle,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def setup_status(request):
    """Check if the system has been initialized with at least one user."""
    user_count = User.objects.count()
    return Response({'initialized': user_count > 0})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def create_initial_admin(request):
    """Create the very first administrator account and initial shop."""
    if User.objects.count() > 0:
        return Response(
            {'error': 'System already initialized.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    username = request.data.get('username')
    email = request.data.get('email', '')
    password = request.data.get('password')
    full_name = request.data.get('full_name', 'Admin')
    
    # Shop information
    shop_name = request.data.get('shop_name')
    shop_phone = request.data.get('shop_phone')
    shop_address = request.data.get('shop_address')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not shop_name or not shop_phone or not shop_address:
        return Response(
            {'error': 'Shop name, phone and address are required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        # Apply name
        if ' ' in full_name:
            user.first_name, user.last_name = full_name.split(' ', 1)
        else:
            user.first_name = full_name
        
        user.save()

        # In your system, you might have a OneToOne profile or Role
        # Ensure the role is set correctly if you use a Custom User or Profile
        from .models import UserRole
        # Ensure the user has the Admin role (use the constant UserRole.ADMIN)
        user_role, created = UserRole.objects.get_or_create(
            user=user, 
            defaults={'role': UserRole.ADMIN}
        )
        
        # Patch: If the role was already created as 'ADMIN' (case mismatch), fix it
        if not created and user_role.role == 'ADMIN':
            user_role.role = UserRole.ADMIN
            user_role.save()
        
        # Create the initial shop
        from apps.shop.models import Shop
        Shop.objects.create(
            name=shop_name,
            phone=shop_phone,
            address_line_1=shop_address,
            email=email or 'contact@boutique.com',
            city='Non spécifié',
            country='Algeria'
        )

        return Response({'success': 'Administrator account and shop created successfully.'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    summary="Obtain JWT token pair",
    description="Authenticate user and return access and refresh JWT tokens.",
    tags=['Authentication'],
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'username': {'type': 'string', 'description': 'Username or email'},
                'password': {'type': 'string', 'description': 'User password'}
            },
            'required': ['username', 'password']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'access': {'type': 'string', 'description': 'JWT access token'},
                'refresh': {'type': 'string', 'description': 'JWT refresh token'},
                'user': {'$ref': '#/components/schemas/User'}
            }
        }
    },
    examples=[
        OpenApiExample(
            'Login',
            value={
                'username': 'john.doe',
                'password': 'securepassword123'
            },
            request_only=True,
        ),
        OpenApiExample(
            'Login response',
            value={
                'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                'user': {
                    'id': 1,
                    'username': 'john.doe',
                    'email': 'john@example.com',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'role': 'SALESPERSON'
                }
            },
            response_only=True,
        ),
    ]
)
class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that uses our custom serializer and sets cookies"""
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            
            if access_token:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                    value=access_token,
                    expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
                )
            
            if refresh_token:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                    value=refresh_token,
                    expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
                )
            
            # Optionally remove tokens from response body if you want strictly cookie-based
            # But usually it's fine to keep them for now until frontend is updated
        return response


@extend_schema(
    summary="Refresh JWT token",
    description="Refresh an expired access token using a valid refresh token.",
    tags=['Authentication'],
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'refresh': {'type': 'string', 'description': 'JWT refresh token'}
            },
            'required': ['refresh']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'access': {'type': 'string', 'description': 'New JWT access token'}
            }
        }
    },
    examples=[
        OpenApiExample(
            'Refresh token',
            value={
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
            },
            request_only=True,
        ),
    ]
)
class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view with rate limiting and cookie support"""
    throttle_classes = [TokenRefreshThrottle]

    def post(self, request, *args, **kwargs):
        # If refresh token is missing in body, try to get it from cookie
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        refresh_token = data.get('refresh') or request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])

        if not refresh_token:
            return Response(
                {'detail': 'No active session found.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if refresh_token:
            data['refresh'] = refresh_token
            
        serializer = self.get_serializer(data=data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        
        if response.status_code == 200:
            access_token = response.data.get('access')
            if access_token:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                    value=access_token,
                    expires=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
                )
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout by clearing tokens from cookies"""
    response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
    response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
    response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
    return response


@extend_schema(
    summary="Get or update current user",
    description="Get or update currently authenticated user information",
    tags=['Authentication'],
    responses={200: UserSerializer}
)
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get or update current user information"""
    if request.method == 'GET':
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        # Get a fresh user object from the database to ensure we're updating the real one
        user_obj = User.objects.get(id=request.user.id)
        serializer = ProfileUpdateSerializer(user_obj, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            user = serializer.save()
            # Verify update was persisted
            user.refresh_from_db()
            # Return full user data with context for profile picture URL
            user_serializer = UserSerializer(user, context={'request': request})
            return Response(user_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Upload profile picture",
    description="Upload or update profile picture for current user",
    tags=['Authentication'],
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'profile_picture': {
                    'type': 'string',
                    'format': 'binary'
                }
            }
        }
    },
    responses={200: UserSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Upload or update profile picture for current user"""
    if 'profile_picture' not in request.FILES:
        return Response(
            {'error': 'No profile picture provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from .models import UserProfile
    
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Update profile picture
    profile.profile_picture = request.FILES['profile_picture']
    profile.save()
    
    # Return updated user data
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    summary="Change user password",
    description="Change password for the currently authenticated user.",
    tags=['Authentication'],
    request=ChangePasswordSerializer,
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PasswordChangeThrottle])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user
    old_password = serializer.validated_data['old_password']
    new_password = serializer.validated_data['new_password']

    # Verify old password is correct
    if not user.check_password(old_password):
        return Response(
            {'old_password': 'Old password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    return Response(
        {'message': 'Password changed successfully.'},
        status=status.HTTP_200_OK
    )



@extend_schema_view(
    list=extend_schema(
        summary="List users",
        description="Retrieve a paginated list of all users (excluding current user). Requires user management permissions.",
        tags=['Users'],
        examples=[
            OpenApiExample(
                'List users',
                value={'count': 10, 'next': 'http://api.example.com/api/users/?page=2', 'previous': None, 'results': []},
                response_only=True,
            ),
        ]
    ),
    retrieve=extend_schema(
        summary="Get user details",
        description="Retrieve detailed information about a specific user. Requires user management permissions.",
        tags=['Users']
    ),
    create=extend_schema(
        summary="Create user",
        description="Create a new user account. Requires user management permissions.",
        tags=['Users'],
        examples=[
            OpenApiExample(
                'Create user',
                value={
                    'username': 'jane.smith',
                    'email': 'jane@example.com',
                    'first_name': 'Jane',
                    'last_name': 'Smith',
                    'password': 'securepassword123',
                    'role': 'SALESPERSON'
                },
                request_only=True,
            ),
        ]
    ),
    update=extend_schema(
        summary="Update user",
        description="Update all fields of an existing user. Requires user management permissions.",
        tags=['Users']
    ),
    partial_update=extend_schema(
        summary="Partially update user",
        description="Update specific fields of an existing user. Requires user management permissions.",
        tags=['Users']
    ),
    destroy=extend_schema(
        summary="Delete user",
        description="Remove a user account. Requires user management permissions. WARNING: This action cannot be undone.",
        tags=['Users']
    ),
    me=extend_schema(
        summary="Get current user",
        description="Retrieve information about the currently authenticated user.",
        tags=['Users'],
        examples=[
            OpenApiExample(
                'Current user',
                value={
                    'id': 1,
                    'username': 'john.doe',
                    'email': 'john@example.com',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'role': 'SALESPERSON',
                    'is_active': True
                },
                response_only=True,
            ),
        ]
    ),
    change_password=extend_schema(
        summary="Change password",
        description="Change the current user's password. Requires old password verification.",
        tags=['Users'],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'old_password': {'type': 'string', 'description': 'Current password'},
                    'new_password': {'type': 'string', 'description': 'New password (min 8 characters)'}
                },
                'required': ['old_password', 'new_password']
            }
        },
        examples=[
            OpenApiExample(
                'Change password',
                value={
                    'old_password': 'oldpassword123',
                    'new_password': 'newsecurepassword123'
                },
                request_only=True,
            ),
        ]
    ),
)
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User management"""
    queryset = User.objects.all().select_related('user_role')
    permission_classes = [CanManageUsers]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'list':
            return UserManagementSerializer
        elif self.action == 'retrieve':
            return UserManagementSerializer
        else:
            return UserSerializer
    
    def get_queryset(self):
        """Filter queryset based on action"""
        queryset = User.objects.all().select_related('user_role')
        
        # Exclude current user from list to prevent self-deactivation
        if self.action == 'list':
            return queryset.exclude(id=self.request.user.id)
        
        return queryset


@extend_schema(
    summary="Register new user",
    description="Create a new user account and return authentication tokens.",
    tags=['Authentication'],
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'username': {'type': 'string', 'description': 'Unique username'},
                'email': {'type': 'string', 'format': 'email', 'description': 'User email address'},
                'first_name': {'type': 'string', 'description': 'User first name'},
                'last_name': {'type': 'string', 'description': 'User last name'},
                'password': {'type': 'string', 'description': 'Password (min 8 characters)'}
            },
            'required': ['username', 'email', 'first_name', 'last_name', 'password']
        }
    },
    responses={
        201: {
            'type': 'object',
            'properties': {
                'message': {'type': 'string'},
                'user': {'$ref': '#/components/schemas/User'},
                'access_token': {'type': 'string'},
                'refresh_token': {'type': 'string'}
            }
        }
    },
    examples=[
        OpenApiExample(
            'Register user',
            value={
                'username': 'john.doe',
                'email': 'john@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'password': 'securepassword123'
            },
            request_only=True,
        ),
    ]
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Create a default UserRole for the new user (Salesperson)
        UserRole.objects.create(user=user, role=UserRole.SALESPERSON)
        
        # Generate tokens for new user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Request password reset",
    description="Request a password reset by providing username and developer PIN.",
    tags=['Authentication'],
    request=PINPasswordResetSerializer,
    responses={
        200: {
            'type': 'object',
            'properties': {
                'message': {'type': 'string'},
                'token': {'type': 'string'}
            }
        },
        400: {'type': 'object', 'properties': {'pin': {'type': 'string'}}},
        404: {'type': 'object', 'properties': {'username': {'type': 'string'}}}
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request(request):
    """Request password reset using developer PIN override"""
    print(f"DEBUG: password_reset_request hit with data: {request.data}")
    
    if 'email' in request.data:
        print("WARNING: 'email' found in request data, but 'username' and 'pin' are expected.")
        
    serializer = PINPasswordResetSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    username = serializer.validated_data['username']
    pin = serializer.validated_data['pin']
    
    # HARDCODED DEVELOPER PIN OVERRIDE
    if pin != "131106":
        return Response(
            {'pin': 'Code PIN incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'username': 'Utilisateur non trouvé.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create reset token
    reset_token = PasswordResetToken.create_for_user(user)
    
    return Response(
        {
            'message': 'PIN validé avec succès.',
            'token': reset_token.token
        },
        status=status.HTTP_200_OK
    )


@extend_schema(
    summary="Confirm password reset",
    description="Reset user password using the token received via PIN verification.",
    tags=['Authentication'],
    request=PasswordResetConfirmSerializer,
    responses={
        200: {
            'type': 'object',
            'properties': {
                'message': {'type': 'string'}
            }
        }
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmThrottle])
def password_reset_confirm(request):
    """Confirm password reset with token and new password"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    reset_token = serializer.validated_data['token']
    new_password = serializer.validated_data['password']
    
    # Update user password
    user = reset_token.user
    user.set_password(new_password)
    user.save()
    
    # Mark token as used
    reset_token.mark_as_used()
    
    return Response(
        {'message': 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'},
        status=status.HTTP_200_OK
    )


@extend_schema_view(
    list=extend_schema(
        summary="Get user preferences",
        description="Retrieve the current user's preferences and settings.",
        tags=['Users'],
        examples=[
            OpenApiExample(
                'User preferences',
                value={
                    'theme': 'light',
                    'language': 'en',
                    'notifications_enabled': True,
                    'dashboard_layout': 'grid'
                },
                response_only=True,
            ),
        ]
    ),
    create=extend_schema(
        summary="Create user preferences",
        description="Create preferences for the current user.",
        tags=['Users']
    ),
    update=extend_schema(
        summary="Update user preferences",
        description="Update all preferences for the current user.",
        tags=['Users']
    ),
    partial_update=extend_schema(
        summary="Partially update user preferences",
        description="Update specific preferences for the current user.",
        tags=['Users']
    ),
)
class UserPreferencesViewSet(viewsets.ModelViewSet):
    """ViewSet for User Preferences management"""
    serializer_class = UserPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return preferences for the current user only"""
        return UserPreferences.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create preferences for the current user"""
        obj, created = UserPreferences.objects.get_or_create(user=self.request.user)
        return obj
    
    def list(self, request):
        """Get current user's preferences"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request):
        """Create preferences for the current user"""
        if UserPreferences.objects.filter(user=request.user).exists():
            return Response(
                {'error': 'Preferences already exist for this user.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update current user's preferences"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
