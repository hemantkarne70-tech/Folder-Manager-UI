from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from filemanager.models import ManagedFile


class Command(BaseCommand):
    help = "Permanently delete files that have remained in Trash for 30 days."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=30)
        expired = ManagedFile.objects.filter(
            is_trashed=True,
            deleted_at__isnull=False,
            deleted_at__lte=cutoff,
        )
        count = 0

        for item in expired.iterator():
            stored_file = item.file
            with transaction.atomic():
                item.delete()
                transaction.on_commit(
                    lambda stored_file=stored_file: stored_file.delete(save=False)
                )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Permanently deleted {count} expired trashed file(s)."))
