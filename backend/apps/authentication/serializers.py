from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import PasswordResetToken, UserRole, UserPreferences
from apps.core.validators import (
    validate_username, validate_email_format, validate_password_strength,
    validate_phone_number, sanitize_string
)


class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for UserRole"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['role', 'role_display', 'is_admin', 'is_manager', 'is_salesperson']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with input validation"""
    user_role = UserRoleSerializer(read_only=True)
    profile_picture = serializers.SerializerMethodField()
    role = serializers.CharField(source='user_role.role', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_role', 'profile_picture', 'role', 'date_joined']
    
    def get_profile_picture(self, obj):
        """Get profile picture URL"""
        if hasattr(obj, 'profile') and obj.profile.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.profile_picture.url)
            return obj.profile.profile_picture.url
        return None
    
    def validate_username(self, value):
        """Validate username format"""
        return validate_username(value)
    
    def validate_email(self, value):
        """Validate email format"""
        return validate_email_format(value)
    
    def validate_first_name(self, value):
        """Validate first name"""
        if value:
            return sanitize_string(value, max_length=150)
        return value
    
    def validate_last_name(self, value):
        """Validate last name"""
        if value:
            return sanitize_string(value, max_length=150)
        return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration with comprehensive validation"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate_username(self, value):
        """Validate username format and uniqueness"""
        value = validate_username(value)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        value = validate_email_format(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value
    
    def validate_first_name(self, value):
        """Validate first name"""
        if value:
            return sanitize_string(value, max_length=150)
        return value
    
    def validate_last_name(self, value):
        """Validate last name"""
        if value:
            return sanitize_string(value, max_length=150)
        return value
    
    def validate(self, data):
        """Validate that passwords match"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        """Create a new user"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password with validation"""
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        """Validate passwords"""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password': 'Passwords do not match.'
            })
        
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from old password.'
            })
        
        return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that returns user data with tokens"""

    def validate(self, attrs):
        # Try to find user by email if username looks like an email
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and '@' in username:
            try:
                user = User.objects.get(email=username)
                # Replace username with the actual username for authentication
                attrs['username'] = user.username
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        
        # Add user data to the response payload using UserSerializer for consistency
        data['user'] = UserSerializer(self.user, context={'request': self.context.get('request')}).data
        
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add user data to token
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        # Add user role to token
        try:
            user_role = user.user_role
            
            # Patch for case sensitivity issue: ensure role is lowercase in database
            current_role = user_role.role.lower()
            if user_role.role != current_role:
                user_role.role = current_role
                user_role.save()
                
            token['role'] = user_role.role
            token['is_admin'] = user_role.is_admin
            token['is_manager'] = user_role.is_manager
            token['is_salesperson'] = user_role.is_salesperson
        except UserRole.DoesNotExist:
            token['role'] = UserRole.SALESPERSON
            token['is_admin'] = False
            token['is_manager'] = False
            token['is_salesperson'] = True
        
        return token


class PINPasswordResetSerializer(serializers.Serializer):
    """Serializer for requesting password reset with PIN"""
    username = serializers.CharField(required=True)
    pin = serializers.CharField(required=True)
    
    def validate_username(self, value):
        """Validate user existence"""
        if not User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Aucun utilisateur trouvé avec ce nom d\'utilisateur.')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset with validation"""
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate_token(self, value):
        """Validate reset token"""
        try:
            token = PasswordResetToken.objects.get(token=value)
            if token.is_used or not token.is_valid():
                raise serializers.ValidationError('Jeton de réinitialisation invalide ou expiré.')
            return token
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError('Jeton de réinitialisation invalide.')
    
    def validate(self, data):
        """Validate that passwords match"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        return data


class UserManagementSerializer(serializers.ModelSerializer):
    """Serializer for user management (admin only)"""
    user_role = UserRoleSerializer()
    full_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'user_role', 'is_active', 'date_joined'
        ]
    
    def get_full_name(self, obj):
        """Get user's full name"""
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users (admin only)"""
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserRole.ROLE_CHOICES, default=UserRole.SALESPERSON)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
    
    def validate_username(self, value):
        """Validate username format and uniqueness"""
        value = validate_username(value)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        value = validate_email_format(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value
    
    def create(self, validated_data):
        """Create a new user with role"""
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create UserRole
        UserRole.objects.create(user=user, role=role)
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users (admin only)"""
    role = serializers.ChoiceField(choices=UserRole.ROLE_CHOICES, required=False)
    is_active = serializers.BooleanField(required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    
    def validate_username(self, value):
        """Validate username format and uniqueness"""
        value = validate_username(value)
        # Check if another user has this username
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        value = validate_email_format(value)
        # Check if another user has this email
        if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Email already exists.')
        return value
    
    def update(self, instance, validated_data):
        """Update user and role"""
        role = validated_data.pop('role', None)
        is_active = validated_data.pop('is_active', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update role if provided
        if role is not None:
            user_role, created = UserRole.objects.get_or_create(user=instance)
            user_role.role = role
            user_role.save()
        
        # Update active status if provided
        if is_active is not None:
            instance.is_active = is_active
            instance.save()
        
        return instance


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for users updating their own profile"""
    username = serializers.CharField(required=False, max_length=150)
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email']
    
    def validate_username(self, value):
        """Validate username format and uniqueness"""
        try:
            value = validate_username(value)
        except Exception as e:
            # Handle both django and drf validation errors
            if hasattr(e, 'messages'):
                raise serializers.ValidationError(e.messages)
            raise serializers.ValidationError(str(e))
            
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Ce nom d\'utilisateur est déjà utilisé.')
        return value

    def validate_email(self, value):
        """Validate email format and uniqueness"""
        try:
            value = validate_email_format(value)
        except Exception as e:
            if hasattr(e, 'messages'):
                raise serializers.ValidationError(e.messages)
            raise serializers.ValidationError(str(e))
            
        # Check if another user has this email
        if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Cet e-mail est déjà utilisé.')
        return value

    def update(self, instance, validated_data):
        """Update user profile"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences"""
    notifications = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPreferences
        fields = [
            'id', 'user', 'theme', 'language', 'default_page_size',
            'notifications', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_notifications(self, obj):
        """Get notifications as nested object"""
        return {
            'email_new_sales': obj.email_new_sales,
            'low_stock_alerts': obj.low_stock_alerts,
            'weekly_summary': obj.weekly_summary,
        }
    
    def create(self, validated_data):
        """Create preferences for the current user"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update preferences"""
        # Handle notifications separately
        notifications = self.initial_data.get('notifications', {})
        if notifications:
            instance.email_new_sales = notifications.get('email_new_sales', instance.email_new_sales)
            instance.low_stock_alerts = notifications.get('low_stock_alerts', instance.low_stock_alerts)
            instance.weekly_summary = notifications.get('weekly_summary', instance.weekly_summary)
        
        return super().update(instance, validated_data)