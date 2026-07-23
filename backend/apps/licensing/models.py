from django.db import models


class LicenseCode(models.Model):
    code = models.CharField(max_length=8, unique=True)
    is_activated = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    mac_address = models.CharField(max_length=17, blank=True, default='')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    customer_name = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'License Code'
        verbose_name_plural = 'License Codes'
        ordering = ['-created_at']

    def __str__(self):
        return self.code
