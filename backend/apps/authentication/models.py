from django.db import models
from django.contrib.auth.models import User
import uuid
from datetime import timedelta
from django.utils import timezone


class UserRole(models.Model):
    """Model to store user roles and permissions"""
    ADMIN = 'admin'
    MANAGER = 'manager'
    SALESPERSON = 'salesperson'
    
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (MANAGER, 'Manager'),
        (SALESPERSON, 'Salesperson'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_role')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=SALESPERSON)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    @property
    def is_admin(self):
        """Check if user is admin"""
        return self.role.lower() == self.ADMIN
    
    @property
    def is_manager(self):
        """Check if user is manager"""
        return self.role.lower() == self.MANAGER
    
    @property
    def is_salesperson(self):
        """Check if user is salesperson"""
        return self.role.lower() == self.SALESPERSON


class PasswordResetToken(models.Model):
    """Model to store password reset tokens"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reset token for {self.user.username}"
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new reset token for a user (expires in 24 hours)"""
        # Invalidate previous unused tokens
        cls.objects.filter(user=user, is_used=False).delete()
        
        token = cls.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        return token
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.save()


class UserPreferences(models.Model):
    """Model to store user preferences"""
    LIGHT = 'light'
    DARK = 'dark'
    SYSTEM = 'system'
    
    THEME_CHOICES = [
        (LIGHT, 'Light'),
        (DARK, 'Dark'),
        (SYSTEM, 'System'),
    ]
    
    ENGLISH = 'en'
    FRENCH = 'fr'
    
    LANGUAGE_CHOICES = [
        (ENGLISH, 'English'),
        (FRENCH, 'Français'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default=LIGHT)
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default=ENGLISH)
    default_page_size = models.PositiveIntegerField(default=25)
    email_new_sales = models.BooleanField(default=True)
    low_stock_alerts = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Preferences for {self.user.username}"


class UserProfile(models.Model):
    """Model to store user profile information including profile picture"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Profile for {self.user.username}"
