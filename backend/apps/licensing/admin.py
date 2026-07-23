from django.contrib import admin
from django.utils import timezone
from .models import LicenseCode


def reset_license(modeladmin, request, queryset):
    count = queryset.update(
        is_activated=False,
        mac_address='',
        ip_address=None,
        activated_at=None,
        city='',
        country='',
        latitude=None,
        longitude=None,
    )
    modeladmin.message_user(request, f'{count} license(s) reset successfully.')
reset_license.short_description = 'Reset selected licenses'


@admin.register(LicenseCode)
class LicenseCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'is_activated', 'activated_at', 'mac_address', 'ip_address', 'city', 'country', 'customer_name']
    list_filter = ['is_activated', 'country']
    search_fields = ['code', 'customer_name', 'mac_address', 'city']
    readonly_fields = ['activated_at', 'mac_address', 'ip_address', 'city', 'country', 'latitude', 'longitude']
    ordering = ['-activated_at']
    actions = [reset_license]
