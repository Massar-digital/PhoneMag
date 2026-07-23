from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.licensing.models import LicenseCode


class Command(BaseCommand):
    help = 'Import license codes from a plain .txt file (one 8-char code per line)'

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, help='Path to the .txt file with license codes')

    def handle(self, *args, **options):
        filepath = options['file']

        try:
            with open(filepath) as f:
                raw = [line.strip() for line in f if line.strip()]
        except FileNotFoundError:
            raise CommandError(f"File not found: {filepath}")

        total = len(raw)
        existing = set(LicenseCode.objects.filter(code__in=raw).values_list('code', flat=True))
        new_codes = [LicenseCode(code=c) for c in raw if c not in existing]

        LicenseCode.objects.bulk_create(new_codes, ignore_conflicts=False)

        inserted = len(new_codes)
        skipped = total - inserted

        self.stdout.write(f"Inserted: {inserted} | Skipped: {skipped} | Total: {total}")
