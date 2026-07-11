"""
Custom permission classes for role-based access control.

Role hierarchy:
- Admin: Full access to all endpoints
- Manager: CRUD operations on phones, sales, inventory, but no user management
- Salesperson: Can create/view sales, view inventory (read-only), cannot manage phones or users
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import UserRole


class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """
    message = "Admin access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superusers always have access
        if user.is_superuser:
            return True
        
        try:
            user_role = user.user_role
            return user_role.is_admin
        except UserRole.DoesNotExist:
            return False


class IsManager(BasePermission):
    """
    Allows access to manager and admin users.
    Managers can perform CRUD operations on core resources.
    """
    message = "Manager or Admin access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superusers always have access
        if user.is_superuser:
            return True
            
        try:
            user_role = user.user_role
            return user_role.is_admin or user_role.is_manager
        except UserRole.DoesNotExist:
            return False


class IsSalesperson(BasePermission):
    """
    Allows access to salesperson, manager, and admin users.
    Salespersons have limited access to certain endpoints.
    """
    message = "Salesperson or higher access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        try:
            user_role = user.user_role
            return True  # All roles can access salesperson-level features
        except UserRole.DoesNotExist:
            return False


class IsSalespersonCanCreateSales(BasePermission):
    """
    Allows salesperson to create/update/delete sales.
    Managers and admins have full access.
    """
    message = "You do not have permission to perform this action on sales."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        try:
            user_role = user.user_role
            # Admin and Manager have full access
            if user_role.is_admin or user_role.is_manager:
                return True
            # Salesperson can only create/update/delete sales (not read-only)
            if user_role.is_salesperson and request.method not in SAFE_METHODS:
                return True
            # For read operations, salesperson can view sales
            if user_role.is_salesperson and request.method in SAFE_METHODS:
                return True
            return False
        except UserRole.DoesNotExist:
            return False


class IsManagerOrAdmin(BasePermission):
    """
    Allows access only to manager and admin users.
    Blocks salesperson access to phone and inventory management (destructive operations).
    """
    message = "Manager or Admin access required for this operation."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers always have access
        if user.is_superuser:
            return True
        
        try:
            user_role = user.user_role
            return user_role.is_admin or user_role.is_manager
        except UserRole.DoesNotExist:
            return False


class IsAdminForDestructive(BasePermission):
    """
    Allows admin users to perform destructive operations (delete).
    Managers can delete from certain endpoints but not users.
    """
    message = "Admin access required to delete resources."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers always have access
        if user.is_superuser:
            return True
        
        # Only DELETE operations are restricted
        if request.method != 'DELETE':
            return True
        
        try:
            user_role = user.user_role
            # Only admin can delete
            return user_role.is_admin
        except UserRole.DoesNotExist:
            return False


class CanManageUsers(BasePermission):
    """
    Allows only admin users to manage users.
    Other roles cannot access user management endpoints.
    """
    message = "Only admins can manage users."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
            
        # Superusers always have access
        if user.is_superuser:
            return True
        
        try:
            user_role = user.user_role
            return user_role.is_admin
        except UserRole.DoesNotExist:
            return False
