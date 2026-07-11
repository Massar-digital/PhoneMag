"""
Custom throttle classes for rate limiting API endpoints.
Protects against brute force attacks and ensures fair API usage.
"""

from rest_framework.throttling import SimpleRateThrottle
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(UserRateThrottle):
    """
    Rate throttle for login endpoint.
    Limits login attempts to prevent brute force attacks.
    """
    scope = 'login'


class RegisterThrottle(AnonRateThrottle):
    """
    Rate throttle for registration endpoint.
    Limits registration attempts per IP to prevent account spam.
    """
    scope = 'register'


class PasswordResetThrottle(AnonRateThrottle):
    """
    Rate throttle for password reset request endpoint.
    Limits password reset requests per IP to prevent email spam.
    """
    scope = 'password_reset'


class PasswordResetConfirmThrottle(SimpleRateThrottle):
    """
    Rate throttle for password reset confirmation endpoint.
    Limits confirmation attempts per token to prevent brute force.
    """
    scope = 'password_reset_confirm'

    def get_cache_key(self):
        """Use token as cache key for password reset confirmation"""
        if not self.request.data.get('token'):
            return None
        return f'password_reset_confirm_{self.request.data.get("token")}'


class PasswordChangeThrottle(UserRateThrottle):
    """
    Rate throttle for password change endpoint.
    Limits password change attempts per user.
    """
    scope = 'password_change'


class TokenRefreshThrottle(UserRateThrottle):
    """
    Rate throttle for token refresh endpoint.
    Limits token refresh attempts per user.
    """
    scope = 'token_refresh'


class GeneralAPIThrottle(UserRateThrottle):
    """
    General rate throttle for authenticated API endpoints.
    Limits requests per user across all endpoints.
    """
    scope = 'api'


class SensitiveActionThrottle(UserRateThrottle):
    """
    Rate throttle for sensitive actions like refunds, voids, and deletes.
    """
    scope = 'sensitive_action'
